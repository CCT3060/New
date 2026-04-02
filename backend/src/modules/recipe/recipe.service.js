const prisma = require('../../db/prisma');
const recipeRepo = require('./recipe.repository');
const auditService = require('../audit/audit.service');
const inventoryService = require('../inventory/inventory.service');
const { AppError } = require('../../middleware/error.middleware');

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Statuses that allow direct editing
const EDITABLE_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

// Valid status transition map
const VALID_TRANSITIONS = {
  DRAFT: ['ACTIVE', 'INACTIVE', 'UNDER_REVIEW', 'ARCHIVED'],
  UNDER_REVIEW: ['DRAFT', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED'],
  APPROVED: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
  ACTIVE: ['INACTIVE', 'ARCHIVED'],
  INACTIVE: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE', 'INACTIVE'],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate net quantity from gross and wastage
 */
const calcNetQty = (grossQty, wastagePercent) => {
  return parseFloat((grossQty - (grossQty * wastagePercent) / 100).toFixed(4));
};

/**
 * Calculate line cost: netQty * unitCost
 */
const calcLineCost = (netQty, unitCost) => {
  return parseFloat((netQty * unitCost).toFixed(4));
};

/**
 * Build full costing from ingredients + overheads
 */
const buildCostData = (ingredients, { fuelCost = 0, laborCost = 0, packagingCost = 0, otherCost = 0, standardPax }) => {
  const ingredientCost = ingredients.reduce((sum, ing) => sum + parseFloat(ing.lineCost), 0);
  const totalCost = ingredientCost + fuelCost + laborCost + packagingCost + otherCost;
  const costPerPax = standardPax > 0 ? parseFloat((totalCost / standardPax).toFixed(4)) : 0;

  return {
    ingredientCost: parseFloat(ingredientCost.toFixed(4)),
    fuelCost,
    laborCost,
    packagingCost,
    otherCost,
    totalCost: parseFloat(totalCost.toFixed(4)),
    costPerPax,
  };
};

/**
 * Get the first active warehouse (fallback when none specified)
 */
const getDefaultWarehouseId = async () => {
  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
  if (!warehouse) throw new AppError('No warehouse configured in the system', 400);
  return warehouse.id;
};

/**
 * Assert recipe exists and not deleted
 */
const assertRecipeExists = async (id) => {
  const recipe = await recipeRepo.findById(id);
  if (!recipe) throw new AppError('Recipe not found', 404);
  return recipe;
};

/**
 * Assert recipe is in editable state
 */
const assertEditable = (recipe) => {
  if (!EDITABLE_STATUSES.includes(recipe.status)) {
    throw new AppError(
      `Recipe cannot be edited in '${recipe.status}' status. Create a new version for approved/active recipes.`,
      400
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RECIPE CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List recipes with pagination, search, and filters
 */
const listRecipes = async (filters) => {
  return recipeRepo.findAll(filters);
};

/**
 * Get single recipe by ID
 */
const getRecipeById = async (id) => {
  const recipe = await recipeRepo.findById(id);
  if (!recipe) throw new AppError('Recipe not found', 404);
  return recipe;
};

/**
 * Create a new recipe (starts as DRAFT)
 */
const createRecipe = async (data, userId) => {
  // Check for duplicate recipe code
  const existing = await recipeRepo.findByCode(data.recipeCode);
  if (existing) {
    throw new AppError(`Recipe code '${data.recipeCode}' already exists`, 409);
  }

  // Auto-assign warehouse if not provided
  if (!data.warehouseId) {
    data.warehouseId = await getDefaultWarehouseId();
  }

  const { tags = [], status: initialStatus, ...recipeData } = data;

  const recipe = await prisma.$transaction(async (tx) => {
    const created = await tx.recipe.create({
      data: {
        ...recipeData,
        status: initialStatus || 'DRAFT',
        versionNumber: 1,
        isCurrentVersion: true,
        createdBy: userId,
      },
    });

    // Sync tags
    if (tags.length > 0) {
      await tx.recipeTag.createMany({
        data: tags.map((tagName) => ({ recipeId: created.id, tagName })),
        skipDuplicates: true,
      });
    }

    // Initial version log
    await tx.recipeVersion.create({
      data: {
        recipeId: created.id,
        versionNumber: 1,
        changeSummary: 'Recipe created',
        changedBy: userId,
        isCurrent: true,
      },
    });

    return created;
  });

  await auditService.log({
    module: 'RECIPE',
    entityId: recipe.id,
    action: 'CREATED',
    newValue: { recipeCode: recipe.recipeCode, recipeName: recipe.recipeName },
    userId,
  });

  return recipeRepo.findById(recipe.id);
};

/**
 * Update recipe header (only in DRAFT or UNDER_REVIEW)
 */
const updateRecipe = async (id, data, userId) => {
  const recipe = await assertRecipeExists(id);
  assertEditable(recipe);

  const { tags, ...recipeData } = data;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedRecipe = await tx.recipe.update({
      where: { id },
      data: recipeData,
    });

    if (tags !== undefined) {
      await tx.recipeTag.deleteMany({ where: { recipeId: id } });
      if (tags.length > 0) {
        await tx.recipeTag.createMany({
          data: tags.map((tagName) => ({ recipeId: id, tagName })),
          skipDuplicates: true,
        });
      }
    }

    return updatedRecipe;
  });

  await auditService.log({
    module: 'RECIPE',
    entityId: id,
    action: 'UPDATED',
    oldValue: { status: recipe.status },
    newValue: recipeData,
    userId,
  });

  return recipeRepo.findById(id);
};

/**
 * Soft delete recipe (Admin only)
 */
const deleteRecipe = async (id, userId) => {
  const recipe = await assertRecipeExists(id);

  if (recipe.status === 'ACTIVE') {
    throw new AppError('Cannot delete an active recipe. Deactivate it first.', 400);
  }

  await recipeRepo.softDelete(id);

  await auditService.log({
    module: 'RECIPE',
    entityId: id,
    action: 'DELETED',
    oldValue: { status: recipe.status },
    userId,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// INGREDIENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add ingredient to recipe
 */
const addIngredient = async (recipeId, data, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  assertEditable(recipe);

  // Check for duplicate ingredient
  const duplicate = await recipeRepo.findIngredientByRecipeAndItem(recipeId, data.inventoryItemId);
  if (duplicate) {
    throw new AppError('This ingredient is already added to the recipe. Edit the existing row instead.', 409);
  }

  // Validate inventory item is active
  const item = await inventoryService.getItemById(data.inventoryItemId);
  if (!item.isActive) {
    throw new AppError(`Inventory item '${item.itemName}' is inactive and cannot be added to recipes`, 400);
  }

  const netQty = calcNetQty(data.grossQty, data.wastagePercent || 0);
  const lineCost = calcLineCost(netQty, parseFloat(item.costPerUnit));

  // Assign sequence number
  const currentCount = await recipeRepo.countIngredients(recipeId);

  const ingredient = await recipeRepo.createIngredient({
    recipeId,
    inventoryItemId: data.inventoryItemId,
    grossQty: data.grossQty,
    grossUnit: data.grossUnit,
    wastagePercent: data.wastagePercent || 0,
    netQty,
    netUnit: data.grossUnit, // same unit, wastage % affects only qty
    unitCostSnapshot: parseFloat(item.costPerUnit),
    lineCost,
    sequenceNo: currentCount + 1,
    notes: data.notes || null,
  });

  await auditService.log({
    module: 'RECIPE',
    entityId: recipeId,
    action: 'INGREDIENT_ADDED',
    newValue: { itemName: item.itemName, grossQty: data.grossQty },
    userId,
  });

  // Recalculate recipe costs
  await recalculateCost(recipeId, {}, recipe.standardPax);

  return ingredient;
};

/**
 * Update ingredient
 */
const updateIngredient = async (recipeId, ingredientId, data, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  assertEditable(recipe);

  const ingredient = await recipeRepo.findIngredientById(ingredientId);
  if (!ingredient || ingredient.recipeId !== recipeId) {
    throw new AppError('Ingredient not found on this recipe', 404);
  }

  const grossQty = data.grossQty !== undefined ? data.grossQty : parseFloat(ingredient.grossQty);
  const wastagePercent = data.wastagePercent !== undefined ? data.wastagePercent : parseFloat(ingredient.wastagePercent);
  const netQty = calcNetQty(grossQty, wastagePercent);
  const lineCost = calcLineCost(netQty, parseFloat(ingredient.unitCostSnapshot));

  const updated = await recipeRepo.updateIngredient(ingredientId, {
    ...data,
    netQty,
    lineCost,
  });

  await recalculateCost(recipeId, {}, recipe.standardPax);
  return updated;
};

/**
 * Remove ingredient
 */
const removeIngredient = async (recipeId, ingredientId, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  assertEditable(recipe);

  const ingredient = await recipeRepo.findIngredientById(ingredientId);
  if (!ingredient || ingredient.recipeId !== recipeId) {
    throw new AppError('Ingredient not found on this recipe', 404);
  }

  await recipeRepo.deleteIngredient(ingredientId);

  await auditService.log({
    module: 'RECIPE',
    entityId: recipeId,
    action: 'INGREDIENT_REMOVED',
    oldValue: { inventoryItemId: ingredient.inventoryItemId },
    userId,
  });

  await recalculateCost(recipeId, {}, recipe.standardPax);
};

// ─────────────────────────────────────────────────────────────────────────────
// STEPS
// ─────────────────────────────────────────────────────────────────────────────

const addStep = async (recipeId, data, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  assertEditable(recipe);

  return recipeRepo.createStep({ recipeId, ...data });
};

const updateStep = async (recipeId, stepId, data, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  assertEditable(recipe);

  const step = await recipeRepo.findStepById(stepId);
  if (!step || step.recipeId !== recipeId) {
    throw new AppError('Step not found on this recipe', 404);
  }

  return recipeRepo.updateStep(stepId, data);
};

const removeStep = async (recipeId, stepId, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  assertEditable(recipe);

  const step = await recipeRepo.findStepById(stepId);
  if (!step || step.recipeId !== recipeId) {
    throw new AppError('Step not found on this recipe', 404);
  }

  await recipeRepo.deleteStep(stepId);
};

// ─────────────────────────────────────────────────────────────────────────────
// COSTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get latest costing for a recipe
 */
const getCosting = async (recipeId) => {
  await assertRecipeExists(recipeId);
  const cost = await recipeRepo.getLatestCost(recipeId);
  return cost || null;
};

/**
 * Recalculate and save costing
 */
const recalculateCost = async (recipeId, overheads = {}, standardPax) => {
  // Get standardPax from recipe if not passed
  if (!standardPax) {
    const recipe = await recipeRepo.findById(recipeId);
    if (!recipe) return;
    standardPax = recipe.standardPax;
  }

  const ingredients = await recipeRepo.getIngredients(recipeId);
  const latestCost = await recipeRepo.getLatestCost(recipeId);

  const existingOverheads = latestCost
    ? {
        fuelCost: parseFloat(latestCost.fuelCost),
        laborCost: parseFloat(latestCost.laborCost),
        packagingCost: parseFloat(latestCost.packagingCost),
        otherCost: parseFloat(latestCost.otherCost),
      }
    : {};

  const merged = { ...existingOverheads, ...overheads };
  const costData = buildCostData(ingredients, { ...merged, standardPax });

  return recipeRepo.upsertCost(recipeId, costData);
};

/**
 * Update overhead costs and recalculate
 */
const updateCosting = async (recipeId, overheadData, userId) => {
  await assertRecipeExists(recipeId);
  return recalculateCost(recipeId, overheadData);
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit for review (Ops Manager)
 */
const submitForReview = async (recipeId, userId) => {
  const recipe = await assertRecipeExists(recipeId);

  if (recipe.status !== 'DRAFT') {
    throw new AppError('Only DRAFT recipes can be submitted for review', 400);
  }

  // Validation: must have at least one ingredient
  const ingredientCount = await recipeRepo.countIngredients(recipeId);
  if (ingredientCount === 0) {
    throw new AppError('Recipe must have at least one ingredient before submitting for review', 400);
  }

  await recipeRepo.update(recipeId, { status: 'UNDER_REVIEW' });

  await auditService.log({
    module: 'RECIPE',
    entityId: recipeId,
    action: 'SUBMITTED_FOR_REVIEW',
    oldValue: { status: 'DRAFT' },
    newValue: { status: 'UNDER_REVIEW' },
    userId,
  });

  return recipeRepo.findById(recipeId);
};

/**
 * Approve recipe (Approver / Admin)
 */
const approveRecipe = async (recipeId, note, userId) => {
  const recipe = await assertRecipeExists(recipeId);

  if (recipe.status !== 'UNDER_REVIEW') {
    throw new AppError('Only recipes UNDER_REVIEW can be approved', 400);
  }

  const ingredientCount = await recipeRepo.countIngredients(recipeId);
  if (ingredientCount === 0) {
    throw new AppError('Cannot approve a recipe with no ingredients', 400);
  }

  await recipeRepo.update(recipeId, {
    status: 'APPROVED',
    approvedBy: userId,
    approvedAt: new Date(),
    approvalNote: note || null,
  });

  await auditService.log({
    module: 'RECIPE',
    entityId: recipeId,
    action: 'APPROVED',
    oldValue: { status: 'UNDER_REVIEW' },
    newValue: { status: 'APPROVED', approvedBy: userId },
    userId,
  });

  return recipeRepo.findById(recipeId);
};

/**
 * Reject recipe (Approver / Admin)
 */
const rejectRecipe = async (recipeId, note, userId) => {
  const recipe = await assertRecipeExists(recipeId);

  if (recipe.status !== 'UNDER_REVIEW') {
    throw new AppError('Only recipes UNDER_REVIEW can be rejected', 400);
  }

  await recipeRepo.update(recipeId, {
    status: 'DRAFT',
    approvalNote: `REJECTED: ${note}`,
  });

  await auditService.log({
    module: 'RECIPE',
    entityId: recipeId,
    action: 'STATUS_CHANGED',
    oldValue: { status: 'UNDER_REVIEW' },
    newValue: { status: 'DRAFT', note },
    userId,
  });

  return recipeRepo.findById(recipeId);
};

/**
 * Change recipe status (Admin only for direct status changes)
 */
const changeStatus = async (recipeId, newStatus, note, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  const allowed = VALID_TRANSITIONS[recipe.status];

  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Invalid status transition from '${recipe.status}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
      400
    );
  }

  const updateData = { status: newStatus };
  if (note) updateData.approvalNote = note;

  await recipeRepo.update(recipeId, updateData);

  await auditService.log({
    module: 'RECIPE',
    entityId: recipeId,
    action: 'STATUS_CHANGED',
    oldValue: { status: recipe.status },
    newValue: { status: newStatus },
    userId,
  });

  return recipeRepo.findById(recipeId);
};

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new version from an existing approved/active recipe
 */
const createNewVersion = async (recipeId, changeSummary, userId) => {
  const originalRecipe = await assertRecipeExists(recipeId);

  // Only approved or active recipes should spawn versions
  if (!['APPROVED', 'ACTIVE'].includes(originalRecipe.status)) {
    throw new AppError('New versions can only be created from APPROVED or ACTIVE recipes', 400);
  }

  const ingredients = await recipeRepo.getIngredients(recipeId);
  const steps = await prisma.recipeStep.findMany({ where: { recipeId }, orderBy: { stepNo: 'asc' } });
  const latestCost = await recipeRepo.getLatestCost(recipeId);
  const tags = await prisma.recipeTag.findMany({ where: { recipeId } });

  const baseId = originalRecipe.baseRecipeId || originalRecipe.id;
  const newVersion = originalRecipe.versionNumber + 1;

  const newRecipe = await prisma.$transaction(async (tx) => {
    // Create new recipe clone
    const cloned = await tx.recipe.create({
      data: {
        recipeCode: `${originalRecipe.recipeCode}-V${newVersion}`,
        recipeName: originalRecipe.recipeName,
        category: originalRecipe.category,
        mealType: originalRecipe.mealType,
        foodType: originalRecipe.foodType,
        cuisineType: originalRecipe.cuisineType,
        description: originalRecipe.description,
        standardPax: originalRecipe.standardPax,
        yieldQty: originalRecipe.yieldQty,
        yieldUnit: originalRecipe.yieldUnit,
        portionPerPax: originalRecipe.portionPerPax,
        prepTimeMin: originalRecipe.prepTimeMin,
        cookTimeMin: originalRecipe.cookTimeMin,
        status: 'DRAFT',
        versionNumber: newVersion,
        isCurrentVersion: true,
        baseRecipeId: baseId,
        warehouseId: originalRecipe.warehouseId,
        createdBy: userId,
      },
    });

    // Mark original as not current
    await tx.recipe.update({
      where: { id: originalRecipe.id },
      data: { isCurrentVersion: false },
    });

    // Clone ingredients
    if (ingredients.length > 0) {
      await tx.recipeIngredient.createMany({
        data: ingredients.map((ing) => ({
          recipeId: cloned.id,
          inventoryItemId: ing.inventoryItemId,
          sequenceNo: ing.sequenceNo,
          grossQty: ing.grossQty,
          grossUnit: ing.grossUnit,
          wastagePercent: ing.wastagePercent,
          netQty: ing.netQty,
          netUnit: ing.netUnit,
          unitCostSnapshot: ing.unitCostSnapshot,
          lineCost: ing.lineCost,
          notes: ing.notes,
        })),
      });
    }

    // Clone steps
    if (steps.length > 0) {
      await tx.recipeStep.createMany({
        data: steps.map((step) => ({
          recipeId: cloned.id,
          stepNo: step.stepNo,
          stepType: step.stepType,
          instruction: step.instruction,
          estimatedTimeMin: step.estimatedTimeMin,
          equipmentName: step.equipmentName,
          temperatureNote: step.temperatureNote,
          qcCheckNote: step.qcCheckNote,
        })),
      });
    }

    // Clone tags
    if (tags.length > 0) {
      await tx.recipeTag.createMany({
        data: tags.map((t) => ({ recipeId: cloned.id, tagName: t.tagName })),
        skipDuplicates: true,
      });
    }

    // Clone cost as starting point
    if (latestCost) {
      await tx.recipeCost.create({
        data: {
          recipeId: cloned.id,
          ingredientCost: latestCost.ingredientCost,
          fuelCost: latestCost.fuelCost,
          laborCost: latestCost.laborCost,
          packagingCost: latestCost.packagingCost,
          otherCost: latestCost.otherCost,
          totalCost: latestCost.totalCost,
          costPerPax: latestCost.costPerPax,
        },
      });
    }

    // Version log
    await tx.recipeVersion.create({
      data: {
        recipeId: cloned.id,
        baseRecipeId: baseId,
        versionNumber: newVersion,
        changeSummary,
        changedBy: userId,
        isCurrent: true,
      },
    });

    // Mark all previous version logs not current
    await tx.recipeVersion.updateMany({
      where: { recipeId: originalRecipe.id },
      data: { isCurrent: false },
    });

    return cloned;
  });

  await auditService.log({
    module: 'RECIPE',
    entityId: newRecipe.id,
    action: 'VERSION_CREATED',
    newValue: { versionNumber: newVersion, baseRecipeId: baseId, changeSummary },
    userId,
  });

  return recipeRepo.findById(newRecipe.id);
};

/**
 * Get all versions of a base recipe
 */
const getVersionHistory = async (recipeId) => {
  const recipe = await assertRecipeExists(recipeId);
  const baseId = recipe.baseRecipeId || recipe.id;

  const allVersions = await prisma.recipe.findMany({
    where: {
      OR: [
        { id: baseId },
        { baseRecipeId: baseId },
      ],
      deletedAt: null,
    },
    include: {
      creator: { select: { id: true, name: true } },
      costs: { orderBy: { calculatedAt: 'desc' }, take: 1 },
    },
    orderBy: { versionNumber: 'desc' },
  });

  return allVersions;
};

// ─────────────────────────────────────────────────────────────────────────────
// SCALING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scale ingredient quantities from standard pax to target pax
 */
const scaleRecipe = async (recipeId, targetPax) => {
  const recipe = await assertRecipeExists(recipeId);

  if (targetPax <= 0) throw new AppError('Target pax must be greater than 0', 400);

  const ingredients = await recipeRepo.getIngredients(recipeId);
  const scaleFactor = targetPax / recipe.standardPax;

  const scaledIngredients = ingredients.map((ing) => {
    const scaledGrossQty = parseFloat((parseFloat(ing.grossQty) * scaleFactor).toFixed(4));
    const scaledNetQty = calcNetQty(scaledGrossQty, parseFloat(ing.wastagePercent));
    const scaledLineCost = calcLineCost(scaledNetQty, parseFloat(ing.unitCostSnapshot));

    return {
      inventoryItemId: ing.inventoryItemId,
      itemCode: ing.inventoryItem.itemCode,
      itemName: ing.inventoryItem.itemName,
      grossQty: scaledGrossQty,
      grossUnit: ing.grossUnit,
      wastagePercent: parseFloat(ing.wastagePercent),
      netQty: scaledNetQty,
      netUnit: ing.netUnit,
      unitCost: parseFloat(ing.unitCostSnapshot),
      lineCost: scaledLineCost,
      // Requisition-ready
      warehouseId: recipe.warehouseId,
      recipeId: recipe.id,
      recipeName: recipe.recipeName,
    };
  });

  const ingredientCost = scaledIngredients.reduce((sum, i) => sum + i.lineCost, 0);
  const latestCost = await recipeRepo.getLatestCost(recipeId);
  const overheadScaleFactor = targetPax / recipe.standardPax;

  const estimatedTotalCost = latestCost
    ? parseFloat(
        (
          ingredientCost +
          parseFloat(latestCost.fuelCost) * overheadScaleFactor +
          parseFloat(latestCost.laborCost) * overheadScaleFactor +
          parseFloat(latestCost.packagingCost) * overheadScaleFactor +
          parseFloat(latestCost.otherCost) * overheadScaleFactor
        ).toFixed(4)
      )
    : parseFloat(ingredientCost.toFixed(4));

  return {
    recipeId: recipe.id,
    recipeCode: recipe.recipeCode,
    recipeName: recipe.recipeName,
    standardPax: recipe.standardPax,
    targetPax,
    scaleFactor: parseFloat(scaleFactor.toFixed(4)),
    scaledIngredients,
    costEstimate: {
      ingredientCost: parseFloat(ingredientCost.toFixed(4)),
      estimatedTotalCost,
      costPerPax: parseFloat((estimatedTotalCost / targetPax).toFixed(4)),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP (for menu planning integration)
// ─────────────────────────────────────────────────────────────────────────────

const lookupRecipes = async ({ status, mealType, warehouseId, page = 1, limit = 50 }) => {
  const where = {
    deletedAt: null,
    isCurrentVersion: true,
  };

  // Default to active/approved for downstream usage
  if (status) {
    where.status = status;
  } else {
    where.status = { in: ['APPROVED', 'ACTIVE'] };
  }

  if (mealType) where.mealType = mealType;
  if (warehouseId) where.warehouseId = warehouseId;

  const skip = (page - 1) * limit;

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      select: {
        id: true,
        recipeCode: true,
        recipeName: true,
        category: true,
        mealType: true,
        foodType: true,
        cuisineType: true,
        standardPax: true,
        yieldQty: true,
        yieldUnit: true,
        portionPerPax: true,
        status: true,
        versionNumber: true,
        warehouseId: true,
        warehouse: { select: { id: true, name: true, code: true } },
        tags: { select: { tagName: true } },
        costs: { orderBy: { calculatedAt: 'desc' }, take: 1 },
      },
      orderBy: { recipeName: 'asc' },
      skip,
      take: limit,
    }),
    prisma.recipe.count({ where }),
  ]);

  return { recipes, total };
};

module.exports = {
  listRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  addIngredient,
  updateIngredient,
  removeIngredient,
  addStep,
  updateStep,
  removeStep,
  getCosting,
  recalculateCost,
  updateCosting,
  submitForReview,
  approveRecipe,
  rejectRecipe,
  changeStatus,
  createNewVersion,
  getVersionHistory,
  scaleRecipe,
  lookupRecipes,
};
