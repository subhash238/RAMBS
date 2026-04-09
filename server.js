require("dotenv").config();
const app = require("./src/app");
const logger = require("./src/config/logger");
const { sequelize } = require("./src/models");
const smartSync = require("./src/utils/databaseSync.util");
const matchListService = require("./src/services/matchList.service");
const matchScoreboardService = require("./src/services/matchScoreboard.service");
const matchDataService = require("./src/services/matchData.service");

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Test database connection first
    await sequelize.authenticate();
    logger.success("Database connection established");
    
    // Smart automatic database synchronization
    await smartSync();
    
    // Start listening
    app.listen(PORT,'0.0.0.0', () => {
      logger.success(`🚀 Server started successfully on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`💰 User model fields (depositBalance, withdrawBalance) have been added to database`);
      logger.info(`⚡ Redis caching enabled for user and admin settings`);
      logger.info(`🔧 Activity logging restricted to admin-level users (superadmin, admin, manager)`);
      
      // Start match list scheduler (updates every 5 seconds)
      matchListService.startScheduler();
      
      // Start match scoreboard scheduler (updates every 5 seconds)
      matchScoreboardService.startScheduler();
      
      // Start match data scheduler (updates every 5 seconds)
      matchDataService.startScheduler();
    });
  } catch (err) {
    logger.error(`💥 Failed to start server: ${err.message}`);
    if (err.original) {
      logger.error(`🔍 Original SQL error: ${err.original.message}`);
    }
    process.exit(1);
  }
};

startServer();
