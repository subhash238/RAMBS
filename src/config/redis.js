const redis = require("redis");
const logger = require("./logger");

// Parse Redis URL from environment
// Format: redis://username:password@host:port/db
// Example: redis://default:password@localhost:6379/0
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Create Redis client
const client = redis.createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        // After 3 retries, don't reconnect - app works fine without Redis
        logger.warn(
          "Redis reconnection attempts exhausted. App will work without caching."
        );
        return false;
      }
      return retries * 50;
    },
  },
});

// Handle connection events
client.on("connect", () => {
  logger.success("Redis client connected");
});

client.on("error", (err) => {
  // Don't exit on error - Redis is optional
  logger.warn(`Redis client error: ${err.message}`);
});

client.on("ready", () => {
  logger.success("Redis client ready");
});

client.on("reconnecting", () => {
  logger.warn("Redis client reconnecting");
});

client.on("end", () => {
  logger.warn("Redis client disconnected");
});

// Connect to Redis (non-blocking - app continues if Redis fails)
(async () => {
  try {
    await client.connect();
    logger.success("Connected to Redis");
  } catch (err) {
    logger.warn(
      `Could not connect to Redis (${err.message}). App will work without caching.`
    );
  }
})();

module.exports = client;
