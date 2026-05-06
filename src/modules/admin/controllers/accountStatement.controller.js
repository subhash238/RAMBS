const { Op } = require("sequelize");
const History = require("../../../models/history.model");
const User = require("../../../models/user.model");
const logger = require("../../../config/logger");

/**
 * Get account statement with filters and user join
 * Supports: date range, client name search, game name, account type filters
 */
exports.getAccountStatement = async (req, res) => {
  try {
    const {
      accountType,
      gameName,
      clientName,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
    } = req.query;

    // Build where clause for History
    const whereClause = {};

    // Date range filter
    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) {
        whereClause.createdAt[Op.gte] = new Date(fromDate);
      }
      if (toDate) {
        whereClause.createdAt[Op.lte] = new Date(toDate + " 23:59:59");
      }
    }

    // Game Name filter (gameId in history)
    if (gameName && gameName !== "All") {
      whereClause.gameId = gameName;
    }

    // Build user where clause for filters
    const userWhereClause = {};
    
    // Search By Client Name (user.name)
    if (clientName) {
      userWhereClause[Op.or] = [
        { name: { [Op.iLike]: `%${clientName}%` } },
        { email: { [Op.iLike]: `%${clientName}%` } },
      ];
    }
    
    // Account Type filter (user.role: superadmin, admin, manager, user)
    if (accountType && accountType !== "All") {
      userWhereClause.role = accountType;
    }

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch history with user join
    const { count, rows: histories } = await History.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "historyUser",
          where: Object.keys(userWhereClause).length > 0 ? userWhereClause : undefined,
          attributes: ["id", "name", "email", "role"],
          required: true, // INNER JOIN - only histories with valid users
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: offset,
    });

    // Format response data
    const formattedData = histories.map((history) => ({
      id: history.id,
      date: history.createdAt,
      clientName: history.historyUser?.name || "Unknown",
      clientEmail: history.historyUser?.email,
      credit: history.tranType === "credit" ? parseFloat(history.amount) : 0,
      debit: history.tranType === "debit" ? parseFloat(history.amount) : 0,
      closing: parseFloat(history.closingBalance || 0),
      description: history.note || history.type,
      fromTo: history.sendedBy || "system",
      gameId: history.gameId,
      tranType: history.tranType,
      type: history.type,
      status: history.status,
    }));

    // Calculate summary totals
    const summary = formattedData.reduce(
      (acc, curr) => ({
        totalCredit: acc.totalCredit + curr.credit,
        totalDebit: acc.totalDebit + curr.debit,
      }),
      { totalCredit: 0, totalDebit: 0 }
    );

    return res.json({
      success: true,
      message: "Account statement retrieved successfully",
      data: {
        statements: formattedData,
        summary: {
          totalCredit: summary.totalCredit.toFixed(2),
          totalDebit: summary.totalDebit.toFixed(2),
          netBalance: (summary.totalCredit - summary.totalDebit).toFixed(2),
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    logger.error(`Get account statement error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch account statement",
      error: err.message,
    });
  }
};

/**
 * Get unique game IDs for filter dropdown
 */
exports.getGameList = async (req, res) => {
  try {
    const games = await History.findAll({
      attributes: [["gameId", "id"]],
      group: ["gameId"],
      where: {
        gameId: {
          [Op.not]: null,
        },
      },
    });

    return res.json({
      success: true,
      data: games.map((g) => g.id).filter(Boolean),
    });
  } catch (err) {
    logger.error(`Get game list error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch game list",
    });
  }
};
