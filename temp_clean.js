const { User, Role } = require("../../../models");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const bcrypt = require("bcrypt");

// ============================================
// USER MANAGEMENT CONTROLLERS
// ============================================

/**
 * Get all users
 * @route GET /api/admin/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (role) where.role = role;
    if (search) {
      where[require("sequelize").Op.or] = [
        { name: { [require("sequelize").Op.iLike]: `%${search}%` } },
        { email: { [require("sequelize").Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    logger.info(`Retrieved ${rows.length} users`);
    return success(res, "Users retrieved successfully", {
      users: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    logger.error(`Error fetching users: ${err.message}`);
    return error(res, "Failed to fetch users", 500);
  }
};

/**
 * Get user by ID
 * @route GET /api/admin/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      logger.warn(`User not found: ${id}`);
      return error(res, "User not found", 404);
    }

    logger.info(`Retrieved user: ${id}`);
    return success(res, "User retrieved successfully", { user });
  } catch (err) {
    logger.error(`Error fetching user: ${err.message}`);
    return error(res, "Failed to fetch user", 500);
  }
};

/**
 * Create new user
 * @route POST /api/admin/users
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return error(res, "Name, email, and password are required", 400);
    }

    // Check user limit for admin/manager (max 50 users)
    if (["admin", "manager"].includes(req.user.role)) {
      // Check if canAddUsers permission is granted
      if (!req.user.canAddUsers) {
        // Check if they've exceeded 50 users limit
        if (req.user.usersCreatedCount >= 50) {
          logger.warn(
            `User creation failed: ${req.user.role} ${req.user.email} has reached limit of 50 users`
          );
          return error(
            res,
            `${req.user.role} can create maximum 50 users. You have reached the limit.`,
            403
          );
        }
      }
    }

    // Check if user already exists (including deleted users)
    const existingUser = await User.scope("withDeleted").findOne({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.isDeleted) {
        logger.warn(
          `User creation failed: User with email exists but is deleted - ${email}`
        );
        return error(
          res,
          "User with this email exists but is deleted. Restore the user instead of creating a new one.",
          400
        );
      } else {
        logger.warn(`User creation failed: Email already exists - ${email}`);
        return error(res, "Email already exists", 400);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
      createdBy: req.user.id,
    });

    // Increment user count for the creator
    req.user.usersCreatedCount += 1;
    await req.user.save();

    logger.success(`User created: ${user.id} by ${req.user.email}`);
    return success(res, "User created successfully", { user }, 201);
  } catch (err) {
    logger.error(`Error creating user: ${err.message}`);
    return error(res, "Failed to create user", 500);
  }
};

/**
 * Update user
 * @route PUT /api/admin/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      logger.warn(`User not found for update: ${id}`);
      return error(res, "User not found", 404);
    }

    // Authorization: Check who can update password and user details
    const isTargetUser = req.user.id === id;
    const isSuperAdmin = req.user.role === "superadmin";
    const isManagerOrAdmin = ["manager", "admin"].includes(req.user.role);
    const targetIsRegularUser = user.role === "user";

    // Permission check for sensitive data (password, email)
    const isUpdatingSensitiveData = password || email;

    if (isUpdatingSensitiveData) {
      // Superadmin can update anyone
      if (isSuperAdmin) {
        // Allow
      }
      // Manager/Admin can update:
      // 1. Themselves
      // 2. Regular users
      // But NOT other admin/manager/superadmin
      else if (isManagerOrAdmin) {
        if (!isTargetUser && !targetIsRegularUser) {
          logger.warn(
            `Unauthorized update attempt by ${req.user.role} ${req.user.email} for ${user.role} ${id}`
          );
          return error(
            res,
            `${req.user.role} can only update their own or regular users' password/email.`,
            403
          );
        }
      }
      // Regular user can only update themselves
      else {
        if (!isTargetUser) {
          logger.warn(
            `Unauthorized update attempt by user ${req.user.email} for user ${id}`
          );
          return error(
            res,
            "You can only update your own password/email.",
            403
          );
        }
      }
    }

    // Check if new email already exists (if changing email)
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) {
        logger.warn(`User update failed: Email already exists - ${email}`);
        return error(res, "Email already exists", 400);
      }
    }

    // Update allowed fields based on permission
    if (name) {
      user.name = name;
    }

    if (email) {
      user.email = email;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Only superadmin can change role
    if (role && isSuperAdmin) {
      user.role = role;
    }

    user.updatedBy = req.user.id;

    await user.save();

    logger.success(`User updated: ${id} by ${req.user.email}`);
    return success(res, "User updated successfully", { user });
  } catch (err) {
    logger.error(`Error updating user: ${err.message}`);
    return error(res, "Failed to update user", 500);
  }
};

/**
 * Delete user (soft delete)
 * @route DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // ?permanent=true for hard delete

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      logger.warn(`User attempted to delete their own account: ${id}`);
      return error(res, "Cannot delete your own account", 400);
    }

    // Use withDeleted scope to find soft-deleted users too
    const user = await User.scope("withDeleted").findByPk(id);
    if (!user) {
      logger.warn(`User not found for deletion: ${id}`);
      return error(res, "User not found", 404);
    }

    // Permanent hard delete
    if (permanent === "true") {
      await user.destroy({ force: true });
      logger.success(`User permanently deleted: ${id}`);
      return success(res, "User permanently deleted");
    }

    // Soft delete
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.updatedBy = req.user.id;  // Track who deleted the user
    await user.save();

    logger.success(`User soft deleted: ${id}`);
    return success(res, "User deleted successfully");
  } catch (err) {
    logger.error(`Error deleting user: ${err.message}`);
    return error(res, "Failed to delete user", 500);
exports.getAllRoles = async (req, res) => {
  try {
    const roles = ["superadmin", "manager", "admin", "user"];
    const roleStats = {};

    for (const role of roles) {
      const count = await User.count({ where: { role } });
      roleStats[role] = count;
    }

    logger.info("Retrieved all roles");
    return success(res, "Roles retrieved successfully", { roles, stats: roleStats });
  } catch (err) {
    logger.error(`Error fetching roles: ${err.message}`);
    return error(res, "Failed to fetch roles", 500);
  }
};

/**
 * Create new role
 * @route POST /api/admin/roles
 */
exports.createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;

    // Validation
    if (!name) {
      return error(res, "Role name is required", 400);
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ where: { name } });
    if (existingRole) {
      logger.warn(`Role creation failed: Role already exists - ${name}`);
      return error(res, "Role already exists", 400);
    }

    // Create role
    const role = await Role.create({
      name,
      permissions: permissions || [],
      createdBy: req.user.id,
    });

    logger.success(`Role created: ${role.id} by ${req.user.email}`);
    return success(res, "Role created successfully", { role }, 201);
  } catch (err) {
    logger.error(`Error creating role: ${err.message}`);
    return error(res, "Failed to create role", 500);
  }
};

/**
 * Update role
 * @route PUT /api/admin/roles/:id
 */
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions } = req.body;

    // Validation
    if (!name) {
      return error(res, "Role name is required", 400);
    }

    // Find role
    const role = await Role.findByPk(id);
    if (!role) {
      logger.warn(`Role not found for update: ${id}`);
      return error(res, "Role not found", 404);
    }

    // Check if new name already exists (if changing name)
    if (name && name !== role.name) {
      const nameExists = await Role.findOne({ where: { name } });
      if (nameExists) {
        logger.warn(`Role update failed: Name already exists - ${name}`);
        return error(res, "Role name already exists", 400);
      }
    }

    // Update role
    if (name) {
      role.name = name;
    }
    
    if (permissions) {
      role.permissions = permissions;
    }

    role.updatedBy = req.user.id;
    await role.save();

    logger.success(`Role updated: ${id} by ${req.user.email}`);
    return success(res, "Role updated successfully", { role });
  } catch (err) {
    logger.error(`Error updating role: ${err.message}`);
    return error(res, "Failed to update role", 500);
  }
};

/**
 * Delete role
 * @route DELETE /api/admin/roles/:id
 */
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Find role
    const role = await Role.findByPk(id);
    if (!role) {
      logger.warn(`Role not found for deletion: ${id}`);
      return error(res, "Role not found", 404);
    }

    // Check if role is being used by any users
    const usersWithRole = await User.count({ where: { role: role.name } });
    if (usersWithRole > 0) {
      logger.warn(`Role deletion failed: Role ${role.name} is assigned to ${usersWithRole} users`);
      return error(res, "Cannot delete role that is assigned to users", 400);
    }

    await role.destroy();

    logger.success(`Role deleted: ${id}`);
    return success(res, "Role deleted successfully");
  } catch (err) {
    logger.error(`Error deleting role: ${err.message}`);
    return error(res, "Failed to delete role", 500);
  }
};

/**
 * Assign role to user
 * @route POST /api/admin/users/:userId/roles/:roleId
 */
exports.assignRoleToUser = async (req, res) => {
  try {
    const { userId, roleId } = req.params;

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`User not found for role assignment: ${userId}`);
      return error(res, "User not found", 404);
    }

    // Find role
    const role = await Role.findByPk(roleId);
    if (!role) {
      logger.warn(`Role not found for assignment: ${roleId}`);
      return error(res, "Role not found", 404);
    }

    // Update user role
    user.role = role.name;
    user.updatedBy = req.user.id;
    await user.save();

    logger.success(`Role ${role.name} assigned to user ${userId} by ${req.user.email}`);
    return success(res, "Role assigned to user successfully", { user });
  } catch (err) {
    logger.error(`Error assigning role to user: ${err.message}`);
    return error(res, "Failed to assign role to user", 500);
  }
};

/**
 * Restore soft-deleted user
 * @route POST /api/admin/users/:id/restore
 */
exports.restoreUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find soft-deleted user
    const user = await User.scope("withDeleted").findByPk(id);
    if (!user) {
      logger.warn(`User not found for restore: ${id}`);
      return error(res, "User not found", 404);
    }

    if (!user.isDeleted) {
      logger.warn(`User is not deleted: ${id}`);
      return error(res, "User is not deleted", 400);
    }

    // Restore user
    user.isDeleted = false;
    user.deletedAt = null;
    user.updatedBy = req.user.id;  // Track who restored the user
    await user.save();

    logger.success(`User restored: ${id}`);
    return success(res, "User restored successfully", { user });
  } catch (err) {
    logger.error(`Error restoring user: ${err.message}`);
    return error(res, "Failed to restore user", 500);
  }
};

exports.getDeletedUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.scope("onlyDeleted").findAndCountAll({
      offset,
      limit: parseInt(limit),
      attributes: { exclude: ["password"] },
      order: [["deletedAt", "DESC"]],
    });

    logger.info(`Retrieved ${rows.length} deleted users`);
    return success(res, "Deleted users retrieved successfully", {
      users: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    logger.error(`Error fetching deleted users: ${err.message}`);
    return error(res, "Failed to fetch deleted users", 500);
  }
};

/**
 * Get system logs
 * @route GET /api/admin/logs
 */
exports.getSystemLogs = async (req, res) => {
  try {
    logger.info("System logs requested");
    // This is a placeholder - integrate with your actual logging system
    return success(res, "System logs retrieved successfully", {
      message: "Logs are available in logs/app.log file",
      location: "logs/app.log",
    });
  } catch (err) {
    logger.error(`Error fetching system logs: ${err.message}`);
    return error(res, "Failed to fetch system logs", 500);
  }
};
// ============================================
// PERMISSION MANAGEMENT CONTROLLERS
// ============================================

/**
 * Grant "Add Users" permission to admin
 * @route POST /api/admin/users/:id/grant-add-users-permission
 */
exports.grantAddUsersPermission = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      logger.warn(`User not found: ${id}`);
      return error(res, "User not found", 404);
    }

    // Only allow superadmin to grant this permission
    if (req.user.role !== "superadmin") {
      logger.warn(`Unauthorized permission grant attempt by ${req.user.email}`);
      return error(res, "Only superadmin can grant permissions", 403);
    }

    // Check if user is admin or higher
    if (!["admin", "manager", "superadmin"].includes(user.role)) {
      return error(
        res,
        "Only admin, manager, or superadmin can receive this permission",
        400
      );
    }

    // Grant permission
    user.canAddUsers = true;
    await user.save();

    logger.success(
      `Granted "Add Users" permission to ${user.email} by ${req.user.email}`
    );
    return success(res, "Permission granted successfully", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        canAddUsers: user.canAddUsers,
      },
    });
  } catch (err) {
    logger.error(`Error granting permission: ${err.message}`);
    return error(res, "Failed to grant permission", 500);
  }
};

/**
 * Revoke "Add Users" permission from admin
 * @route POST /api/admin/users/:id/revoke-add-users-permission
 */
exports.revokeAddUsersPermission = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      logger.warn(`User not found: ${id}`);
      return error(res, "User not found", 404);
    }

    // Only allow superadmin to revoke this permission
    if (req.user.role !== "superadmin") {
      logger.warn(`Unauthorized permission revoke attempt by ${req.user.email}`);
      return error(res, "Only superadmin can revoke permissions", 403);
    }

    // Revoke permission
    user.canAddUsers = false;
    await user.save();

    logger.success(
      `Revoked "Add Users" permission from ${user.email} by ${req.user.email}`
    );
    return success(res, "Permission revoked successfully", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        canAddUsers: user.canAddUsers,
      },
    });
  } catch (err) {
    logger.error(`Error revoking permission: ${err.message}`);
    return error(res, "Failed to revoke permission", 500);
  }
};

/**
 * Get users with "Add Users" permission
 * @route GET /api/admin/users/permissions/add-users
 */
exports.getUsersWithAddPermission = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where: { canAddUsers: true, isDeleted: false },
      offset,
      limit: parseInt(limit),
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    logger.info(`Retrieved ${rows.length} users with add permission`);
    return success(res, "Users with add permission retrieved successfully", {
      users: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit), // Removed parseInt() from limit
      },
    });
  } catch (err) {
    logger.error(`Error fetching users with permission: ${err.message}`);
    return error(res, "Failed to fetch users", 500);
  }
};

// ============================================
// DASHBOARD & ANALYTICS CONTROLLERS
// ============================================

/**
 * Get admin dashboard statistics
 * @route GET /api/admin/dashboard
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.count({ where: { isDeleted: false } });
    const activeUsers = await User.count({ 
      where: { 
        isDeleted: false,
        updatedAt: {
          [require("sequelize").Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });
    
    // Get role statistics
    const roleStats = {};
    const roles = ["superadmin", "manager", "admin", "user"];
    for (const role of roles) {
      const count = await User.count({ where: { role, isDeleted: false } });
      roleStats[role] = count;
    }

    // Get recent users (last 7 days)
    const recentUsers = await User.findAll({
      where: {
        isDeleted: false,
        createdAt: {
          [require("sequelize").Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      limit: 5,
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]]
    });

    logger.info("Retrieved dashboard statistics");
    return success(res, "Dashboard statistics retrieved successfully", {
      totalUsers,
      activeUsers,
      roleStats,
      recentUsers,
      userGrowth: {
        thisMonth: await User.count({
          where: {
            isDeleted: false,
            createdAt: {
              [require("sequelize").Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        }),
        lastMonth: await User.count({
          where: {
            isDeleted: false,
            createdAt: {
              [require("sequelize").Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
              [require("sequelize").Op.lt]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        })
      }
    });
  } catch (err) {
    logger.error(`Error fetching dashboard statistics: ${err.message}`);
    return error(res, "Failed to fetch dashboard statistics", 500);
  }
};
