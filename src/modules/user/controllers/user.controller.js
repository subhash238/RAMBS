const { User } = require("../../../models");
const { UserLog } = require("../../../models");
const logger = require("../../../config/logger");
const { success, error } = require("../../../common/response");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AuthLoggerService = require("../../../services/authLogger.service");
const UserActivityService = require("../../../services/userActivity.service");

/**
 * User registration
 * @route POST /api/user/register
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return error(res, "Name, email, and password are required", 400);
    }

    // Name validation
    if (name.length < 2 || name.length > 50) {
      return error(res, "Name must be between 2 and 50 characters", 400);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error(res, "Invalid email format", 400);
    }

    // Password validation
    if (password.length < 8) {
      return error(res, "Password must be at least 8 characters long", 400);
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      return error(res, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character", 400);
    }

    if (password !== confirmPassword) {
      return error(res, "Password and confirm password do not match", 400);
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists (including deleted users)
    const existingUser = await User.scope("withDeleted").findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.isDeleted) {
        logger.warn(
          `Registration failed: User with email exists but is deleted - ${normalizedEmail}`
        );
        return error(
          res,
          "This email was previously used. Please contact support to reactivate your account.",
          400
        );
      } else {
        logger.warn(`Registration failed: Email already exists - ${normalizedEmail}`);
        return error(res, "Email already exists", 400);
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user", // Default role
      status: "active", // Default status
      isEmailVerified: false, // Require email verification
    });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    logger.info(`User registered successfully: ${normalizedEmail}`);
    
    return success(res, "Registration successful", {
      message: "Account created successfully. Please verify your email.",
      user: userResponse,
      requiresEmailVerification: true,
    }, 201);
  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    return error(res, "Failed to register", 500);
  }
};

/**
 * User login
 * @route POST /api/user/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return error(res, "Email and password are required", 400);
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user by email (including deleted users for proper error messages)
    const user = await User.scope("withDeleted").findOne({ 
      where: { email: normalizedEmail } 
    });
    
    if (!user) {
      logger.warn(`Login failed: User not found - ${normalizedEmail}`);
      return error(res, "Invalid email or password", 401);
    }

    // Check if user is deleted
    if (user.isDeleted) {
      logger.warn(`Login failed: Account deleted - ${normalizedEmail}`);
      return error(res, "Account has been deleted. Please contact support.", 410);
    }

    // Check if user is active/blocked
    if (user.status === 'blocked') {
      logger.warn(`Login failed: Account blocked - ${normalizedEmail}`);
      return error(res, "Account has been blocked. Please contact support.", 423);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password - ${normalizedEmail}`);
      return error(res, "Invalid email or password", 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    // Generate refresh token (longer expiration)
    const refreshToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET + "_refresh",
      { expiresIn: "30d" }
    );

    // Log user login using common service
    await AuthLoggerService.logLogin(user, req, 'user');

    // Log user activity
    await UserActivityService.logRead(
      user.id,
      'users',
      null,
      { loginTime: new Date().toISOString() }
    );

    logger.success(`User logged in: ${user.email} (${user.role})`);
    
    return success(res, "Login successful", {
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRE || "7d",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    return error(res, "Failed to login", 500);
  }
};

/**
 * Refresh access token
 * @route POST /api/user/refresh-token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return error(res, "Refresh token is required", 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + "_refresh");
    } catch (verifyErr) {
      logger.warn("Invalid refresh token");
      return error(res, "Invalid refresh token", 401);
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      logger.warn(`User not found for token refresh: ${decoded.id}`);
      return error(res, "User not found", 404);
    }

    // Generate new access token
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    logger.success(`Token refreshed for user: ${user.email}`);
    return success(res, "Token refreshed successfully", {
      token: newToken,
    });
  } catch (err) {
    logger.error(`Token refresh error: ${err.message}`);
    return error(res, "Failed to refresh token", 500);
  }
};

/**
 * User logout
 * @route POST /api/user/logout
 */
exports.logout = async (req, res) => {
  try {
    // User is already authenticated via middleware
    const user = req.user;
    
    // Simple logout - just log the event and return success
    // In JWT systems, logout is mainly for client-side token removal
    // and server-side audit logging
    
    // Log user logout using AuthLoggerService
    await AuthLoggerService.logLogout(user, req, 'user');
    
    logger.success(`User logged out: ${user.email}`);
    
    return success(res, "Logout successful", {
      message: "Logged out successfully",
      loggedOutAt: new Date().toISOString()
    });
  } catch (err) {
    logger.error(`Logout error: ${err.message}`);
    return error(res, "Failed to logout", 500);
  }
};

/**
 * Get current user profile
 * @route GET /api/user/me
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      logger.warn(`User not found: ${req.user.id}`);
      return error(res, "User not found", 404);
    }

    // Log user activity
    await UserActivityService.logRead(req.user.id, 'users');

    logger.info(`Retrieved user profile: ${req.user.id}`);
    return success(res, "User profile retrieved successfully", { user });
  } catch (err) {
    logger.error(`Error fetching user profile: ${err.message}`);
    return error(res, "Failed to fetch user profile", 500);
  }
};

/**
 * Get user's own login history
 * @route GET /api/user/login-history
 */
exports.getLoginHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    const activeSessions = await AuthLoggerService.getActiveSessions(userId);
    
    // Get login history from UserLog model
    const { UserLog } = require("../../../models");
    const offset = (page - 1) * limit;

    const { count, rows } = await UserLog.findAndCountAll({
      where: { user_id: userId },
      offset,
      limit: parseInt(limit),
      order: [["login_date", "DESC"]],
    });

    return success(res, "Login history retrieved successfully", {
      loginHistory: rows,
      activeSessions: activeSessions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    logger.error(`Error fetching login history: ${err.message}`);
    return error(res, "Failed to fetch login history", 500);
  }
};

/**
 * Logout all user sessions
 * @route POST /api/user/logout-all
 */
exports.logoutAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const loggedOutCount = await AuthLoggerService.logoutAllSessions(userId);
    
    logger.info(`User ${req.user.email} logged out of ${loggedOutCount} sessions`);
    
    return success(res, "All sessions logged out successfully", {
      loggedOutSessions: loggedOutCount,
      loggedOutAt: new Date().toISOString()
    });
  } catch (err) {
    logger.error(`Error logging out all sessions: ${err.message}`);
    return error(res, "Failed to logout all sessions", 500);
  }
};

/**
 * Update current user profile
 * @route PUT /api/user/me
 */
exports.updateCurrentUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      logger.warn(`User not found: ${req.user.id}`);
      return error(res, "User not found", 404);
    }

    // Check if new email already exists (if changing email)
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) {
        logger.warn(`Email update failed: Email already exists - ${email}`);
        return error(res, "Email already exists", 400);
      }
    }

    // Update fields
    const oldData = { name: user.name, email: user.email };
    if (name) user.name = name;
    if (email) user.email = email;
    user.updatedBy = req.user.id;

    await user.save();

    // Log user activity
    await UserActivityService.logWrite(
      req.user.id,
      'users',
      oldData,
      { name: user.name, email: user.email }
    );

    logger.success(`User profile updated: ${req.user.id}`);
    return success(res, "User profile updated successfully", { user });
  } catch (err) {
    logger.error(`Error updating user profile: ${err.message}`);
    return error(res, "Failed to update user profile", 500);
  }
};

/**
 * Change password
 * @route POST /api/user/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return error(
        res,
        "Current password, new password, and confirm password are required",
        400
      );
    }

    if (newPassword !== confirmPassword) {
      logger.warn(`Password change failed: Passwords do not match - ${req.user.id}`);
      return error(res, "New password and confirm password do not match", 400);
    }

    if (newPassword.length < 6) {
      return error(res, "Password must be at least 6 characters long", 400);
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.warn(`User not found: ${req.user.id}`);
      return error(res, "User not found", 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      logger.warn(`Password change failed: Invalid current password - ${req.user.id}`);
      return error(res, "Current password is incorrect", 401);
    }

    // Hash and update new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.updatedBy = req.user.id;
    await user.save();

    logger.success(`Password changed for user: ${req.user.id}`);
    return success(res, "Password changed successfully");
  } catch (err) {
    logger.error(`Error changing password: ${err.message}`);
    return error(res, "Failed to change password", 500);
  }
};
