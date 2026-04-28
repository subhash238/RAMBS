const matchListService = require("../../../services/matchList.service");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");

/**
 * Get match list from cache or external API
 */
exports.getMatchList = async (req, res) => {
  try {
    const matchList = await matchListService.getMatchList();
    return success(res, "Match list retrieved", matchList);
  } catch (err) {
    logger.error(`Get match list error: ${err.message}`);
    return error(res, "Failed to fetch match list", 500);
  }
};

/**
 * Get match list scheduler status
 */
exports.getMatchListStatus = async (req, res) => {
  try {
    const status = matchListService.getStatus();
    return success(res, "Match list scheduler status", status);
  } catch (err) {
    logger.error(`Get scheduler status error: ${err.message}`);
    return error(res, "Failed to get scheduler status", 500);
  }
};
