const { UserLog } = require("../models");
const logger = require("../config/logger");

/**
 * Common Authentication Logging Service
 * Handles login/logout logging for both user and admin modules
 */
class AuthLoggerService {
  
  /**
   * Get device type from user agent
   * @param {string} userAgent - User agent string
   * @returns {string} - Device type (android, ios, web)
   */
  static getDeviceType(userAgent) {
    if (!userAgent) return 'web';
    
    if (/android/i.test(userAgent)) {
      return 'android';
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      return 'ios';
    } else {
      return 'web';
    }
  }

  /**
   * Extract device information from user agent
   * @param {string} userAgent - User agent string
   * @returns {object} - Device information
   */
  static extractDeviceInfo(userAgent) {
    if (!userAgent) {
      return {
        device_name: null,
        device_model: null,
        device_type: 'web',
        device_os: null
      };
    }

    const deviceInfo = {
      device_name: null,
      device_model: null,
      device_type: this.getDeviceType(userAgent),
      device_os: null
    };

    // Extract device name and model
    if (deviceInfo.device_type === 'ios') {
      const match = userAgent.match(/(iPhone|iPad|iPod)[^;]*;.*CPU.*OS\s*([\d_]+)/);
      if (match) {
        deviceInfo.device_name = match[1];
        deviceInfo.device_model = match[1];
        deviceInfo.device_os = `iOS ${match[2].replace(/_/g, '.')}`;
      }
    } else if (deviceInfo.device_type === 'android') {
      const match = userAgent.match(/Android\s*([\d.]+)/);
      if (match) {
        deviceInfo.device_os = `Android ${match[1]}`;
        // Extract manufacturer/model if available
        const modelMatch = userAgent.match(/;([^)]*)\)/);
        if (modelMatch) {
          deviceInfo.device_model = modelMatch[1].trim();
        }
      }
    } else {
      // Web browser detection
      if (userAgent.includes('Chrome')) {
        deviceInfo.device_name = 'Chrome';
      } else if (userAgent.includes('Firefox')) {
        deviceInfo.device_name = 'Firefox';
      } else if (userAgent.includes('Safari')) {
        deviceInfo.device_name = 'Safari';
      } else if (userAgent.includes('Edge')) {
        deviceInfo.device_name = 'Edge';
      } else if (userAgent.includes('Postman')) {
        deviceInfo.device_name = 'Postman';
      } else {
        deviceInfo.device_name = 'Unknown Browser';
      }
      
      // Extract OS for web
      if (userAgent.includes('Windows')) {
        deviceInfo.device_os = 'Windows';
      } else if (userAgent.includes('Mac')) {
        deviceInfo.device_os = 'macOS';
      } else if (userAgent.includes('Linux')) {
        deviceInfo.device_os = 'Linux';
      }
    }

    return deviceInfo;
  }

  /**
   * Extract and normalize IP address
   * @param {object} req - Express request object
   * @returns {string|null} - Normalized IP address
   */
  static extractIP(req) {
    let ipRaw = req.headers["x-forwarded-for"] || req.ip || req.connection?.remoteAddress || null;
    
    if (!ipRaw) return null;

    // If x-forwarded-for contains a list, take the first non-empty entry
    if (typeof ipRaw === "string" && ipRaw.includes(",")) {
      ipRaw = ipRaw.split(",").map(s => s.trim()).find(Boolean) || ipRaw;
    }

    // IPv6 loopback (::1) -> map to IPv4 loopback for readability
    if (ipRaw === "::1") {
      return "127.0.0.1";
    } else if (typeof ipRaw === "string" && ipRaw.startsWith("::ffff:")) {
      // IPv4 mapped in IPv6 format ::ffff:127.0.0.1 -> extract IPv4
      return ipRaw.split(":").pop();
    }

    return ipRaw;
  }

  /**
   * Generate unique device ID based on user agent and IP
   * @param {string} userAgent - User agent string
   * @param {string} ip - IP address
   * @returns {string} - Device ID hash
   */
  static generateDeviceId(userAgent, ip) {
    const crypto = require('crypto');
    const deviceString = `${userAgent || ''}-${ip || ''}`;
    return crypto.createHash('sha256').update(deviceString).digest('hex').substring(0, 32);
  }

  /**
   * Log user login event
   * @param {object} user - User object
   * @param {object} req - Express request object
   * @param {string} userType - Type of user ('user' or 'admin')
   * @returns {Promise<object>} - Created log entry
   */
  static async logLogin(user, req, userType = 'user') {
    try {
      const ip = this.extractIP(req);
      const userAgent = req.headers['user-agent'];
      const deviceInfo = this.extractDeviceInfo(userAgent);
      const deviceId = this.generateDeviceId(userAgent, ip);

      // Check for existing active session for this device
      const existingSession = await UserLog.findOne({
        where: {
          user_id: user.id,
          device_id: deviceId,
          logout_date: null
        }
      });

      if (existingSession) {
        logger.warn(`Multiple login detected for ${userType} ${user.email} on same device`);
        // Update existing session login_date
        await existingSession.update({
          login_date: new Date(),
          ip: ip,
          device_name: deviceInfo.device_name,
          device_model: deviceInfo.device_model,
          device_type: deviceInfo.device_type,
          device_os: deviceInfo.device_os
        });
        
        logger.info(`${userType.charAt(0).toUpperCase() + userType.slice(1)} login updated: ${user.email}`);
        return existingSession;
      }

      // Create new login log
      const logEntry = await UserLog.create({
        user_id: user.id,
        ip: ip,
        device_os: deviceInfo.device_os,
        device_id: deviceId,
        device_name: deviceInfo.device_name,
        device_model: deviceInfo.device_model,
        device_type: deviceInfo.device_type,
        login_date: new Date(),
        logout_date: null
      });

      logger.info(`${userType.charAt(0).toUpperCase() + userType.slice(1)} login logged: ${user.email}`);
      return logEntry;
    } catch (error) {
      logger.error(`Failed to log ${userType} login: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log user logout event
   * @param {object} user - User object
   * @param {object} req - Express request object
   * @param {string} userType - Type of user ('user' or 'admin')
   * @returns {Promise<object>} - Updated log entry
   */
  static async logLogout(user, req, userType = 'user') {
    try {
      const ip = this.extractIP(req);
      const userAgent = req.headers['user-agent'];
      const deviceId = this.generateDeviceId(userAgent, ip);

      // First try to find the active session for this specific device
      let activeSession = await UserLog.findOne({
        where: {
          user_id: user.id,
          device_id: deviceId,
          logout_date: null
        }
      });

      // If not found, try to find any active session for this user
      if (!activeSession) {
        activeSession = await UserLog.findOne({
          where: {
            user_id: user.id,
            logout_date: null
          },
          order: [['login_date', 'DESC']] // Get the most recent session
        });
      }

      if (!activeSession) {
        logger.warn(`No active session found for ${userType} ${user.email}`);
        return null;
      }

      // Update the logout date
      await activeSession.update({
        logout_date: new Date()
      });

      logger.info(`${userType.charAt(0).toUpperCase() + userType.slice(1)} logout logged: ${user.email}`);
      return activeSession;
    } catch (error) {
      logger.error(`Failed to log ${userType} logout: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of active sessions
   */
  static async getActiveSessions(userId) {
    try {
      return await UserLog.findAll({
        where: {
          user_id: userId,
          logout_date: null
        },
        order: [['login_date', 'DESC']]
      });
    } catch (error) {
      logger.error(`Failed to get active sessions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Logout all sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Number of sessions logged out
   */
  static async logoutAllSessions(userId) {
    try {
      const result = await UserLog.update(
        { logout_date: new Date() },
        {
          where: {
            user_id: userId,
            logout_date: null
          }
        }
      );

      logger.info(`Logged out ${result[0]} sessions for user ${userId}`);
      return result[0];
    } catch (error) {
      logger.error(`Failed to logout all sessions: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AuthLoggerService;
