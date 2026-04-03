const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { addDays, format, eachDayOfInterval } = require('date-fns');

// GET menu plans for a company in a date range
router.get('/', (req, res) => {
    const { company_id, start_date, end_date } = req.query;
    try {
        const plans = db.prepare(`
            SELECT mp.*, r.name as recipe_name, r.category_type, r.base_serves,
                   c.name as company_name
            FROM menu_plans mp
            JOIN recipes r ON mp.recipe_id = r.id
            JOIN companies c ON mp.company_id = c.id
            WHERE mp.company_id = ? AND mp.plan_date BETWEEN ? AND ?
            ORDER BY mp.plan_date ASC
        `).all(company_id, start_date, end_date);
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET plans across ALL companies in a date range (for overview/admin reports)
router.get('/all', (req, res) => {
    const { start_date, end_date } = req.query;
    try {
        const plans = db.prepare(`
            SELECT mp.*, r.name as recipe_name, r.category_type, r.base_serves,
                   c.name as company_name
            FROM menu_plans mp
            JOIN recipes r ON mp.recipe_id = r.id
            JOIN companies c ON mp.company_id = c.id
            WHERE mp.plan_date BETWEEN ? AND ?
            ORDER BY mp.plan_date ASC, c.name ASC
        `).all(start_date, end_date);
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE/UPDATE a single menu plan entry (Manual Drag & Drop)
router.post('/assign', (req, res) => {
    const { company_id, recipe_id, plan_date, category, pax_count } = req.body;
    try {
        const info = db.prepare(`
            INSERT INTO menu_plans (company_id, recipe_id, plan_date, category, pax_count)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(company_id, plan_date, category, recipe_id) DO UPDATE SET pax_count = excluded.pax_count
        `).run(company_id, recipe_id, plan_date, category, pax_count || 1);
        res.json({ message: 'Menu updated', id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE/UPDATE multiple menu plan entries at once (Batch Assignment)
router.post('/assign-batch', (req, res) => {
    const { company_ids, recipe_id, plan_date, category, pax_count } = req.body;
    try {
        const insertStmt = db.prepare(`
            INSERT INTO menu_plans (company_id, recipe_id, plan_date, category, pax_count)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(company_id, plan_date, category, recipe_id) DO UPDATE SET pax_count = excluded.pax_count
        `);

        const transaction = db.transaction((ids) => {
            const results = [];
            for (const id of ids) {
                const info = insertStmt.run(id, recipe_id, plan_date, category, pax_count || 1);
                results.push({ id: info.lastInsertRowid, company_id: id });
            }
            return results;
        });

        const results = transaction(company_ids);
        res.json({ message: `Successfully assigned to ${results.length} companies`, results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE pax_count for a specific plan entry
router.patch('/:id/pax', (req, res) => {
    const { pax_count } = req.body;
    try {
        db.prepare('UPDATE menu_plans SET pax_count = ? WHERE id = ?').run(pax_count, req.params.id);
        res.json({ message: 'Pax updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// REPLACE a recipe in a slot (swap recipe_id)
router.patch('/:id/replace', (req, res) => {
    const { new_recipe_id } = req.body;
    try {
        // Check new_recipe_id exists
        const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(new_recipe_id);
        if (!recipe) return res.status(404).json({ error: 'New recipe not found' });

        db.prepare('UPDATE menu_plans SET recipe_id = ? WHERE id = ?').run(new_recipe_id, req.params.id);
        res.json({ message: 'Recipe replaced' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE a specific plan item
router.delete('/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM menu_plans WHERE id = ?').run(req.params.id);
        res.json({ message: 'Item removed from planner' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SMART SHUFFLE LOGICAL v2.0 (Non-Repetition Rules)
router.post('/shuffle', (req, res) => {
    const { company_id, start_date } = req.body;

    try {
        const startDate = new Date(start_date);
        const endDate = addDays(startDate, 6);
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        const allRecipes = db.prepare('SELECT id, name, category_type FROM recipes').all();
        const recipesByCategory = {
            'Breakfast': allRecipes.filter(r => r.category_type === 'Breakfast'),
            'Lunch': allRecipes.filter(r => r.category_type === 'Lunch'),
            'Dinner': allRecipes.filter(r => r.category_type === 'Dinner'),
            'Evening Snacks': allRecipes.filter(r => r.category_type === 'Evening Snacks')
        };

        const lookbackDate = format(addDays(startDate, -7), 'yyyy-MM-dd');
        const prevPlans = db.prepare(`
            SELECT recipe_id, plan_date, category 
            FROM menu_plans 
            WHERE company_id = ? AND plan_date >= ?
        `).all(company_id, lookbackDate);

        const getPrevIds = (dateStr, category) => {
            return prevPlans
                .filter(p => p.plan_date === dateStr && p.category === category)
                .map(p => p.recipe_id);
        };

        const newPlans = [];
        const usedThisShuffle = { 'Lunch': new Set(), 'Dinner': new Set(), 'Breakfast': new Set(), 'Evening Snacks': new Set() };
        const lastDaySelections = { 'Breakfast': new Set(), 'Lunch': new Set(), 'Dinner': new Set(), 'Evening Snacks': new Set() };

        let prevDayDate = format(addDays(startDate, -1), 'yyyy-MM-dd');

        for (const [dayIdx, day] of days.entries()) {
            const dateStr = format(day, 'yyyy-MM-dd');
            const sameDayLastWeekStr = format(addDays(day, -7), 'yyyy-MM-dd');

            ['Breakfast', 'Lunch', 'Dinner', 'Evening Snacks'].forEach(category => {
                let pool = recipesByCategory[category];
                if (!pool.length) return;

                const yesterdayIds = dayIdx === 0
                    ? new Set(getPrevIds(prevDayDate, category))
                    : lastDaySelections[category];

                const lastWeekIds = new Set(getPrevIds(sameDayLastWeekStr, category));
                const thisWeekIds = usedThisShuffle[category];

                let available = pool.filter(r =>
                    !yesterdayIds.has(r.id) && !lastWeekIds.has(r.id) && !thisWeekIds.has(r.id)
                );
                if (available.length === 0) available = pool.filter(r => !yesterdayIds.has(r.id) && !lastWeekIds.has(r.id));
                if (available.length === 0) available = pool.filter(r => !yesterdayIds.has(r.id));
                if (available.length === 0) available = pool;

                if (available.length > 0) {
                    const selected = available[Math.floor(Math.random() * available.length)];
                    newPlans.push({ company_id, recipe_id: selected.id, plan_date: dateStr, category });
                    usedThisShuffle[category].add(selected.id);
                    lastDaySelections[category] = new Set([selected.id]);
                }
            });
            prevDayDate = dateStr;
        }

        const insertStmt = db.prepare(`
            INSERT INTO menu_plans (company_id, recipe_id, plan_date, category)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(company_id, plan_date, category, recipe_id) DO NOTHING
        `);
        const deleteStmt = db.prepare(`DELETE FROM menu_plans WHERE company_id = ? AND plan_date BETWEEN ? AND ?`);

        const transaction = db.transaction((plans) => {
            deleteStmt.run(company_id, start_date, format(addDays(startDate, 6), 'yyyy-MM-dd'));
            for (const plan of plans) {
                insertStmt.run(plan.company_id, plan.recipe_id, plan.plan_date, plan.category);
            }
        });

        transaction(newPlans);
        res.json({ message: 'Smart Shuffle Complete!', count: newPlans.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// COPY MENU — supports week copy (start_date) OR custom range (from_date / to_date)
// Target can be one or multiple companies (to_company_ids as array or to_company_id as single)
router.post('/copy-range', (req, res) => {
    const { from_company_id, to_company_ids, from_date, to_date } = req.body;

    if (!from_company_id || !from_date || !to_date) {
        return res.status(400).json({ error: 'from_company_id, from_date, and to_date are required' });
    }

    const targetIds = Array.isArray(to_company_ids) ? to_company_ids : [to_company_ids];

    try {
        const sourcePlans = db.prepare(`
            SELECT recipe_id, plan_date, category 
            FROM menu_plans 
            WHERE company_id = ? AND plan_date BETWEEN ? AND ?
        `).all(from_company_id, from_date, to_date);

        if (sourcePlans.length === 0) {
            return res.status(404).json({ error: 'No menu plans found for the source company in this range.' });
        }

        const insertStmt = db.prepare(`
            INSERT INTO menu_plans (company_id, recipe_id, plan_date, category)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(company_id, plan_date, category, recipe_id) DO NOTHING
        `);
        const deleteStmt = db.prepare(`DELETE FROM menu_plans WHERE company_id = ? AND plan_date BETWEEN ? AND ?`);

        const transaction = db.transaction((plans, targetCompanyId) => {
            deleteStmt.run(targetCompanyId, from_date, to_date);
            for (const plan of plans) {
                insertStmt.run(targetCompanyId, plan.recipe_id, plan.plan_date, plan.category);
            }
        });

        let totalCopied = 0;
        for (const targetId of targetIds) {
            if (parseInt(targetId) === parseInt(from_company_id)) continue; // skip self
            transaction(sourcePlans, targetId);
            totalCopied += sourcePlans.length;
        }

        res.json({ message: `Successfully copied ${sourcePlans.length} items to ${targetIds.length} company/companies!`, totalCopied });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Legacy COPY WEEK (kept for backward compat)
router.post('/copy-week', (req, res) => {
    const { from_company_id, to_company_id, start_date } = req.body;
    const endDate = format(addDays(new Date(start_date), 6), 'yyyy-MM-dd');
    req.body = { from_company_id, to_company_ids: [to_company_id], from_date: start_date, to_date: endDate };
    // redirect to copy-range logic inline
    try {
        const sourcePlans = db.prepare(`
            SELECT recipe_id, plan_date, category 
            FROM menu_plans 
            WHERE company_id = ? AND plan_date BETWEEN ? AND ?
        `).all(from_company_id, start_date, endDate);

        if (sourcePlans.length === 0) {
            return res.status(404).json({ error: 'No menu plans found for the source company in this week.' });
        }

        const insertStmt = db.prepare(`
            INSERT INTO menu_plans (company_id, recipe_id, plan_date, category)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(company_id, plan_date, category, recipe_id) DO NOTHING
        `);
        const deleteStmt = db.prepare(`DELETE FROM menu_plans WHERE company_id = ? AND plan_date BETWEEN ? AND ?`);

        db.transaction((plans) => {
            deleteStmt.run(to_company_id, start_date, endDate);
            for (const plan of plans) insertStmt.run(to_company_id, plan.recipe_id, plan.plan_date, plan.category);
        })(sourcePlans);

        res.json({ message: `Successfully copied ${sourcePlans.length} menu items!` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CLEAR date range for a company
router.post('/clear-week', (req, res) => {
    const { company_id, start_date, end_date } = req.body;
    try {
        const finalEnd = end_date || format(addDays(new Date(start_date), 6), 'yyyy-MM-dd');
        db.prepare(`DELETE FROM menu_plans WHERE company_id = ? AND plan_date BETWEEN ? AND ?`)
            .run(company_id, start_date, finalEnd);
        res.json({ message: 'Range cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
