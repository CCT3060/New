const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('./root.controller');
const rootService = require('./root.service');
const { unauthorized } = require('../../utils/response');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many login attempts, please try again later.' } });

// Root JWT guard middleware
const rootAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return unauthorized(res, 'Root auth required');
  const decoded = rootService.verifyRootToken(header.split(' ')[1]);
  if (!decoded?.role === 'ROOT_ADMIN') return unauthorized(res, 'Invalid root token');
  req.rootAdmin = decoded;
  next();
};

router.post('/login', loginLimiter, ctrl.login);
router.get('/clients', rootAuth, ctrl.listClients);
router.post('/clients', rootAuth, ctrl.createClient);
router.put('/clients/:id', rootAuth, ctrl.updateClient);
router.delete('/clients/:id', rootAuth, ctrl.deleteClient);

module.exports = router;
