const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all recipes (with ingredients + base_serves)
router.get('/', (req, res) => {
    try {
        const recipes = db.prepare('SELECT * FROM recipes ORDER BY created_at DESC').all();
        const fullRecipes = recipes.map(recipe => {
            const ingredients = db.prepare(`
                SELECT i.id, i.name, i.unit, i.cost_per_unit, ri.quantity 
                FROM recipe_ingredients ri
                JOIN ingredients i ON ri.ingredient_id = i.id
                WHERE ri.recipe_id = ?
            `).all(recipe.id);
            return { ...recipe, ingredients };
        });
        res.json(fullRecipes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET pax report for a recipe — scales ingredients for N people
// GET /recipes/:id/pax-report?pax=50
router.get('/:id/pax-report', (req, res) => {
    const recipeId = req.params.id;
    const pax = parseInt(req.query.pax) || 1;

    try {
        const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
        if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

        const baseServes = recipe.base_serves || 1;
        const multiplier = pax / baseServes;

        const ingredients = db.prepare(`
            SELECT i.id, i.name, i.unit, i.cost_per_unit, ri.quantity AS base_quantity
            FROM recipe_ingredients ri
            JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE ri.recipe_id = ?
        `).all(recipeId);

        let totalCost = 0;
        const scaledIngredients = ingredients.map(ing => {
            const scaledQty = parseFloat((ing.base_quantity * multiplier).toFixed(3));
            const cost = parseFloat((scaledQty * (ing.cost_per_unit || 0)).toFixed(2));
            totalCost += cost;
            return {
                id: ing.id,
                name: ing.name,
                unit: ing.unit,
                cost_per_unit: ing.cost_per_unit || 0,
                base_quantity: ing.base_quantity,
                scaled_quantity: scaledQty,
                line_cost: cost
            };
        });

        res.json({
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            category_type: recipe.category_type,
            base_serves: baseServes,
            pax,
            multiplier: parseFloat(multiplier.toFixed(4)),
            ingredients: scaledIngredients,
            total_cost: parseFloat(totalCost.toFixed(2))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE recipe (with base_serves)
router.post('/', (req, res) => {
    const { name, description, category_type, base_serves, ingredients } = req.body;

    const createRecipe = db.transaction((data) => {
        const info = db.prepare(
            'INSERT INTO recipes (name, description, category_type, base_serves) VALUES (?, ?, ?, ?)'
        ).run(data.name, data.description, data.category_type, data.base_serves || 1);

        const recipeId = info.lastInsertRowid;

        if (data.ingredients && data.ingredients.length > 0) {
            const insertIngredient = db.prepare(
                'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)'
            );
            for (const item of data.ingredients) {
                insertIngredient.run(recipeId, item.ingredient_id, item.quantity);
            }
        }
        return recipeId;
    });

    try {
        const id = createRecipe({ name, description, category_type, base_serves, ingredients });
        res.status(201).json({ id, name, description, category_type, base_serves, ingredients });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE recipe
router.put('/:id', (req, res) => {
    const { name, description, category_type, base_serves, ingredients } = req.body;
    const recipeId = req.params.id;

    const updateRecipe = db.transaction((data) => {
        db.prepare(
            'UPDATE recipes SET name = ?, description = ?, category_type = ?, base_serves = ? WHERE id = ?'
        ).run(data.name, data.description, data.category_type, data.base_serves || 1, recipeId);

        db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(recipeId);

        if (data.ingredients && data.ingredients.length > 0) {
            const insertIngredient = db.prepare(
                'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)'
            );
            for (const item of data.ingredients) {
                insertIngredient.run(recipeId, item.ingredient_id, item.quantity);
            }
        }
    });

    try {
        updateRecipe({ name, description, category_type, base_serves, ingredients });
        res.json({ id: recipeId, name, description, category_type, base_serves, ingredients });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE recipe
router.delete('/:id', (req, res) => {
    try {
        const info = db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id);
        if (info.changes === 0) return res.status(404).json({ message: 'Recipe not found' });
        res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
