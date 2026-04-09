const matchListService = require("../../../services/matchList.service");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");

/**
 * Match List Controller
 * Serves cached match data from external API
 */
class MatchListController {
  /**
   * Get cached match list
   * @route GET /api/matches
   */
  async getMatchList(req, res) {
    try {
      const result = await matchListService.getMatchList();

      if (!result.success) {
        return error(res, "Failed to fetch match list", 500);
      }

      return success(res, "Match list retrieved successfully", {
        matches: result.data,
        cachedAt: result.timestamp,
        source: result.source,
      });
    } catch (err) {
      logger.error(`Get match list error: ${err.message}`);
      return error(res, "Failed to fetch match list", 500);
    }
  }

  /**
   * Force refresh match list cache
   * @route POST /api/matches/refresh
   */
  async refreshCache(req, res) {
    try {
      await matchListService.updateCache();

      return success(res, "Match list cache refreshed successfully");
    } catch (err) {
      logger.error(`Refresh match list error: ${err.message}`);
      return error(res, "Failed to refresh match list", 500);
    }
  }

  /**
   * Get scheduler status
   * @route GET /api/matches/status
   */
  async getStatus(req, res) {
    try {
      const status = matchListService.getStatus();

      return success(res, "Match list scheduler status", status);
    } catch (err) {
      logger.error(`Get status error: ${err.message}`);
      return error(res, "Failed to get status", 500);
    }
  }

  /**
   * Start match list scheduler
   * @route POST /api/matches/start
   */
  async startScheduler(req, res) {
    try {
      matchListService.startScheduler();

      return success(res, "Match list scheduler started successfully");
    } catch (err) {
      logger.error(`Start scheduler error: ${err.message}`);
      return error(res, "Failed to start scheduler", 500);
    }
  }

  /**
   * Stop match list scheduler
   * @route POST /api/matches/stop
   */
  async stopScheduler(req, res) {
    try {
      matchListService.stopScheduler();

      return success(res, "Match list scheduler stopped successfully");
    } catch (err) {
      logger.error(`Stop scheduler error: ${err.message}`);
      return error(res, "Failed to stop scheduler", 500);
    }
  }
}

module.exports = new MatchListController();
