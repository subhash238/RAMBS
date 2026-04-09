const express = require("express");
const router = express.Router();
const { protect } = require("../../../middlewares/auth.middleware");
const { authorize } = require("../../../middlewares/role.middleware");
const matchListController = require("../controllers/matchList.controller");
const matchScoreboardController = require("../controllers/matchScoreboard.controller");
const matchDataController = require("../controllers/matchData.controller");

// Apply authentication to all routes
router.use(protect);

// ============================================
// Match List Routes - Auto Refresh
// Scheduler updates cache every 5 seconds automatically
// ============================================

// Get cached match list (auto-updated every 5 seconds)
router.get("/", matchListController.getMatchList);

// Get scheduler status (admin/superadmin only)
router.get(
  "/status",
  authorize("superadmin", "admin"),
  matchListController.getStatus
);

// Start scheduler (superadmin only)
router.post(
  "/start",
  authorize("superadmin"),
  matchListController.startScheduler
);

// Stop scheduler (superadmin only)
router.post(
  "/stop",
  authorize("superadmin"),
  matchListController.stopScheduler
);

// ============================================
// Match Scoreboard Routes - Auto Refresh
// Each gameId is cached separately and auto-updated every 5 seconds
// ============================================

// Get cached match scoreboard by gameId
router.get("/scoreboard/:gameId", matchScoreboardController.getScoreboard);

// Get scoreboard scheduler status (admin/superadmin only)
router.get(
  "/scoreboard-status",
  authorize("superadmin", "admin"),
  matchScoreboardController.getStatus
);

// Start scoreboard scheduler (superadmin only)
router.post(
  "/scoreboard-start",
  authorize("superadmin"),
  matchScoreboardController.startScheduler
);

// Stop scoreboard scheduler (superadmin only)
router.post(
  "/scoreboard-stop",
  authorize("superadmin"),
  matchScoreboardController.stopScheduler
);

// Remove gameId from tracking (admin/superadmin only)
router.delete(
  "/scoreboard/:gameId",
  authorize("superadmin", "admin"),
  matchScoreboardController.removeGameId
);

// ============================================
// Match Data Routes - Auto Refresh
// Each gameId is cached separately and auto-updated every 5 seconds
// ============================================

// Get cached match data by gameId
router.get("/data/:gameId", matchDataController.getMatchData);

// Get match data scheduler status (admin/superadmin only)
router.get(
  "/data-status",
  authorize("superadmin", "admin"),
  matchDataController.getStatus
);

// Start match data scheduler (superadmin only)
router.post(
  "/data-start",
  authorize("superadmin"),
  matchDataController.startScheduler
);

// Stop match data scheduler (superadmin only)
router.post(
  "/data-stop",
  authorize("superadmin"),
  matchDataController.stopScheduler
);

// Remove gameId from match data tracking (admin/superadmin only)
router.delete(
  "/data/:gameId",
  authorize("superadmin", "admin"),
  matchDataController.removeGameId
);

module.exports = router;
