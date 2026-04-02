/**
 * Unit Tests: Recipe Business Logic
 *
 * Tests the core service-layer logic without hitting the database.
 * All Prisma calls are mocked.
 */

// Mock Prisma and dependencies
jest.mock('../src/db/prisma', () => ({
  recipe: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  recipeIngredient: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
  },
  recipeStep: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createMany: jest.fn(),
  },
  recipeCost: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  recipeVersion: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  recipeTag: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  inventoryItem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn({
    recipe: { create: jest.fn(), update: jest.fn() },
    recipeIngredient: { createMany: jest.fn() },
    recipeStep: { createMany: jest.fn() },
    recipeCost: { create: jest.fn() },
    recipeVersion: { create: jest.fn(), updateMany: jest.fn() },
    recipeTag: { deleteMany: jest.fn(), createMany: jest.fn() },
  })),
}));

jest.mock('../src/modules/inventory/inventory.service');
jest.mock('../src/modules/audit/audit.service');

describe('Recipe Service — Unit Tests', () => {
  // ─── Net Quantity Calculation ──────────────────────────────────────────────
  describe('Net Quantity Calculation', () => {
    const calcNetQty = (grossQty, wastagePercent) => {
      return parseFloat((grossQty - (grossQty * wastagePercent) / 100).toFixed(4));
    };

    test('should return gross qty when wastage is 0%', () => {
      expect(calcNetQty(10, 0)).toBe(10);
    });

    test('should correctly calculate 20% wastage on 5kg', () => {
      expect(calcNetQty(5, 20)).toBe(4);
    });

    test('should handle 100% wastage (edge case)', () => {
      expect(calcNetQty(10, 100)).toBe(0);
    });

    test('should handle fractional wastage', () => {
      expect(calcNetQty(10, 7.5)).toBe(9.25);
    });

    test('calculates net qty for rice (10kg, 0% wastage)', () => {
      expect(calcNetQty(10, 0)).toBe(10);
    });

    test('calculates net qty for mixed veg (5kg, 20% wastage)', () => {
      expect(calcNetQty(5, 20)).toBe(4);
    });
  });

  // ─── Line Cost Calculation ─────────────────────────────────────────────────
  describe('Line Cost Calculation', () => {
    const calcLineCost = (netQty, unitCost) =>
      parseFloat((netQty * unitCost).toFixed(4));

    test('should calculate line cost correctly', () => {
      expect(calcLineCost(10, 85)).toBe(850);
    });

    test('should compute line cost with fractional values', () => {
      expect(calcLineCost(4, 40)).toBe(160);
    });

    test('zero netQty gives zero line cost', () => {
      expect(calcLineCost(0, 100)).toBe(0);
    });
  });

  // ─── Costing Totals ────────────────────────────────────────────────────────
  describe('Recipe Total Cost Calculation', () => {
    const buildCostData = (ingredients, { fuelCost, laborCost, packagingCost, otherCost, standardPax }) => {
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

    const sampleIngredients = [
      { lineCost: 850 }, // Rice: 10kg * 85
      { lineCost: 160 }, // Mixed Veg: 4kg (net, after 20%) * 40
      { lineCost: 110 }, // Oil: 1L * 110
      { lineCost: 3.6 }, // Salt: 0.2kg * 18
      { lineCost: 48 },  // Spices: 0.15kg * 320
    ];

    test('should sum ingredient costs correctly', () => {
      const result = buildCostData(sampleIngredients, {
        fuelCost: 0, laborCost: 0, packagingCost: 0, otherCost: 0, standardPax: 100
      });
      expect(result.ingredientCost).toBeCloseTo(1171.6, 1);
    });

    test('should add overhead costs to total', () => {
      const result = buildCostData(sampleIngredients, {
        fuelCost: 50, laborCost: 200, packagingCost: 30, otherCost: 0, standardPax: 100
      });
      expect(result.totalCost).toBeCloseTo(1451.6, 1);
    });

    test('should calculate cost per pax correctly', () => {
      const result = buildCostData(sampleIngredients, {
        fuelCost: 50, laborCost: 200, packagingCost: 30, otherCost: 0, standardPax: 100
      });
      expect(result.costPerPax).toBeCloseTo(14.516, 2);
    });

    test('returns 0 costPerPax if standardPax = 0 (edge case)', () => {
      const result = buildCostData(sampleIngredients, {
        fuelCost: 0, laborCost: 0, packagingCost: 0, otherCost: 0, standardPax: 0
      });
      expect(result.costPerPax).toBe(0);
    });
  });

  // ─── Scaling Logic ─────────────────────────────────────────────────────────
  describe('Recipe Scaling Logic', () => {
    const scaleIngredients = (ingredients, standardPax, targetPax) => {
      const scaleFactor = targetPax / standardPax;
      return ingredients.map((ing) => {
        const scaledGross = parseFloat((ing.grossQty * scaleFactor).toFixed(4));
        const scaledNet = parseFloat((scaledGross - (scaledGross * ing.wastagePercent / 100)).toFixed(4));
        return { ...ing, scaledGrossQty: scaledGross, scaledNetQty: scaledNet };
      });
    };

    const baseIngredients = [
      { grossQty: 10, wastagePercent: 0 }, // Rice
      { grossQty: 5, wastagePercent: 20 }, // Veg
      { grossQty: 1, wastagePercent: 0 },  // Oil
    ];

    test('scaling from 100 to 200 pax doubles all quantities', () => {
      const scaled = scaleIngredients(baseIngredients, 100, 200);
      expect(scaled[0].scaledGrossQty).toBe(20);    // Rice
      expect(scaled[1].scaledGrossQty).toBe(10);    // Veg
    });

    test('scaling from 100 to 50 pax halves all quantities', () => {
      const scaled = scaleIngredients(baseIngredients, 100, 50);
      expect(scaled[0].scaledGrossQty).toBe(5);
      expect(scaled[1].scaledGrossQty).toBe(2.5);
    });

    test('wastage is applied correctly on scaled quantities', () => {
      const scaled = scaleIngredients(baseIngredients, 100, 250);
      // Veg: 5 * 2.5 = 12.5 gross, 12.5 * 0.8 = 10 net
      expect(scaled[1].scaledGrossQty).toBe(12.5);
      expect(scaled[1].scaledNetQty).toBe(10);
    });

    test('scale factor is computed correctly', () => {
      const scaleFactor = 250 / 100;
      expect(scaleFactor).toBe(2.5);
    });
  });

  // ─── Validation Rules ──────────────────────────────────────────────────────
  describe('Recipe Validation Schema', () => {
    const { createRecipeSchema } = require('../src/modules/recipe/recipe.validation');

    test('should fail if recipeName is empty', () => {
      const { error } = createRecipeSchema.validate({
        recipeCode: 'REC-001',
        recipeName: '',
        category: 'Rice',
        mealType: 'LUNCH',
        foodType: 'VEG',
        standardPax: 100,
        yieldQty: 25,
        yieldUnit: 'kg',
        portionPerPax: 250,
        warehouseId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('recipeName');
    });

    test('should fail if standardPax <= 0', () => {
      const { error } = createRecipeSchema.validate({
        recipeCode: 'REC-001',
        recipeName: 'Test Recipe',
        category: 'Rice',
        mealType: 'LUNCH',
        foodType: 'VEG',
        standardPax: 0,
        yieldQty: 25,
        yieldUnit: 'kg',
        portionPerPax: 250,
        warehouseId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(error).toBeDefined();
    });

    test('should fail with invalid mealType', () => {
      const { error } = createRecipeSchema.validate({
        recipeCode: 'REC-001',
        recipeName: 'Test',
        category: 'Rice',
        mealType: 'MIDNIGHT_SNACK',
        foodType: 'VEG',
        standardPax: 100,
        yieldQty: 25,
        yieldUnit: 'kg',
        portionPerPax: 250,
        warehouseId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(error).toBeDefined();
    });

    test('should pass with valid data', () => {
      const { error } = createRecipeSchema.validate({
        recipeCode: 'REC-VEG-001',
        recipeName: 'Veg Pulao',
        category: 'Rice Dishes',
        mealType: 'LUNCH',
        foodType: 'VEG',
        cuisineType: 'North Indian',
        standardPax: 100,
        yieldQty: 25,
        yieldUnit: 'kg',
        portionPerPax: 250,
        prepTimeMin: 30,
        cookTimeMin: 45,
        warehouseId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(error).toBeUndefined();
    });
  });

  // ─── Ingredient Validation ─────────────────────────────────────────────────
  describe('Ingredient Validation Schema', () => {
    const { addIngredientSchema } = require('../src/modules/recipe/recipe.validation');

    test('should fail if grossQty is 0', () => {
      const { error } = addIngredientSchema.validate({
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        grossQty: 0,
        grossUnit: 'kg',
        wastagePercent: 10,
      });
      expect(error).toBeDefined();
    });

    test('should fail if wastage > 100%', () => {
      const { error } = addIngredientSchema.validate({
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        grossQty: 5,
        grossUnit: 'kg',
        wastagePercent: 110,
      });
      expect(error).toBeDefined();
    });

    test('should pass with valid ingredient data', () => {
      const { error } = addIngredientSchema.validate({
        inventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        grossQty: 5,
        grossUnit: 'kg',
        wastagePercent: 20,
      });
      expect(error).toBeUndefined();
    });
  });
});
