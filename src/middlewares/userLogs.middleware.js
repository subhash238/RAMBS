const { UserLog } = require("../models");
const logger = require("../config/logger");

// Middleware to create UserLog entries for login/logout events only
module.exports = (req, res, next) => {
  // Store original res.end to intercept login/logout responses
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // Only log login and logout events
    const isLoginEvent = req.path.includes('/login') && req.method === 'POST';
    const isLogoutEvent = req.path.includes('/logout') && (req.method === 'POST' || req.method === 'GET');
    
    if ((isLoginEvent || isLogoutEvent) && res.statusCode >= 200 && res.statusCode < 300) {
      // Process login/logout logging asynchronously
      processUserLog(req, res, isLoginEvent);
    }
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  next();
};

// Async function to process user log creation
async function processUserLog(req, res, isLoginEvent) {
  try {
    // IP detection and normalization
    let ipRaw = req.headers["x-forwarded-for"] || req.ip || req.connection?.remoteAddress || null;
    let ip = null;
    if (ipRaw) {
      // If x-forwarded-for contains a list, take the first non-empty entry
      if (typeof ipRaw === "string" && ipRaw.includes(",")) {
        ipRaw = ipRaw.split(",").map(s => s.trim()).find(Boolean) || ipRaw;
      }

      // IPv6 loopback (::1) -> map to IPv4 loopback for readability
      if (ipRaw === "::1") {
        ip = "127.0.0.1";
      } else if (typeof ipRaw === "string" && ipRaw.startsWith("::ffff:")) {
        // IPv4 mapped in IPv6 format ::ffff:127.0.0.1 -> extract IPv4
        ip = ipRaw.split(":").pop();
      } else {
        ip = ipRaw;
      }
    }

    // Device info from user-agent header
    const userAgent = req.headers["user-agent"] || null;
    
    // Parse device details
    let deviceType = 'web';
    let deviceName = null;
    let deviceModel = null;
    
    if (userAgent) {
      if (userAgent.includes('Postman')) {
        deviceName = 'Postman';
        deviceType = 'web';
      } else if (userAgent.includes('Chrome')) {
        deviceName = 'Chrome';
        deviceType = 'web';
      } else if (userAgent.includes('Firefox')) {
        deviceName = 'Firefox';
        deviceType = 'web';
      } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        deviceName = 'Safari';
        deviceType = 'web';
      } else if (userAgent.includes('Edge')) {
        deviceName = 'Edge';
        deviceType = 'web';
      } else if (userAgent.includes('Android')) {
        deviceName = 'Android';
        deviceType = 'android';
      } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        deviceName = userAgent.includes('iPhone') ? 'iPhone' : 'iPad';
        deviceType = 'ios';
      } else {
        deviceName = userAgent.substring(0, 50);
        deviceType = 'web';
      }
    }

    // Get user ID from request (set by auth middleware for successful login)
    const userId = req.user?.id || null;

    // Create UserLog entry for login/logout
    const logData = {
      user_id: userId,
      ip: ip,
      device_os: deviceName,
      device_id: null, // Can be enhanced later
      device_name: deviceName,
      device_model: deviceModel,
      device_type: deviceType,
      login_date: isLoginEvent ? new Date() : null,
      logout_date: isLogoutEvent ? new Date() : null
    };

    await UserLog.create(logData);
    logger.debug(`UserLog created: ${isLoginEvent ? 'LOGIN' : 'LOGOUT'} for user ${userId} from ${ip}`);
    
  } catch (err) {
    logger.warn(`Failed to create UserLog entry: ${err.message}`);
  }
}

// Helper function to manually create UserLog entries
module.exports.logUserLog = async (userId, logType, data = {}) => {
  try {
    const logData = {
      user_id: userId,
      ip: data.ip || null,
      device_os: data.device_os || null,
      device_id: data.device_id || null,
      device_name: data.device_name || null,
      device_model: data.device_model || null,
      device_type: data.device_type || 'web'
    };

    // Set appropriate date based on log type
    if (logType === 'login') {
      logData.login_date = new Date();
    } else if (logType === 'logout') {
      logData.logout_date = new Date();
    }

    await UserLog.create(logData);
    logger.debug(`Manual UserLog created: ${logType.toUpperCase()} for user ${userId}`);
  } catch (err) {
    logger.warn(`Failed to create manual UserLog: ${err.message}`);
  }
};
