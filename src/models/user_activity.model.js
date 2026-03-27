const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Define enum values as constants for validation
const OPERATION_TYPES = ['read', 'view', 'write', 'delete'];
const TABLE_NAMES = ['users', 'roles', 'settings', 'permissions', 'logs', 'activities', 'history', 'system'];

const UserActivity = sequelize.define("UserActivity", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: "ID of the user who performed the action"
  },
  table_name: {
    type: DataTypes.ENUM(...TABLE_NAMES),
    allowNull: false,
    comment: "Name of the table where operation was performed"
  },
  operation: {
    type: DataTypes.ENUM(...OPERATION_TYPES),
    allowNull: false,
    comment: "Type of operation performed"
  },
  old_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Previous value before update (JSON string)"
  },
  new_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "New value after update (JSON string)"
  }
}, {
  tableName: "user_activities",
  timestamps: true,
  indexes: [
    {
      fields: ['createdAt']
    },
    {
      fields: ['user_id', 'table_name', 'operation']
    }
  ]
});

// Define associations
UserActivity.associate = (models) => {
  // Association already defined in models/index.js to avoid alias conflicts
};

// Export enum constants for validation
UserActivity.OPERATION_TYPES = OPERATION_TYPES;
UserActivity.TABLE_NAMES = TABLE_NAMES;

module.exports = UserActivity;
