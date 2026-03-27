const express = require("express");
const router = express.Router();
const { protect } = require("../../../middlewares/auth.middleware");
const { authorize } = require("../../../middlewares/role.middleware");
const { paginationValidator, idValidator } = require("../../../middlewares/validation.middleware");
const userLogsController = require("../controllers/userLogs.controller");

// Apply authentication to all routes
router.use(protect);

// ============================================
// USER LOGS ROUTES
// ============================================

// Get all user logs with pagination and filters
router.get(
  "/",
  paginationValidator,
  authorize('superadmin', 'admin', 'manager'),
  userLogsController.getUserLogs
);

// Get login history for a specific user
router.get(
  "/history/:id",
  paginationValidator,
  idValidator,
  authorize('superadmin', 'admin', 'manager'),
  userLogsController.getLoginHistory
);

// Get active sessions for a user
router.get(
  "/sessions/:id",
  paginationValidator,
  idValidator,
  authorize('superadmin', 'admin', 'manager'),
  userLogsController.getActiveSessions
);

// Force logout all sessions for a user
router.post(
  "/logout-all/:id",
  idValidator,
  authorize('superadmin', 'admin', 'manager'),
  userLogsController.forceLogoutAllSessions
);

module.exports = router;
