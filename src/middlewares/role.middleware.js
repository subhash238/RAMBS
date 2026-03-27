const logger = require("../config/logger"); // Winston logger
const { error } = require("../common/response"); // custom response handler

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn("Unauthorized access attempt without authentication");
      return error(res, "Unauthorized", 401);
    }

    if (!roles.includes(req.user.role)) {
      logger.fail(
        `Access denied for user ID: ${req.user.id} with role: ${req.user.role}`
      );
      return error(res, "Access Denied", 403);
    }

    logger.success(
      `Access granted for user ID: ${req.user.id} with role: ${req.user.role}`
    );
    next();
  };
};