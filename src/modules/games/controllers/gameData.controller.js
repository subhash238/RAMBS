const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const cacheManager = require("../../../services/cache.service");
const axios = require("axios");

const CACHE_TTL = 5; // 5 seconds

/**
 * Get game data by game ID
 * Check Redis cache first, if cached within 5 seconds return cached data
 * Otherwise fetch from third-party API and return
 */
exports.getGameDataById = async (req, res) => {
  try {
    const { gameId } = req.params;
    const CACHE_KEY = `game:${gameId}`;

    // Try to get from Redis cache
    const cachedData = await cacheManager.get(CACHE_KEY);

    if (cachedData && cachedData.cachedAt) {
      const cachedTime = new Date(cachedData.cachedAt).getTime();
      const currentTime = new Date().getTime();
      const timeDiff = (currentTime - cachedTime) / 1000; // in seconds

      // If cached within 5 seconds, return cached data
      if (timeDiff < CACHE_TTL) {
        logger.info(`Game ${gameId} served from cache (${timeDiff.toFixed(2)}s old)`);
        return success(res, "Game data retrieved from cache", {
          gameId,
          source: "cache",
          cachedAt: cachedData.cachedAt,
          data: cachedData.data,
        });
      }
    }

    // Cache miss or expired, fetch from third-party API
    const API_URL = `http://165.232.181.130:4011/api-v2/match-data/${gameId}`;
    logger.info(`Fetching game ${gameId} from third-party API`);

    const response = await axios.get(API_URL, {
      timeout: 10000, // 10 seconds timeout
    });

    if (response.data) {
      // Prepare data to cache
      const dataToCache = {
        data: response.data,
        cachedAt: new Date().toISOString(),
        source: API_URL,
      };

      // Save to Redis with 5 second TTL
      await cacheManager.set(CACHE_KEY, dataToCache, { ttl: CACHE_TTL });

      logger.success(`Game ${gameId} fetched from API and cached`);
      return success(res, "Game data retrieved from API", {
        gameId,
        source: "api",
        cachedAt: dataToCache.cachedAt,
        data: response.data,
      });
    } else {
      return error(res, "No data received from third-party API", 502);
    }
  } catch (err) {
    logger.error(`Get game data error: ${err.message}`);
    return error(res, "Failed to fetch game data", 500);
  }
};

/**
 * Get match scoreboard by game ID
 * Check Redis cache first, if cached within 5 seconds return cached data
 * Otherwise fetch from third-party API and return
 */
exports.getScoreboardById = async (req, res) => {
  try {
    const { gameId } = req.params;
    const CACHE_KEY = `scoreboard:${gameId}`;

    // Try to get from Redis cache
    const cachedData = await cacheManager.get(CACHE_KEY);

    if (cachedData && cachedData.cachedAt) {
      const cachedTime = new Date(cachedData.cachedAt).getTime();
      const currentTime = new Date().getTime();
      const timeDiff = (currentTime - cachedTime) / 1000; // in seconds

      // If cached within 5 seconds, return cached data
      if (timeDiff < CACHE_TTL) {
        logger.info(`Scoreboard ${gameId} served from cache (${timeDiff.toFixed(2)}s old)`);
        return success(res, "Scoreboard data retrieved from cache", {
          gameId,
          source: "cache",
          cachedAt: cachedData.cachedAt,
          data: cachedData.data,
        });
      }
    }

    // Cache miss or expired, fetch from third-party API
    const API_URL = `http://165.232.181.130:4011/api-v2/match-scoreboard/${gameId}`;
    logger.info(`Fetching scoreboard ${gameId} from third-party API`);

    const response = await axios.get(API_URL, {
      timeout: 10000, // 10 seconds timeout
    });

    if (response.data) {
      // Prepare data to cache
      const dataToCache = {
        data: response.data,
        cachedAt: new Date().toISOString(),
        source: API_URL,
      };

      // Save to Redis with 5 second TTL
      await cacheManager.set(CACHE_KEY, dataToCache, { ttl: CACHE_TTL });

      logger.success(`Scoreboard ${gameId} fetched from API and cached`);
      return success(res, "Scoreboard data retrieved from API", {
        gameId,
        source: "api",
        cachedAt: dataToCache.cachedAt,
        data: response.data,
      });
    } else {
      return error(res, "No data received from third-party API", 502);
    }
  } catch (err) {
    logger.error(`Get scoreboard error: ${err.message}`);
    return error(res, "Failed to fetch scoreboard data", 500);
  }
};
