const userRoutes = require("./routes/user.routes");
const userSettingsRoutes = require("./routes/userSettings.routes");
const userHistoryRoutes = require("./routes/userHistory.routes");

module.exports = {
  routes: [userRoutes, userSettingsRoutes, userHistoryRoutes],
  prefix: "/user",
};
