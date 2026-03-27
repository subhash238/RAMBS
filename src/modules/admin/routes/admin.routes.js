const express = require("express");
const router = express.Router();
const { protect } = require("../../../middlewares/auth.middleware");
const { authorize } = require("../../../middlewares/role.middleware");
const {
  createUserValidator,
  updateUserValidator,
  assignRoleValidator,
  idValidator,
  paginationValidator,
} = require("../../../middlewares/validation.middleware");
const adminController = require("../controllers/admin.controller");
const settingsRoutes = require("./settings.routes");
const historyRoutes = require("./history.routes");
const userLogsController = require("../controllers/userLogs.controller");

// Apply authentication to all admin routes
router.use(protect);

// ============================================
// User Management Routes
// ============================================

// Get all users with type filter (admin, normal, or all)
router.get(
  "/users",
  paginationValidator,
  authorize('superadmin', 'admin', 'manager'),
  adminController.getAllUsers
);

// Get single user by ID
router.get(
  "/users/:id",
  idValidator,
  authorize('superadmin', 'admin', 'manager'),
  adminController.getUserById
);

// Create new user
router.post(
  "/users",
  createUserValidator,
  authorize('superadmin', 'admin', 'manager'),
  adminController.createUser
);

// Update user
router.put(
  "/users/:id",
  idValidator,
  updateUserValidator,
  authorize('superadmin', 'admin', 'manager'),
  adminController.updateUser
);

// Delete user (soft delete)
router.delete(
  "/users/:id",
  idValidator,
  authorize('superadmin', 'admin', 'manager'),
  adminController.deleteUser
);

// Restore soft-deleted user
router.post(
  "/users/:id/restore",
  idValidator,
  authorize('superadmin', 'admin', 'manager'),
  adminController.restoreUser
);

// Get deleted users
router.get(
  "/users/deleted/list",
  paginationValidator,
  authorize('superadmin', 'admin', 'manager'),
  adminController.getDeletedUsers
);


// Get system logs
router.get(
  "/logs",
  authorize('superadmin', 'admin', 'manager'),
  adminController.getSystemLogs
);

// ============================================
// Settings Routes
// ============================================
router.use("/settings", settingsRoutes);

// ============================================
// History Routes
// ============================================
router.use("/history", historyRoutes);


module.exports = router;
