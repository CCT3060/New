const menuPlannerService = require('./menu-planner.service');
const { success, created, notFound, forbidden } = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta, getSortParams } = require('../../utils/pagination');
const listMenuPlans = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const orderBy = getSortParams(req.query, ['planDate', 'planName', 'createdAt']);
    const { menuPlans, total } = await menuPlannerService.listMenuPlans({
      ...req.query,
      skip,
      take: limit,
      orderBy,
    });
    return success(res, { menuPlans, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

const getMenuPlan = async (req, res, next) => {
  try {
    const menuPlan = await menuPlannerService.getMenuPlanById(req.params.id);
    return success(res, menuPlan);
  } catch (err) { next(err); }
};

const createMenuPlan = async (req, res, next) => {
  try {
    const menuPlan = await menuPlannerService.createMenuPlan(req.body, req.user.id);
    return created(res, menuPlan, 'Menu plan created successfully');
  } catch (err) { next(err); }
};

const updateMenuPlan = async (req, res, next) => {
  try {
    const menuPlan = await menuPlannerService.updateMenuPlan(req.params.id, req.body, req.user.id);
    return success(res, menuPlan, 'Menu plan updated successfully');
  } catch (err) { next(err); }
};

const deleteMenuPlan = async (req, res, next) => {
  try {
    if (!['ADMIN', 'OPS_MANAGER'].includes(req.user.role)) {
      return forbidden(res, 'Insufficient permissions to delete menu plans');
    }
    await menuPlannerService.deleteMenuPlan(req.params.id);
    return success(res, {}, 'Menu plan deleted successfully');
  } catch (err) { next(err); }
};

const addItem = async (req, res, next) => {
  try {
    const item = await menuPlannerService.addItem(req.params.id, req.body);
    return created(res, item, 'Recipe added to menu plan');
  } catch (err) { next(err); }
};

const updateItem = async (req, res, next) => {
  try {
    const item = await menuPlannerService.updateItem(req.params.id, req.params.itemId, req.body);
    return success(res, item, 'Menu plan item updated');
  } catch (err) { next(err); }
};

const removeItem = async (req, res, next) => {
  try {
    await menuPlannerService.removeItem(req.params.id, req.params.itemId);
    return success(res, {}, 'Recipe removed from menu plan');
  } catch (err) { next(err); }
};

module.exports = {
  listMenuPlans,
  getMenuPlan,
  createMenuPlan,
  updateMenuPlan,
  deleteMenuPlan,
  addItem,
  updateItem,
  removeItem,
  dropRecipeOnSlot,
  moveItemBetweenSlots,
};

async function dropRecipeOnSlot(req, res, next) {
  try {
    const { planDate, mealType, warehouseId, recipeId, servings } = req.body;
    if (!planDate || !mealType || !warehouseId || !recipeId) {
      return res.status(400).json({ success: false, message: 'planDate, mealType, warehouseId and recipeId are required' });
    }
    const result = await menuPlannerService.dropRecipeOnSlot(
      { planDate, mealType, warehouseId, recipeId, servings },
      req.user.id
    );
    return created(res, result, result.alreadyExists ? 'Recipe already in this slot' : 'Recipe added to slot');
  } catch (err) { next(err); }
}

async function moveItemBetweenSlots(req, res, next) {
  try {
    const { itemId, sourcePlanId, targetDate, targetMealType, warehouseId } = req.body;
    if (!itemId || !sourcePlanId || !targetDate || !targetMealType || !warehouseId) {
      return res.status(400).json({ success: false, message: 'itemId, sourcePlanId, targetDate, targetMealType and warehouseId are required' });
    }
    await menuPlannerService.moveItemBetweenSlots(
      { itemId, sourcePlanId, targetDate, targetMealType, warehouseId },
      req.user.id
    );
    return success(res, {}, 'Recipe moved successfully');
  } catch (err) { next(err); }
}
