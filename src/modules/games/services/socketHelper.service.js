const redisClient = require("../../../config/redis");
const logger = require("../../../config/logger");

const SOCKET_PREFIX = "socket:user:";
const SOCKET_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Add user socket to Redis
 * @param {Object} data - { user_id, socket_id, type }
 */
const Add_User_Socket = async (data) => {
  try {
    const { user_id, socket_id, type = "user" } = data;
    const key = `${SOCKET_PREFIX}${user_id}`;
    const socketData = {
      user_id,
      socket_id,
      type,
      createdAt: new Date().toISOString(),
    };

    await redisClient.hSet(key, {
      socket_id,
      type,
      createdAt: socketData.createdAt,
    });
    await redisClient.expire(key, SOCKET_TTL);

    // Also store reverse mapping for quick lookup by socket_id
    const reverseKey = `socket:id:${socket_id}`;
    await redisClient.set(reverseKey, user_id);
    await redisClient.expire(reverseKey, SOCKET_TTL);

    logger.info(`Socket added for user ${user_id}: ${socket_id}`);
    return { status: true, data: socketData };
  } catch (err) {
    logger.error(`Add_User_Socket error: ${err.message}`);
    return { status: false, error: err.message };
  }
};

/**
 * Delete user socket by socket_id
 * @param {string} socket_id
 */
const Delete_User_Socket_By_SocketId = async (socket_id) => {
  try {
    // First find user_id by socket_id
    const reverseKey = `socket:id:${socket_id}`;
    const user_id = await redisClient.get(reverseKey);

    if (!user_id) {
      logger.warn(`No user found for socket_id: ${socket_id}`);
      return { status: false, message: "Socket not found" };
    }

    // Delete user socket data
    const key = `${SOCKET_PREFIX}${user_id}`;
    await redisClient.del(key);
    await redisClient.del(reverseKey);

    logger.info(`Socket deleted for user ${user_id}: ${socket_id}`);
    return { status: true, user_id };
  } catch (err) {
    logger.error(`Delete_User_Socket_By_SocketId error: ${err.message}`);
    return { status: false, error: err.message };
  }
};

/**
 * Get all user sockets
 */
const Get_All_User_Sockets = async () => {
  try {
    const keys = await redisClient.keys(`${SOCKET_PREFIX}*`);
    const sockets = [];

    for (const key of keys) {
      const data = await redisClient.hGetAll(key);
      if (data && data.socket_id) {
        const user_id = key.replace(SOCKET_PREFIX, "");
        sockets.push({
          user_id,
          ...data,
        });
      }
    }

    return { status: true, count: sockets.length, data: sockets };
  } catch (err) {
    logger.error(`Get_All_User_Sockets error: ${err.message}`);
    return { status: false, error: err.message };
  }
};

/**
 * Get user socket count
 */
const Get_User_Socket_Count = async () => {
  try {
    const keys = await redisClient.keys(`${SOCKET_PREFIX}*`);
    return { status: true, count: keys.length };
  } catch (err) {
    logger.error(`Get_User_Socket_Count error: ${err.message}`);
    return { status: false, error: err.message };
  }
};

/**
 * Delete sockets older than 3 hours (inactive)
 */
const Delete_Last_3_hour_User_Sockets = async () => {
  try {
    const keys = await redisClient.keys(`${SOCKET_PREFIX}*`);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    let deletedCount = 0;

    for (const key of keys) {
      const data = await redisClient.hGetAll(key);
      if (data.createdAt && data.createdAt < threeHoursAgo) {
        // Also delete reverse mapping
        if (data.socket_id) {
          await redisClient.del(`socket:id:${data.socket_id}`);
        }
        await redisClient.del(key);
        deletedCount++;
      }
    }

    logger.info(`Deleted ${deletedCount} inactive sockets (older than 3 hours)`);
    return { status: true, deletedCount };
  } catch (err) {
    logger.error(`Delete_Last_3_hour_User_Sockets error: ${err.message}`);
    return { status: false, error: err.message };
  }
};

module.exports = {
  Add_User_Socket,
  Delete_User_Socket_By_SocketId,
  Get_All_User_Sockets,
  Get_User_Socket_Count,
  Delete_Last_3_hour_User_Sockets,
};
