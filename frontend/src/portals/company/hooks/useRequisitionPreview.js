// hooks/useRequisitionPreview.js
// Keeps totalPax, recipeBreakdown, and consolidatedIngredients in sync
// with the user's staged (pending) pax inputs — no API call required.
// Works with the pendingEntries map from PaxCountTab.jsx.

import { useMemo } from 'react';
import {
  calculateTotalPax,
  generateRecipeWiseBreakdown,
  consolidateIngredients,
} from '../../../utils/requisition';

/**
 * @param {Object} pendingEntries
 *   key: `${date}-${recipeId}-${mealType}-${unitId}`
 *   value: { date, recipeId, mealType, unitId, paxCount, uom }
 *
 * @param {Object} data  — matrix data from GET /pax/matrix
 *   { units: [], rows: [{ date, dayLabel, mealGroups: [{ mealType, recipes: [{ recipeId, recipeName, ... }] }] }] }
 *
 * @param {Array} recipeDetails
 *   Full recipe objects with standardPax + ingredients[], preloaded from GET /pax/scale/:id
 *   or any cache. Shape: { id, name, standardPax, ingredients: [{ ingredientId, ingredientName, quantity, uom }] }
 *
 * @returns {{ totalPax, recipeBreakdown, consolidatedIngredients }}
 */
export function useRequisitionPreview(pendingEntries, data, recipeDetails) {
  return useMemo(() => {
    if (!data || !recipeDetails.length) {
      return { totalPax: 0, recipeBreakdown: [], consolidatedIngredients: [] };
    }

    // Build paxEntries from pendingEntries (staged values)
    const paxEntries = Object.values(pendingEntries).map((e) => {
      // Look up recipeName from matrix data
      let recipeName = e.recipeId;
      for (const row of data.rows) {
        for (const mg of row.mealGroups) {
          const rec = mg.recipes.find((r) => r.recipeId === e.recipeId);
          if (rec) { recipeName = rec.recipeName; break; }
        }
      }
      // Look up unitName
      const unit = data.units.find((u) => u.id === e.unitId);
      return {
        recipeId:   e.recipeId,
        recipeName,
        enteredPax: e.paxCount,
        date:       e.date,
        mealType:   e.mealType,
        unitName:   unit?.name || '',
      };
    });

    const totalPax             = calculateTotalPax(paxEntries);
    const recipeBreakdown      = generateRecipeWiseBreakdown(paxEntries, recipeDetails);
    const consolidatedIngredients = consolidateIngredients(recipeBreakdown);

    return { totalPax, recipeBreakdown, consolidatedIngredients };
  }, [pendingEntries, data, recipeDetails]);
}
