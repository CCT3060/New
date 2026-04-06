// services/requisitionService.js
// Generates requisition result from pax entries in the DB.
// Uses the pure utils from ../../utils/requisition.
// This replaces the inline logic in company.routes.js GET /pax/requisition.

const db = require('../db/mysql');
const {
  calculateTotalPax,
  generateRecipeWiseBreakdown,
  consolidateIngredients,
} = require('../utils/requisition');

/**
 * generateRequisition
 * @param {string} companyId
 * @param {string} from  - YYYY-MM-DD
 * @param {string} to    - YYYY-MM-DD
 * @returns {Promise<{ totalPax, recipeBreakdown, consolidatedIngredients, from, to }>}
 */
async function generateRequisition(companyId, from, to) {
  // 1. Fetch all pax entries with recipe + unit details
  const [rows] = await db.query(
    `SELECT
       pe.date, pe.recipeId, pe.mealType, pe.paxCount AS enteredPax, pe.uom,
       r.recipeName, r.category, r.standardPax,
       u.name AS unitName
     FROM pax_entries pe
     JOIN recipes r ON r.id = pe.recipeId
     JOIN units u   ON u.id = pe.unitId
     WHERE pe.companyId = ?
       AND pe.date >= ? AND pe.date <= ?
       AND pe.paxCount > 0
     ORDER BY pe.date ASC, pe.mealType ASC`,
    [companyId, from, to]
  );

  if (rows.length === 0) {
    return { totalPax: 0, recipeBreakdown: [], consolidatedIngredients: [], from, to };
  }

  // 2. Fetch full ingredient lists for each unique recipe in one query
  const uniqueRecipeIds = [...new Set(rows.map((r) => r.recipeId))];
  const placeholders = uniqueRecipeIds.map(() => '?').join(',');

  const [ingredientRows] = await db.query(
    `SELECT
       ri.recipeId,
       ri.inventoryItemId  AS ingredientId,
       ii.itemName         AS ingredientName,
       ii.itemCode,
       ri.grossQty         AS quantity,
       ri.grossUnit        AS uom,
       ri.wastagePercent
     FROM recipe_ingredients ri
     JOIN inventory_items ii ON ii.id = ri.inventoryItemId
     WHERE ri.recipeId IN (${placeholders})
       AND ri.deletedAt IS NULL`,
    uniqueRecipeIds
  );

  // 3. Build recipe objects in the shape expected by the pure utils
  const [recipeRows] = await db.query(
    `SELECT id, recipeName AS name, standardPax FROM recipes WHERE id IN (${placeholders})`,
    uniqueRecipeIds
  );

  const recipeMap = {};
  for (const r of recipeRows) {
    recipeMap[r.id] = { ...r, ingredients: [] };
  }
  for (const ing of ingredientRows) {
    recipeMap[ing.recipeId]?.ingredients.push({
      ingredientId:   ing.ingredientId,
      ingredientName: ing.ingredientName,
      itemCode:       ing.itemCode,
      quantity:       parseFloat(ing.quantity),
      uom:            ing.uom,
      wastagePercent: parseFloat(ing.wastagePercent || 0),
    });
  }

  // 4. Shape pax entries to match the pure util interface
  const paxEntries = rows.map((r) => ({
    recipeId:    r.recipeId,
    recipeName:  r.recipeName,
    enteredPax:  Number(r.enteredPax),
    date:        String(r.date).split('T')[0],
    mealType:    r.mealType,
    unitName:    r.unitName,
  }));

  // 5. Run pure calculations
  const totalPax             = calculateTotalPax(paxEntries);
  const recipeBreakdown      = generateRecipeWiseBreakdown(paxEntries, Object.values(recipeMap));
  const consolidatedIngredients = consolidateIngredients(recipeBreakdown);

  return { totalPax, recipeBreakdown, consolidatedIngredients, from, to };
}

module.exports = { generateRequisition };
