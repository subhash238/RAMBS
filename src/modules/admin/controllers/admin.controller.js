const { User, Role } = require("../../../models");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const bcrypt = require("bcrypt");
const {
  validateRequiredFields,
  canCreateRole,
  checkUserLimit,
  canModifyRole,
  canModifySensitiveData,
  checkEmailExists,
  ROLES
} = require("../../../utils/permissions");

// ============================================
// USER MANAGEMENT CONTROLLERS
// ============================================

/**
 * Get all users with type filter
 * @route GET /api/admin/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, type } = req.query;
    const offset = (page - 1) * limit;

    // Define admin roles
    const adminRoles = ['superadmin', 'admin', 'manager'];
    
    // Build where clause based on type parameter
    let where = {};
    
    if (type === 'admin') {
      // Fetch only admin users (excluding superadmin)
      where.role = { [require("sequelize").Op.in]: ['admin', 'manager'] };
    } else if (type === 'normal') {
      // Fetch only normal users
      where.role = { [require("sequelize").Op.notIn]: adminRoles };
      
      // Add additional filters for normal users
      const { status, timeframe } = req.query;
      
      // Filter by isDeleted status
      if (status === 'active') {
        where.isDeleted = false;
      } else if (status === 'deleted') {
        where.isDeleted = true;
      }
      // If no status filter, include both active and deleted
      
      // Filter by timeframe (new users within 5 days)
      if (timeframe === 'new') {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        where.createdAt = {
          [require("sequelize").Op.gte]: fiveDaysAgo
        };
      }
    }
    // else: Fetch all users (default behavior) - no role filter needed

    // Add search filter
    if (search) {
      where[require("sequelize").Op.or] = [
        { name: { [require("sequelize").Op.iLike]: `%${search}%` } },
        { email: { [require("sequelize").Op.iLike]: `%${search}%` } },
      ];
    }

    // Manager can only see users they created
    const operator = req.user;
    if (operator.role === ROLES.MANAGER) {
      where.createdBy = operator.id;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    const userType = type === 'admin' ? 'admin' : type === 'normal' ? 'normal' : 'all';
    
    // Prepare response with filter information
    const responseData = {
      users: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
      type: userType
    };
    
    // Add filter information for normal users
    if (type === 'normal') {
      const { status, timeframe } = req.query;
      responseData.filters = {
        status: status || 'all',  // active, deleted, or all
        timeframe: timeframe || 'all'  // new (within 5 days) or all
      };
    }
    
    logger.info(`Retrieved ${rows.length} ${userType} users with filters`);
    return success(res, `${userType.charAt(0).toUpperCase() + userType.slice(1)} users retrieved successfully`, responseData);
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
    const { name, email, password, role, userCreationLimit } = req.body;
    const creator = req.user;
    const targetRole = role || ROLES.USER;

    // 1. Validate required fields
    const missingFields = validateRequiredFields({ name, email, password });
    if (missingFields) {
      return error(res, `Required: ${missingFields.join(", ")}`, 400);
    }

    // 2. Check role permissions
    if (!canCreateRole(creator.role, targetRole)) {
      const allowed = ROLE_HIERARCHY[creator.role]?.join(", ") || "none";
      logger.warn(`Permission denied: ${creator.role} cannot create ${targetRole}`);
      return error(res, `${creator.role} can only create: ${allowed}`, 403);
    }

    // 2.5 Manager can only create normal users (role: user)
    if (creator.role === ROLES.MANAGER && targetRole !== ROLES.USER) {
      logger.warn(`Manager ${creator.email} attempted to create ${targetRole}`);
      return error(res, "Manager can only create normal users (role: user)", 403);
    }

    // 3. Check user creation limits (use creator's custom limit if available)
    const limitCheck = await checkUserLimit(creator.id, creator.role, creator.userCreationLimit);
    if (limitCheck.exceeded) {
      logger.warn(`Limit exceeded: ${creator.email} has ${limitCheck.count}/${limitCheck.limit} users`);
      return error(res, `Maximum ${limitCheck.limit} users reached`, 403);
    }

    // 4. Check for existing user
    const existingUser = await User.scope("withDeleted").findOne({ where: { email } });
    if (existingUser) {
      const message = existingUser.isDeleted
        ? "User exists but is deleted. Restore instead."
        : "Email already exists";
      logger.warn(`Creation failed: ${email} - ${message}`);
      return error(res, message, existingUser.isDeleted ? 400 : 409);
    }

    // 5. Create user (set custom limit for admin/manager)
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      name,
      email,
      password: hashedPassword,
      role: targetRole,
      createdBy: creator.id,
    };

    // Set custom user creation limit for admin/manager (default 50)
    if (targetRole === ROLES.ADMIN || targetRole === ROLES.MANAGER) {
      userData.userCreationLimit = userCreationLimit || 50;
    }

    const user = await User.create(userData);

    // 6. Set activity data for middleware (creation has no old data)
    res.locals.activityData = {
      oldData: null,  // No old data for creation
      newData: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    };

    logger.success(`Created: ${user.id} by ${creator.email}`);
    return success(res, "User created successfully", { user }, 201);

  } catch (err) {
    logger.error(`Create user error: ${err.message}`);
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
    const { name, email, password, role, userCreationLimit } = req.body;
    const operator = req.user;

    // 1. Find target user
    const user = await User.findByPk(id);
    if (!user) {
      logger.warn(`Update failed: User ${id} not found`);
      return error(res, "User not found", 404);
    }

    // 2. Check modification permissions
    if (!canModifyRole(operator.role, user.role)) {
      logger.warn(`Permission denied: ${operator.role} cannot modify ${user.role}`);
      return error(res, `Cannot modify ${user.role}`, 403);
    }

    // 3. Check sensitive data permissions
    const isUpdatingSensitive = password || (email && email !== user.email);
    if (isUpdatingSensitive && !canModifySensitiveData(operator, user)) {
      logger.warn(`Sensitive data modification denied: ${operator.email} -> ${user.email}`);
      return error(res, "Cannot modify sensitive data for this user", 403);
    }

    // 4. Validate email uniqueness
    if (email && email !== user.email) {
      const exists = await checkEmailExists(email, id);
      if (exists) {
        logger.warn(`Update failed: Email ${email} already exists`);
        return error(res, "Email already exists", 409);
      }
    }

    // 5. Store old data for activity logging
    const oldData = {
      name: user.name,
      email: user.email,
      role: user.role,
      userCreationLimit: user.userCreationLimit
    };

    // 6. Apply updates
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = await bcrypt.hash(password, 10);

    // Only superadmin can change roles
    if (role && operator.role === ROLES.SUPERADMIN) {
      user.role = role;
    }

    // Only superadmin/admin can update userCreationLimit for admin/manager
    if (userCreationLimit !== undefined && 
        (user.role === ROLES.ADMIN || user.role === ROLES.MANAGER) &&
        (operator.role === ROLES.SUPERADMIN || operator.role === ROLES.ADMIN)) {
      user.userCreationLimit = userCreationLimit;
    }

    user.updatedBy = operator.id;
    await user.save();

    // 7. Store new data for activity logging
    const newData = {
      name: user.name,
      email: user.email,
      role: user.role,
      userCreationLimit: user.userCreationLimit
    };

    // 8. Set activity data for middleware
    res.locals.activityData = {
      oldData,
      newData
    };

    logger.success(`Updated: ${id} by ${operator.email}`);
    return success(res, "User updated successfully", { user });

  } catch (err) {
    logger.error(`Update error: ${err.message}`);
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
    const { permanent } = req.query;
    const operator = req.user;

    // 1. Prevent self-deletion
    if (id === operator.id) {
      logger.warn(`Self-deletion attempt: ${id}`);
      return error(res, "Cannot delete your own account", 400);
    }

    // 2. Find target user
    const user = await User.scope("withDeleted").findByPk(id);
    if (!user) {
      logger.warn(`Delete failed: User ${id} not found`);
      return error(res, "User not found", 404);
    }

    // 3. Check deletion permissions
    if (!canModifyRole(operator.role, user.role)) {
      logger.warn(`Permission denied: ${operator.role} cannot delete ${user.role}`);
      return error(res, `Cannot delete ${user.role}`, 403);
    }

    // 4. Handle permanent deletion (superadmin only)
    if (permanent === "true") {
      if (operator.role !== ROLES.SUPERADMIN) {
        logger.warn(`Permanent delete denied: ${operator.email}`);
        return error(res, "Only superadmin can permanently delete", 403);
      }
      await user.destroy({ force: true });
      logger.success(`Permanently deleted: ${id}`);
      return success(res, "User permanently deleted");
    }

    // 5. Store old data for activity logging
    const oldData = {
      name: user.name,
      email: user.email,
      role: user.role,
      isDeleted: user.isDeleted
    };

    // 6. Soft delete
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.updatedBy = operator.id;
    await user.save();

    // 7. Set activity data for middleware (deletion)
    res.locals.activityData = {
      oldData,
      newData: null  // No new data for deletion
    };

    logger.success(`Soft deleted: ${id}`);
    return success(res, "User deleted successfully");

  } catch (err) {
    logger.error(`Delete error: ${err.message}`);
    return error(res, "Failed to delete user", 500);
  }
};

/**
 * Restore soft-deleted user
 * @route POST /api/admin/users/:id/restore
 */
exports.restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    const operator = req.user;

    // Find soft-deleted user
    const user = await User.scope("withDeleted").findByPk(id);
    if (!user) {
      logger.warn(`Restore failed: User ${id} not found`);
      return error(res, "User not found", 404);
    }

    if (!user.isDeleted) {
      logger.warn(`User is not deleted: ${id}`);
      return error(res, "User is not deleted", 400);
    }

    // Check restore permissions - manager: users, admin: managers+users, superadmin: all
    if (!canModifyRole(operator.role, user.role)) {
      logger.warn(`Restore denied: ${operator.role} cannot restore ${user.role}`);
      return error(res, `Cannot restore ${user.role}`, 403);
    }

    // Restore user
    user.isDeleted = false;
    user.deletedAt = null;
    user.updatedBy = operator.id;
    await user.save();

    logger.success(`Restored: ${id} by ${operator.email}`);
    return success(res, "User restored successfully", { user });
  } catch (err) {
    logger.error(`Restore error: ${err.message}`);
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

/**
 * Get current admin/superadmin own profile
 * @route GET /api/admin/me
 */
exports.getMyProfile = async (req, res) => {
  try {
    const user = req.user;

    logger.info(`Admin ${user.email} retrieved own profile`);
    return success(res, "Profile retrieved successfully", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    logger.error(`Error fetching admin profile: ${err.message}`);
    return error(res, "Failed to fetch profile", 500);
  }
};

/**
 * Update current admin/superadmin own profile
 * @route PUT /api/admin/me
 */
exports.updateMyProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = req.user;

    // Security: Prevent role change through this endpoint
    if (req.body.role !== undefined) {
      logger.warn(`Admin ${user.email} attempted to change own role`);
      return error(res, "Cannot change your own role through profile update", 403);
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const exists = await checkEmailExists(email, user.id);
      if (exists) {
        return error(res, "Email already exists", 409);
      }
      user.email = email;
    }

    if (name) {
      user.name = name;
    }

    await user.save();

    logger.success(`Admin ${user.email} updated own profile`);
    return success(res, "Profile updated successfully", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    logger.error(`Error updating admin profile: ${err.message}`);
    return error(res, "Failed to update profile", 500);
  }
};

/**
 * Get user creation count and limit for current admin/manager
 * @route GET /api/admin/user-creation-stats
 */
exports.getUserCreationStats = async (req, res) => {
  try {
    const user = req.user;

    // Get count and limit (use user's custom limit if available)
    const limitData = await checkUserLimit(user.id, user.role, user.userCreationLimit);

    // Superadmin has no limit
    const isUnlimited = !limitData.limit;

    logger.info(`User creation stats retrieved for ${user.email}`);
    return success(res, "User creation stats retrieved", {
      stats: {
        created: limitData.count || 0,
        limit: limitData.limit || "unlimited",
        remaining: isUnlimited ? "unlimited" : Math.max(0, limitData.limit - limitData.count),
        percentage: isUnlimited ? 0 : Math.round((limitData.count / limitData.limit) * 100),
        canCreate: isUnlimited ? true : !limitData.exceeded,
        role: user.role,
        userCreationLimit: user.userCreationLimit
      },
    });
  } catch (err) {
    logger.error(`Error fetching user creation stats: ${err.message}`);
    return error(res, "Failed to fetch stats", 500);
  }
};

/**
 * Change admin/superadmin own password or any user's password
 * @route POST /api/admin/change-password/:id?
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const { id } = req.params;
    const operator = req.user;

    // Determine target user ID - if id param provided, change that user's password
    // Otherwise change own password
    const targetUserId = id || operator.id;
    const isChangingOwnPassword = targetUserId === operator.id;

    // Validation: newPassword is always required
    if (!newPassword || newPassword.length < 6) {
      return error(res, "New password must be at least 6 characters", 400);
    }

    // Validation: confirmPassword must match newPassword (only when changing own password)
    if (isChangingOwnPassword && newPassword !== confirmPassword) {
      return error(res, "Passwords do not match", 400);
    }

    // Validation: currentPassword required only when changing own password
    if (isChangingOwnPassword && !currentPassword) {
      return error(res, "Current password is required", 400);
    }

    // Find the target user
    const user = await User.findByPk(targetUserId);
    if (!user) {
      return error(res, "User not found", 404);
    }

    // If changing own password, verify current password
    if (isChangingOwnPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        logger.warn(`Password change failed: Invalid current password for user ${user.email}`);
        return error(res, "Current password is incorrect", 400);
      }
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    const actionMsg = isChangingOwnPassword ? "own password" : `${user.email}'s password`;
    logger.success(`${operator.email} changed ${actionMsg}`);
    
    return success(res, "Password changed successfully", {
      message: isChangingOwnPassword 
        ? "Your password has been updated" 
        : `Password for ${user.email} has been updated`
    });
  } catch (err) {
    logger.error(`Change password error: ${err.message}`);
    return error(res, "Failed to change password", 500);
  }
};
