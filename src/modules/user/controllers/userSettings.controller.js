const { Settings } = require("../../../models");
const { success, error } = require("../../../common/response");
const logger = require("../../../config/logger");
const { cacheManager } = require("../../../services/cache.service");
const { 
  CACHE_NAMESPACES, 
  CACHE_TTL, 
  CACHE_PATTERNS, 
  CACHE_VERSIONS 
} = require("../../../constants/cache.constants");
const { Op } = require("sequelize");

/**
 * Get all settings (read-only for users)
 * @route GET /api/user/settings
 */
exports.getSettings = async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    
    // Generate enterprise cache key for user settings
    const cacheKey = cacheManager.generateKey(
      CACHE_NAMESPACES.SETTINGS,
      `${CACHE_PATTERNS.PAGINATED(page, limit)}:${category || CACHE_PATTERNS.ALL}`,
      CACHE_VERSIONS.CURRENT
    );

    // Use enterprise cache with fallback
    const result = await cacheManager.getOrSet(cacheKey, async () => {
      // Build query conditions
      const whereClause = {};
      if (category) {
        whereClause.category = category;
      }
      
      const offset = (page - 1) * limit;
      
      const { count, rows: settings } = await Settings.findAndCountAll({
        where: whereClause,
        attributes: ['id', 'is_maintenance', 'maintenance_value', 'createdAt'],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        settings,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      };
    }, { ttl: CACHE_TTL.MEDIUM });

    logger.info(`User settings retrieved for user: ${req.user.id}`);
    
    return success(res, "Settings retrieved successfully", result);
  } catch (err) {
    logger.error(`Error fetching user settings: ${err.message}`);
    return error(res, "Failed to fetch settings", 500);
  }
};

/**
 * Get setting by ID (read-only for users)
 * @route GET /api/user/settings/:id
 */
exports.getSettingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Generate enterprise cache key
    const cacheKey = cacheManager.generateKey(
      CACHE_NAMESPACES.USER_SETTINGS,
      CACHE_PATTERNS.BY_ID(id),
      CACHE_VERSIONS.CURRENT
    );

    // Use enterprise cache with fallback
    const setting = await cacheManager.getOrSet(cacheKey, async () => {
      return await Settings.findOne({
        where: { id },
        attributes: ['id', 'is_maintenance', 'maintenance_value', 'createdAt'],
      });
    }, { ttl: CACHE_TTL.LONG });

    if (!setting) {
      return error(res, "Setting not found", 404);
    }

    logger.info(`User setting retrieved for user: ${req.user.id}, setting: ${setting.key}`);
    
    return success(res, "Setting retrieved successfully", { setting });
  } catch (err) {
    logger.error(`Error fetching user setting: ${err.message}`);
    return error(res, "Failed to fetch setting", 500);
  }
};
