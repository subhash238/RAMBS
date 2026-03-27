const { UserActivity, User } = require("../models");
const logger = require("../config/logger");

// Enhanced middleware to record user activities with new model
module.exports = (req, res, next) => {
  const startTime = Date.now();

  // On finish, record the activity
  res.on("finish", async () => {
    try {
      // Skip activity logging for health checks, static assets, and non-important operations
      if (req.path === '/health' || 
          req.path.startsWith('/static') || 
          req.path.startsWith('/public') ||
          req.path.includes('/activities') ||  // Skip activity logging for activity endpoints
          req.path.includes('/logs') ||         // Skip logging for log viewing
          req.path.includes('/stats')) {        // Skip logging for stats endpoints
        return;
      }

      // Only log for authenticated users with admin roles (superadmin, admin, manager)
      if (!req.user) {
        return;
      }

      // Check if user has admin-level role
      const userRole = req.user.role;
      const adminRoles = ['superadmin', 'admin', 'manager'];
      
      if (!adminRoles.includes(userRole)) {
        // Skip activity logging for regular users
        return;
      }

      // Only log successful operations (skip errors and redirects)
      if (res.statusCode >= 400 || res.statusCode >= 300) {
        return;
      }

      // Skip GET requests for read-only operations (industry standard)
      if (req.method === 'GET') {
        return;
      }

      // Build basic info
      const method = req.method;
      const path = req.baseUrl + req.path;
      const statusCode = res.statusCode;

      // IP detection and normalization
      let ipRaw = req.headers["x-forwarded-for"] || req.ip || req.connection?.remoteAddress || null;
      let ip = null;
      if (ipRaw) {
        // If x-forwarded-for contains a list, take the first non-empty entry
        if (typeof ipRaw === "string" && ipRaw.includes(",")) {
          ipRaw = ipRaw.split(",").map(s => s.trim()).find(Boolean) || ipRaw;
        }

        // IPv6 loopback (::1) -> map to IPv4 loopback for readability
        if (ipRaw === "::1") {
          ip = "127.0.0.1";
        } else if (typeof ipRaw === "string" && ipRaw.startsWith("::ffff:")) {
          // IPv4 mapped in IPv6 format ::ffff:127.0.0.1 -> extract IPv4
          ip = ipRaw.split(":").pop();
        } else {
          ip = ipRaw;
        }
      }

      // Device info from user-agent header
      const userAgent = req.headers["user-agent"] || null;

      // Determine operation type based on method and path (only for important operations)
      let operation = 'write';
      let tableName = 'system';
      
      // Map HTTP methods to operations (only POST, PUT, PATCH, DELETE)
      switch (method) {
        case 'POST':
          operation = 'write';
          break;
        case 'PUT':
        case 'PATCH':
          operation = 'write';
          break;
        case 'DELETE':
          operation = 'delete';
          break;
        default:
          operation = 'write';
          break;
      }

      // Determine table name from path (only for important tables)
      if (path.includes('/users')) {
        tableName = 'users';
      } else if (path.includes('/roles')) {
        tableName = 'roles';
      } else if (path.includes('/settings')) {
        tableName = 'settings';
      } else if (path.includes('/permissions')) {
        tableName = 'permissions';
      } else if (path.includes('/history')) {
        tableName = 'history';
      } else {
        tableName = 'system'; // Default for all other paths
      }

      // Determine old and new values for activity tracking (only for important operations)
      let oldValue = null;
      let newValue = null;
      
      // For UPDATE operations, capture old/new data if available
      if (res.locals && res.locals.activityData) {
        if (res.locals.activityData.oldData) {
          oldValue = JSON.stringify(res.locals.activityData.oldData);
        }
        if (res.locals.activityData.newData) {
          newValue = JSON.stringify(res.locals.activityData.newData);
        }
      }

      // Create activity record
      await UserActivity.create({
        user_id: req.user.id,
        table_name: tableName,
        operation: operation,
        old_value: oldValue,
        new_value: newValue
      });

      logger.debug(`Activity logged: ${operation} on ${tableName} by user ${req.user.id}`);
    } catch (err) {
      logger.warn(`Failed to write activity log: ${err.message}`);
    }
  });

  next();
};

// Helper function to manually log activities
module.exports.logActivity = async (userId, tableName, operation, data) => {
  try {
    await UserActivity.create({
      user_id: userId,
      table_name: tableName,
      operation: operation,
      old_value: data.oldValue ? JSON.stringify(data.oldValue) : null,
      new_value: data.newValue ? JSON.stringify(data.newValue) : null
    });
    
    logger.debug(`Manual activity logged: ${operation} on ${tableName} by user ${userId}`);
  } catch (err) {
    logger.warn(`Failed to write manual activity log: ${err.message}`);
  }
};
