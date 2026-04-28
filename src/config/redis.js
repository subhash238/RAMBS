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
  // Suppress ECONNREFUSED errors (Redis not running)
  if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
    return; // Already logged by reconnectStrategy
  }
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

// Flag to track connection state
let isConnected = false;
let connectionAttempted = false;

// Catch unhandled Redis connection rejections at process level
process.on('unhandledRejection', (reason, promise) => {
  // Check if this is a Redis connection error
  if (reason?.code === 'ECONNREFUSED' && reason?.message?.includes('6379')) {
    // Suppress this specific error - Redis is optional
    return;
  }
  // Log other unhandled rejections
  logger.warn(`Unhandled rejection: ${reason}`);
});

// Handle connection promise separately to catch all errors
// Use setImmediate to ensure error handlers are registered first
setImmediate(() => {
  if (connectionAttempted) return;
  connectionAttempted = true;

  const connectWithRetry = async () => {
    try {
      await client.connect();
      isConnected = true;
      logger.success("Connected to Redis");
    } catch (err) {
      isConnected = false;
      // Suppress connection errors - app works without Redis
      if (err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
        logger.warn("Redis not available. App will work without caching.");
        return;
      }
      logger.warn(`Could not connect to Redis: ${err.message}`);
    }
  };

  connectWithRetry();
});

// Create a safe wrapper that handles disconnections
const safeClient = new Proxy(client, {
  get(target, prop) {
    const value = target[prop];
    if (typeof value === 'function') {
      return function(...args) {
        try {
          const result = value.apply(target, args);
          // Handle promise rejections from Redis methods
          if (result && typeof result.catch === 'function') {
            return result.catch((err) => {
              if (err.message?.includes('Socket closed') || err.code === 'ECONNREFUSED') {
                logger.warn(`Redis operation failed: ${err.message}`);
                return null;
              }
              throw err;
            });
          }
          return result;
        } catch (err) {
          if (err.message?.includes('Socket closed') || err.code === 'ECONNREFUSED') {
            logger.warn(`Redis operation failed: ${err.message}`);
            return null;
          }
          throw err;
        }
      };
    }
    return value;
  }
});

module.exports = safeClient;
