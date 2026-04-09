const { Permission, User } = require("../../../models");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");

// ============================================
// PERMISSION CONTROLLERS
// Only superadmin can manage permissions
// ============================================

/**
 * Get all permissions with pagination and search
 * @route GET /api/admin/permissions
 */
exports.getAllPermissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, user_id } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    let where = {};
    if (user_id) {
      where.user_id = user_id;
    }

    const { count, rows } = await Permission.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: User,
          as: "createdBy",
          attributes: ["name"],
        },
        {
          model: User,
          as: "updatedBy",
          attributes: ["name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    logger.info(`Retrieved ${rows.length} permissions`);
    return success(res, "Permissions retrieved successfully", {
      permissions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    logger.error(`Get permissions error: ${err.message}`);
    return error(res, "Failed to fetch permissions", 500);
  }
};

/**
 * Get permissions by user ID
 * @route GET /api/admin/permissions/user/:userId
 */
exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const permissions = await Permission.findAll({
      where: { user_id: userId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
      ],
      order: [["name", "ASC"]],
    });

    logger.info(`Retrieved ${permissions.length} permissions for user ${userId}`);
    return success(res, "User permissions retrieved successfully", {
      permissions,
    });
  } catch (err) {
    logger.error(`Get user permissions error: ${err.message}`);
    return error(res, "Failed to fetch user permissions", 500);
  }
};

/**
 * Create new permission (superadmin only)
 * @route POST /api/admin/permissions
 */
exports.createPermission = async (req, res) => {
  try {
    const { user_id, name, access } = req.body;
    const creator = req.user;

    // Validate required fields
    if (!user_id || !name || !access) {
      return error(res, "user_id, name, and access are required", 400);
    }

    // Validate access value
    const validAccess = ["read", "write", "read_write"];
    if (!validAccess.includes(access)) {
      return error(res, "access must be: read, write, or read_write", 400);
    }

    // Check if user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return error(res, "User not found", 404);
    }

    // Check if permission already exists for this user and name
    const existing = await Permission.findOne({
      where: { user_id, name },
    });
    if (existing) {
      return error(res, `Permission '${name}' already exists for this user`, 409);
    }

    // Create permission
    const permission = await Permission.create({
      user_id,
      name,
      access,
      created_by: creator.id,
    });

    logger.success(`Permission created: ${permission.id} by ${creator.email}`);
    return success(
      res,
      "Permission created successfully",
      { permission },
      201
    );
  } catch (err) {
    logger.error(`Create permission error: ${err.message}`);
    return error(res, "Failed to create permission", 500);
  }
};

/**
 * Update permission (superadmin only)
 * @route PUT /api/admin/permissions/:id
 */
exports.updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { access } = req.body;
    const updater = req.user;

    // Validate access value
    const validAccess = ["read", "write", "read_write"];
    if (!validAccess.includes(access)) {
      return error(res, "access must be: read, write, or read_write", 400);
    }

    const permission = await Permission.findByPk(id);
    if (!permission) {
      return error(res, "Permission not found", 404);
    }

    // Update fields
    permission.access = access;
    permission.updated_by = updater.id;
    await permission.save();

    logger.success(`Permission updated: ${id} by ${updater.email}`);
    return success(res, "Permission updated successfully", { permission });
  } catch (err) {
    logger.error(`Update permission error: ${err.message}`);
    return error(res, "Failed to update permission", 500);
  }
};

/**
 * Delete permission (superadmin only)
 * @route DELETE /api/admin/permissions/:id
 */
exports.deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findByPk(id);
    if (!permission) {
      return error(res, "Permission not found", 404);
    }

    await permission.destroy();

    logger.success(`Permission deleted: ${id} by ${req.user.email}`);
    return success(res, "Permission deleted successfully");
  } catch (err) {
    logger.error(`Delete permission error: ${err.message}`);
    return error(res, "Failed to delete permission", 500);
  }
};

/**
 * Check if user has specific permission
 * @route GET /api/admin/permissions/check/:userId
 */
exports.checkPermission = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, access } = req.query;

    if (!name || !access) {
      return error(res, "name and access query params required", 400);
    }

    const permission = await Permission.findOne({
      where: { user_id: userId, name },
    });

    if (!permission) {
      return success(res, "Permission check result", {
        hasPermission: false,
        message: `No permission '${name}' found for user`,
      });
    }

    // Check access level
    const userAccess = permission.access;
    const requiredAccess = access;

    let hasAccess = false;
    if (requiredAccess === "read") {
      hasAccess = ["read", "write", "read_write"].includes(userAccess);
    } else if (requiredAccess === "write") {
      hasAccess = ["write", "read_write"].includes(userAccess);
    }

    return success(res, "Permission check result", {
      hasPermission: hasAccess,
      userAccess,
      requiredAccess,
    });
  } catch (err) {
    logger.error(`Check permission error: ${err.message}`);
    return error(res, "Failed to check permission", 500);
  }
};
