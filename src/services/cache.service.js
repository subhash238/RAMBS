const CacheService = require("../config/cache");
const logger = require("../config/logger");

/**
 * Enterprise Cache Manager
 * Centralized caching with enterprise-level features:
 * - Versioned keys
 * - TTL strategies
 * - Cache invalidation patterns
 * - Performance monitoring
 * - Error handling & fallbacks
 */

class CacheManager {
  constructor() {
    this.cacheHitCount = 0;
    this.cacheMissCount = 0;
    this.cacheErrorCount = 0;
  }

  /**
   * Generate versioned cache key
   * @param {string} namespace - Cache namespace
   * @param {string} identifier - Cache identifier
   * @param {string} version - Cache version
   * @returns {string} - Versioned cache key
   */
  generateKey(namespace, identifier, version = "v1") {
    return `${namespace}:${identifier}:${version}`;
  }

  /**
   * Get cached data with fallback
   * @param {string} key - Cache key
   * @param {Function} fallback - Fallback function to call on cache miss
   * @param {Object} options - Cache options
   * @returns {Promise<any>} - Cached or fresh data
   */
  async getOrSet(key, fallback, options = {}) {
    try {
      const cached = await CacheService.get(key);
      console.log(`GetOrSet: Key ${key}, cached:`, cached);

      if (cached !== null) {
        this.cacheHitCount++;
        logger.debug(`Cache HIT: ${key}`);
        console.log(`GetOrSet: CACHE HIT for ${key}`);
        return cached;  // CacheService.get() already returns parsed object
      }

      this.cacheMissCount++;
      logger.debug(`Cache MISS: ${key}`);
      console.log(`GetOrSet: CACHE MISS for ${key} - executing fallback`);
      
      const data = await fallback();
      console.log(`GetOrSet: Fallback data for ${key}:`, data);
      await this.set(key, data, options);
      
      return data;
    } catch (err) {
      console.log(err, "error")
      this.cacheErrorCount++;
      logger.error(`Cache error for key ${key}: ${err.message}`);
      
      // Fallback to direct execution
      return await fallback();
    }
  }

  /**
   * Set cache with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {Object} options - Cache options
   */
  async set(key, data, options = {}) {
    try {
      const ttl = options.ttl || 3600; // Default 1 hour
      
      // CacheService.set() already handles JSON stringification
      await CacheService.set(key, data, ttl);
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (err) {
      this.cacheErrorCount++;
      logger.error(`Cache set error for key ${key}: ${err.message}`);
    }
  }

  /**
   * Get cached data by key
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached data or null
   */
  async get(key) {
    try {
      const cached = await CacheService.get(key);
      if (cached !== null) {
        logger.debug(`Cache GET: ${key} (HIT)`);
        return cached;
      }
      logger.debug(`Cache GET: ${key} (MISS)`);
      return null;
    } catch (err) {
      this.cacheErrorCount++;
      logger.error(`Cache get error for key ${key}: ${err.message}`);
      return null;
    }
  }

  /**
   * Delete cache key
   * @param {string|string[]} keys - Single key or array of keys
   */
  async delete(keys) {
    try {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      
      if (keysArray.length === 1) {
        await CacheService.delete(keysArray[0]);
        logger.debug(`Cache DELETE: ${keysArray[0]}`);
      } else {
        await CacheService.deleteMany(keysArray);
        logger.debug(`Cache DELETE_MANY: ${keysArray.join(", ")}`);
      }
    } catch (err) {
      this.cacheErrorCount++;
      logger.error(`Cache delete error: ${err.message}`);
    }
  }

  /**
   * Smart update cache with transformation function
   * @param {string} pattern - Cache pattern to update
   * @param {Function} transformFn - Function to transform cached data
   */
  async smartUpdate(pattern, transformFn) {
    try {
      // Get all keys matching the pattern
      const keys = await CacheService.getKeys(pattern);
      console.log(`SmartUpdate: Pattern "${pattern}"`);
      console.log(`SmartUpdate: Found ${keys.length} keys for pattern ${pattern}:`, keys);
      
      let updatedCount = 0;
      
      for (const key of keys) {
        try {
          // Get current cached data (already parsed by CacheService.get)
          const cached = await CacheService.get(key);
          console.log(`SmartUpdate: Key ${key} cached data:`, cached);
          
          if (cached !== null) {
            // Transform the data (no need to parse, already object)
            const updatedData = transformFn(cached);
            console.log(`SmartUpdate: Transformed data for key ${key}:`, updatedData);
            
            // Update the cache with transformed data
            await CacheService.set(key, updatedData);
            updatedCount++;
            console.log(`SmartUpdate: Successfully updated key ${key}`);
          } else {
            console.log(`SmartUpdate: Key ${key} has no cached data`);
          }
        } catch (err) {
          console.log(`SmartUpdate: Failed to update cache key ${key}:`, err);
          logger.warn(`Failed to update cache key ${key}: ${err.message}`);
        }
      }
      
      logger.info(`Cache SMART_UPDATE: ${pattern} (${updatedCount} keys updated)`);
      console.log(`SmartUpdate: Completed ${updatedCount} updates for pattern ${pattern}`);
      return updatedCount;
    } catch (err) {
      this.cacheErrorCount++;
      logger.error(`Cache smart update error: ${err.message}`);
      console.log(`SmartUpdate: Error:`, err);
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Cache pattern to invalidate
   */
  async invalidatePattern(pattern) {
    try {
      // Get all keys matching the pattern
      const keys = await CacheService.getKeys(pattern);
      
      if (keys && keys.length > 0) {
        // Delete all matching keys
        await CacheService.deleteMany(keys);
        logger.info(`Cache INVALIDATE_PATTERN: ${pattern} (${keys.length} keys deleted)`);
      } else {
        logger.debug(`Cache INVALIDATE_PATTERN: ${pattern} (no keys found)`);
      }
    } catch (err) {
      this.cacheErrorCount++;
      logger.error(`Cache pattern invalidation error: ${err.message}`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache performance stats
   */
  getStats() {
    const total = this.cacheHitCount + this.cacheMissCount;
    const hitRate = total > 0 ? (this.cacheHitCount / total * 100).toFixed(2) : 0;
    
    return {
      hits: this.cacheHitCount,
      misses: this.cacheMissCount,
      errors: this.cacheErrorCount,
      hitRate: `${hitRate}%`,
      total
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.cacheHitCount = 0;
    this.cacheMissCount = 0;
    this.cacheErrorCount = 0;
    logger.info("Cache statistics reset");
  }
}

// Singleton instance
const cacheManager = new CacheManager();

module.exports = {
  cacheManager,
  
  // Convenience methods
  getOrSet: (key, fallback, options) => cacheManager.getOrSet(key, fallback, options),
  set: (key, data, options) => cacheManager.set(key, data, options),
  delete: (keys) => cacheManager.delete(keys),
  smartUpdate: (pattern, transformFn) => cacheManager.smartUpdate(pattern, transformFn),
  invalidatePattern: (pattern) => cacheManager.invalidatePattern(pattern),
  generateKey: (namespace, identifier, version) => cacheManager.generateKey(namespace, identifier, version),
  getStats: () => cacheManager.getStats(),
  resetStats: () => cacheManager.resetStats()
};
