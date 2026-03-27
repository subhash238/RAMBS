const winston = require("winston");

// Define custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    fail: 4,
    debug: 5,
  },
  colors: {
    error: "red",
    warn: "yellow",
    info: "blue",
    success: "green",
    fail: "magenta",
    debug: "grey",
  },
};

winston.addColors(customLevels.colors);

const logger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.colorize({ all: true }), // colorize console output
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console({
      level: "debug", // log everything to console
    }),
    new winston.transports.File({
      filename: "logs/app.log",
      level: "debug", // log everything to file
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json() // keep file JSON formatted
      ),
    }),
  ],
});

module.exports = logger;
logger.error("This is an error message");
logger.success("This is a success message");
logger.fail("This is a fail message");
logger.debug("This is a debug message");

module.exports = logger;