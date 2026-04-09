const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const UserHistoryService = require("../../../services/userHistory.service");

const { User } = require("../../../models");
const { ROLES } = require("../../../common/roles");

/**
 * Create history record for any user (Admin only, Manager only for their created users)
 * @route POST /api/admin/history
 */
exports.createHistory = async (req, res) => {
  try {
    const { userId } = req.body;
    const operator = req.user;

    if (!userId) {
      return error(res, "User ID is required", 400);
    }

    // Manager can only create history for users they created
    if (operator.role === ROLES.MANAGER) {
      const targetUser = await User.findByPk(userId, {
        attributes: ['id', 'createdBy', 'role']
      });

      if (!targetUser) {
        return error(res, "User not found", 404);
      }

      // Manager can only create history for 'user' role users they created
      if (targetUser.createdBy !== operator.id) {
        logger.warn(`Manager ${operator.email} attempted to create history for user ${userId} they did not create`);
        return error(res, "You can only create history records for users you created", 403);
      }

      // Manager can only create history for 'user' role, not admin/manager
      if (targetUser.role !== ROLES.USER) {
        logger.warn(`Manager ${operator.email} attempted to create history for ${targetUser.role}`);
        return error(res, "You can only create history records for normal users", 403);
      }
    }

    // Use common service - pass req.body and target user ID
    const result = await UserHistoryService.createHistoryRecord(req, userId);
    
    if (!result.success) {
      return error(res, result.message, 400);
    }
    
    // Set activity data for middleware (creation)
    res.locals.activityData = {
      oldData: null,  // No old data for creation
      newData: {
        userId: userId,
        type: result.history?.type,
        amount: result.history?.amount,
        status: result.history?.status
      }
    };
    
    return success(res, result.message, {
      history: result.history,
      user: result.user
    }, 201);
  } catch (err) {
    logger.error(`Error creating history: ${err.message}`);
    return error(res, "Failed to create history record", 500);
  }
};

/**
 * Get all history records with pagination and filters (Admin only)
 * @route GET /api/admin/history
 */
exports.getAllHistory = async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Use common service - pass req and target user ID (or null for all users)
    const result = await UserHistoryService.getHistoryRecords(req, userId || null);
    
    if (!result.success) {
      return error(res, result.message, 400);
    }
    
    return success(res, "History records retrieved successfully", {
      history: result.history,
      pagination: result.pagination,
      filters: result.filters
    });
  } catch (err) {
    logger.error(`Error fetching all history: ${err.message}`);
    return error(res, "Failed to fetch history records", 500);
  }
};

/**
 * Get history records for specific user (Admin only)
 * @route GET /api/admin/history/user/:userId
 */
exports.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Use common service - pass req and target user ID
    const result = await UserHistoryService.getHistoryRecords(req, userId);
    
    if (!result.success) {
      return error(res, result.message, 400);
    }
    
    return success(res, "User history retrieved successfully", {
      history: result.history,
      pagination: result.pagination,
      filters: result.filters
    });
  } catch (err) {
    logger.error(`Error fetching user history: ${err.message}`);
    return error(res, "Failed to fetch history records", 500);
  }
};

/**
 * Get specific history record (Admin only)
 * @route GET /api/admin/history/:id
 */
exports.getHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use common service - pass req, history ID, and null (admin can access any)
    const result = await UserHistoryService.getHistoryById(req, id, null);
    
    if (!result.success) {
      return error(res, result.message, 404);
    }
    
    return success(res, result.message, { history: result.history });
  } catch (err) {
    logger.error(`Error fetching history by ID: ${err.message}`);
    return error(res, "Failed to fetch history record", 500);
  }
};

/**
 * Update history record (Admin only)
 * @route PUT /api/admin/history/:id
 */
exports.updateHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use common service - pass req, history ID, and null (admin can update any)
    const result = await UserHistoryService.updateHistoryRecord(req, id, null);
    
    if (!result.success) {
      return error(res, result.message, 400);
    }
    
    // Set activity data for middleware (update)
    res.locals.activityData = {
      oldData: {
        id: id,
        status: result.history?.previousStatus || 'unknown'
      },
      newData: {
        id: id,
        status: result.history?.status
      }
    };
    
    return success(res, result.message, {
      history: result.history,
      user: result.user
    });
  } catch (err) {
    logger.error(`Error updating history: ${err.message}`);
    return error(res, "Failed to update history record", 500);
  }
};

/**
 * Delete history record (Admin only)
 * @route DELETE /api/admin/history/:id
 */
exports.deleteHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use common service - pass req, history ID, and null (admin can delete any)
    const result = await UserHistoryService.deleteHistoryRecord(req, id, null);
    
    if (!result.success) {
      return error(res, result.message, 404);
    }
    
    // Set activity data for middleware (deletion)
    res.locals.activityData = {
      oldData: {
        id: id,
        type: result.deletedHistory?.type,
        amount: result.deletedHistory?.amount,
        status: result.deletedHistory?.status
      },
      newData: null  // No new data for deletion
    };
    
    return success(res, result.message, {
      deletedHistory: result.deletedHistory,
      user: result.user
    });
  } catch (err) {
    logger.error(`Error deleting history: ${err.message}`);
    return error(res, "Failed to delete history record", 500);
  }
};

/**
 * Get history statistics for all users (Admin only)
 * @route GET /api/admin/history/stats
 */
exports.getAllHistoryStats = async (req, res) => {
  try {
    // Use common service - pass req and null (for all users)
    const result = await UserHistoryService.getHistoryStats(req, null);
    
    if (!result.success) {
      return error(res, result.message, 400);
    }
    
    return success(res, "History statistics retrieved successfully", {
      stats: result.stats,
      filters: result.filters
    });
  } catch (err) {
    logger.error(`Error fetching history stats: ${err.message}`);
    return error(res, "Failed to fetch history statistics", 500);
  }
};

/**
 * Get history statistics for specific user (Admin only)
 * @route GET /api/admin/history/stats/user/:userId
 */
exports.getUserHistoryStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Use common service - pass req and target user ID
    const result = await UserHistoryService.getHistoryStats(req, userId);
    
    if (!result.success) {
      return error(res, result.message, 400);
    }
    
    return success(res, "User history statistics retrieved successfully", {
      stats: result.stats,
      filters: result.filters
    });
  } catch (err) {
    logger.error(`Error fetching user history stats: ${err.message}`);
    return error(res, "Failed to fetch history statistics", 500);
  }
};
