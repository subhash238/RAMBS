const express = require("express");
const adminRoutes = require("./routes/admin.routes");
const userActivityRoutes = require("./routes/userActivity.routes");
const userLogsRoutes = require("./routes/userLogs.routes");

// Create a combined router
const router = express.Router();

// Mount all admin routes
router.use("/", adminRoutes);
router.use("/user-activities", userActivityRoutes);
router.use("/user-logs", userLogsRoutes);

module.exports = {
  routes: router, // Single router instead of array
  prefix: "/admin",
};
