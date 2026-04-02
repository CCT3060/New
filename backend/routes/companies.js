const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET all companies
router.get('/', (req, res) => {
    try {
        const companies = db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all();
        res.json(companies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single company
router.get('/:id', (req, res) => {
    try {
        const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
        if (!company) return res.status(404).json({ message: 'Company not found' });
        res.json(company);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE company
router.post('/', (req, res) => {
    const { name, logo_url, description } = req.body;
    try {
        const info = db.prepare(
            'INSERT INTO companies (name, logo_url, description) VALUES (?, ?, ?)'
        ).run(name, logo_url, description);
        res.status(201).json({ id: info.lastInsertRowid, name, logo_url, description });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE company
router.put('/:id', (req, res) => {
    const { name, logo_url, description } = req.body;
    try {
        const info = db.prepare(
            'UPDATE companies SET name = ?, logo_url = ?, description = ? WHERE id = ?'
        ).run(name, logo_url, description, req.params.id);
        if (info.changes === 0) return res.status(404).json({ message: 'Company not found' });
        res.json({ id: req.params.id, name, logo_url, description });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE company
router.delete('/:id', (req, res) => {
    try {
        const info = db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
        if (info.changes === 0) return res.status(404).json({ message: 'Company not found' });
        res.json({ message: 'Company deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
