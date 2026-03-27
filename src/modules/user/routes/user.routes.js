const express = require("express");
const router = express.Router();
const { protect } = require("../../../middlewares/auth.middleware");
const {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  updateProfileValidator,
  changePasswordValidator,
} = require("../../../middlewares/validation.middleware");
const {
  loginLimiter,
  registrationLimiter,
} = require("../../../config/rateLimiter");
const userController = require("../controllers/user.controller");

// ============================================
// Authentication Routes (No auth required)
// ============================================

// Register
router.post(
  "/register",
  registrationLimiter,
  registerValidator,
  userController.register
);

// Login
router.post(
  "/login",
  loginLimiter,
  loginValidator,
  userController.login
);

// Refresh token
router.post(
  "/refresh-token",
  refreshTokenValidator,
  userController.refreshToken
);

// ============================================
// User Profile Routes (Auth required)
// ============================================

// Apply authentication to remaining routes
router.use(protect);

// Logout
router.post(
  "/logout",
  userController.logout
);

// Get current user profile
router.get(
  "/me",
  userController.getCurrentUser
);

// Update current user profile
router.put(
  "/me",
  updateProfileValidator,
  userController.updateCurrentUser
);

// Change password
router.post(
  "/change-password",
  changePasswordValidator,
  userController.changePassword
);

// ============================================
// User Session Management Routes
// ============================================

// Get user's own login history
router.get(
  "/login-history",
  userController.getLoginHistory
);

// Logout all user sessions
router.post(
  "/logout-all",
  userController.logoutAllSessions
);


module.exports = router;
