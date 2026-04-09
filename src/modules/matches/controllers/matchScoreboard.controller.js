const matchScoreboardService = require("../../../services/matchScoreboard.service");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");

/**
 * Match Scoreboard Controller
 * Serves cached scoreboard data from external API by gameId
 */
class MatchScoreboardController {
  /**
   * Get cached match scoreboard by gameId
   * @route GET /api/matches/scoreboard/:gameId
   */
  async getScoreboard(req, res) {
    try {
      const { gameId } = req.params;

      if (!gameId) {
        return error(res, "gameId is required", 400);
      }

      const result = await matchScoreboardService.getScoreboard(gameId);

      if (!result.success) {
        return error(res, "Failed to fetch match scoreboard", 500);
      }

      return success(res, "Match scoreboard retrieved successfully", {
        scoreboard: result.data,
        gameId: result.gameId,
        cachedAt: result.timestamp,
        source: result.source,
      });
    } catch (err) {
      logger.error(`Get scoreboard error: ${err.message}`);
      return error(res, "Failed to fetch match scoreboard", 500);
    }
  }

  /**
   * Get scheduler status
   * @route GET /api/matches/scoreboard/status
   */
  async getStatus(req, res) {
    try {
      const status = matchScoreboardService.getStatus();

      return success(res, "Match scoreboard scheduler status", status);
    } catch (err) {
      logger.error(`Get scoreboard status error: ${err.message}`);
      return error(res, "Failed to get status", 500);
    }
  }

  /**
   * Start scoreboard scheduler
   * @route POST /api/matches/scoreboard/start
   */
  async startScheduler(req, res) {
    try {
      matchScoreboardService.startScheduler();

      return success(res, "Match scoreboard scheduler started successfully");
    } catch (err) {
      logger.error(`Start scoreboard scheduler error: ${err.message}`);
      return error(res, "Failed to start scheduler", 500);
    }
  }

  /**
   * Stop scoreboard scheduler
   * @route POST /api/matches/scoreboard/stop
   */
  async stopScheduler(req, res) {
    try {
      matchScoreboardService.stopScheduler();

      return success(res, "Match scoreboard scheduler stopped successfully");
    } catch (err) {
      logger.error(`Stop scoreboard scheduler error: ${err.message}`);
      return error(res, "Failed to stop scheduler", 500);
    }
  }

  /**
   * Remove gameId from active tracking
   * @route DELETE /api/matches/scoreboard/:gameId
   */
  async removeGameId(req, res) {
    try {
      const { gameId } = req.params;

      if (!gameId) {
        return error(res, "gameId is required", 400);
      }

      matchScoreboardService.removeGameId(gameId);

      return success(res, `GameId ${gameId} removed from active tracking`);
    } catch (err) {
      logger.error(`Remove gameId error: ${err.message}`);
      return error(res, "Failed to remove gameId", 500);
    }
  }
}

module.exports = new MatchScoreboardController();
