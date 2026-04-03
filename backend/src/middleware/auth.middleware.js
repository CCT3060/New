const jwt = require('jsonwebtoken');
const db = require('../db/mysql');
const { unauthorized } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No authentication token provided');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return unauthorized(res, 'Token has expired. Please login again.');
      }
      return unauthorized(res, 'Invalid authentication token');
    }

    const [[user]] = await db.query(
      'SELECT id, name, email, role, isActive FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user || !user.isActive) {
      return unauthorized(res, 'User account not found or deactivated');
    }

    req.user = { ...user, isActive: !!user.isActive };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };
