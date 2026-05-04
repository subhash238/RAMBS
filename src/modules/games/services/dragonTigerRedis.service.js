const redisClient = require("../../../config/redis");
const logger = require("../../../config/logger");

// Redis key prefixes
const PREFIX = {
  ROOMS: "dragon_tiger:rooms",
  ROOM_DETAILS: "dragon_tiger:room_details",
  ROOM_USERS: "dragon_tiger:room_users",
  ROOM_USER_DATA: "dragon_tiger:room_user",
  BETS: "dragon_tiger:bets",
  TIMER: "dragon_tiger:timer",
};

// In-memory fallback when Redis is not available
const memoryStore = {
  rooms: new Map(),
  users: new Map(),
  bets: new Map(),
};

// Check if Redis is connected
const isRedisAvailable = () => {
  return redisClient.isReady !== false && redisClient.isOpen === true;
};

/**
 * Get all active room IDs
 */
const getActiveRooms = async () => {
  try {
    if (!isRedisAvailable()) {
      return Array.from(memoryStore.rooms.keys());
    }
    const rooms = await redisClient.lRange(PREFIX.ROOMS, 0, -1);
    return rooms || [];
  } catch (err) {
    logger.warn(`Redis getActiveRooms failed: ${err.message}`);
    return Array.from(memoryStore.rooms.keys());
  }
};

/**
 * Add room to active list
 */
const addActiveRoom = async (roomId) => {
  try {
    if (!isRedisAvailable()) return;
    const exists = await redisClient.lPos(PREFIX.ROOMS, roomId);
    if (exists === null) {
      await redisClient.rPush(PREFIX.ROOMS, roomId);
    }
  } catch (err) {
    logger.warn(`Redis addActiveRoom failed: ${err.message}`);
  }
};

/**
 * Remove room from active list
 */
const removeActiveRoom = async (roomId) => {
  try {
    if (!isRedisAvailable()) return;
    await redisClient.lRem(PREFIX.ROOMS, 0, roomId);
  } catch (err) {
    logger.warn(`Redis removeActiveRoom failed: ${err.message}`);
  }
};

/**
 * Get room details
 */
const getRoomDetails = async (roomId) => {
  try {
    if (!isRedisAvailable()) {
      return memoryStore.rooms.get(roomId) || null;
    }
    const key = `${PREFIX.ROOM_DETAILS}:${roomId}`;
    const data = await redisClient.hGetAll(key);
    if (!data || Object.keys(data).length === 0) return null;

    return {
      roomId: data.roomId,
      status: data.status || "start",
      roundId: parseInt(data.roundId) || 1,
      botData: JSON.parse(data.botData || "[]"),
      roundHistory: JSON.parse(data.roundHistory || "[]"),
      startRoundTimer: data.startRoundTimer === "true",
      continueTimer: data.continueTimer === "true",
      card1: JSON.parse(data.card1 || "{}"),
      card2: JSON.parse(data.card2 || "{}"),
      botComplexity: parseInt(data.botComplexity) || 1,
      timer: parseInt(data.timer) || 10,
      user_id: data.user_id || null,
      is_delete: data.is_delete === "true",
      updatedAt: data.updatedAt,
    };
  } catch (err) {
    logger.warn(`Redis getRoomDetails failed: ${err.message}`);
    return memoryStore.rooms.get(roomId) || null;
  }
};

/**
 * Set room details
 */
const setRoomDetails = async (roomId, details) => {
  try {
    // Always store in memory as backup
    memoryStore.rooms.set(roomId, details);

    if (!isRedisAvailable()) {
      logger.debug(`Redis unavailable, storing room ${roomId} in memory only`);
      return;
    }

    const key = `${PREFIX.ROOM_DETAILS}:${roomId}`;
    const data = {
      roomId: details.roomId,
      status: details.status || "start",
      roundId: String(details.roundId || 1),
      botData: JSON.stringify(details.botData || []),
      roundHistory: JSON.stringify(details.roundHistory || []),
      startRoundTimer: String(details.startRoundTimer || false),
      continueTimer: String(details.continueTimer || false),
      card1: JSON.stringify(details.card1 || {}),
      card2: JSON.stringify(details.card2 || {}),
      botComplexity: String(details.botComplexity || 1),
      timer: String(details.timer || 10),
      user_id: details.user_id || "",
      is_delete: String(details.is_delete || false),
      updatedAt: new Date().toISOString(),
    };

    await redisClient.hSet(key, data);
    await addActiveRoom(roomId);
  } catch (err) {
    logger.warn(`Redis setRoomDetails failed: ${err.message}`);
    // Data already stored in memory
  }
};

/**
 * Update room status
 */
const updateRoomStatus = async (roomId, status) => {
  try {
    // Update memory store first
    const room = memoryStore.rooms.get(roomId);
    if (room) {
      room.status = status;
      room.updatedAt = new Date().toISOString();
    }

    if (!isRedisAvailable()) return;
    const key = `${PREFIX.ROOM_DETAILS}:${roomId}`;
    await redisClient.hSet(key, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn(`Redis updateRoomStatus failed: ${err.message}`);
  }
};

/**
 * Update room round
 */
const updateRoomRound = async (roomId, roundId) => {
  const key = `${PREFIX.ROOM_DETAILS}:${roomId}`;
  await redisClient.hSet(key, {
    roundId: String(roundId),
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Update room cards
 */
const updateRoomCards = async (roomId, card1, card2) => {
  try {
    // Update memory store first
    const room = memoryStore.rooms.get(roomId);
    if (room) {
      room.card1 = card1;
      room.card2 = card2;
      room.updatedAt = new Date().toISOString();
    }

    if (!isRedisAvailable()) return;
    const key = `${PREFIX.ROOM_DETAILS}:${roomId}`;
    await redisClient.hSet(key, {
      card1: JSON.stringify(card1),
      card2: JSON.stringify(card2),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn(`Redis updateRoomCards failed: ${err.message}`);
  }
};

/**
 * Add round history
 */
const addRoundHistory = async (roomId, roundId, win) => {
  const key = `${PREFIX.ROOM_DETAILS}:${roomId}`;
  const room = await getRoomDetails(roomId);
  if (!room) return;

  const history = room.roundHistory || [];
  history.push({ roundId, win, timestamp: new Date().toISOString() });

  // Keep only last 100 rounds
  if (history.length > 100) {
    history.shift();
  }

  await redisClient.hSet(key, {
    roundHistory: JSON.stringify(history),
  });
};

/**
 * Get room users list
 */
const getRoomUsers = async (roomId) => {
  try {
    if (!isRedisAvailable()) {
      // Return users from memory store
      const users = [];
      for (const [key, userData] of memoryStore.users.entries()) {
        if (key.startsWith(`${roomId}:`)) {
          users.push(userData.playerId);
        }
      }
      return users;
    }
    const key = `${PREFIX.ROOM_USERS}:${roomId}`;
    return await redisClient.lRange(key, 0, -1) || [];
  } catch (err) {
    logger.warn(`Redis getRoomUsers failed: ${err.message}`);
    return [];
  }
};

/**
 * Add user to room
 */
const addRoomUser = async (roomId, userId, userData) => {
  try {
    // Always store in memory
    const memoryKey = `${roomId}:${userId}`;
    const memoryData = {
      roomId,
      playerId: userId,
      playerData: userData.playerData || {},
      dragonTotalAmount: 0,
      tigerTotalAmount: 0,
      tieTotalAmount: 0,
      isDelete: false,
      isPending: true,
      joinDate: new Date().toISOString(),
      playerStatus: 0,
      isDisconnect: false,
      isPingTimeOut: false,
      activeRoundId: userData.activeRoundId || 0,
    };
    memoryStore.users.set(memoryKey, memoryData);

    if (!isRedisAvailable()) {
      logger.debug(`Redis unavailable, storing user ${userId} in memory only`);
      return;
    }

    const usersKey = `${PREFIX.ROOM_USERS}:${roomId}`;
    const userKey = `${PREFIX.ROOM_USER_DATA}:${roomId}:${userId}`;

    // Add to users list if not exists
    const exists = await redisClient.lPos(usersKey, userId);
    if (exists === null) {
      await redisClient.rPush(usersKey, userId);
    }

    // Set user data
    const data = {
      roomId,
      playerId: userId,
      playerData: JSON.stringify(userData.playerData || {}),
      dragonTotalAmount: "0",
      tigerTotalAmount: "0",
      tieTotalAmount: "0",
      isDelete: "false",
      isPending: "true",
      joinDate: new Date().toISOString(),
      playerStatus: "0",
      isDisconnect: "false",
      isPingTimeOut: "false",
      activeRoundId: String(userData.activeRoundId || 0),
    };

    await redisClient.hSet(userKey, data);
  } catch (err) {
    logger.warn(`Redis addRoomUser failed: ${err.message}`);
    // User already stored in memory
  }
};

/**
 * Get room user data
 */
const getRoomUserData = async (roomId, userId) => {
  try {
    if (!isRedisAvailable()) {
      const userKey = `${roomId}:${userId}`;
      return memoryStore.users.get(userKey) || null;
    }

    const key = `${PREFIX.ROOM_USER_DATA}:${roomId}:${userId}`;
    const data = await redisClient.hGetAll(key);
    if (!data || Object.keys(data).length === 0) return null;

    return {
      roomId: data.roomId,
      playerId: data.playerId,
      playerData: JSON.parse(data.playerData || "{}"),
      dragonTotalAmount: parseFloat(data.dragonTotalAmount) || 0,
      tigerTotalAmount: parseFloat(data.tigerTotalAmount) || 0,
      tieTotalAmount: parseFloat(data.tieTotalAmount) || 0,
      isDelete: data.isDelete === "true",
      isPending: data.isPending === "true",
      joinDate: data.joinDate,
      playerStatus: parseInt(data.playerStatus) || 0,
      isDisconnect: data.isDisconnect === "true",
      isPingTimeOut: data.isPingTimeOut === "true",
      activeRoundId: parseInt(data.activeRoundId) || 0,
    };
  } catch (err) {
    logger.warn(`Redis getRoomUserData failed: ${err.message}`);
    const userKey = `${roomId}:${userId}`;
    return memoryStore.users.get(userKey) || null;
  }
};

/**
 * Update user bet
 */
const updateUserBet = async (roomId, userId, betType, amount) => {
  const key = `${PREFIX.ROOM_USER_DATA}:${roomId}:${userId}`;
  const user = await getRoomUserData(roomId, userId);
  if (!user) return;

  let field;
  if (betType === 0) field = "dragonTotalAmount";
  else if (betType === 1) field = "tigerTotalAmount";
  else if (betType === 2) field = "tieTotalAmount";
  else return;

  const currentAmount = user[field] || 0;
  await redisClient.hSet(key, {
    [field]: String(currentAmount + amount),
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Get all room users data
 */
const getAllRoomUsersData = async (roomId) => {
  try {
    const userIds = await getRoomUsers(roomId);
    const users = [];

    for (const userId of userIds) {
      const data = await getRoomUserData(roomId, userId);
      if (data && !data.isDelete) {
        users.push(data);
      }
    }

    return users;
  } catch (err) {
    logger.warn(`Redis getAllRoomUsersData failed: ${err.message}`);
    // Return users from memory store for this room
    const users = [];
    for (const [key, userData] of memoryStore.users.entries()) {
      if (key.startsWith(`${roomId}:`) && !userData.isDelete) {
        users.push(userData);
      }
    }
    return users;
  }
};

/**
 * Mark user as deleted
 */
const markUserDeleted = async (roomId, userId) => {
  const key = `${PREFIX.ROOM_USER_DATA}:${roomId}:${userId}`;
  await redisClient.hSet(key, {
    isDelete: "true",
    deletedAt: new Date().toISOString(),
  });
};

/**
 * Reset user bets for new round
 */
const resetUserBets = async (roomId) => {
  const userIds = await getRoomUsers(roomId);

  for (const userId of userIds) {
    const key = `${PREFIX.ROOM_USER_DATA}:${roomId}:${userId}`;
    await redisClient.hSet(key, {
      dragonTotalAmount: "0",
      tigerTotalAmount: "0",
      tieTotalAmount: "0",
    });
  }
};

/**
 * Store bet
 */
const storeBet = async (roomId, roundId, userId, betData) => {
  try {
    // Store in memory as backup
    const betKey = `${roomId}:${roundId}:${userId}`;
    memoryStore.bets.set(betKey, {
      ...betData,
      timestamp: new Date().toISOString(),
    });

    if (!isRedisAvailable()) return;
    const key = `${PREFIX.BETS}:${roomId}:${roundId}`;
    const betId = `${userId}_${Date.now()}`;
    await redisClient.hSet(key, {
      [betId]: JSON.stringify({
        ...betData,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    logger.warn(`Redis storeBet failed: ${err.message}`);
  }
};

/**
 * Get round bets
 */
const getRoundBets = async (roomId, roundId) => {
  const key = `${PREFIX.BETS}:${roomId}:${roundId}`;
  const data = await redisClient.hGetAll(key);

  const bets = [];
  for (const [betId, betData] of Object.entries(data)) {
    bets.push(JSON.parse(betData));
  }
  return bets;
};

/**
 * Clear room data
 */
const clearRoomData = async (roomId) => {
  // Get all keys related to this room
  const keys = await redisClient.keys(`${PREFIX.ROOM_DETAILS}:${roomId}*`);
  const userKeys = await redisClient.keys(`${PREFIX.ROOM_USER_DATA}:${roomId}*`);
  const betKeys = await redisClient.keys(`${PREFIX.BETS}:${roomId}*`);

  const allKeys = [...keys, ...userKeys, ...betKeys];

  if (allKeys.length > 0) {
    await redisClient.del(allKeys);
  }

  await redisClient.del(`${PREFIX.ROOM_USERS}:${roomId}`);
  await removeActiveRoom(roomId);

  logger.info(`Cleared room data for ${roomId}`);
};

/**
 * Get room user count
 */
const getRoomUserCount = async (roomId) => {
  try {
    const userIds = await getRoomUsers(roomId);
    let activeCount = 0;

    for (const userId of userIds) {
      const data = await getRoomUserData(roomId, userId);
      if (data && !data.isDelete && !data.isDisconnect) {
        activeCount++;
      }
    }

    return activeCount;
  } catch (err) {
    logger.warn(`Redis getRoomUserCount failed: ${err.message}`);
    // Count from memory
    let count = 0;
    for (const [key, userData] of memoryStore.users.entries()) {
      if (key.startsWith(`${roomId}:`) && !userData.isDelete && !userData.isDisconnect) {
        count++;
      }
    }
    return count;
  }
};

module.exports = {
  // Room management
  getActiveRooms,
  addActiveRoom,
  removeActiveRoom,
  getRoomDetails,
  setRoomDetails,
  updateRoomStatus,
  updateRoomRound,
  updateRoomCards,
  addRoundHistory,
  clearRoomData,
  getRoomUserCount,

  // User management
  getRoomUsers,
  addRoomUser,
  getRoomUserData,
  getAllRoomUsersData,
  updateUserBet,
  markUserDeleted,
  resetUserBets,

  // Betting
  storeBet,
  getRoundBets,
};
