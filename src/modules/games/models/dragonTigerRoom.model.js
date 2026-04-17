const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const DragonTigerRoom = sequelize.define("DragonTigerRoom", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: "0: Waiting, 1: Betting, 2: Running, 3: Completed",
  },
  roundId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  roundHistory: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: "Array of {roundId, winValue} objects",
  },
  card1: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: "Dragon card {cardNum, cardValue, cardColor}",
  },
  card2: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: "Tiger card {cardNum, cardValue, cardColor}",
  },
  startRoundTimer: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  continueTimer: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  winner: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "0: Dragon, 1: Tiger, 2: Tie",
  },
}, {
  tableName: "dragon_tiger_rooms",
  timestamps: true,
});

module.exports = DragonTigerRoom;
