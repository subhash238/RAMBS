const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const CricketMatchData = sequelize.define("CricketMatchData", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  gameId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  data: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  tableName: "cricket_match_data",
  timestamps: true,
});

module.exports = CricketMatchData;
