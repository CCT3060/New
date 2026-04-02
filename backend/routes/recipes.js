const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all recipes
router.get('/', (req, res) => {
    try {
        const recipes = db.prepare('SELECT * FROM recipes ORDER BY created_at DESC').all();
        // Enrich with ingredients
        const fullRecipes = recipes.map(recipe => {
            const ingredients = db.prepare(`
                SELECT i.id, i.name, i.unit, ri.quantity 
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

// CREATE recipe
router.post('/', (req, res) => {
    const { name, description, category_type, ingredients } = req.body;
    
    // Use a transaction for atomicity
    const createRecipe = db.transaction((data) => {
        const info = db.prepare(
            'INSERT INTO recipes (name, description, category_type) VALUES (?, ?, ?)'
        ).run(data.name, data.description, data.category_type);
        
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
        const id = createRecipe({ name, description, category_type, ingredients });
        res.status(201).json({ id, name, description, category_type, ingredients });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE recipe
router.put('/:id', (req, res) => {
    const { name, description, category_type, ingredients } = req.body;
    const recipeId = req.params.id;

    const updateRecipe = db.transaction((data) => {
        // Update basic info
        db.prepare(
            'UPDATE recipes SET name = ?, description = ?, category_type = ? WHERE id = ?'
        ).run(data.name, data.description, data.category_type, recipeId);

        // Clear existing ingredients
        db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(recipeId);

        // Insert new ingredients
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
        updateRecipe({ name, description, category_type, ingredients });
        res.json({ id: recipeId, name, description, category_type, ingredients });
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
