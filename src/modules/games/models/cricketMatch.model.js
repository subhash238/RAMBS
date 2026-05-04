const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const CricketMatch = sequelize.define("CricketMatch", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  gameId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  marketId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  eventName: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  tableName: "cricket_matches",
  timestamps: true,
});

module.exports = CricketMatch;
