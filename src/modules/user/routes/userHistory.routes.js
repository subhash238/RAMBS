const express = require("express");
const router = express.Router();
const { protect } = require("../../../middlewares/auth.middleware");
const {
  getUserHistory,
  createUserHistory,
  getUserHistoryById
} = require("../controllers/userHistory.controller");

// Apply authentication middleware to all routes
router.use(protect);

// GET /api/user/history - Get current user's history records
router.get("/history", getUserHistory);

// GET /api/user/history/balance - Get current user's balance summary
// POST /api/user/history - Create new history record (user can only create certain types)
router.post("/history", createUserHistory);

// GET /api/user/history/:id - Get specific history record for current user
router.get("/history/:id", getUserHistoryById);

module.exports = router;
