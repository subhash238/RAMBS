const logger = require("../config/logger");

/**
 * Request timing middleware
 * Logs request with exact format:
 * GET /api/users 200 45.123 ms - 1234 [2026-02-23T10:00:00.000Z]
 */
const requestTimingMiddleware = (req, res, next) => {
  // Start time with high resolution
  const startHR = process.hrtime();

  // Capture original methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Flag to prevent duplicate logging
  let hasLogged = false;

  // Helper function to log request
  const logRequest = (data) => {
    // Skip if already logged
    if (hasLogged) return;
    hasLogged = true;

    // Calculate duration in milliseconds with high precision
    const durationHR = process.hrtime(startHR);
    const durationMs = (durationHR[0] * 1000 + durationHR[1] / 1000000).toFixed(3);

    // Get response size
    let responseSize = 0;
    if (typeof data === "string") {
      responseSize = Buffer.byteLength(data);
    } else if (typeof data === "object") {
      responseSize = Buffer.byteLength(JSON.stringify(data));
    }

    // Format timestamp - ISO format
    const timestamp = new Date().toISOString();

    // Get full path (baseUrl + path gives complete route)
    const fullPath = req.baseUrl + req.path;

    // Build exact log message format
    // METHOD PATH STATUS DURATION ms - SIZE [TIMESTAMP]
    const logMessage = `${req.method} ${fullPath} ${res.statusCode} ${durationMs} ms - ${responseSize} [${timestamp}]`;

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error(logMessage);
    } else if (res.statusCode >= 400) {
      logger.warn(logMessage);
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      logger.success(logMessage);
    } else {
      logger.info(logMessage);
    }
  };

  // Override json method (used by controllers)
  res.json = function (data) {
    logRequest(data);
    return originalJson.call(this, data);
  };

  // Override send method (fallback)
  res.send = function (data) {
    logRequest(data);
    return originalSend.call(this, data);
  };

  next();
};

module.exports = requestTimingMiddleware;
