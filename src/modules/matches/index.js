const express = require("express");
const matchListRoutes = require("./routes/matchList.routes");

// Create a combined router
const router = express.Router();

// Mount all matches routes
router.use("/", matchListRoutes);

module.exports = {
  routes: router,
  prefix: "/matches",
};
