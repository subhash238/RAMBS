const axios = require("axios");
const CricketMatch = require("../modules/games/models/cricketMatch.model");
const logger = require("../config/logger");

const API_URL = "http://168.144.21.102:3000/api/admin/match-list";

/**
 * Fetch match list from external API and sync to database
 */
const syncCricketMatches = async () => {
  try {
    logger.info("[CricketSync] Starting match sync...");
    
    const response = await axios.get(API_URL, {
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${process.env.ADMIN_TOKEN}`,
      },
    });
    
    if (!response.data?.success || !response.data?.data?.data) {
      logger.warn("[CricketSync] Invalid API response structure");
      return;
    }
    
    const matches = response.data.data.data.data;
    
    if (!Array.isArray(matches) || matches.length === 0) {
      logger.info("[CricketSync] No matches found in API response");
      return;
    }
    
    // Upsert each match to database
    for (const match of matches) {
      const { gameId, marketId, eventName } = match;
      
      if (!gameId || !marketId || !eventName) {
        logger.warn(`[CricketSync] Skipping match - missing required fields: ${JSON.stringify({ gameId, marketId, eventName })}`);
        continue;
      }
      
      try {
        await CricketMatch.upsert({
          gameId: String(gameId),
          marketId: String(marketId),
          eventName: typeof eventName === 'object' ? eventName : { name: eventName },
        });
        logger.info(`[CricketSync] Upserted match: ${gameId} - ${eventName}`);
      } catch (err) {
        logger.error(`[CricketSync] Failed to upsert match ${gameId}: ${err.message}`);
      }
    }
    
    logger.info(`[CricketSync] Sync completed - ${matches.length} matches processed`);
  } catch (err) {
    logger.error(`[CricketSync] Sync error: ${err.message}`);
  }
};

/**
 * Start the sync scheduler (every 30 seconds)
 */
let syncInterval = null;

const startSyncScheduler = () => {
  logger.info("[CricketSync] Starting scheduler (30s interval)...");
  
  // Run immediately on start
  syncCricketMatches();
  
  // Schedule every 30 seconds
  syncInterval = setInterval(syncCricketMatches, 30000);
  
  return syncInterval;
};

/**
 * Stop the sync scheduler
 */
const stopSyncScheduler = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    logger.info("[CricketSync] Scheduler stopped");
  }
};

module.exports = {
  syncCricketMatches,
  startSyncScheduler,
  stopSyncScheduler,
};
