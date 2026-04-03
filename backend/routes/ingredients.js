const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all ingredients
router.get('/', (req, res) => {
    try {
        const ingredients = db.prepare('SELECT * FROM ingredients ORDER BY name ASC').all();
        res.json(ingredients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE ingredient
router.post('/', (req, res) => {
    const { name, unit, cost_per_unit } = req.body;
    try {
        const info = db.prepare(
            'INSERT INTO ingredients (name, unit, cost_per_unit) VALUES (?, ?, ?)'
        ).run(name, unit, cost_per_unit || 0);
        res.status(201).json({ id: info.lastInsertRowid, name, unit, cost_per_unit: cost_per_unit || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE ingredient
router.put('/:id', (req, res) => {
    const { name, unit, is_active, cost_per_unit } = req.body;
    try {
        const info = db.prepare(
            'UPDATE ingredients SET name = ?, unit = ?, is_active = ?, cost_per_unit = ? WHERE id = ?'
        ).run(name, unit, is_active, cost_per_unit || 0, req.params.id);
        if (info.changes === 0) return res.status(404).json({ message: 'Ingredient not found' });
        res.json({ id: req.params.id, name, unit, is_active, cost_per_unit: cost_per_unit || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE ingredient
router.delete('/:id', (req, res) => {
    try {
        const info = db.prepare('DELETE FROM ingredients WHERE id = ?').run(req.params.id);
        if (info.changes === 0) return res.status(404).json({ message: 'Ingredient not found' });
        res.json({ message: 'Ingredient deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
