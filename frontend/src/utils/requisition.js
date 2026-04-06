// utils/requisition.js
// Pure, reusable calculations for pax count and ingredient requisition.
// No side-effects. All functions are synchronous.

// ─── 1. calculateTotalPax ─────────────────────────────────────────────────────
// Returns the sum of all entered pax values.
// paxEntries: PaxEntry[]  →  { recipeId, enteredPax, ... }
export function calculateTotalPax(paxEntries) {
  return paxEntries.reduce((sum, e) => {
    const v = Number(e.enteredPax);
    return sum + (Number.isFinite(v) && v > 0 ? v : 0);
  }, 0);
}

// ─── 2. calculateScaledIngredients ───────────────────────────────────────────
// Returns scaled ingredient list for one recipe given the entered pax count.
// recipe   : { id, name, standardPax, ingredients: [{ ingredientId, ingredientName, quantity, uom }] }
// enteredPax: number
// Returns : { ingredientId, ingredientName, scaledQty, uom }[]
export function calculateScaledIngredients(recipe, enteredPax) {
  const pax = Number(enteredPax);
  if (!pax || pax < 0) return [];
  if (!recipe.ingredients || recipe.ingredients.length === 0) return [];

  const stdPax = Number(recipe.standardPax);
  if (!stdPax || stdPax <= 0) return []; // safe guard: avoid divide-by-zero

  const scaleFactor = pax / stdPax;

  return recipe.ingredients.map((ing) => ({
    ingredientId:   ing.ingredientId,
    ingredientName: ing.ingredientName,
    uom:            ing.uom,
    scaledQty:      Math.round(ing.quantity * scaleFactor * 100) / 100, // 2 decimal places
  }));
}

// ─── 3. generateRecipeWiseBreakdown ──────────────────────────────────────────
// Produces an array of recipe cards, each with its scaled ingredient list.
// paxEntries : PaxEntry[]   — { recipeId, recipeName, enteredPax, date, mealType, unitName }
// recipes    : Recipe[]     — { id, name, standardPax, ingredients[] }
// Returns    : RecipeCard[]
//   { recipeId, recipeName, date, mealType, unitName, enteredPax, scaleFactor, scaledIngredients[] }
export function generateRecipeWiseBreakdown(paxEntries, recipes) {
  const recipeMap = Object.fromEntries(recipes.map((r) => [r.id, r]));

  return paxEntries
    .filter((e) => Number(e.enteredPax) > 0)
    .map((entry) => {
      const recipe = recipeMap[entry.recipeId];
      if (!recipe) return null;

      const stdPax = Number(recipe.standardPax);
      const enteredPax = Number(entry.enteredPax);
      const scaleFactor = stdPax > 0 ? Math.round((enteredPax / stdPax) * 10000) / 10000 : 0;

      return {
        recipeId:          entry.recipeId,
        recipeName:        entry.recipeName || recipe.name,
        date:              entry.date,
        mealType:          entry.mealType,
        unitName:          entry.unitName,
        enteredPax,
        standardPax:       stdPax,
        scaleFactor,
        scaledIngredients: calculateScaledIngredients(recipe, enteredPax),
      };
    })
    .filter(Boolean);
}

// ─── 4. consolidateIngredients ────────────────────────────────────────────────
// Sums same ingredientId across all recipe cards into one final list.
// breakdown: RecipeCard[]  (output of generateRecipeWiseBreakdown)
// Returns  : { ingredientId, ingredientName, totalQty, uom }[]  — sorted by ingredientName
export function consolidateIngredients(breakdown) {
  const map = {};

  for (const card of breakdown) {
    for (const ing of card.scaledIngredients) {
      if (!map[ing.ingredientId]) {
        map[ing.ingredientId] = {
          ingredientId:   ing.ingredientId,
          ingredientName: ing.ingredientName,
          uom:            ing.uom,
          totalQty:       0,
        };
      }
      map[ing.ingredientId].totalQty =
        Math.round((map[ing.ingredientId].totalQty + ing.scaledQty) * 100) / 100;
    }
  }

  return Object.values(map).sort((a, b) =>
    a.ingredientName.localeCompare(b.ingredientName)
  );
}
