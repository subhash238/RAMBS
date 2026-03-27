const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4, // Automatically generate UUID v4
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: "user",
    comment: "User role: superadmin, manager, admin, user"
  },
  createdBy: {
    type: DataTypes.UUID, // UUID of the user who created this user
    allowNull: true,
  },
  updatedBy: {
    type: DataTypes.UUID, // UUID of the user who last updated this user
    allowNull: true,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  depositBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    allowNull: false,
    comment: "Total deposited balance for the user"
  },
  withdrawBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    allowNull: false,
    comment: "Total withdrawn balance for the user"
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: "users",
  timestamps: true, // createdAt and updatedAt
  paranoid: true,
  defaultScope: {
    where: { isDeleted: false },
  },
  scopes: {
    // Scope to include deleted users
    withDeleted: {
      where: {},
    },
    // Scope to only show deleted users
    onlyDeleted: {
      where: { isDeleted: true },
    },
  },
});

module.exports = User;