const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const DragonTigerTournament = sequelize.define("DragonTigerTournament", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Dragon Tiger Infinite",
  },
  timer: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    comment: "Round timer in seconds (betting time)",
  },
  botComplexity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: "0: Easy, 1: Medium, 2: Hard",
  },
  minBet: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 10.00,
  },
  maxBet: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 10000.00,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: "dragon_tiger_tournaments",
  timestamps: true,
});

module.exports = DragonTigerTournament;
