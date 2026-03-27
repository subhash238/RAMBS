const { UserActivity, User } = require("../../../models");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const UserActivityService = require("../../../services/userActivity.service");

// ============================================
// USER ACTIVITY CONTROLLERS (OPTIMIZED WITH COMMON SERVICE)
// ============================================

/**
 * Get all user activities with pagination and filtering
 */
exports.getAllActivities = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      user_id, 
      table_name, 
      operation,
      start_date,
      end_date 
    } = req.query;

    // Build filters for common service
    const filters = {};
    if (table_name) filters.tableName = table_name;
    if (operation) filters.operation = operation;
    if (start_date || end_date) {
      filters.dateFrom = start_date;
      filters.dateTo = end_date;
    }

    // Use common service
    const result = await UserActivityService.getActivities(
      user_id || null, 
      filters, 
      parseInt(page), 
      parseInt(limit)
    );

    return success(res, "Activities retrieved", result);
  } catch (err) {
    logger.error(`Get activities error: ${err.message}`);
    return error(res, "Failed to fetch activities", 500);
  }
};

/**
 * Get activities for specific user (by ID or username)
 */
exports.getUserActivities = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { page = 1, limit = 20, operation } = req.query;

    // Check if identifier is UUID (ID) or username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    
    let userId;
    let identifierType;
    
    if (isUUID) {
      // Identifier is a UUID (user ID)
      userId = identifier;
      identifierType = 'id';
    } else {
      // Identifier is a username
      const user = await User.findOne({
        where: { 
          name: identifier,
          isDeleted: false 
        },
        attributes: ['id']
      });
      
      if (!user) {
        logger.warn(`User not found with identifier: ${identifier}`);
        return error(res, "User not found", 404);
      }
      
      userId = user.id;
      identifierType = 'username';
    }

    // Build filters for common service
    const filters = {};
    if (operation) filters.operation = operation;

    // Use common service
    const result = await UserActivityService.getActivities(
      userId, 
      filters, 
      parseInt(page), 
      parseInt(limit)
    );

    return success(res, "User activities retrieved", {
      ...result,
      userIdentifier: {
        type: identifierType,
        value: identifier
      }
    });
  } catch (err) {
    logger.error(`Get user activities error: ${err.message}`);
    return error(res, "Failed to fetch activities", 500);
  }
};

/**
 * Get activity statistics
 */
exports.getActivityStats = async (req, res) => {
  try {
    const { user_id, table_name, start_date, end_date } = req.query;

    // Build filters for common service
    const filters = {};
    if (table_name) filters.tableName = table_name;
    if (start_date || end_date) {
      filters.dateFrom = start_date;
      filters.dateTo = end_date;
    }

    // Use common service
    const stats = await UserActivityService.getActivityStats(
      user_id || null, 
      filters
    );

    return success(res, "Activity statistics retrieved", stats);
  } catch (err) {
    logger.error(`Get activity stats error: ${err.message}`);
    return error(res, "Failed to fetch activity statistics", 500);
  }
};

/**
 * Get single activity by ID
 */
exports.getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await UserActivity.findByPk(id, {
      attributes: [
        'id', 'user_id', 'table_name', 'operation',
        'old_value', 'new_value', 'createdAt'
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role'],
        required: false
      }]
    });

    if (!activity) {
      return error(res, "Activity not found", 404);
    }

    return success(res, "Activity retrieved", { activity });
  } catch (err) {
    logger.error(`Get activity error: ${err.message}`);
    return error(res, "Failed to fetch activity", 500);
  }
};

/**
 * Delete old activities (cleanup)
 */
exports.cleanupOldActivities = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const deletedCount = await UserActivity.destroy({
      where: {
        createdAt: {
          [require("sequelize").Op.lt]: cutoffDate
        }
      }
    });

    logger.info(`Cleaned up ${deletedCount} old activities older than ${days} days`);
    return success(res, "Activities cleaned up", { deletedCount, days });
  } catch (err) {
    logger.error(`Cleanup activities error: ${err.message}`);
    return error(res, "Failed to cleanup activities", 500);
  }
};

/**
 * Export activities to CSV
 */
exports.exportActivities = async (req, res) => {
  try {
    const { user_id, table_name, operation, start_date, end_date } = req.query;

    // Build filters for common service
    const filters = {};
    if (table_name) filters.tableName = table_name;
    if (operation) filters.operation = operation;
    if (start_date || end_date) {
      filters.dateFrom = start_date;
      filters.dateTo = end_date;
    }

    // Get all activities for export (no pagination)
    const result = await UserActivityService.getActivities(
      user_id || null, 
      filters, 
      1, 
      10000 // Large limit for export
    );

    const activities = result.activities;

    // Convert to CSV format
    const csvHeader = 'ID,User,Email,Table,Operation,Old Value,New Value,Created At\n';
    const csvData = activities.map(activity => {
      const oldVal = activity.old_value ? JSON.parse(activity.old_value) : null;
      const newVal = activity.new_value ? JSON.parse(activity.new_value) : null;
      
      return `${activity.id},${activity.user?.name || 'N/A'},${activity.user?.email || 'N/A'},${activity.table_name},${activity.operation},"${oldVal ? JSON.stringify(oldVal).replace(/"/g, '""') : 'N/A'}","${newVal ? JSON.stringify(newVal).replace(/"/g, '""') : 'N/A'}",${activity.createdAt}`;
    }).join('\n');

    const csv = csvHeader + csvData;

    // Log export activity
    await UserActivityService.logWrite(
      req.user.id,
      'user_activities',
      null,
      { 
        exported_count: activities.length,
        filters: { user_id, table_name, operation, start_date, end_date }
      }
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=activities.csv');
    return res.send(csv);
  } catch (err) {
    logger.error(`Export activities error: ${err.message}`);
    return error(res, "Failed to export activities", 500);
  }
};
