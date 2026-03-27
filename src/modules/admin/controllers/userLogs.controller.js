const { UserLog } = require("../../../models");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const AuthLoggerService = require("../../../services/authLogger.service");

/**
 * Get paginated user logs
 * @route GET /api/admin/user-logs
 */
exports.getUserLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, ip, path, method } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (userId) where.user_id = userId;
    if (ip) where.ip = ip;
    if (path) where.path = path;
    if (method) where.method = method;

    const { count, rows } = await UserLog.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [["createdAt", "DESC"]],
    });

    return success(res, "User logs retrieved", {
      logs: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    logger.error(`Error fetching user logs: ${err.message}`);
    return error(res, "Failed to fetch user logs", 500);
  }
};

/**
 * Get active sessions for a user
 * @route GET /api/admin/user-logs/active/:id
 */
exports.getActiveSessions = async (req, res) => {
  try {
    const { id } = req.params;
    
    const activeSessions = await AuthLoggerService.getActiveSessions(id);
    
    return success(res, "Active sessions retrieved", {
      userId: id,
      activeSessions,
      totalActiveSessions: activeSessions.length
    });
  } catch (err) {
    logger.error(`Error fetching active sessions: ${err.message}`);
    return error(res, "Failed to fetch active sessions", 500);
  }
};

/**
 * Force logout all sessions for a user
 * @route POST /api/admin/user-logs/logout-all/:id
 */
exports.forceLogoutAllSessions = async (req, res) => {
  try {
    const { id } = req.params;
    
    const loggedOutCount = await AuthLoggerService.logoutAllSessions(id);
    
    logger.info(`Admin ${req.user.email} forced logout of ${loggedOutCount} sessions for user ${id}`);
    
    return success(res, "All sessions logged out successfully", {
      userId: id,
      loggedOutSessions: loggedOutCount,
      forcedBy: req.user.email
    });
  } catch (err) {
    logger.error(`Error forcing logout: ${err.message}`);
    return error(res, "Failed to logout sessions", 500);
  }
};

/**
 * Get login history for a user
 * @route GET /api/admin/user-logs/history/:id
 */
exports.getLoginHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get active sessions using common service
    const activeSessions = await AuthLoggerService.getActiveSessions(id);

    // Get login history from UserLog model
    const { count, rows } = await UserLog.findAndCountAll({
      where: { user_id: id },
      offset,
      limit: parseInt(limit),
      order: [["login_date", "DESC"]],
    });

    return success(res, "Login history retrieved", {
      userId: id,
      history: rows,
      activeSessions: activeSessions,
      totalActiveSessions: activeSessions.length,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    logger.error(`Error fetching login history: ${err.message}`);
    return error(res, "Failed to fetch login history", 500);
  }
};
