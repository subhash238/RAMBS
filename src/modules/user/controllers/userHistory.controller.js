const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const UserHistoryService = require("../../../services/userHistory.service");

/**
 * Create history record for current user
 * @route POST /api/user/history
 */
exports.createUserHistory = async (req, res) => {
  try {
    // Use common service - pass req.body and current user
    const result = await UserHistoryService.createHistoryRecord(req);
    
    if (!result.success) {
      return error(res, result.message, 400);
    }
    
    return success(res, result.message, {
      history: result.history,
      user: result.user
    }, 201);
  } catch (err) {
    logger.error(`Error creating user history: ${err.message}`);
    return error(res, "Failed to create history record", 500);
  }
};

/**
 * Get history records for current user
 * @route GET /api/user/history
 */
exports.getUserHistory = async (req, res) => {
  try {
    // Use common service - pass req and current user
    const result = await UserHistoryService.getHistoryRecords(req);
    
    if (!result.success) {
      return error(res, result.message, 400);
    }
    
    return success(res, "History records retrieved successfully", {
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
 * Get specific history record for current user
 * @route GET /api/user/history/:id
 */
exports.getUserHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use common service - pass req, history ID, and current user
    const result = await UserHistoryService.getHistoryById(req, id);
    
    if (!result.success) {
      return error(res, result.message, 404);
    }
    
    return success(res, result.message, { history: result.history });
  } catch (err) {
    logger.error(`Error fetching user history by ID: ${err.message}`);
    return error(res, "Failed to fetch history record", 500);
  }
};
