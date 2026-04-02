const prisma = require('../../db/prisma');

// ─── Recipe Query Include ──────────────────────────────────────────────────────
const RECIPE_INCLUDE = {
  warehouse: { select: { id: true, name: true, code: true } },
  creator: { select: { id: true, name: true, email: true } },
  approver: { select: { id: true, name: true, email: true } },
  ingredients: {
    include: { inventoryItem: { select: { id: true, itemCode: true, itemName: true, unit: true, costPerUnit: true, isActive: true } } },
    orderBy: { sequenceNo: 'asc' },
  },
  steps: { orderBy: { stepNo: 'asc' } },
  costs: { orderBy: { calculatedAt: 'desc' }, take: 1 },
  tags: true,
};

const RECIPE_LIST_INCLUDE = {
  warehouse: { select: { id: true, name: true, code: true } },
  creator: { select: { id: true, name: true } },
  costs: { orderBy: { calculatedAt: 'desc' }, take: 1 },
  tags: true,
};

// ─── List Recipes ─────────────────────────────────────────────────────────────
const findAll = async ({
  search, status, mealType, category, foodType, warehouseId,
  isCurrentVersion = true, skip = 0, take = 20, orderBy = { updatedAt: 'desc' }
}) => {
  const where = { deletedAt: null };

  if (search) {
    where.OR = [
      { recipeName: { contains: search, mode: 'insensitive' } },
      { recipeCode: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;
  if (mealType) where.mealType = mealType;
  if (category) where.category = { contains: category, mode: 'insensitive' };
  if (foodType) where.foodType = foodType;
  if (warehouseId) where.warehouseId = warehouseId;
  if (isCurrentVersion !== undefined) where.isCurrentVersion = isCurrentVersion;

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({ where, include: RECIPE_LIST_INCLUDE, orderBy, skip, take }),
    prisma.recipe.count({ where }),
  ]);

  return { recipes, total };
};

// ─── Find Single Recipe ────────────────────────────────────────────────────────
const findById = async (id) => {
  return prisma.recipe.findFirst({
    where: { id, deletedAt: null },
    include: RECIPE_INCLUDE,
  });
};

const findByCode = async (recipeCode) => {
  return prisma.recipe.findFirst({ where: { recipeCode, deletedAt: null } });
};

// ─── Create Recipe ─────────────────────────────────────────────────────────────
const create = async (data) => {
  return prisma.recipe.create({ data, include: RECIPE_INCLUDE });
};

// ─── Update Recipe ─────────────────────────────────────────────────────────────
const update = async (id, data) => {
  return prisma.recipe.update({ where: { id }, data, include: RECIPE_INCLUDE });
};

// ─── Soft Delete ───────────────────────────────────────────────────────────────
const softDelete = async (id) => {
  return prisma.recipe.update({ where: { id }, data: { deletedAt: new Date() } });
};

// ─── Ingredients ──────────────────────────────────────────────────────────────
const findIngredientById = async (id) => {
  return prisma.recipeIngredient.findUnique({
    where: { id },
    include: { inventoryItem: true },
  });
};

const createIngredient = async (data) => {
  return prisma.recipeIngredient.create({
    data,
    include: { inventoryItem: { select: { id: true, itemCode: true, itemName: true, unit: true } } },
  });
};

const updateIngredient = async (id, data) => {
  return prisma.recipeIngredient.update({
    where: { id },
    data,
    include: { inventoryItem: { select: { id: true, itemCode: true, itemName: true, unit: true } } },
  });
};

const deleteIngredient = async (id) => {
  return prisma.recipeIngredient.delete({ where: { id } });
};

const findIngredientByRecipeAndItem = async (recipeId, inventoryItemId, excludeId = null) => {
  const where = { recipeId, inventoryItemId };
  if (excludeId) where.id = { not: excludeId };
  return prisma.recipeIngredient.findFirst({ where });
};

// ─── Steps ────────────────────────────────────────────────────────────────────
const findStepById = async (id) => {
  return prisma.recipeStep.findUnique({ where: { id } });
};

const createStep = async (data) => {
  return prisma.recipeStep.create({ data });
};

const updateStep = async (id, data) => {
  return prisma.recipeStep.update({ where: { id }, data });
};

const deleteStep = async (id) => {
  return prisma.recipeStep.delete({ where: { id } });
};

// ─── Costs ────────────────────────────────────────────────────────────────────
const getLatestCost = async (recipeId) => {
  return prisma.recipeCost.findFirst({
    where: { recipeId },
    orderBy: { calculatedAt: 'desc' },
  });
};

const upsertCost = async (recipeId, data) => {
  // Always create a new cost record (preserve history)
  return prisma.recipeCost.create({ data: { recipeId, ...data } });
};

// ─── Versions ────────────────────────────────────────────────────────────────
const getVersionHistory = async (baseRecipeId) => {
  return prisma.recipeVersion.findMany({
    where: { OR: [{ recipeId: baseRecipeId }, { baseRecipeId }] },
    include: { changer: { select: { id: true, name: true, role: true } } },
    orderBy: { versionNumber: 'desc' },
  });
};

const createVersionLog = async (data) => {
  return prisma.recipeVersion.create({ data });
};

// ─── Tags ────────────────────────────────────────────────────────────────────
const syncTags = async (recipeId, tagNames, tx = prisma) => {
  await tx.recipeTag.deleteMany({ where: { recipeId } });
  if (tagNames && tagNames.length > 0) {
    await tx.recipeTag.createMany({
      data: tagNames.map((tagName) => ({ recipeId, tagName })),
      skipDuplicates: true,
    });
  }
};

// ─── Ingredient count ─────────────────────────────────────────────────────────
const countIngredients = async (recipeId) => {
  return prisma.recipeIngredient.count({ where: { recipeId } });
};

// ─── Get all ingredients ──────────────────────────────────────────────────────
const getIngredients = async (recipeId) => {
  return prisma.recipeIngredient.findMany({
    where: { recipeId },
    include: { inventoryItem: true },
    orderBy: { sequenceNo: 'asc' },
  });
};

module.exports = {
  findAll,
  findById,
  findByCode,
  create,
  update,
  softDelete,
  findIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  findIngredientByRecipeAndItem,
  findStepById,
  createStep,
  updateStep,
  deleteStep,
  getLatestCost,
  upsertCost,
  getVersionHistory,
  createVersionLog,
  syncTags,
  countIngredients,
  getIngredients,
};
