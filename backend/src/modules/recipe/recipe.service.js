const { v4: uuidv4 } = require('uuid');
const db = require('../../db/mysql');
const recipeRepo = require('./recipe.repository');
const auditService = require('../audit/audit.service');
const inventoryService = require('../inventory/inventory.service');
const { AppError } = require('../../middleware/error.middleware');

const EDITABLE_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

const VALID_TRANSITIONS = {
  DRAFT: ['ACTIVE', 'INACTIVE', 'UNDER_REVIEW', 'ARCHIVED'],
  UNDER_REVIEW: ['DRAFT', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED'],
  APPROVED: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
  ACTIVE: ['INACTIVE', 'ARCHIVED'],
  INACTIVE: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE', 'INACTIVE'],
};

const calcNetQty = (grossQty, wastagePercent) =>
  parseFloat((grossQty - (grossQty * wastagePercent) / 100).toFixed(4));

const calcLineCost = (netQty, unitCost) =>
  parseFloat((netQty * unitCost).toFixed(4));

const buildCostData = (ingredients, { fuelCost = 0, laborCost = 0, packagingCost = 0, otherCost = 0, standardPax }) => {
  const ingredientCost = ingredients.reduce((sum, ing) => sum + parseFloat(ing.lineCost), 0);
  const totalCost = ingredientCost + fuelCost + laborCost + packagingCost + otherCost;
  const costPerPax = standardPax > 0 ? parseFloat((totalCost / standardPax).toFixed(4)) : 0;
  return {
    ingredientCost: parseFloat(ingredientCost.toFixed(4)),
    fuelCost, laborCost, packagingCost, otherCost,
    totalCost: parseFloat(totalCost.toFixed(4)),
    costPerPax,
  };
};

const getDefaultWarehouseId = async () => {
  const [[w]] = await db.query('SELECT id FROM warehouses WHERE isActive = 1 LIMIT 1');
  if (!w) throw new AppError('No warehouse configured in the system', 400);
  return w.id;
};

const assertRecipeExists = async (id) => {
  const recipe = await recipeRepo.findById(id);
  if (!recipe) throw new AppError('Recipe not found', 404);
  return recipe;
};

const assertEditable = (recipe) => {
  if (!EDITABLE_STATUSES.includes(recipe.status)) {
    throw new AppError(
      `Recipe cannot be edited in '${recipe.status}' status. Create a new version for approved/active recipes.`,
      400
    );
  }
};

//  RECIPE CRUD 

const listRecipes = async (filters) => recipeRepo.findAll(filters);

const getRecipeById = async (id) => {
  const recipe = await recipeRepo.findById(id);
  if (!recipe) throw new AppError('Recipe not found', 404);
  return recipe;
};

const createRecipe = async (data, userId) => {
  const existing = await recipeRepo.findByCode(data.recipeCode);
  if (existing) throw new AppError(`Recipe code '${data.recipeCode}' already exists`, 409);

  if (!data.warehouseId) data.warehouseId = await getDefaultWarehouseId();

  const { tags = [], ...recipeData } = data;

  const recipe = await recipeRepo.create({
    ...recipeData,
    status: recipeData.status || 'DRAFT',
    versionNumber: 1,
    isCurrentVersion: true,
    createdBy: userId,
  });

  if (tags.length > 0) await recipeRepo.syncTags(recipe.id, tags);

  await recipeRepo.createVersionLog({
    recipeId: recipe.id,
    versionNumber: 1,
    changeSummary: 'Recipe created',
    changedBy: userId,
    isCurrent: true,
  });

  await auditService.log({
    module: 'RECIPE', entityId: recipe.id, action: 'CREATED',
    newValue: { recipeCode: recipe.recipeCode, recipeName: recipe.recipeName }, userId,
  });

  return recipeRepo.findById(recipe.id);
};

const updateRecipe = async (id, data, userId) => {
  const recipe = await assertRecipeExists(id);
  assertEditable(recipe);

  const { tags, ...recipeData } = data;

  await recipeRepo.update(id, recipeData);
  if (tags !== undefined) await recipeRepo.syncTags(id, tags);

  await auditService.log({
    module: 'RECIPE', entityId: id, action: 'UPDATED',
    oldValue: { status: recipe.status }, newValue: recipeData, userId,
  });

  return recipeRepo.findById(id);
};

const deleteRecipe = async (id, userId) => {
  const recipe = await assertRecipeExists(id);
  if (recipe.status === 'ACTIVE') throw new AppError('Cannot delete an active recipe. Deactivate it first.', 400);

  await recipeRepo.softDelete(id);

  await auditService.log({
    module: 'RECIPE', entityId: id, action: 'DELETED',
    oldValue: { status: recipe.status }, userId,
  });
};

//  INGREDIENTS 

const addIngredient = async (recipeId, data, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  assertEditable(recipe);

  const duplicate = await recipeRepo.findIngredientByRecipeAndItem(recipeId, data.inventoryItemId);
  if (duplicate) throw new AppError('This ingredient is already added to the recipe. Edit the existing row instead.', 409);

  const item = await inventoryService.getItemById(data.inventoryItemId);
  if (!item.isActive) throw new AppError(`Inventory item '${item.itemName}' is inactive and cannot be added to recipes`, 400);

  const netQty = calcNetQty(data.grossQty, data.wastagePercent || 0);
  const lineCost = calcLineCost(netQty, parseFloat(item.costPerUnit));
  const currentCount = await recipeRepo.countIngredients(recipeId);

  const ingredient = await recipeRepo.createIngredient({
    recipeId, inventoryItemId: data.inventoryItemId,
    grossQty: data.grossQty, grossUnit: data.grossUnit,
    wastagePercent: data.wastagePercent || 0,
    netQty, netUnit: data.grossUnit,
    unitCostSnapshot: parseFloat(item.costPerUnit),
    lineCost,
    sequenceNo: currentCount + 1,
    notes: data.notes || null,
  });

  await auditService.log({
    module: 'RECIPE', entityId: recipeId, action: 'INGREDIENT_ADDED',
    newValue: { itemName: item.itemName, grossQty: data.grossQty }, userId,
  });

  await recalculateCost(recipeId, {}, recipe.standardPax);
  return ingredient;
};

const updateIngredient = async (recipeId, ingredientId, data, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  assertEditable(recipe);

  const ingredient = await recipeRepo.findIngredientById(ingredientId);
  if (!ingredient || ingredient.recipeId !== recipeId) throw new AppError('Ingredient not found on this recipe', 404);

  const grossQty = data.grossQty !== undefined ? data.grossQty : parseFloat(ingredient.grossQty);
  const wastagePercent = data.wastagePercent !== undefined ? data.wastagePercent : parseFloat(ingredient.wastagePercent);
  const netQty = calcNetQty(grossQty, wastagePercent);
  const lineCost = calcLineCost(netQty, parseFloat(ingredient.unitCostSnapshot));

  const updated = await recipeRepo.updateIngredient(ingredientId, { ...data, netQty, lineCost });
  await recalculateCost(recipeId, {}, recipe.standardPax);
  return updated;
};

const removeIngredient = async (recipeId, ingredientId, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  assertEditable(recipe);

  const ingredient = await recipeRepo.findIngredientById(ingredientId);
  if (!ingredient || ingredient.recipeId !== recipeId) throw new AppError('Ingredient not found on this recipe', 404);

  await recipeRepo.deleteIngredient(ingredientId);

  await auditService.log({
    module: 'RECIPE', entityId: recipeId, action: 'INGREDIENT_REMOVED',
    oldValue: { inventoryItemId: ingredient.inventoryItemId }, userId,
  });

  await recalculateCost(recipeId, {}, recipe.standardPax);
};

//  STEPS 

const addStep = async (recipeId, data, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  assertEditable(recipe);
  return recipeRepo.createStep({ recipeId, ...data });
};

const updateStep = async (recipeId, stepId, data, userId) => {
  await assertRecipeExists(recipeId);
  const step = await recipeRepo.findStepById(stepId);
  if (!step || step.recipeId !== recipeId) throw new AppError('Step not found on this recipe', 404);
  return recipeRepo.updateStep(stepId, data);
};

const removeStep = async (recipeId, stepId, userId) => {
  await assertRecipeExists(recipeId);
  const step = await recipeRepo.findStepById(stepId);
  if (!step || step.recipeId !== recipeId) throw new AppError('Step not found on this recipe', 404);
  await recipeRepo.deleteStep(stepId);
};

//  COSTING 

const getCosting = async (recipeId) => {
  await assertRecipeExists(recipeId);
  return recipeRepo.getLatestCost(recipeId) || null;
};

const recalculateCost = async (recipeId, overheads = {}, standardPax) => {
  if (!standardPax) {
    const recipe = await recipeRepo.findById(recipeId);
    if (!recipe) return;
    standardPax = recipe.standardPax;
  }

  const ingredients = await recipeRepo.getIngredients(recipeId);
  const latestCost = await recipeRepo.getLatestCost(recipeId);

  const existingOverheads = latestCost
    ? { fuelCost: parseFloat(latestCost.fuelCost), laborCost: parseFloat(latestCost.laborCost),
        packagingCost: parseFloat(latestCost.packagingCost), otherCost: parseFloat(latestCost.otherCost) }
    : {};

  const merged = { ...existingOverheads, ...overheads };
  const costData = buildCostData(ingredients, { ...merged, standardPax });
  return recipeRepo.upsertCost(recipeId, costData);
};

const updateCosting = async (recipeId, overheadData, userId) => {
  await assertRecipeExists(recipeId);
  return recalculateCost(recipeId, overheadData);
};

//  STATUS 

const submitForReview = async (recipeId, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  if (recipe.status !== 'DRAFT') throw new AppError('Only DRAFT recipes can be submitted for review', 400);

  const ingredientCount = await recipeRepo.countIngredients(recipeId);
  if (ingredientCount === 0) throw new AppError('Recipe must have at least one ingredient before submitting for review', 400);

  await recipeRepo.update(recipeId, { status: 'UNDER_REVIEW' });

  await auditService.log({
    module: 'RECIPE', entityId: recipeId, action: 'SUBMITTED_FOR_REVIEW',
    oldValue: { status: 'DRAFT' }, newValue: { status: 'UNDER_REVIEW' }, userId,
  });

  return recipeRepo.findById(recipeId);
};

const approveRecipe = async (recipeId, note, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  if (recipe.status !== 'UNDER_REVIEW') throw new AppError('Only recipes UNDER_REVIEW can be approved', 400);

  const ingredientCount = await recipeRepo.countIngredients(recipeId);
  if (ingredientCount === 0) throw new AppError('Cannot approve a recipe with no ingredients', 400);

  await recipeRepo.update(recipeId, { status: 'APPROVED', approvedBy: userId, approvedAt: new Date(), approvalNote: note || null });

  await auditService.log({
    module: 'RECIPE', entityId: recipeId, action: 'APPROVED',
    oldValue: { status: 'UNDER_REVIEW' }, newValue: { status: 'APPROVED', approvedBy: userId }, userId,
  });

  return recipeRepo.findById(recipeId);
};

const rejectRecipe = async (recipeId, note, userId) => {
  const recipe = await assertRecipeExists(recipeId);
  if (recipe.status !== 'UNDER_REVIEW') throw new AppError('Only recipes UNDER_REVIEW can be rejected', 400);

  await recipeRepo.update(recipeId, { status: 'DRAFT', approvalNote: `REJECTED: ${note}` });

  await auditService.log({
    module: 'RECIPE', entityId: recipeId, action: 'STATUS_CHANGED',
    oldValue: { status: 'UNDER_REVIEW' }, newValue: { status: 'DRAFT', note }, userId,
  });

  return recipeRepo.findById(recipeId);
};

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
    module: 'RECIPE', entityId: recipeId, action: 'STATUS_CHANGED',
    oldValue: { status: recipe.status }, newValue: { status: newStatus }, userId,
  });

  return recipeRepo.findById(recipeId);
};

//  VERSIONING 

const createNewVersion = async (recipeId, changeSummary, userId) => {
  const originalRecipe = await assertRecipeExists(recipeId);

  if (!['APPROVED', 'ACTIVE'].includes(originalRecipe.status)) {
    throw new AppError('New versions can only be created from APPROVED or ACTIVE recipes', 400);
  }

  const ingredients = await recipeRepo.getIngredients(recipeId);
  const steps = await recipeRepo.getSteps(recipeId);
  const latestCost = await recipeRepo.getLatestCost(recipeId);
  const tags = await recipeRepo.getTags(recipeId);

  const baseId = originalRecipe.baseRecipeId || originalRecipe.id;
  const newVersion = originalRecipe.versionNumber + 1;
  const newId = uuidv4();

  // Create new recipe clone
  await recipeRepo.create({
    id: newId,
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
  });

  // Mark original as not current
  await recipeRepo.update(originalRecipe.id, { isCurrentVersion: false });

  // Clone ingredients
  for (const ing of ingredients) {
    await recipeRepo.createIngredient({
      recipeId: newId,
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
    });
  }

  // Clone steps
  for (const step of steps) {
    await recipeRepo.createStep({
      recipeId: newId,
      stepNo: step.stepNo,
      stepType: step.stepType,
      instruction: step.instruction,
      estimatedTimeMin: step.estimatedTimeMin,
      equipmentName: step.equipmentName,
      temperatureNote: step.temperatureNote,
      qcCheckNote: step.qcCheckNote,
    });
  }

  // Clone tags
  if (tags.length > 0) await recipeRepo.syncTags(newId, tags.map(t => t.tagName));

  // Clone cost
  if (latestCost) {
    await recipeRepo.upsertCost(newId, {
      ingredientCost: latestCost.ingredientCost,
      fuelCost: latestCost.fuelCost,
      laborCost: latestCost.laborCost,
      packagingCost: latestCost.packagingCost,
      otherCost: latestCost.otherCost,
      totalCost: latestCost.totalCost,
      costPerPax: latestCost.costPerPax,
    });
  }

  // Version log for new recipe
  await recipeRepo.createVersionLog({
    recipeId: newId,
    baseRecipeId: baseId,
    versionNumber: newVersion,
    changeSummary,
    changedBy: userId,
    isCurrent: true,
  });

  // Mark previous version logs not current
  await recipeRepo.markVersionsNotCurrent(originalRecipe.id);

  await auditService.log({
    module: 'RECIPE', entityId: newId, action: 'VERSION_CREATED',
    newValue: { versionNumber: newVersion, baseRecipeId: baseId, changeSummary }, userId,
  });

  return recipeRepo.findById(newId);
};

const getVersionHistory = async (recipeId) => {
  const recipe = await assertRecipeExists(recipeId);
  const baseId = recipe.baseRecipeId || recipe.id;
  return recipeRepo.findVersionsByBaseId(baseId);
};

//  SCALING 

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
      itemCode: ing.inventoryItem?.itemCode,
      itemName: ing.inventoryItem?.itemName,
      grossQty: scaledGrossQty,
      grossUnit: ing.grossUnit,
      wastagePercent: parseFloat(ing.wastagePercent),
      netQty: scaledNetQty,
      netUnit: ing.netUnit,
      unitCost: parseFloat(ing.unitCostSnapshot),
      lineCost: scaledLineCost,
      warehouseId: recipe.warehouseId,
      recipeId: recipe.id,
      recipeName: recipe.recipeName,
    };
  });

  const ingredientCost = scaledIngredients.reduce((sum, i) => sum + i.lineCost, 0);
  const latestCost = await recipeRepo.getLatestCost(recipeId);

  const estimatedTotalCost = latestCost
    ? parseFloat((
        ingredientCost +
        parseFloat(latestCost.fuelCost) * scaleFactor +
        parseFloat(latestCost.laborCost) * scaleFactor +
        parseFloat(latestCost.packagingCost) * scaleFactor +
        parseFloat(latestCost.otherCost) * scaleFactor
      ).toFixed(4))
    : parseFloat(ingredientCost.toFixed(4));

  return {
    recipeId: recipe.id, recipeCode: recipe.recipeCode, recipeName: recipe.recipeName,
    standardPax: recipe.standardPax, targetPax,
    scaleFactor: parseFloat(scaleFactor.toFixed(4)),
    scaledIngredients,
    costEstimate: {
      ingredientCost: parseFloat(ingredientCost.toFixed(4)),
      estimatedTotalCost,
      costPerPax: parseFloat((estimatedTotalCost / targetPax).toFixed(4)),
    },
  };
};

//  LOOKUP 

const lookupRecipes = async ({ status, mealType, warehouseId, page = 1, limit = 50 }) => {
  const conds = ['r.deletedAt IS NULL', 'r.isCurrentVersion = 1'];
  const params = [];

  if (status) {
    conds.push('r.status = ?'); params.push(status);
  } else {
    conds.push("r.status IN ('APPROVED', 'ACTIVE')");
  }
  if (mealType) { conds.push('r.mealType = ?'); params.push(mealType); }
  if (warehouseId) { conds.push('r.warehouseId = ?'); params.push(warehouseId); }

  const where = 'WHERE ' + conds.join(' AND ');
  const skip = (page - 1) * limit;

  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM recipes r ${where}`, params);
  const [rows] = await db.query(`
    SELECT r.id, r.recipeCode, r.recipeName, r.category, r.mealType, r.foodType, r.cuisineType,
           r.standardPax, r.yieldQty, r.yieldUnit, r.portionPerPax, r.status,
           r.versionNumber, r.warehouseId,
           w.id AS w_id, w.name AS w_name, w.code AS w_code
    FROM recipes r
    LEFT JOIN warehouses w ON w.id = r.warehouseId
    ${where} ORDER BY r.recipeName ASC LIMIT ? OFFSET ?`,
    [...params, limit, skip]
  );

  const recipes = await Promise.all(rows.map(async (r) => {
    const [tags] = await db.query('SELECT id, recipeId, tagName FROM recipe_tags WHERE recipeId = ?', [r.id]);
    const [costs] = await db.query('SELECT * FROM recipe_costs WHERE recipeId = ? ORDER BY calculatedAt DESC LIMIT 1', [r.id]);
    return {
      ...r,
      warehouse: r.w_id ? { id: r.w_id, name: r.w_name, code: r.w_code } : null,
      tags, costs,
    };
  }));

  return { recipes, total };
};

module.exports = {
  listRecipes, getRecipeById, createRecipe, updateRecipe, deleteRecipe,
  addIngredient, updateIngredient, removeIngredient,
  addStep, updateStep, removeStep,
  getCosting, recalculateCost, updateCosting,
  submitForReview, approveRecipe, rejectRecipe, changeStatus,
  createNewVersion, getVersionHistory,
  scaleRecipe, lookupRecipes,
};