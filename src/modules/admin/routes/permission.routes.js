const express = require("express");
const router = express.Router();
const { protect } = require("../../../middlewares/auth.middleware");
const { authorize } = require("../../../middlewares/role.middleware");
const permissionController = require("../controllers/permission.controller");

// Apply authentication to all permission routes
router.use(protect);

// ============================================
// PERMISSION ROUTES (Superadmin only)
// ============================================

// Get all permissions (superadmin only)
router.get(
  "/",
  authorize("superadmin"),
  permissionController.getAllPermissions
);

// Get permissions by user ID (superadmin only)
router.get(
  "/user/:userId",
  authorize("superadmin", "admin", "manager"),
  permissionController.getUserPermissions
);

// Check permission for a user (superadmin only)
router.get(
  "/check/:userId",
  authorize("superadmin"),
  permissionController.checkPermission
);

// Create new permission (superadmin only)
router.post(
  "/",
  authorize("superadmin"),
  permissionController.createPermission
);

// Update permission (superadmin only)
router.put(
  "/:id",
  authorize("superadmin"),
  permissionController.updatePermission
);

// Delete permission (superadmin only)
router.delete(
  "/:id",
  authorize("superadmin"),
  permissionController.deletePermission
);

module.exports = router;
