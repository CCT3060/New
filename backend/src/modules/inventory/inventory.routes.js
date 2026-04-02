const router = require('express').Router();
const inventoryService = require('./inventory.service');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize, authorizeOrAdmin } = require('../../middleware/role.middleware');
const { success, created } = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const Joi = require('joi');

router.use(authenticate);

// GET /api/inventory/warehouses
router.get('/warehouses', async (req, res, next) => {
  try {
    const warehouses = await inventoryService.getWarehouses();
    return success(res, warehouses);
  } catch (err) { next(err); }
});

// GET /api/inventory/items/active?warehouseId=...
router.get('/items/active', async (req, res, next) => {
  try {
    const items = await inventoryService.getActiveItemsForRecipe(req.query.warehouseId);
    return success(res, items);
  } catch (err) { next(err); }
});

// GET /api/inventory/items
router.get('/items', async (req, res, next) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { items, total } = await inventoryService.getItems({ ...req.query, page, limit });
    return success(res, { items, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
});

// GET /api/inventory/items/:id
router.get('/items/:id', async (req, res, next) => {
  try {
    const item = await inventoryService.getItemById(req.params.id);
    return success(res, item);
  } catch (err) { next(err); }
});

// POST /api/inventory/items (Admin or Store Manager)
router.post('/items', authorizeOrAdmin('STORE_MANAGER'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      itemCode: Joi.string().max(50).required(),
      itemName: Joi.string().max(200).required(),
      category: Joi.string().max(100).required(),
      unit: Joi.string().max(50).required(),
      costPerUnit: Joi.number().min(0).required(),
      currentStock: Joi.number().min(0).default(0),
      minimumStock: Joi.number().min(0).default(0),
      warehouseId: Joi.string().uuid().required(),
      isActive: Joi.boolean().default(true),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(422).json({ success: false, message: 'Validation failed', errors: error.details });

    const item = await inventoryService.createItem(value);
    return created(res, item, 'Inventory item created');
  } catch (err) { next(err); }
});

// PUT /api/inventory/items/:id
router.put('/items/:id', authorizeOrAdmin('STORE_MANAGER'), async (req, res, next) => {
  try {
    const item = await inventoryService.updateItem(req.params.id, req.body);
    return success(res, item, 'Item updated');
  } catch (err) { next(err); }
});

module.exports = router;
