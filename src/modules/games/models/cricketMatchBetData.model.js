const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const CricketMatchBetData = sequelize.define("CricketMatchBetData", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  gameId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  odds: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  otype: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  oname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tno: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  size: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bet_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bet_status: {
    type: DataTypes.ENUM("win", "loss"),
    allowNull: true,
  },
}, {
  tableName: "cricket_match_bet_data",
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ["gameId", "mid", "oname", "odds"],
    },
  ],
});

module.exports = CricketMatchBetData;
