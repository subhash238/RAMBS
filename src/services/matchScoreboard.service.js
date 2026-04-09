const axios = require("axios");
const cacheManager = require("./cache.service");
const logger = require("../config/logger");

const BASE_API_URL = "http://165.232.181.130:4011/api-v2";
const CACHE_KEY_PREFIX = "external:match-scoreboard";
const CACHE_TTL = 10; // 10 seconds TTL
const UPDATE_INTERVAL = 5000; // 5 seconds

/**
 * Match Scoreboard Service
 * Fetches scoreboard data from external API by gameId and caches it in Redis
 * Auto-updates every 5 seconds for active gameIds
 */
class MatchScoreboardService {
  constructor() {
    this.updateInterval = null;
    this.isRunning = false;
    this.activeGameIds = new Set(); // Track which gameIds to auto-update
  }

  /**
   * Generate cache key for gameId
   */
  getCacheKey(gameId) {
    return `${CACHE_KEY_PREFIX}:${gameId}`;
  }

  /**
   * Fetch match scoreboard from external API
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} Scoreboard data
   */
  async fetchScoreboard(gameId) {
    try {
      const url = `${BASE_API_URL}/match-scoreboard/${gameId}`;
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          Accept: "application/json",
        },
      });

      logger.info(`Match scoreboard fetched for gameId: ${gameId}`);
      return {
        success: true,
        data: response.data,
        gameId,
        timestamp: new Date().toISOString(),
        source: url,
      };
    } catch (err) {
      logger.error(`Failed to fetch scoreboard for gameId ${gameId}: ${err.message}`);
      return {
        success: false,
        error: err.message,
        gameId,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Update cache for specific gameId
   */
  async updateCache(gameId) {
    try {
      const result = await this.fetchScoreboard(gameId);
      const cacheKey = this.getCacheKey(gameId);

      if (result.success) {
        await cacheManager.set(cacheKey, result, { ttl: CACHE_TTL });
        logger.debug(`Scoreboard cache updated for gameId: ${gameId}`);
      } else {
        logger.warn(`Failed to update scoreboard cache for gameId: ${gameId}`);
      }
    } catch (err) {
      logger.error(`Scoreboard cache update error for ${gameId}: ${err.message}`);
    }
  }

  /**
   * Update all active gameIds in cache
   */
  async updateAllActive() {
    if (this.activeGameIds.size === 0) {
      return;
    }

    logger.debug(`Updating scoreboard cache for ${this.activeGameIds.size} active gameIds`);

    const promises = Array.from(this.activeGameIds).map((gameId) =>
      this.updateCache(gameId)
    );

    await Promise.all(promises);
  }

  /**
   * Get scoreboard from cache or fetch fresh
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} Cached or fresh scoreboard data
   */
  async getScoreboard(gameId) {
    const cacheKey = this.getCacheKey(gameId);

    // Add to active gameIds for auto-update
    this.activeGameIds.add(gameId);

    return await cacheManager.getOrSet(
      cacheKey,
      async () => await this.fetchScoreboard(gameId),
      { ttl: CACHE_TTL }
    );
  }

  /**
   * Remove gameId from active tracking
   */
  removeGameId(gameId) {
    this.activeGameIds.delete(gameId);
    logger.info(`Removed gameId ${gameId} from active scoreboard tracking`);
  }

  /**
   * Get list of active gameIds
   */
  getActiveGameIds() {
    return Array.from(this.activeGameIds);
  }

  /**
   * Start auto-update scheduler (every 5 seconds)
   */
  startScheduler() {
    if (this.isRunning) {
      logger.warn("Match scoreboard scheduler is already running");
      return;
    }

    this.isRunning = true;
    logger.success("Match scoreboard scheduler started (updates every 5 seconds)");

    // Set interval for updates
    this.updateInterval = setInterval(() => {
      this.updateAllActive();
    }, UPDATE_INTERVAL);
  }

  /**
   * Stop auto-update scheduler
   */
  stopScheduler() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    this.activeGameIds.clear();
    logger.info("Match scoreboard scheduler stopped");
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeGameIds: this.getActiveGameIds(),
      activeCount: this.activeGameIds.size,
      updateInterval: "5 seconds",
      apiBaseUrl: BASE_API_URL,
    };
  }
}

// Export singleton instance
module.exports = new MatchScoreboardService();
