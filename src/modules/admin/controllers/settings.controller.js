const { Settings } = require("../../../models");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const { cacheManager } = require("../../../services/cache.service");
const { 
  CACHE_NAMESPACES, 
  CACHE_TTL, 
  CACHE_PATTERNS, 
  CACHE_VERSIONS 
} = require("../../../constants/cache.constants");

// ============================================
// ENTERPRISE SETTINGS CONTROLLERS
// ============================================

/**
 * Get all settings with pagination and search
 */
exports.getAllSettings = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    // Generate enterprise cache key
    const cacheKey = cacheManager.generateKey(
      CACHE_NAMESPACES.SETTINGS,
      `${CACHE_PATTERNS.PAGINATED(page, limit)}:${search || CACHE_PATTERNS.ALL}`,
      CACHE_VERSIONS.CURRENT
    );

    // Use enterprise cache with fallback
    const result = await cacheManager.getOrSet(cacheKey, async () => {
      // Build search filter
      const where = search ? {
        maintenance_value: { [require("sequelize").Op.iLike]: `%${search}%` }
      } : {};

      // Optimized query with pagination
      const { count, rows } = await Settings.findAndCountAll({
        where,
        offset: (page - 1) * limit,
        limit: parseInt(limit),
        attributes: ['id', 'is_maintenance', 'maintenance_value', 'createdAt'],
        order: [["createdAt", "DESC"]]
      });

      return {
        settings: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      };
    }, { ttl: CACHE_TTL.MEDIUM });

    logger.info(`Retrieved settings page ${page}`);
    return success(res, "Settings retrieved successfully", result);
  } catch (err) {
    logger.error(`Get settings error: ${err.message}`);
    return error(res, "Failed to fetch settings", 500);
  }
};

/**
 * Get single setting
 */
exports.getSettingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Generate enterprise cache key
    const cacheKey = cacheManager.generateKey(
      CACHE_NAMESPACES.SETTINGS,
      CACHE_PATTERNS.BY_ID(id),
      CACHE_VERSIONS.CURRENT
    );

    // Use enterprise cache with fallback
    const setting = await cacheManager.getOrSet(cacheKey, async () => {
      return await Settings.findByPk(id, {
        attributes: ['id', 'is_maintenance', 'maintenance_value', 'createdAt']
      });
    }, { ttl: CACHE_TTL.LONG });

    if (!setting) {
      return error(res, "Setting not found", 404);
    }

    return success(res, "Setting retrieved successfully", { setting });
  } catch (err) {
    logger.error(`Get setting error: ${err.message}`);
    return error(res, "Failed to fetch setting", 500);
  }
};

/**
 * Create setting
 */
exports.createSetting = async (req, res) => {
  try {
    const { is_maintenance, maintenance_value } = req.body;

    if (is_maintenance === undefined || is_maintenance === null) {
      return error(res, "is_maintenance is required", 400);
    }

    const setting = await Settings.create({
      is_maintenance,
      maintenance_value: maintenance_value || null,
      created_by: req.user.id,
    });

    // Set activity data for middleware (creation has no old data)
    res.locals.activityData = {
      oldData: null,  // No old data for creation
      newData: {
        is_maintenance: setting.is_maintenance,
        maintenance_value: setting.maintenance_value
      }
    };

    // Simple cache invalidation - let next request get fresh data
    await cacheManager.invalidatePattern(`${CACHE_NAMESPACES.SETTINGS}:*`);
    
    return success(res, "Setting created successfully", { setting }, 201);
  } catch (err) {
    logger.error(`Create setting error: ${err.message}`);
    return error(res, "Failed to create setting", 500);
  }
};

/**
 * Update setting
 */
exports.updateSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_maintenance, maintenance_value } = req.body;

    const setting = await Settings.findByPk(id);
    if (!setting) {
      return error(res, "Setting not found", 404);
    }

    // Store old data for activity logging
    const oldData = {
      is_maintenance: setting.is_maintenance,
      maintenance_value: setting.maintenance_value
    };
    
    // Update fields
    if (is_maintenance !== undefined && is_maintenance !== null) {
      setting.is_maintenance = is_maintenance;
    }
    if (maintenance_value !== undefined) {
      setting.maintenance_value = maintenance_value;
    }
    setting.updated_by = req.user.id;

    await setting.save();

    // Store new data for activity logging
    const newData = {
      is_maintenance: setting.is_maintenance,
      maintenance_value: setting.maintenance_value
    };

    // Set activity data for middleware
    res.locals.activityData = {
      oldData,
      newData
    };

    // Update individual setting cache
    const cacheKey = cacheManager.generateKey(
      CACHE_NAMESPACES.SETTINGS,
      CACHE_PATTERNS.BY_ID(id),
      CACHE_VERSIONS.CURRENT
    );
    await cacheManager.set(cacheKey, setting, { ttl: CACHE_TTL.LONG });

    // Simple cache invalidation - let next request get fresh data
    await cacheManager.invalidatePattern(`${CACHE_NAMESPACES.SETTINGS}:*`);

    return success(res, "Setting updated successfully", { setting });
  } catch (err) {
    logger.error(`Update setting error: ${err.message}`);
    return error(res, "Failed to update setting", 500);
  }
};

/**
 * Delete setting
 */
exports.deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;

    const setting = await Settings.findByPk(id);
    if (!setting) {
      return error(res, "Setting not found", 404);
    }

    // Store old data for activity logging
    const oldData = {
      is_maintenance: setting.is_maintenance,
      maintenance_value: setting.maintenance_value
    };

    await setting.destroy();

    // Set activity data for middleware (deletion)
    res.locals.activityData = {
      oldData,
      newData: null  // No new data for deletion
    };
    
    // Simple cache invalidation - let next request get fresh data
    await cacheManager.invalidatePattern(`${CACHE_NAMESPACES.SETTINGS}:*`);
    
    return success(res, "Setting deleted successfully");
  } catch (err) {
    logger.error(`Delete setting error: ${err.message}`);
    return error(res, "Failed to delete setting", 500);
  }
};
