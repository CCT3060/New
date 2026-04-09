const recipeService = require('./recipe.service');
const {
  createRecipeSchema,
  updateRecipeSchema,
  addIngredientSchema,
  updateIngredientSchema,
  addStepSchema,
  updateStepSchema,
  updateCostSchema,
  newVersionSchema,
  approvalSchema,
  rejectSchema,
  scaleSchema,
  statusChangeSchema,
} = require('./recipe.validation');
const { success, created, validationError, notFound, forbidden } = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta, getSortParams } = require('../../utils/pagination');
const { canEditRecipe, canApproveRecipe } = require('../../middleware/role.middleware');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const validate = (schema, data, res) => {
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    validationError(
      res,
      error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
    );
    return null;
  }
  return value;
};

// ─────────────────────────────────────────────────────────────────────────────
// RECIPE MASTER
// ─────────────────────────────────────────────────────────────────────────────

const listRecipes = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const orderBy = getSortParams(req.query, ['recipeName', 'recipeCode', 'createdAt', 'updatedAt', 'standardPax']);

    // Scope to companyId if the authenticated user has one
    const companyId = req.user?.companyId || null;

    const { recipes, total } = await recipeService.listRecipes({
      ...req.query,
      companyId: companyId || undefined,
      skip,
      take: limit,
      orderBy,
    });

    return success(res, {
      recipes,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (err) { next(err); }
};

const getRecipe = async (req, res, next) => {
  try {
    const recipe = await recipeService.getRecipeById(req.params.id);
    return success(res, recipe);
  } catch (err) { next(err); }
};

const createRecipe = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    const value = validate(createRecipeSchema, req.body, res);
    if (!value) return;

    const recipe = await recipeService.createRecipe(value, req.user.id);
    return created(res, recipe, 'Recipe created successfully');
  } catch (err) { next(err); }
};

const updateRecipe = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    const value = validate(updateRecipeSchema, req.body, res);
    if (!value) return;

    const recipe = await recipeService.updateRecipe(req.params.id, value, req.user.id);
    return success(res, recipe, 'Recipe updated successfully');
  } catch (err) { next(err); }
};

const deleteRecipe = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') return forbidden(res, 'Only Admins can delete recipes');

    await recipeService.deleteRecipe(req.params.id, req.user.id);
    return success(res, {}, 'Recipe deleted successfully');
  } catch (err) { next(err); }
};

const lookupRecipes = async (req, res, next) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { recipes, total } = await recipeService.lookupRecipes({ ...req.query, page, limit });
    return success(res, { recipes, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// INGREDIENTS
// ─────────────────────────────────────────────────────────────────────────────

const addIngredient = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    const value = validate(addIngredientSchema, req.body, res);
    if (!value) return;

    const ingredient = await recipeService.addIngredient(req.params.id, value, req.user.id);
    return created(res, ingredient, 'Ingredient added successfully');
  } catch (err) { next(err); }
};

const updateIngredient = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    const value = validate(updateIngredientSchema, req.body, res);
    if (!value) return;

    const ingredient = await recipeService.updateIngredient(
      req.params.id, req.params.ingredientId, value, req.user.id
    );
    return success(res, ingredient, 'Ingredient updated');
  } catch (err) { next(err); }
};

const removeIngredient = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    await recipeService.removeIngredient(req.params.id, req.params.ingredientId, req.user.id);
    return success(res, {}, 'Ingredient removed');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEPS
// ─────────────────────────────────────────────────────────────────────────────

const addStep = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    const value = validate(addStepSchema, req.body, res);
    if (!value) return;

    const step = await recipeService.addStep(req.params.id, value, req.user.id);
    return created(res, step, 'Step added');
  } catch (err) { next(err); }
};

const updateStep = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    const value = validate(updateStepSchema, req.body, res);
    if (!value) return;

    const step = await recipeService.updateStep(req.params.id, req.params.stepId, value, req.user.id);
    return success(res, step, 'Step updated');
  } catch (err) { next(err); }
};

const removeStep = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    await recipeService.removeStep(req.params.id, req.params.stepId, req.user.id);
    return success(res, {}, 'Step removed');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// COSTING
// ─────────────────────────────────────────────────────────────────────────────

const getCosting = async (req, res, next) => {
  try {
    const cost = await recipeService.getCosting(req.params.id);
    return success(res, cost);
  } catch (err) { next(err); }
};

const recalculateCosting = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    const value = validate(updateCostSchema, req.body, res);
    if (!value) return;

    const cost = await recipeService.updateCosting(req.params.id, value, req.user.id);
    return success(res, cost, 'Cost recalculated');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

const submitForReview = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    const recipe = await recipeService.submitForReview(req.params.id, req.user.id);
    return success(res, recipe, 'Recipe submitted for review');
  } catch (err) { next(err); }
};

const approveRecipe = async (req, res, next) => {
  try {
    if (!canApproveRecipe(req.user)) return forbidden(res, 'Only Approvers and Admins can approve recipes');

    const value = validate(approvalSchema, req.body, res);
    if (!value) return;

    const recipe = await recipeService.approveRecipe(req.params.id, value.note, req.user.id);
    return success(res, recipe, 'Recipe approved');
  } catch (err) { next(err); }
};

const rejectRecipe = async (req, res, next) => {
  try {
    if (!canApproveRecipe(req.user)) return forbidden(res, 'Only Approvers and Admins can reject recipes');

    const value = validate(rejectSchema, req.body, res);
    if (!value) return;

    const recipe = await recipeService.rejectRecipe(req.params.id, value.note, req.user.id);
    return success(res, recipe, 'Recipe returned to Draft');
  } catch (err) { next(err); }
};

const changeStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') return forbidden(res, 'Only Admin can directly change recipe status');

    const value = validate(statusChangeSchema, req.body, res);
    if (!value) return;

    const recipe = await recipeService.changeStatus(req.params.id, value.status, value.note, req.user.id);
    return success(res, recipe, 'Status updated');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

const createNewVersion = async (req, res, next) => {
  try {
    if (!canEditRecipe(req.user)) return forbidden(res);

    const value = validate(newVersionSchema, req.body, res);
    if (!value) return;

    const recipe = await recipeService.createNewVersion(req.params.id, value.changeSummary, req.user.id);
    return created(res, recipe, 'New version created');
  } catch (err) { next(err); }
};

const getVersionHistory = async (req, res, next) => {
  try {
    const versions = await recipeService.getVersionHistory(req.params.id);
    return success(res, versions);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// SCALING
// ─────────────────────────────────────────────────────────────────────────────

const scaleRecipe = async (req, res, next) => {
  try {
    const value = validate(scaleSchema, req.body, res);
    if (!value) return;

    const result = await recipeService.scaleRecipe(req.params.id, value.targetPax);
    return success(res, result);
  } catch (err) { next(err); }
};

module.exports = {
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  lookupRecipes,
  addIngredient,
  updateIngredient,
  removeIngredient,
  addStep,
  updateStep,
  removeStep,
  getCosting,
  recalculateCosting,
  submitForReview,
  approveRecipe,
  rejectRecipe,
  changeStatus,
  createNewVersion,
  getVersionHistory,
  scaleRecipe,
};
