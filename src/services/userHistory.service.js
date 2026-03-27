const { User, History } = require("../models");
const logger = require("../config/logger");
const { success, error } = require("../common/response");

/**
 * User History Service - Common functions for Admin and User modules
 */
class UserHistoryService {
  /**
   * Validate history data
   * @param {object} data - History data to validate
   * @returns {object} - Validated data or error
   */
  static validateHistoryData(data) {
    const { type, tranType, amount, walletType, note, status, gameId } = data;

    // Status-only validation (for admin status updates)
    const isStatusOnly = status && 
                          !type && 
                          !tranType && 
                          !amount && 
                          !walletType && 
                          !note && 
                          !gameId;

    if (isStatusOnly) {
      // Only validate status field
      if (status && !["active", "pending", "failed"].includes(status)) {
        return {
          valid: false,
          message: "Invalid status. Must be: active, pending, failed",
        };
      }
      
      return {
        valid: true,
        data: { status }
      };
    }

    // Full validation (for complete updates)
    if (
      !type ||
      !["add_money", "withdraw", "game_play", "other"].includes(type)
    ) {
      return {
        valid: false,
        message:
          "Invalid or missing transaction type. Must be: add_money, withdraw, game_play, other",
      };
    }

    if (!tranType || !["debit", "credit"].includes(tranType)) {
      return {
        valid: false,
        message: "Invalid or missing transaction type. Must be: debit, credit",
      };
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return {
        valid: false,
        message: "Invalid amount - must be a positive number",
      };
    }

    if (!walletType || !["deposit", "withdraw"].includes(walletType)) {
      return {
        valid: false,
        message: "Invalid or missing wallet type. Must be: deposit, withdraw",
      };
    }

    // Optional fields validation
    if (note && (typeof note !== "string" || note.length > 255)) {
      return {
        valid: false,
        message: "Note must be a string with max 255 characters",
      };
    }

    // Full validation - check status again for complete updates
    if (status && !["active", "pending", "failed"].includes(status)) {
      return {
        valid: false,
        message: "Invalid status. Must be: active, pending, failed",
      };
    }

    return {
      valid: true,
      data: {
        type,
        tranType,
        amount: parseFloat(amount),
        walletType,
        note: note ? note.trim() : null,
        status: status || "active",
        gameId: gameId || null,
      },
    };
  }

  /**
   * Create history record (common function)
   * @param {object} req - Express request object
   * @param {string} targetUserId - Target user ID (for admin use) or null (for current user)
   * @returns {Promise<object>} - Created history record
   */
  static async createHistoryRecord(req, targetUserId = null) {
    try {
      // Determine user ID
      const userId = targetUserId || req.user.id;

      // Validate history data
      const validation = this.validateHistoryData(req.body);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const { type, tranType, amount, walletType, note, status, gameId } =
        validation.data;

      // Check if user exists and is not deleted - only select required attributes
      const user = await User.findByPk(userId, {
        attributes: [
          "id",
          "name",
          "email",
          "depositBalance",
          "withdrawBalance",
        ],
        where: {
          isDeleted: {
            [require("sequelize").Op.ne]: true,
          },
        },
      });

      if (!user) {
        throw new Error("User not found or has been deleted");
      }

      // Create history record
      const history = await History.create({
        userId,
        type,
        tranType,
        amount,
        walletType,
        note: note || null,
        status: status || "active",
        gameId: gameId || null,
        data: req.body.data || null,
      });

      // Update user balance based on transaction type and wallet
      await this.updateUserBalanceWithUser(user, tranType, walletType, amount);

      // Save the updated user (no need to fetch again)
      await user.save();

      logger.info(`History record created: ${history.id} for user ${userId}`);

      return {
        success: true,
        history,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          depositBalance: user.depositBalance,
          withdrawBalance: user.withdrawBalance,
        },
        message: "History record created successfully",
      };
    } catch (err) {
      logger.error(`Create history error: ${err.message}`);
      return {
        success: false,
        message: err.message || "Failed to create history record",
      };
    }
  }

  /**
   * Get history records (common function)
   * @param {object} req - Express request object
   * @param {string} targetUserId - Target user ID (for admin use) or null (for current user)
   * @returns {Promise<object>} - History records with pagination
   */
  static async getHistoryRecords(req, targetUserId = null) {
    try {
      // Determine user ID (null for admin fetching all records)
      const userId = targetUserId || req.user.id;
      const isAdminFetchingAll = targetUserId === null && req.user.role !== 'user';

      // Only check user existence if fetching for specific user (not admin fetching all)
      let user = null;
      if (!isAdminFetchingAll && userId) {
        user = await User.findByPk(userId, {
          attributes: ["id"],
          where: {
            isDeleted: {
              [require("sequelize").Op.ne]: true,
            },
          },
        });

        if (!user) {
          throw new Error("User not found or has been deleted");
        }
        console.log(user, "user getting");
      }
      const {
        page = 1,
        limit = 20,
        type,
        tranType,
        walletType,
        status,
        gameId,
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = req.query;

      // Build where clause
      const where = {};
      
      // Only add userId filter if not admin fetching all records
      if (!isAdminFetchingAll && userId) {
        where.userId = userId;
      }

      if (type) where.type = type;
      if (tranType) where.tranType = tranType;
      if (walletType) where.walletType = walletType;
      if (status) where.status = status;
      if (gameId) where.gameId = gameId;

      // Date range filter
      if (req.query.startDate || req.query.endDate) {
        where.createdAt = {};
        if (req.query.startDate)
          where.createdAt[require("sequelize").Op.gte] = new Date(
            req.query.startDate,
          );
        if (req.query.endDate)
          where.createdAt[require("sequelize").Op.lte] = new Date(
            req.query.endDate,
          );
      }

      // Pagination
      const offset = (page - 1) * limit;

      // Get history records
      const { count, rows } = await History.findAndCountAll({
        where,
        offset,
        limit: parseInt(limit),
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
            required: false,
            where: {
              isDeleted: {
                [require("sequelize").Op.ne]: true,
              },
            },
          },
        ],
      });

      const logMessage = isAdminFetchingAll 
        ? `Retrieved ${rows.length} history records for all users` 
        : `Retrieved ${rows.length} history records for user ${userId}`;
      
      logger.info(logMessage);

      return {
        success: true,
        history: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
        },
        filters: {
          type,
          tranType,
          walletType,
          status,
          gameId,
          startDate: req.query.startDate,
          endDate: req.query.endDate,
        },
      };
    } catch (err) {
      logger.error(`Get history error: ${err.message}`);
      return {
        success: false,
        message: err.message || "Failed to fetch history records",
      };
    }
  }

  /**
   * Get single history record (common function)
   * @param {object} req - Express request object
   * @param {string} historyId - History record ID
   * @param {string} targetUserId - Target user ID (for admin use) or null (for current user)
   * @returns {Promise<object>} - History record
   */
  static async getHistoryById(req, historyId, targetUserId = null) {
    try {
      // Determine user ID (null for admin fetching any record)
      const userId = targetUserId || req.user.id;
      const isAdminFetchingAll = targetUserId === null && req.user.role !== 'user';

      // Build where clause
      const where = { id: historyId };
      
      // Only add userId filter if not admin fetching all records
      if (!isAdminFetchingAll && userId) {
        where.userId = userId;
      }

      const history = await History.findOne({
        where,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
            required: false,
            where: {
              isDeleted: {
                [require("sequelize").Op.ne]: true,
              },
            },
          },
        ],
      });

      if (!history) {
        throw new Error("History record not found");
      }

      const logMessage = isAdminFetchingAll 
        ? `Admin retrieved history record: ${historyId}` 
        : `Retrieved history record: ${historyId} for user ${userId}`;
      
      logger.info(logMessage);

      return {
        success: true,
        history,
        message: "History record retrieved successfully",
      };
    } catch (err) {
      logger.error(`Get history by ID error: ${err.message}`);
      return {
        success: false,
        message: err.message || "Failed to fetch history record",
      };
    }
  }

  /**
   * Update history record (common function)
   * @param {object} req - Express request object
   * @param {string} historyId - History record ID
   * @param {string} targetUserId - Target user ID (for admin use) or null (for current user)
   * @returns {Promise<object>} - Updated history record
   */
  static async updateHistoryRecord(req, historyId, targetUserId = null) {
    try {
      // This is an admin-only route, so targetUserId can be used directly
      const userId = targetUserId; // null for admin fetching any record, or specific user ID

      // Find existing history record
      const whereClause = { id: historyId };
      
      // Only add userId filter if not admin fetching all records
      if (userId) {
        whereClause.userId = userId;
      }

      const existingHistory = await History.findOne({
        where: whereClause,
      });

      if (!existingHistory) {
        throw new Error("History record not found");
      }

      
      // Validate update data (using common validation)
      const validation = this.validateHistoryData(req.body);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const { note, status, data, type, amount, description, transactionId, category, tranType, walletType } = validation.data;

      // Build update data object with ONLY status field (using History model fields)
      const updateData = {};

      // Update ONLY status field
      if (status !== undefined) updateData.status = status;

      // Update history record
      await existingHistory.update(updateData);

      const logMessage = userId 
        ? `History record updated: ${historyId} for user ${userId}` 
        : `Admin updated history record: ${historyId}`;
      
      logger.info(logMessage);

      return {
        success: true,
        history: existingHistory,
        message: "History record updated successfully",
      };
    } catch (err) {
      logger.error(`Update history error: ${err.message}`);
      return {
        success: false,
        message: err.message || "Failed to update history record",
      };
    }
  }

  /**
   * Delete history record (common function)
   * @param {object} req - Express request object
   * @param {string} historyId - History record ID
   * @param {string} targetUserId - Target user ID (for admin use) or null (for current user)
   * @returns {Promise<object>} - Deletion result
   */
  static async deleteHistoryRecord(req, historyId, targetUserId = null) {
    try {
      // Determine user ID (null for admin fetching any record)
      const userId = targetUserId || req.user.id;
      const isAdminFetchingAll = targetUserId === null && req.user.role !== 'user';

      // Find existing history record
      const whereClause = { id: historyId };
      
      // Only add userId filter if not admin fetching all records
      if (!isAdminFetchingAll && userId) {
        whereClause.userId = userId;
      }

      const existingHistory = await History.findOne({
        where: whereClause,
      });

      if (!existingHistory) {
        throw new Error("History record not found");
      }

      // Store transaction details for balance update
      const { type, amount } = existingHistory;

      // Delete history record
      await existingHistory.destroy();

      // Revert user balance
      await this.updateUserBalance(userId, type, -amount);

      // Get updated user info
      const updatedUser = await User.findOne({
        where: { id: userId },
        attributes: [
          "id",
          "name",
          "email",
          "depositBalance",
          "withdrawBalance",
        ],
      });

      const logMessage = isAdminFetchingAll 
        ? `Admin deleted history record: ${historyId}` 
        : `History record deleted: ${historyId} for user ${userId}`;
      
      logger.info(logMessage);

      return {
        success: true,
        deletedHistory: existingHistory,
        user: updatedUser,
        message: "History record deleted successfully",
      };
    } catch (err) {
      logger.error(`Delete history error: ${err.message}`);
      return {
        success: false,
        message: err.message || "Failed to delete history record",
      };
    }
  }

  /**
   * Update user balance based on transaction type and wallet (using existing user object)
   * @param {object} user - User object (already fetched)
   * @param {string} tranType - Transaction type (debit/credit)
   * @param {string} walletType - Wallet type (deposit/withdraw)
   * @param {number} amount - Transaction amount
   */
  static async updateUserBalanceWithUser(user, tranType, walletType, amount) {
    try {
      const parsedAmount = parseFloat(amount);

      // Simple and accurate balance logic
      if (tranType === "debit") {
        // Debit means CUTTING from wallet
        if (walletType === "withdraw") {
          // Check withdraw balance before cutting
          const currentWithdraw = parseFloat(user.depositBalance || 0);
          if (currentWithdraw < parsedAmount) {
            throw new Error(
              `Insufficient withdraw balance. Available: ${currentWithdraw}, Required: ${parsedAmount}`,
            );
          }
          user.depositBalance = (currentWithdraw - parsedAmount).toFixed(2);
          logger.info(
            `Debited ${parsedAmount} from withdraw balance. New: ${user.withdrawBalance}`,
          );
        }
      } else if (tranType === "credit") {
        // Credit means ADDING to wallet
        if (walletType === "deposit") {
          user.depositBalance = (
            parseFloat(user.depositBalance || 0) + parsedAmount
          ).toFixed(2);
          logger.info(
            `Credited ${parsedAmount} to deposit balance. New: ${user.depositBalance}`,
          );
        } 
      } else {
        throw new Error(
          `Invalid transaction type: ${tranType}. Must be: debit, credit`,
        );
      }

      // Final validation: Ensure no negative balances
      if (
        parseFloat(user.depositBalance || 0) < 0 ||
        parseFloat(user.withdrawBalance || 0) < 0
      ) {
        throw new Error("Balance cannot be negative. Transaction rolled back.");
      }
    } catch (err) {
      logger.error(`Update balance error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Update user balance based on transaction type and wallet
   * @param {string} userId - User ID
   * @param {string} tranType - Transaction type (debit/credit)
   * @param {string} walletType - Wallet type (deposit/withdraw)
   * @param {number} amount - Transaction amount
   */
  static async updateUserBalance(userId, tranType, walletType, amount) {
    try {
      // Find user with only required attributes and check not deleted
      const user = await User.findByPk(userId, {
        attributes: ["id", "depositBalance", "withdrawBalance"],
        where: {
        isDeleted: {
              [require("sequelize").Op.ne]: true,
            },
        },
      });

      if (!user) return;

      const parsedAmount = parseFloat(amount);

      // Simple and accurate balance logic
      if (tranType === "debit") {
        // Debit means CUTTING from wallet
        if (walletType === "deposit") {
          // Check deposit balance before cutting
          const currentDeposit = parseFloat(user.depositBalance || 0);
          if (currentDeposit < parsedAmount) {
            throw new Error(
              `Insufficient deposit balance. Available: ${currentDeposit}, Required: ${parsedAmount}`,
            );
          }
          user.depositBalance = (currentDeposit - parsedAmount).toFixed(2);
          logger.info(
            `Debited ${parsedAmount} from deposit balance. New: ${user.depositBalance}`,
          );
        } else if (walletType === "withdraw") {
          // Check withdraw balance before cutting
          const currentWithdraw = parseFloat(user.withdrawBalance || 0);
          if (currentWithdraw < parsedAmount) {
            throw new Error(
              `Insufficient withdraw balance. Available: ${currentWithdraw}, Required: ${parsedAmount}`,
            );
          }
          user.withdrawBalance = (currentWithdraw - parsedAmount).toFixed(2);
          logger.info(
            `Debited ${parsedAmount} from withdraw balance. New: ${user.withdrawBalance}`,
          );
        }
      } else if (tranType === "credit") {
        // Credit means ADDING to wallet
        if (walletType === "deposit") {
          user.depositBalance = (
            parseFloat(user.depositBalance || 0) + parsedAmount
          ).toFixed(2);
          logger.info(
            `Credited ${parsedAmount} to deposit balance. New: ${user.depositBalance}`,
          );
        } else if (walletType === "withdraw") {
          user.withdrawBalance = (
            parseFloat(user.withdrawBalance || 0) + parsedAmount
          ).toFixed(2);
          logger.info(
            `Credited ${parsedAmount} to withdraw balance. New: ${user.withdrawBalance}`,
          );
        }
      } else {
        throw new Error(
          `Invalid transaction type: ${tranType}. Must be: debit, credit`,
        );
      }

      // Final validation: Ensure no negative balances
      if (
        parseFloat(user.depositBalance || 0) < 0 ||
        parseFloat(user.withdrawBalance || 0) < 0
      ) {
        throw new Error("Balance cannot be negative. Transaction rolled back.");
      }

      await user.save();
    } catch (err) {
      logger.error(`Update balance error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get history statistics (common function)
   * @param {object} req - Express request object
   * @param {string} targetUserId - Target user ID (for admin use) or null (for current user)
   * @returns {Promise<object>} - History statistics
   */
  static async getHistoryStats(req, targetUserId = null) {
    try {
      // Determine user ID
      const userId = targetUserId || req.user.id;

      const { startDate, endDate } = req.query;

      // Build where clause
      const where = { userId };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate)
          where.createdAt[require("sequelize").Op.gte] = new Date(startDate);
        if (endDate)
          where.createdAt[require("sequelize").Op.lte] = new Date(endDate);
      }

      // Get statistics
      const [
        totalRecords,
        totalDeposit,
        totalWithdraw,
        recordsByType,
        recordsByStatus,
        recordsByCategory,
      ] = await Promise.all([
        // Total records count
        History.count({ where }),

        // Total deposit amount
        History.sum("amount", { where: { ...where, type: "deposit" } }),

        // Total withdraw amount
        History.sum("amount", { where: { ...where, type: "withdraw" } }),

        // Records by type
        History.findAll({
          where,
          attributes: [
            "type",
            [
              require("sequelize").fn("COUNT", require("sequelize").col("id")),
              "count",
            ],
            [
              require("sequelize").fn(
                "SUM",
                require("sequelize").col("amount"),
              ),
              "total",
            ],
          ],
          group: ["type"],
          raw: true,
        }),

        // Records by status
        History.findAll({
          where,
          attributes: [
            "status",
            [
              require("sequelize").fn("COUNT", require("sequelize").col("id")),
              "count",
            ],
          ],
          group: ["status"],
          raw: true,
        }),

        // Records by category
        History.findAll({
          where,
          attributes: [
            "category",
            [
              require("sequelize").fn("COUNT", require("sequelize").col("id")),
              "count",
            ],
            [
              require("sequelize").fn(
                "SUM",
                require("sequelize").col("amount"),
              ),
              "total",
            ],
          ],
          group: ["category"],
          raw: true,
        }),
      ]);

      logger.info(`Retrieved history statistics for user ${userId}`);

      return {
        success: true,
        stats: {
          totalRecords: totalRecords || 0,
          totalDeposit: totalDeposit || 0,
          totalWithdraw: totalWithdraw || 0,
          netBalance: (totalDeposit || 0) - (totalWithdraw || 0),
          recordsByType,
          recordsByStatus,
          recordsByCategory,
        },
        filters: { startDate, endDate },
      };
    } catch (err) {
      logger.error(`Get history stats error: ${err.message}`);
      return {
        success: false,
        message: err.message || "Failed to fetch history statistics",
      };
    }
  }
}

module.exports = UserHistoryService;
