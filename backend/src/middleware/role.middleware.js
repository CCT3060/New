const { forbidden } = require('../utils/response');

/**
 * Role hierarchy for reference:
 * ADMIN > APPROVER > OPS_MANAGER > KITCHEN_MANAGER > STORE_MANAGER
 *
 * Role definitions:
 *  ADMIN           - Full access to everything
 *  APPROVER        - Review and approve/reject recipes
 *  OPS_MANAGER     - Create, edit draft recipes, submit for review
 *  KITCHEN_MANAGER - View approved/active recipes
 *  STORE_MANAGER   - View recipe ingredient requirements
 */

/**
 * Authorize by role(s)
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Access denied. Required role(s): ${roles.join(', ')}`);
    }
    next();
  };
};

/**
 * Grant access to admin always, then check other roles
 */
const authorizeOrAdmin = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Authentication required');
    }
    if (req.user.role === 'ADMIN' || roles.includes(req.user.role)) {
      return next();
    }
    return forbidden(res, `Access denied. Required role(s): ADMIN, ${roles.join(', ')}`);
  };
};

// Convenience permission checkers
const canEditRecipe = (user) =>
  ['ADMIN', 'OPS_MANAGER'].includes(user.role);

const canApproveRecipe = (user) =>
  ['ADMIN', 'APPROVER'].includes(user.role);

const canViewRecipe = (user) =>
  ['ADMIN', 'OPS_MANAGER', 'KITCHEN_MANAGER', 'STORE_MANAGER', 'APPROVER'].includes(user.role);

const canManageInventory = (user) =>
  ['ADMIN', 'STORE_MANAGER'].includes(user.role);

const isAdmin = (user) => user.role === 'ADMIN';

module.exports = {
  authorize,
  authorizeOrAdmin,
  canEditRecipe,
  canApproveRecipe,
  canViewRecipe,
  canManageInventory,
  isAdmin,
};
