const express = require("express");
const router = express.Router();
const { protect } = require("../../../middlewares/auth.middleware");
const { authorize } = require("../../../middlewares/role.middleware");
const { idValidator } = require("../../../middlewares/validation.middleware");
const settingsController = require("../controllers/settings.controller");

// Apply authentication to all settings routes
router.use(protect);

// ============================================
// Settings Management Routes
// ============================================

// Get all settings
router.get(
  "/",
  authorize('superadmin', 'admin', 'manager'),
  settingsController.getAllSettings
);

// Get setting by ID
router.get(
  "/:id",
  idValidator,
  authorize('superadmin', 'admin', 'manager'),
  settingsController.getSettingById
);

// Create new setting
router.post(
  "/",
  authorize('superadmin', 'admin', 'manager'),
  settingsController.createSetting
);

// Update setting
router.put(
  "/:id",
  idValidator,
  authorize('superadmin', 'admin', 'manager'),
  settingsController.updateSetting
);

// Delete setting
router.delete(
  "/:id",
  idValidator,
  authorize('superadmin', 'admin', 'manager'),
  settingsController.deleteSetting
);

module.exports = router;
