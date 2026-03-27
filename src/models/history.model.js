const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const History = sequelize.define("History", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: "ID of the user who performed this transaction"
  },
  type: {
    type: DataTypes.ENUM('add_money', 'withdraw', 'game_play', 'other'),
    allowNull: false,
    comment: "Type of transaction"
  },
  tranType: {
    type: DataTypes.ENUM('debit', 'credit'),
    allowNull: false,
    comment: "Transaction type (debit or credit)"
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: "Transaction amount"
  },
  walletType: {
    type: DataTypes.ENUM('deposit', 'withdraw'),
    allowNull: false,
    comment: "Wallet type used for this transaction"
  },
  note: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "Transaction description or note"
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'failed'),
    defaultValue: 'active',
    allowNull: false,
    comment: "Transaction status"
  },
  gameId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: "ID of the game if transaction is game_play type"
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Additional transaction data (JSON object)"
  }
}, {
  tableName: "histories",
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'createdAt']
    },
    {
      fields: ['type', 'status']
    },
    {
      fields: ['tranType', 'walletType']
    }
  ]
});

// Define associations
History.associate = (models) => {
  History.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
};

// Export enum constants for validation
History.TYPES = ['add_money', 'withdraw', 'game_play', 'other'];
History.TRAN_TYPES = ['debit', 'credit'];
History.WALLET_TYPES = ['deposit', 'withdraw'];
History.STATUSES = ['active', 'pending', 'failed'];

module.exports = History;
