const router = require('express').Router();
const c = require('./recipe.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// All recipe routes require authentication
router.use(authenticate);

// ─── Lookup (for menu planning) ────────────────────────────────────────────
// Must be before /:id routes to avoid conflict
router.get('/lookup', c.lookupRecipes);

// ─── Recipe Master ─────────────────────────────────────────────────────────
router.get('/', c.listRecipes);
router.post('/', c.createRecipe);
router.get('/:id', c.getRecipe);
router.put('/:id', c.updateRecipe);
router.delete('/:id', c.deleteRecipe);

// ─── Status & Approval ─────────────────────────────────────────────────────
router.patch('/:id/status', c.changeStatus);
router.post('/:id/submit-review', c.submitForReview);
router.post('/:id/approve', c.approveRecipe);
router.post('/:id/reject', c.rejectRecipe);

// ─── Ingredients ───────────────────────────────────────────────────────────
router.post('/:id/ingredients', c.addIngredient);
router.put('/:id/ingredients/:ingredientId', c.updateIngredient);
router.delete('/:id/ingredients/:ingredientId', c.removeIngredient);

// ─── Steps ─────────────────────────────────────────────────────────────────
router.post('/:id/steps', c.addStep);
router.put('/:id/steps/:stepId', c.updateStep);
router.delete('/:id/steps/:stepId', c.removeStep);

// ─── Costing ───────────────────────────────────────────────────────────────
router.get('/:id/costing', c.getCosting);
router.post('/:id/costing/recalculate', c.recalculateCosting);

// ─── Versioning ────────────────────────────────────────────────────────────
router.post('/:id/new-version', c.createNewVersion);
router.get('/:id/versions', c.getVersionHistory);

// ─── Scaling ───────────────────────────────────────────────────────────────
router.post('/:id/scale', c.scaleRecipe);

module.exports = router;
