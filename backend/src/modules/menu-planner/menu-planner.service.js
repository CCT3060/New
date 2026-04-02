const prisma = require('../../db/prisma');

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
const listMenuPlans = async ({ warehouseId, mealType, planDate, search, skip = 0, take = 20, orderBy }) => {
  const where = { isActive: true };

  if (warehouseId) where.warehouseId = warehouseId;
  if (mealType) where.mealType = mealType;
  if (planDate) where.planDate = { gte: new Date(planDate), lt: new Date(new Date(planDate).getTime() + 86400000) };
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

module.exports = {
  listMenuPlans,
  getMenuPlanById,
  createMenuPlan,
  updateMenuPlan,
  deleteMenuPlan,
  addItem,
  updateItem,
  removeItem,
};
