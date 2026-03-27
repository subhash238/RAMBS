// utils/responseHandler.js

// Success response
exports.success = (res, message, data = {}, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    status, // optional, can include status in response body
    timestamp: new Date().toISOString()
  });
};

// Error response
exports.error = (res, message, status = 500, errors = []) => {
  return res.status(status).json({
    success: false,
    message,
    errors: errors.length ? errors : undefined,
    status,
    timestamp: new Date().toISOString()
  });
};

// Custom response
exports.custom = (res, responseObj = {}, status = 200) => {
  return res.status(status).json({
    ...responseObj,
    status,
    timestamp: new Date().toISOString()
  });
};