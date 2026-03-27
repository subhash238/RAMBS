const express = require("express");
const router = express.Router();
const { protect } = require("../../../middlewares/auth.middleware");
const {
  getAllHistory,
  getHistoryById,
  createHistory,
  updateHistory,
  deleteHistory,
  
} = require("../controllers/history.controller");

// Apply authentication middleware to all routes
router.use(protect);

// GET /api/admin/history - Get all history records
router.get("/", getAllHistory);

// GET /api/admin/history/:id - Get history by ID
router.get("/:id", getHistoryById);

// POST /api/admin/history - Create new history record
router.post("/", createHistory);

// PUT /api/admin/history/:id - Update history record
router.put("/:id", updateHistory);

// DELETE /api/admin/history/:id - Delete history record
router.delete("/:id", deleteHistory);

// GET /api/admin/history/user/:userId/balance - Get user balance summary


module.exports = router;
