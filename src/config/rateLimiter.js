const rateLimit = require("express-rate-limit");
const logger = require("./logger");

/**
 * General API rate limiter
 * 15 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check
    if (req.path === "/health") {
      return true;
    }
    return false;
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      success: false,
      message: "Too many requests, please try again later",
      status: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Login rate limiter
 * 5 requests per 15 minutes per IP
 */
const loginLimiter = rateLimit({
  windowMs:  1000,
  max: 5,
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Login rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      success: false,
      message: "Too many login attempts, please try again later",
      status: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Registration rate limiter
 * 3 requests per sec per IP
 */
const registrationLimiter = rateLimit({
  windowMs:  1000, // 1 sec
  max: 3,
  message: "Too many registration attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Registration rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      success: false,
      message: "Too many registration attempts, please try again later",
      status: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Password reset rate limiter
 * 3 requests per sec per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 1000, // 1 sec
  max: 3,
  message: "Too many password reset attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      success: false,
      message: "Too many password reset attempts, please try again later",
      status: 429,
      timestamp: new Date().toISOString(),
    });
  },
});

module.exports = {
  apiLimiter,
  loginLimiter,
  registrationLimiter,
  passwordResetLimiter,
};
