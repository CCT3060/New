const Joi = require('joi');

// ─────────────────────────────────────────────
// Recipe Header
// ─────────────────────────────────────────────
const createRecipeSchema = Joi.object({
  recipeCode: Joi.string().trim().max(50).required().messages({ 'any.required': 'Recipe code is required' }),
  recipeName: Joi.string().trim().min(2).max(200).required().messages({ 'any.required': 'Recipe name is required' }),
  category: Joi.string().trim().max(100).optional().allow('').default(''),
  mealType: Joi.string().valid('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'BEVERAGE', 'DESSERT').optional().default('LUNCH'),
  foodType: Joi.string().valid('VEG', 'NON_VEG', 'EGG', 'VEGAN').optional().default('VEG'),
  cuisineType: Joi.string().trim().max(100).optional().allow(''),
  description: Joi.string().trim().max(2000).optional().allow(''),
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'INACTIVE').default('ACTIVE'),
  standardPax: Joi.number().integer().min(1).required().messages({
    'number.min': 'Standard pax must be at least 1',
    'any.required': 'Standard pax is required',
  }),
  yieldQty: Joi.number().positive().required().messages({ 'number.positive': 'Yield quantity must be positive' }),
  yieldUnit: Joi.string().trim().max(50).required(),
  portionPerPax: Joi.number().positive().optional().default(1),
  prepTimeMin: Joi.number().integer().min(0).default(0),
  cookTimeMin: Joi.number().integer().min(0).default(0),
  warehouseId: Joi.string().uuid().optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional().default([]),
});

const updateRecipeSchema = Joi.object({
  recipeName: Joi.string().trim().min(2).max(200),
  category: Joi.string().trim().max(100),
  mealType: Joi.string().valid('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'BEVERAGE', 'DESSERT'),
  foodType: Joi.string().valid('VEG', 'NON_VEG', 'EGG', 'VEGAN'),
  cuisineType: Joi.string().trim().max(100).allow(''),
  description: Joi.string().trim().max(2000).allow(''),
  standardPax: Joi.number().integer().min(1),
  yieldQty: Joi.number().positive(),
  yieldUnit: Joi.string().trim().max(50),
  portionPerPax: Joi.number().positive(),
  prepTimeMin: Joi.number().integer().min(0),
  cookTimeMin: Joi.number().integer().min(0),
  tags: Joi.array().items(Joi.string().trim().max(50)),
}).min(1); // At least one field required

// ─────────────────────────────────────────────
// Status change
// ─────────────────────────────────────────────
const statusChangeSchema = Joi.object({
  status: Joi.string()
    .valid('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED')
    .required(),
  note: Joi.string().max(500).optional().allow(''),
});

// ─────────────────────────────────────────────
// Ingredients
// ─────────────────────────────────────────────
const addIngredientSchema = Joi.object({
  inventoryItemId: Joi.string().uuid().required(),
  grossQty: Joi.number().positive().required().messages({ 'number.positive': 'Gross quantity must be positive' }),
  grossUnit: Joi.string().trim().max(50).required(),
  wastagePercent: Joi.number().min(0).max(100).default(0),
  notes: Joi.string().trim().max(500).optional().allow(''),
});

const updateIngredientSchema = Joi.object({
  grossQty: Joi.number().positive(),
  grossUnit: Joi.string().trim().max(50),
  wastagePercent: Joi.number().min(0).max(100),
  notes: Joi.string().trim().max(500).allow(''),
}).min(1);

// ─────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────
const addStepSchema = Joi.object({
  stepNo: Joi.number().integer().min(1).required(),
  stepType: Joi.string().valid('PREP', 'COOK', 'GARNISH', 'HOLD', 'PACK').default('PREP'),
  instruction: Joi.string().trim().min(5).max(2000).required(),
  estimatedTimeMin: Joi.number().integer().min(0).default(0),
  equipmentName: Joi.string().trim().max(200).optional().allow(''),
  temperatureNote: Joi.string().trim().max(200).optional().allow(''),
  qcCheckNote: Joi.string().trim().max(500).optional().allow(''),
});

const updateStepSchema = Joi.object({
  stepType: Joi.string().valid('PREP', 'COOK', 'GARNISH', 'HOLD', 'PACK'),
  instruction: Joi.string().trim().min(5).max(2000),
  estimatedTimeMin: Joi.number().integer().min(0),
  equipmentName: Joi.string().trim().max(200).allow(''),
  temperatureNote: Joi.string().trim().max(200).allow(''),
  qcCheckNote: Joi.string().trim().max(500).allow(''),
}).min(1);

// ─────────────────────────────────────────────
// Costing
// ─────────────────────────────────────────────
const updateCostSchema = Joi.object({
  fuelCost: Joi.number().min(0).default(0),
  laborCost: Joi.number().min(0).default(0),
  packagingCost: Joi.number().min(0).default(0),
  otherCost: Joi.number().min(0).default(0),
});

// ─────────────────────────────────────────────
// Version
// ─────────────────────────────────────────────
const newVersionSchema = Joi.object({
  changeSummary: Joi.string().trim().min(5).max(500).required().messages({
    'any.required': 'Change summary is required when creating a new version',
  }),
});

// ─────────────────────────────────────────────
// Approval
// ─────────────────────────────────────────────
const approvalSchema = Joi.object({
  note: Joi.string().trim().max(500).optional().allow(''),
});

const rejectSchema = Joi.object({
  note: Joi.string().trim().min(5).max(500).required().messages({
    'any.required': 'Rejection reason / note is required',
  }),
});

// ─────────────────────────────────────────────
// Scaling
// ─────────────────────────────────────────────
const scaleSchema = Joi.object({
  targetPax: Joi.number().integer().min(1).required().messages({
    'number.min': 'Target pax must be at least 1',
    'any.required': 'Target pax is required',
  }),
});

module.exports = {
  createRecipeSchema,
  updateRecipeSchema,
  statusChangeSchema,
  addIngredientSchema,
  updateIngredientSchema,
  addStepSchema,
  updateStepSchema,
  updateCostSchema,
  newVersionSchema,
  approvalSchema,
  rejectSchema,
  scaleSchema,
};
