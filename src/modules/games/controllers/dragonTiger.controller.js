const DragonTigerTournament = require("../models/dragonTigerTournament.model");
const DragonTigerRoom = require("../models/dragonTigerRoom.model");
const DragonTigerRoomJoin = require("../models/dragonTigerRoomJoin.model");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const dtRedis = require("../services/dragonTigerRedis.service");

// Main exports
exports.getTournament = async (req, res) => {
  try {
    const tournament = await DragonTigerTournament.findOne({
      where: { isActive: true },
    });

    if (!tournament) {
      return error(res, "No active tournament found", 404);
    }

    // Get active rooms from Redis
    const activeRooms = await dtRedis.getActiveRooms();

    return success(res, "Tournament retrieved", {
      tournament,
      activeRooms,
    });
  } catch (err) {
    logger.error(`Error fetching tournament: ${err.message}`);
    return error(res, "Failed to fetch tournament", 500);
  }
};

exports.getRoomData = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await DragonTigerRoom.findOne({
      where: { roomId },
    });

    if (!room) {
      return error(res, "Room not found", 404);
    }

    const users = await DragonTigerRoomJoin.findAll({
      where: { roomId, isDelete: false },
    });

    // Get live room data from Redis
    const liveRoomData = await dtRedis.getRoomDetails(roomId);
    const liveUsers = await dtRedis.getAllRoomUsersData(roomId);

    return success(res, "Room data retrieved", {
      room,
      users,
      liveRoom: liveRoomData,
      liveUsers,
    });
  } catch (err) {
    logger.error(`Error fetching room: ${err.message}`);
    return error(res, "Failed to fetch room", 500);
  }
};

exports.getLiveRoomData = async (req, res) => {
  try {
    const { roomId } = req.params;

    const roomData = await dtRedis.getRoomDetails(roomId);
    if (!roomData) {
      return error(res, "Room not active", 404);
    }

    const users = await dtRedis.getAllRoomUsersData(roomId);

    return success(res, "Live room data retrieved", {
      room: roomData,
      users,
    });
  } catch (err) {
    logger.error(`Error fetching live room: ${err.message}`);
    return error(res, "Failed to fetch live room data", 500);
  }
};
