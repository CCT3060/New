const router = require('express').Router();
const c = require('./menu-planner.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const db = require('../../db/mysql');
const { success } = require('../../utils/response');

router.use(authenticate);

// Delivery units for the authenticated company user (used by menu plan form in iframe)
router.get('/delivery-units', async (req, res, next) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return success(res, { units: [] });
    const [units] = await db.query(
      'SELECT id, name, code FROM units WHERE companyId = ? AND isActive = 1 ORDER BY name ASC',
      [companyId]
    );
    return success(res, { units });
  } catch (err) { next(err); }
});

// Calendar actions (before /:id to avoid conflicts)
router.post('/calendar/drop', c.dropRecipeOnSlot);
router.post('/calendar/move', c.moveItemBetweenSlots);

// Report & week management
router.get('/report', c.getReport);
router.post('/clear-range', c.clearDateRangePlans);
router.post('/duplicate-week', c.duplicateWeek);

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
