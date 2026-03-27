require("dotenv").config();
const bcrypt = require("bcrypt");
const { User } = require("./src/models");
const { sequelize } = require("./src/models");
const logger = require("./src/config/logger");

const seedUsers = async () => {
  try {
    // Sync database
    await sequelize.sync({ alter: false });
    logger.success("Database synced");

    // Check if users already exist
    const userCount = await User.count();
    if (userCount > 0) {
      logger.warn(`Database already has ${userCount} users. Skipping seed.`);
      logger.info("To reset database, delete rbams.db and run seed again.");
      process.exit(0);
    }

    // Create default users
    const users = [
      {
        name: "Super Admin",
        email: "superadmin@example.com",
        password: await bcrypt.hash("Superadmin@123", 10),
        role: "superadmin",
      },
      {
        name: "Admin User",
        email: "admin@example.com",
        password: await bcrypt.hash("Admin@123", 10),
        role: "admin",
      },
      {
        name: "Manager User",
        email: "manager@example.com",
        password: await bcrypt.hash("Manager@123", 10),
        role: "manager",
      },
      {
        name: "Regular User",
        email: "user@example.com",
        password: await bcrypt.hash("User@123", 10),
        role: "user",
      },
    ];

    const createdUsers = await User.bulkCreate(users);

    logger.success(`Seeded ${createdUsers.length} users successfully!`);
    logger.info("\nDefault Users Created:");
    createdUsers.forEach((user) => {
      logger.info(`  Email: ${user.email} | Role: ${user.role} | Password: (see seed file)`);
    });

    logger.success("\n✓ Seed completed successfully!");
    process.exit(0);
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
    process.exit(1);
  }
};

seedUsers();
