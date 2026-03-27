const express = require("express");
const cors = require("cors");
const logger = require("./config/logger");
const { error } = require("./common/response");
const { apiLimiter } = require("./config/rateLimiter");
const requestTimingMiddleware = require("./middlewares/timing.middleware");
const activityMiddleware = require("./middlewares/activity.middleware");
const userLogsMiddleware = require("./middlewares/userLogs.middleware");

// Import modules
const adminModule = require("./modules/admin");
const userModule = require("./modules/user");

const app = express();
// If running behind a proxy (nginx, load balancer), trust specific proxy headers
app.set("trust proxy", false);

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from any origin in development
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // Allow specific origins in production
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://localhost:5173', // Vite default port
      'https://yourdomain.com' // Add your production domain
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(apiLimiter);

// Request timing (logs duration and response size)
app.use(requestTimingMiddleware);

// Activity logging (detailed business operations)
app.use(activityMiddleware);

// User logging (HTTP request tracking)
app.use(userLogsMiddleware);

// ============================================
// ROUTES
// ============================================

// Health check with database and Redis status
app.get("/health", async (req, res) => {
  const healthStatus = {
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    services: {
      server: "OK",
      database: "UNKNOWN",
      redis: "UNKNOWN"
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  };

  try {
    // Check database connection
    const { sequelize } = require("./models");
    await sequelize.authenticate();
    healthStatus.services.database = "OK";
  } catch (dbError) {
    healthStatus.services.database = "ERROR";
    healthStatus.status = "ERROR";
    healthStatus.message = "Database connection failed";
  }

  try {
    // Check Redis connection (if Redis is configured)
    const redis = require("redis");
    const redisClient = redis.createClient();
    await redisClient.connect();
    await redisClient.ping();
    await redisClient.quit();
    healthStatus.services.redis = "OK";
  } catch (redisError) {
    healthStatus.services.redis = "ERROR";
    // Redis is optional, so don't fail the health check
    if (healthStatus.services.database === "OK") {
      healthStatus.message = "Server running (Redis unavailable)";
    }
  }

  const statusCode = healthStatus.status === "OK" ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

// Mount modules
app.use(`/api${adminModule.prefix}`, adminModule.routes);
app.use(`/api${userModule.prefix}`, userModule.routes);

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  return error(res, "Route not found", 404);
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  return error(res, "Internal server error", 500);
});

module.exports = app;
