const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('./portal.controller');
const portalService = require('./portal.service');
const { unauthorized } = require('../../utils/response');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many login attempts, please try again later.' } });

// Portal JWT guard middleware
const portalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return unauthorized(res, 'Portal auth required');
  const decoded = portalService.verifyPortalToken(header.split(' ')[1]);
  if (!decoded?.clientId) return unauthorized(res, 'Invalid portal token');
  req.portalClient = decoded;
  next();
};

router.post('/login', loginLimiter, ctrl.login);

// Companies
router.get('/companies', portalAuth, ctrl.listCompanies);
router.post('/companies', portalAuth, ctrl.createCompany);
router.put('/companies/:id', portalAuth, ctrl.updateCompany);
router.delete('/companies/:id', portalAuth, ctrl.deleteCompany);

// Users
router.get('/users', portalAuth, ctrl.listUsers);
router.post('/users', portalAuth, ctrl.createUser);
router.put('/users/:id', portalAuth, ctrl.updateUser);
router.delete('/users/:id', portalAuth, ctrl.deleteUser);

module.exports = router;
