const prisma = require('../../db/prisma');

const getDefaultWarehouseId = async () => {
  const w = await prisma.warehouse.findFirst({ where: { isActive: true } });
  if (!w) throw Object.assign(new Error('No warehouse configured'), { status: 400 });
  return w.id;
};

const MENU_PLAN_INCLUDE = {
  warehouse: { select: { id: true, name: true, code: true } },
  creator: { select: { id: true, name: true, role: true } },
  items: {
    orderBy: { sortOrder: 'asc' },
    include: {
      recipe: {
        select: {
          id: true,
          recipeCode: true,
          recipeName: true,
          category: true,
          mealType: true,
          foodType: true,
          status: true,
          standardPax: true,
          yieldQty: true,
          yieldUnit: true,
        },
      },
    },
  },
};

/**
 * List menu plans with optional filters.
 */
const listMenuPlans = async ({ warehouseId, mealType, planDate, planDateFrom, planDateTo, search, skip = 0, take = 20, orderBy }) => {
  const where = { isActive: true };

  if (warehouseId) where.warehouseId = warehouseId;
  if (mealType) where.mealType = mealType;

  if (planDateFrom && planDateTo) {
    where.planDate = { gte: new Date(planDateFrom), lte: new Date(planDateTo) };
  } else if (planDate) {
    where.planDate = { gte: new Date(planDate), lt: new Date(new Date(planDate).getTime() + 86400000) };
  }

  if (search) {
    where.OR = [
      { planName: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [menuPlans, total] = await Promise.all([
    prisma.menuPlan.findMany({
      where,
      skip: Number(skip),
      take: Number(take),
      orderBy: orderBy || { planDate: 'desc' },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        creator: { select: { id: true, name: true } },
        _count: { select: { items: true } },
        // Include items when querying for a week/calendar view
        ...(planDateFrom && planDateTo ? {
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              recipe: {
                select: {
                  id: true,
                  recipeCode: true,
                  recipeName: true,
                  mealType: true,
                  foodType: true,
                  standardPax: true,
                  status: true,
                },
              },
            },
          },
        } : {}),
      },
    }),
    prisma.menuPlan.count({ where }),
  ]);

  return { menuPlans, total };
};

/**
 * Get a single menu plan by id.
 */
const getMenuPlanById = async (id) => {
  const menuPlan = await prisma.menuPlan.findFirst({
    where: { id, isActive: true },
    include: MENU_PLAN_INCLUDE,
  });
  if (!menuPlan) throw Object.assign(new Error('Menu plan not found'), { status: 404 });
  return menuPlan;
};

/**
 * Create a new menu plan.
 */
const createMenuPlan = async (data, userId) => {
  const { items, ...planData } = data;
  if (!planData.warehouseId) planData.warehouseId = await getDefaultWarehouseId();

  return prisma.menuPlan.create({
    data: {
      ...planData,
      planDate: new Date(planData.planDate),
      createdBy: userId,
      items: items?.length
        ? {
            create: items.map((item, idx) => ({
              recipeId: item.recipeId,
              servings: item.servings || 1,
              notes: item.notes || null,
              sortOrder: item.sortOrder ?? idx,
            })),
          }
        : undefined,
    },
    include: MENU_PLAN_INCLUDE,
  });
};

/**
 * Update a menu plan.
 */
const updateMenuPlan = async (id, data, userId) => {
  const plan = await prisma.menuPlan.findFirst({ where: { id, isActive: true } });
  if (!plan) throw Object.assign(new Error('Menu plan not found'), { status: 404 });

  const { items, ...planData } = data;
  if (planData.planDate) planData.planDate = new Date(planData.planDate);

  return prisma.menuPlan.update({
    where: { id },
    data: planData,
    include: MENU_PLAN_INCLUDE,
  });
};

/**
 * Soft-delete a menu plan.
 */
const deleteMenuPlan = async (id) => {
  const plan = await prisma.menuPlan.findFirst({ where: { id, isActive: true } });
  if (!plan) throw Object.assign(new Error('Menu plan not found'), { status: 404 });

  await prisma.menuPlan.update({ where: { id }, data: { isActive: false } });
};

/**
 * Add a recipe item to a menu plan.
 */
const addItem = async (menuPlanId, data) => {
  const plan = await prisma.menuPlan.findFirst({ where: { id: menuPlanId, isActive: true } });
  if (!plan) throw Object.assign(new Error('Menu plan not found'), { status: 404 });

  const recipe = await prisma.recipe.findFirst({ where: { id: data.recipeId, deletedAt: null } });
  if (!recipe) throw Object.assign(new Error('Recipe not found'), { status: 404 });

  const existingItem = await prisma.menuPlanItem.findFirst({
    where: { menuPlanId, recipeId: data.recipeId },
  });
  if (existingItem) throw Object.assign(new Error('Recipe already in this menu plan'), { status: 409 });

  const count = await prisma.menuPlanItem.count({ where: { menuPlanId } });

  return prisma.menuPlanItem.create({
    data: {
      menuPlanId,
      recipeId: data.recipeId,
      servings: data.servings || 1,
      notes: data.notes || null,
      sortOrder: data.sortOrder ?? count,
    },
    include: {
      recipe: {
        select: {
          id: true,
          recipeCode: true,
          recipeName: true,
          mealType: true,
          foodType: true,
          status: true,
          standardPax: true,
        },
      },
    },
  });
};

/**
 * Update a menu plan item.
 */
const updateItem = async (menuPlanId, itemId, data) => {
  const item = await prisma.menuPlanItem.findFirst({ where: { id: itemId, menuPlanId } });
  if (!item) throw Object.assign(new Error('Menu plan item not found'), { status: 404 });

  return prisma.menuPlanItem.update({
    where: { id: itemId },
    data: {
      servings: data.servings,
      notes: data.notes,
      sortOrder: data.sortOrder,
    },
    include: {
      recipe: {
        select: { id: true, recipeCode: true, recipeName: true, mealType: true, foodType: true },
      },
    },
  });
};

/**
 * Remove a recipe item from a menu plan.
 */
const removeItem = async (menuPlanId, itemId) => {
  const item = await prisma.menuPlanItem.findFirst({ where: { id: itemId, menuPlanId } });
  if (!item) throw Object.assign(new Error('Menu plan item not found'), { status: 404 });

  await prisma.menuPlanItem.delete({ where: { id: itemId } });
};

/**
 * Find an existing plan for a given date+mealType+warehouse, or create a new one.
 * Used by the calendar drop action.
 */
const findOrCreatePlan = async (planDate, mealType, warehouseId, userId) => {
  const resolvedWarehouseId = warehouseId || await getDefaultWarehouseId();
  const dateObj = new Date(planDate);
  const nextDay = new Date(dateObj.getTime() + 86400000);

  let plan = await prisma.menuPlan.findFirst({
    where: {
      mealType,
      warehouseId: resolvedWarehouseId,
      isActive: true,
      planDate: { gte: dateObj, lt: nextDay },
    },
  });

  if (!plan) {
    const fmt = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    plan = await prisma.menuPlan.create({
      data: {
        planName: `${mealType.charAt(0) + mealType.slice(1).toLowerCase()} — ${fmt}`,
        planDate: dateObj,
        mealType,
        warehouseId: resolvedWarehouseId,
        createdBy: userId,
      },
    });
  }

  return plan;
};

/**
 * Drop a recipe onto a calendar slot (date + mealType). Creates plan if needed, then adds item.
 */
const dropRecipeOnSlot = async ({ planDate, mealType, warehouseId, recipeId, servings = 1 }, userId) => {
  const plan = await findOrCreatePlan(planDate, mealType, warehouseId, userId);

  // Avoid duplicates
  const existing = await prisma.menuPlanItem.findFirst({ where: { menuPlanId: plan.id, recipeId } });
  if (existing) return { plan, item: existing, alreadyExists: true };

  const count = await prisma.menuPlanItem.count({ where: { menuPlanId: plan.id } });
  const item = await prisma.menuPlanItem.create({
    data: { menuPlanId: plan.id, recipeId, servings, sortOrder: count },
    include: {
      recipe: {
        select: { id: true, recipeCode: true, recipeName: true, mealType: true, foodType: true, standardPax: true },
      },
    },
  });

  return { plan, item, alreadyExists: false };
};

/**
 * Move a recipe item from one slot to another. Removes from source, adds to target.
 */
const moveItemBetweenSlots = async ({ itemId, sourcePlanId, targetDate, targetMealType, warehouseId }, userId) => {
  const item = await prisma.menuPlanItem.findFirst({ where: { id: itemId, menuPlanId: sourcePlanId } });
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });

  const resolvedWarehouseId = warehouseId || await getDefaultWarehouseId();
  const targetPlan = await findOrCreatePlan(targetDate, targetMealType, resolvedWarehouseId, userId);

  if (targetPlan.id === sourcePlanId) return; // same slot

  // Check not duplicate
  const exists = await prisma.menuPlanItem.findFirst({ where: { menuPlanId: targetPlan.id, recipeId: item.recipeId } });
  if (exists) {
    await prisma.menuPlanItem.delete({ where: { id: itemId } });
    return;
  }

  await prisma.menuPlanItem.update({
    where: { id: itemId },
    data: { menuPlanId: targetPlan.id },
  });
};

module.exports = {
  listMenuPlans,
  getMenuPlanById,
  createMenuPlan,
  updateMenuPlan,
  deleteMenuPlan,
  addItem,
  updateItem,
  removeItem,
  dropRecipeOnSlot,
  moveItemBetweenSlots,
};
