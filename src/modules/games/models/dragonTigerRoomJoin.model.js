const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const DragonTigerRoomJoin = sequelize.define("DragonTigerRoomJoin", {
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
  playerData: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: "{email, phoneNo, playerName, imageUrl, balance}",
  },
  dragonTotalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  tigerTotalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  tieTotalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  isDelete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isPending: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  isDisconnect: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isPingTimeOut: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  activeRoundId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  playerStatus: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: "dragon_tiger_room_joins",
  timestamps: true,
});

module.exports = DragonTigerRoomJoin;
