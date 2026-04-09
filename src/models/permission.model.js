const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Permission = sequelize.define(
  "Permission",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "User who has this permission",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Permission name (e.g., users, settings, reports)",
    },
    access: {
      type: DataTypes.ENUM("read", "write", "read_write"),
      allowNull: false,
      defaultValue: "read",
      comment: "Access level: read, write, or read_write",
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Superadmin who created this permission",
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Superadmin who last updated this permission",
    },
  },
  {
    tableName: "permissions",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "name"],
        name: "unique_user_permission",
      },
    ],
  }
);

module.exports = Permission;
