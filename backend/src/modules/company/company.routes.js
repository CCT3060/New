const express = require('express');
const router = express.Router();
const ctrl = require('./company.controller');
const { verifyCompanyToken } = require('./company.service');
const recipeService = require('../recipe/recipe.service');
const { AppError } = require('../../middleware/error.middleware');
const { success } = require('../../utils/response');

// Middleware: verify company JWT
const companyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }
  const payload = verifyCompanyToken(authHeader.slice(7));
  if (!payload) return next(new AppError('Invalid or expired token', 401));
  req.companyUser = payload; // { userId, companyId, clientId, role }
  next();
};

router.post('/login', ctrl.login);

// ─── Pax Scale (company-auth, no inner token needed) ─────────────────────────
router.get('/pax/recipes', companyAuth, async (req, res, next) => {
  try {
    const { recipes } = await recipeService.lookupRecipes({ limit: 200, page: 1 });
    return success(res, { recipes });
  } catch (err) { next(err); }
});

router.get('/pax/scale/:recipeId', companyAuth, async (req, res, next) => {
  try {
    const targetPax = parseInt(req.query.pax, 10);
    if (!targetPax || targetPax <= 0) return next(new AppError('pax must be a positive integer', 400));
    const result = await recipeService.scaleRecipe(req.params.recipeId, targetPax);
    return success(res, result);
  } catch (err) { next(err); }
});

router.get('/kitchens',       companyAuth, ctrl.listKitchens);
router.post('/kitchens',      companyAuth, ctrl.createKitchen);
router.put('/kitchens/:id',   companyAuth, ctrl.updateKitchen);
router.delete('/kitchens/:id',companyAuth, ctrl.deleteKitchen);

router.get('/stores',         companyAuth, ctrl.listStores);
router.post('/stores',        companyAuth, ctrl.createStore);
router.put('/stores/:id',     companyAuth, ctrl.updateStore);
router.delete('/stores/:id',  companyAuth, ctrl.deleteStore);

router.get('/units',          companyAuth, ctrl.listUnits);
router.post('/units',         companyAuth, ctrl.createUnit);
router.put('/units/:id',      companyAuth, ctrl.updateUnit);
router.delete('/units/:id',   companyAuth, ctrl.deleteUnit);

// Kitchen Users
router.get('/kitchen-users',        companyAuth, ctrl.listKitchenUsers);
router.post('/kitchen-users',       companyAuth, ctrl.createKitchenUser);
router.put('/kitchen-users/:id',    companyAuth, ctrl.updateKitchenUser);
router.delete('/kitchen-users/:id', companyAuth, ctrl.deleteKitchenUser);

module.exports = router;
