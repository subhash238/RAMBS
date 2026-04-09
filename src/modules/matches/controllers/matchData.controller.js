const matchDataService = require("../../../services/matchData.service");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");

/**
 * Match Data Controller
 * Serves cached match data from external API by gameId
 */
class MatchDataController {
  /**
   * Get cached match data by gameId
   * @route GET /api/matches/data/:gameId
   */
  async getMatchData(req, res) {
    try {
      const { gameId } = req.params;

      if (!gameId) {
        return error(res, "gameId is required", 400);
      }

      const result = await matchDataService.getMatchData(gameId);

      if (!result.success) {
        return error(res, "Failed to fetch match data", 500);
      }

      return success(res, "Match data retrieved successfully", {
        matchData: result.data,
        gameId: result.gameId,
        cachedAt: result.timestamp,
        source: result.source,
      });
    } catch (err) {
      logger.error(`Get match data error: ${err.message}`);
      return error(res, "Failed to fetch match data", 500);
    }
  }

  /**
   * Get scheduler status
   * @route GET /api/matches/data-status
   */
  async getStatus(req, res) {
    try {
      const status = matchDataService.getStatus();

      return success(res, "Match data scheduler status", status);
    } catch (err) {
      logger.error(`Get match data status error: ${err.message}`);
      return error(res, "Failed to get status", 500);
    }
  }

  /**
   * Start match data scheduler
   * @route POST /api/matches/data-start
   */
  async startScheduler(req, res) {
    try {
      matchDataService.startScheduler();

      return success(res, "Match data scheduler started successfully");
    } catch (err) {
      logger.error(`Start match data scheduler error: ${err.message}`);
      return error(res, "Failed to start scheduler", 500);
    }
  }

  /**
   * Stop match data scheduler
   * @route POST /api/matches/data-stop
   */
  async stopScheduler(req, res) {
    try {
      matchDataService.stopScheduler();

      return success(res, "Match data scheduler stopped successfully");
    } catch (err) {
      logger.error(`Stop match data scheduler error: ${err.message}`);
      return error(res, "Failed to stop scheduler", 500);
    }
  }

  /**
   * Remove gameId from active tracking
   * @route DELETE /api/matches/data/:gameId
   */
  async removeGameId(req, res) {
    try {
      const { gameId } = req.params;

      if (!gameId) {
        return error(res, "gameId is required", 400);
      }

      matchDataService.removeGameId(gameId);

      return success(res, `GameId ${gameId} removed from active tracking`);
    } catch (err) {
      logger.error(`Remove gameId error: ${err.message}`);
      return error(res, "Failed to remove gameId", 500);
    }
  }
}

module.exports = new MatchDataController();
