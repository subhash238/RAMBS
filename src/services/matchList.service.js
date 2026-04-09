const axios = require("axios");
const cacheManager = require("./cache.service");
const logger = require("../config/logger");

const MATCH_LIST_API = "http://165.232.181.130:4011/api-v2/match-list";
const CACHE_KEY = "external:match-list";
const CACHE_TTL = 10; // 10 seconds TTL (slightly more than update interval)

/**
 * Match List Service
 * Fetches match data from external API and caches it in Redis
 * Updates every 5 seconds via scheduler
 */
class MatchListService {
  constructor() {
    this.updateInterval = null;
    this.isRunning = false;
  }

  /**
   * Fetch match list from external API
   * @returns {Promise<Object>} Match list data
   */
  async fetchMatchList() {
    try {
      const response = await axios.get(MATCH_LIST_API, {
        timeout: 5000, // 5 second timeout
        headers: {
          Accept: "application/json",
        },
      });

      logger.info(`Match list fetched successfully from external API`);
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
        source: MATCH_LIST_API,
      };
    } catch (err) {
      logger.error(`Failed to fetch match list: ${err.message}`);
      return {
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Update cache with fresh match data
   */
  async updateCache() {
    try {
      const result = await this.fetchMatchList();

      if (result.success) {
        await cacheManager.set(CACHE_KEY, result, { ttl: CACHE_TTL });
        logger.info("Match list cache updated successfully");
      } else {
        logger.warn("Failed to update match list cache - API error");
      }
    } catch (err) {
      logger.error(`Cache update error: ${err.message}`);
    }
  }

  /**
   * Get match list from cache or fetch fresh
   * @returns {Promise<Object>} Cached or fresh match data
   */
  async getMatchList() {
    return await cacheManager.getOrSet(
      CACHE_KEY,
      async () => await this.fetchMatchList(),
      { ttl: CACHE_TTL }
    );
  }

  /**
   * Start auto-update scheduler (every 5 seconds)
   */
  startScheduler() {
    if (this.isRunning) {
      logger.warn("Match list scheduler is already running");
      return;
    }

    this.isRunning = true;
    logger.success("Match list scheduler started (updates every 5 seconds)");

    // Initial fetch
    this.updateCache();

    // Set interval for updates
    this.updateInterval = setInterval(() => {
      this.updateCache();
    }, 5000); // 5 seconds
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
    logger.info("Match list scheduler stopped");
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cacheKey: CACHE_KEY,
      updateInterval: "5 seconds",
      apiEndpoint: MATCH_LIST_API,
    };
  }
}

// Export singleton instance
module.exports = new MatchListService();
