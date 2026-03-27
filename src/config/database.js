const { Sequelize } = require("sequelize");

let sequelize;

if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
  // Production - PostgreSQL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  // Development - SQLite (default)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false,
  });
}

module.exports = sequelize;