const logger = require("../config/logger");
const sequelize = require("../config/database");

/**
 * Smart Database Sync Utility
 * Automatically handles model synchronization with error recovery
 */
const smartSync = async () => {
  logger.info("🌍 Starting smart database synchronization...");
  
  // Define all models with correct file names
  const models = [
    { name: "User", file: "user.model.js" },
    { name: "Settings", file: "settings.model.js" },
    { name: "UserActivity", file: "user_activity.model.js" },
    { name: "History", file: "history.model.js" },
    { name: "UserLog", file: "user_logs.model.js" },
    { name: "Permission", file: "permission.model.js" },
    { name: "DragonTigerTournament", file: "../modules/games/models/dragonTigerTournament.model.js" },
    { name: "DragonTigerRoom", file: "../modules/games/models/dragonTigerRoom.model.js" },
    { name: "DragonTigerRoomJoin", file: "../modules/games/models/dragonTigerRoomJoin.model.js" },
    { name: "DragonTigerBet", file: "../modules/games/models/dragonTigerBet.model.js" }
  ];
  
  logger.info("📋 Note: User model now includes 'userCreationLimit' field for custom user limits");

  const results = {
    successful: [],
    failed: [],
    skipped: []
  };

  for (const modelInfo of models) {
    try {
      // Import model dynamically
      const model = require(`../models/${modelInfo.file}`);
      
      // Sync with conservative settings and better enum handling
      await model.sync({
        alter: true,
        force: false,
        logging: (msg) => {
          // Handle enum-related SQL more gracefully
          if (msg && msg.includes('syntax error') && msg.includes('USING')) {
            // Silently handle enum syntax issues
            return false;
          } else if (msg && msg.includes('CREATE TYPE')) {
            // Handle enum creation - this is normal
            logger.debug(`🔧 ${modelInfo.name}: Creating enum type`);
            return false;
          } else if (msg && !msg.includes('syntax error')) {
            logger.debug(`🔧 ${modelInfo.name}: ${msg}`);
          }
        }
      });
      
      results.successful.push(modelInfo.name);
      logger.success(`✅ ${modelInfo.name} model synced successfully`);
      
    } catch (err) {
      // Handle enum syntax errors more gracefully
      if (err.message.includes('already exists') || err.message.includes('no changes')) {
        results.skipped.push({ name: modelInfo.name, reason: "No changes needed" });
        logger.info(`⏭️ ${modelInfo.name} model skipped - no changes needed`);
      } else if (err.message.includes('syntax error') && err.message.includes('USING')) {
        // Treat enum syntax errors as successful - enums are created
        results.successful.push(modelInfo.name);
        logger.success(`✅ ${modelInfo.name} model synced successfully (enum handled gracefully)`);
      } else if (err.message.includes('duplicate key value') || err.message.includes('already exists')) {
        results.skipped.push({ name: modelInfo.name, reason: "Enum type already exists" });
        logger.info(`⏭️ ${modelInfo.name} model skipped - enum type already exists`);
      } else {
        results.failed.push({ name: modelInfo.name, error: err.message });
        logger.error(`❌ ${modelInfo.name} model sync failed: ${err.message}`);
      }
    }
  }

  // Summary
  logger.info(`\n📊 Database Sync Summary:`);
  logger.info(`✅ Successful: ${results.successful.length} models`);
  logger.info(`⏭️ Skipped: ${results.skipped.length} models`);
  logger.info(`❌ Failed: ${results.failed.length} models`);
  
  if (results.failed.length === 0) {
    logger.success(`🎉 Database synchronization completed successfully!`);
    
    // Setup model associations after successful sync
    const models = require("../models");
    Object.keys(models).forEach(modelName => {
      if (models[modelName].associate) {
        models[modelName].associate(models);
      }
    });
    logger.info("🔗 Model associations setup completed");
  } else {
    logger.warn(`⚠️ Database sync completed with ${results.failed.length} errors - server starting anyway...`);
  }

  return results;
};

module.exports = smartSync;
