const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Settings = sequelize.define(
  "Settings",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    is_maintenance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: "Enable/Disable maintenance mode",
    },
    maintenance_value: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Maintenance message to display",
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "UUID of user who created this setting",
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "UUID of user who last updated this setting",
    },
  },
  {
    tableName: "settings",
    timestamps: true,
  }
);

module.exports = Settings;
