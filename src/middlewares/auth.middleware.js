const jwt = require("jsonwebtoken");
const { User } = require("../models");
const logger = require("../config/logger"); // your Winston logger
const { error } = require("../common/response"); // custom response handler

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn("Authorization header missing");
      return error(res, "Unauthorized", 401);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      logger.warn("JWT token missing in authorization header");
      return error(res, "Unauthorized", 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.success(`Token verified for user ID: ${decoded.id}`);
    } catch (verifyErr) {
      logger.error("Invalid JWT token");
      return error(res, "Invalid Token", 401);
    }

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      logger.fail(`User not found for ID: ${decoded.id}`);
      return error(res, "User not found", 401);
    }

    logger.info(`User authenticated: ${user.id} - ${user.email}`);
    req.user = user;
    next();
  } catch (err) {
    logger.error(`Auth middleware error: ${err.message}`);
    return error(res, "Internal Server Error", 500);
  }
};