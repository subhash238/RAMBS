const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserLog = sequelize.define(
  "UserLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "User who performed the action (nullable for unauthenticated requests)",
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "User IP address",
    },
    device_os: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Operating system of the device",
    },
    device_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Unique device identifier",
    },
    device_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Device name (e.g., iPhone, Samsung Galaxy)",
    },
    device_model: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Device model (e.g., iPhone 14, Galaxy S23)",
    },
    device_type: {
      type: DataTypes.ENUM('android', 'ios', 'web'),
      allowNull: true,
      comment: "Device type: android, ios, or web",
    },
    login_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Login timestamp",
    },
    logout_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Logout timestamp",
    },
  },
  {
    tableName: "user_logs",
    timestamps: true,
  }
);

module.exports = UserLog;
