const { UserActivity } = require("../models");
const logger = require("../config/logger");

/**
 * User Activity Logging Service
 * Tracks all CRUD operations and user actions
 */
class UserActivityService {
  
  /**
   * Log user activity
   * @param {string} userId - User ID who performed the action
   * @param {string} tableName - Table name where operation was performed
   * @param {string} operation - Operation type (read, view, write, delete)
   * @param {object} oldValue - Previous value before update (optional)
   * @param {object} newValue - New value after update (optional)
   * @returns {Promise<object>} - Created activity log
   */
  static async logActivity(userId, tableName, operation, oldValue = null, newValue = null) {
    try {
      // Create activity log
      const activity = await UserActivity.create({
        user_id: userId,
        table_name: tableName,
        operation: operation,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null
      });

      logger.debug(`User activity logged: ${userId} - ${operation} on ${tableName}`);
      return activity;
    } catch (error) {
      logger.error(`Failed to log user activity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log READ operation
   * @param {string} userId - User ID
   * @param {string} tableName - Table name
   * @param {object} oldValue - Previous data (optional)
   * @param {object} newValue - New data (optional)
   */
  static async logRead(userId, tableName, oldValue = null, newValue = null) {
    return this.logActivity(userId, tableName, 'read', oldValue, newValue);
  }

  /**
   * Log VIEW operation (for UI views)
   * @param {string} userId - User ID
   * @param {string} tableName - Table name
   * @param {object} oldValue - Previous data (optional)
   * @param {object} newValue - New data (optional)
   */
  static async logView(userId, tableName, oldValue = null, newValue = null) {
    return this.logActivity(userId, tableName, 'view', oldValue, newValue);
  }

  /**
   * Log WRITE operation (general write operations)
   * @param {string} userId - User ID
   * @param {string} tableName - Table name
   * @param {object} oldValue - Previous data (optional)
   * @param {object} newValue - New data (optional)
   */
  static async logWrite(userId, tableName, oldValue = null, newValue = null) {
    return this.logActivity(userId, tableName, 'write', oldValue, newValue);
  }

  /**
   * Log DELETE operation
   * @param {string} userId - User ID
   * @param {string} tableName - Table name
   * @param {object} deletedData - Data before deletion
   */
  static async logDelete(userId, tableName, deletedData) {
    return this.logActivity(userId, tableName, 'delete', deletedData, null);
  }

  /**
   * Get user activities with pagination
   * @param {string} userId - User ID (optional, for specific user)
   * @param {object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Limit per page
   * @returns {Promise<object>} - Paginated activities
   */
  static async getActivities(userId = null, filters = {}, page = 1, limit = 50) {
    try {
      const where = {};
      
      if (userId) {
        where.user_id = userId;
      }
      
      if (filters.tableName) {
        where.table_name = filters.tableName;
      }
      
      if (filters.operation) {
        where.operation = filters.operation;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await UserActivity.findAndCountAll({
        where,
        offset,
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']],
        include: [
          {
            association: 'user',
            attributes: ['id', 'name', 'email', 'role']
          }
        ]
      });

      return {
        activities: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error(`Failed to get user activities: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get activity statistics
   * @param {string} userId - User ID (optional)
   * @param {object} filters - Filter options
   * @returns {Promise<object>} - Activity statistics
   */
  static async getActivityStats(userId = null, filters = {}) {
    try {
      const where = {};
      
      if (userId) {
        where.user_id = userId;
      }
      
      if (filters.tableName) {
        where.table_name = filters.tableName;
      }

      // Get operation counts
      const operationStats = await UserActivity.findAll({
        where,
        attributes: [
          'operation',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['operation'],
        raw: true
      });

      // Get table access stats
      const tableStats = await UserActivity.findAll({
        where,
        attributes: [
          'table_name',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['table_name'],
        raw: true
      });

      return {
        operations: operationStats,
        tables: tableStats
      };
    } catch (error) {
      logger.error(`Failed to get activity stats: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UserActivityService;
