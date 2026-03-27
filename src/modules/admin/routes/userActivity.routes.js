const express = require("express");
const router = express.Router();
const { protect } = require("../../../middlewares/auth.middleware");
const { authorize } = require("../../../middlewares/role.middleware");
const { idValidator, paginationValidator } = require("../../../middlewares/validation.middleware");
const userActivityController = require("../controllers/userActivity.controller");

// Apply authentication to all routes
router.use(protect);

// ============================================
// USER ACTIVITY ROUTES
// ============================================

// Get all activities with filtering and pagination
router.get(
  "/",
  paginationValidator,
  authorize('superadmin', 'admin', 'manager'),
  userActivityController.getAllActivities
);

// Get activity statistics
router.get(
  "/stats",
  authorize('superadmin', 'admin', 'manager'),
  userActivityController.getActivityStats
);

// Get activities for specific user (by ID or username)
router.get(
  "/users/:identifier",
  paginationValidator,
  authorize('superadmin', 'admin', 'manager'),
  userActivityController.getUserActivities
);

// Get single activity by ID
router.get(
  "/:id",
  idValidator,
  authorize('superadmin', 'admin', 'manager'),
  userActivityController.getActivityById
);

// Export activities to CSV
router.get(
  "/export/csv",
  authorize('superadmin', 'admin', 'manager'),
  userActivityController.exportActivities
);

// Cleanup old activities (admin only)
router.delete(
  "/cleanup",
  authorize('superadmin', 'admin', 'manager'),
  userActivityController.cleanupOldActivities
);

module.exports = router;
