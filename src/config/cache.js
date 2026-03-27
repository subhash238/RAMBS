const redisClient = require("./redis");
const logger = require("./logger");

/**
 * Redis Cache Service
 * Common functions for cache operations
 */

class CacheService {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Parsed value or null
   */
  static async get(key) {
    try {
      const value = await redisClient.get(key);
      console.log(value,"value")
      if (!value) return null;

      // Try to parse JSON, return as string if not JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (err) {
      logger.warn(`Cache get error for key ${key}: ${err.message}`);
      return null;
    }
  }

  /**
   * Set value in cache with optional expiry
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} expirySeconds - Expiry in seconds (default: 3600 = 1 hour)
   * @returns {Promise<boolean>} - Success status
   */
  static async set(key, value, expirySeconds = 3600) {
    try {
      const data = typeof value === "string" ? value : JSON.stringify(value);
      
      if (expirySeconds > 0) {
        await redisClient.setEx(key, expirySeconds, data);
      } else {
        await redisClient.set(key, data);
      }

      logger.debug(`Cache set: ${key}`);
      return true;
    } catch (err) {
      logger.warn(`Cache set error for key ${key}: ${err.message}`);
      return false;
    }
  }

  /**
   * Delete cache key
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(key) {
    try {
      await redisClient.del(key);
      logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (err) {
      logger.warn(`Cache delete error for key ${key}: ${err.message}`);
      return false;
    }
  }

  /**
   * Delete multiple cache keys
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteMany(keys) {
    try {
      if (keys.length === 0) return true;
      await redisClient.del(keys);
      logger.debug(`Cache deleted: ${keys.join(", ")}`);
      return true;
    } catch (err) {
      logger.warn(`Cache delete many error: ${err.message}`);
      return false;
    }
  }

  /**
   * Get keys matching a pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   * @returns {Promise<string[]>} - Array of matching keys
   */
  static async getKeys(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      return keys || [];
    } catch (err) {
      logger.warn(`Cache getKeys error for pattern ${pattern}: ${err.message}`);
      return [];
    }
  }

  /**
   * Clear all cache (use with caution)
   * @returns {Promise<boolean>} - Success status
   */
  static async flushAll() {
    try {
      await redisClient.flushAll();
      logger.warn("Redis cache flushed completely");
      return true;
    } catch (err) {
      logger.warn(`Cache flush error: ${err.message}`);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Key exists status
   */
  static async exists(key) {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (err) {
      logger.warn(`Cache exists check error for key ${key}: ${err.message}`);
      return false;
    }
  }
  

}

module.exports = CacheService;
