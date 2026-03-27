require("dotenv").config();
const app = require("./src/app");
const logger = require("./src/config/logger");
const { sequelize } = require("./src/models");
const smartSync = require("./src/utils/databaseSync.util");

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
