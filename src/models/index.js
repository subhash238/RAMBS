const sequelize = require("../config/database");
const User = require("./user.model");
const Settings = require("./settings.model");
const UserActivity = require("./user_activity.model");
const History = require("./history.model");
const UserLog = require('./user_logs.model')
const db = {};
db.sequelize = sequelize;
db.User = User;
db.Settings = Settings;
db.UserLog = UserLog; 
db.UserActivity = UserActivity;
db.History = History;

// ============================================
// MODEL ASSOCIATIONS
// ============================================

// User associations
User.hasMany(UserActivity, {
  foreignKey: 'user_id',
  as: 'activities',
  sourceKey: 'id'
});

UserActivity.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  targetKey: 'id'
});

// History associations
History.belongsTo(User, {
  foreignKey: 'userId',
  as: 'historyUser',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

User.hasMany(History, {
  foreignKey: 'userId',
  as: 'history',
  sourceKey: 'id'
});

// UserLog associations
User.hasMany(UserLog, {
  foreignKey: 'user_id',
  as: 'userLogs',
  sourceKey: 'id'
});

UserLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'logUser',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

module.exports = db;