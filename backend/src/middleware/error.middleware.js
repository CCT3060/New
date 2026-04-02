const logger = require('../utils/logger');

/**
 * Centralized error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  logger.error(`${err.name || 'Error'}: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Prisma known errors
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          success: false,
          message: 'A record with this value already exists',
          field: err.meta?.target?.[0] || 'unknown',
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          message: 'Record not found',
        });
      case 'P2003':
        return res.status(400).json({
          success: false,
          message: 'Invalid reference — related record not found',
        });
      default:
        break;
    }
  }

  // Joi validation error
  if (err.isJoi) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.details.map((d) => ({ field: d.path.join('.'), message: d.message })),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Custom app errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Default 500
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

/**
 * Custom AppError class for throwing operational errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = errorMiddleware;
module.exports.AppError = AppError;
