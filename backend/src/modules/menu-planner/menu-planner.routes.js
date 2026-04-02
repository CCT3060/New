const router = require('express').Router();
const c = require('./menu-planner.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/', c.listMenuPlans);
router.post('/', c.createMenuPlan);
router.get('/:id', c.getMenuPlan);
router.put('/:id', c.updateMenuPlan);
router.delete('/:id', c.deleteMenuPlan);

// Items
router.post('/:id/items', c.addItem);
router.put('/:id/items/:itemId', c.updateItem);
router.delete('/:id/items/:itemId', c.removeItem);

module.exports = router;
