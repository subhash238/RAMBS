const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const DragonTigerBet = sequelize.define("DragonTigerBet", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  playerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  roundId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  betType: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "0: Dragon, 1: Tiger, 2: Tie",
  },
}, {
  tableName: "dragon_tiger_bets",
  timestamps: true,
});

module.exports = DragonTigerBet;
