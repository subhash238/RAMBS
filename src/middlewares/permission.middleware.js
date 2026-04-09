const { Permission } = require("../models");
const logger = require("../config/logger");

/**
 * Middleware to check if user has specific permission
 * @param {string} permissionName - Name of the permission to check
 * @param {string} requiredAccess - Required access level: 'read' or 'write'
 * @returns {Function} Express middleware
 */
const checkPermission = (permissionName, requiredAccess = "read") => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // Superadmin has all permissions by default
      if (user.role === "superadmin") {
        return next();
      }

      // Find user's permission
      const permission = await Permission.findOne({
        where: {
          user_id: user.id,
          name: permissionName,
        },
      });

      if (!permission) {
        logger.warn(`Permission denied: ${user.email} lacks '${permissionName}' permission`);
        return res.status(403).json({
          success: false,
          message: `You don't have '${permissionName}' permission`,
        });
      }

      // Check access level
      const userAccess = permission.access;
      let hasAccess = false;

      if (requiredAccess === "read") {
        hasAccess = ["read", "write", "read_write"].includes(userAccess);
      } else if (requiredAccess === "write") {
        hasAccess = ["write", "read_write"].includes(userAccess);
      }

      if (!hasAccess) {
        logger.warn(
          `Permission denied: ${user.email} has '${userAccess}' but needs '${requiredAccess}' for '${permissionName}'`
        );
        return res.status(403).json({
          success: false,
          message: `You need '${requiredAccess}' access for '${permissionName}'`,
        });
      }

      // Attach permission to request for later use
      req.userPermission = permission;
      next();
    } catch (err) {
      logger.error(`Permission check error: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: "Failed to check permissions",
      });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {Array} permissions - Array of permission names
 * @param {string} requiredAccess - Required access level
 * @returns {Function} Express middleware
 */
const checkAnyPermission = (permissions, requiredAccess = "read") => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // Superadmin has all permissions by default
      if (user.role === "superadmin") {
        return next();
      }

      // Check if user has any of the permissions
      const userPermissions = await Permission.findAll({
        where: {
          user_id: user.id,
          name: permissions,
        },
      });

      if (userPermissions.length === 0) {
        logger.warn(`Permission denied: ${user.email} lacks required permissions`);
        return res.status(403).json({
          success: false,
          message: "You don't have the required permissions",
        });
      }

      // Check if any permission has the required access level
      let hasAccess = false;
      for (const permission of userPermissions) {
        const userAccess = permission.access;
        if (requiredAccess === "read") {
          if (["read", "write", "read_write"].includes(userAccess)) {
            hasAccess = true;
            break;
          }
        } else if (requiredAccess === "write") {
          if (["write", "read_write"].includes(userAccess)) {
            hasAccess = true;
            break;
          }
        }
      }

      if (!hasAccess) {
        logger.warn(`Permission denied: ${user.email} lacks '${requiredAccess}' access`);
        return res.status(403).json({
          success: false,
          message: `You need '${requiredAccess}' access`,
        });
      }

      next();
    } catch (err) {
      logger.error(`Permission check error: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: "Failed to check permissions",
      });
    }
  };
};

/**
 * Helper function to check permission (for use in controllers)
 * @param {string} userId - User ID
 * @param {string} permissionName - Permission name
 * @param {string} requiredAccess - Required access level
 * @returns {Promise<boolean>}
 */
const hasPermission = async (userId, permissionName, requiredAccess = "read") => {
  try {
    const permission = await Permission.findOne({
      where: {
        user_id: userId,
        name: permissionName,
      },
    });

    if (!permission) return false;

    const userAccess = permission.access;
    if (requiredAccess === "read") {
      return ["read", "write", "read_write"].includes(userAccess);
    } else if (requiredAccess === "write") {
      return ["write", "read_write"].includes(userAccess);
    }
    return false;
  } catch (err) {
    logger.error(`hasPermission check error: ${err.message}`);
    return false;
  }
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  hasPermission,
};
