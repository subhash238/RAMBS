const express = require("express");
const router = express.Router();

// Import controller methods
const userSettingsController = require("../controllers/userSettings.controller");

// ============================================
// User Settings Routes (Read-Only)
// ============================================

// Get all settings (read-only for users)
router.get(
  "/settings",
  userSettingsController.getSettings
);

// Get setting by ID (read-only for users)
router.get(
  "/settings/:id",
  userSettingsController.getSettingById
);

module.exports = router;
