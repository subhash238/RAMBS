const express = require("express");
const router = express.Router();
const dragonTigerController = require("../controllers/dragonTiger.controller");
const { protect } = require("../../../middlewares/auth.middleware");

// Get active tournament settings
router.get("/tournament", protect, dragonTigerController.getTournament);

// Get room data
router.get("/room/:roomId", protect, dragonTigerController.getRoomData);

module.exports = router;
