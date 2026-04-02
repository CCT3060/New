const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval } = require('date-fns');

// GET menu plans for a company in a date range
router.get('/', (req, res) => {
    const { company_id, start_date, end_date } = req.query;
    try {
        const plans = db.prepare(`
            SELECT mp.*, r.name as recipe_name, r.category_type
            FROM menu_plans mp
            JOIN recipes r ON mp.recipe_id = r.id
            WHERE mp.company_id = ? AND mp.plan_date BETWEEN ? AND ?
            ORDER BY mp.plan_date ASC
        `).all(company_id, start_date, end_date);
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE/UPDATE a single menu plan entry (Manual Drag & Drop)
router.post('/assign', (req, res) => {
    const { company_id, recipe_id, plan_date, category } = req.body;
    try {
        // Insert new recipe for the slot; UNIQUE constraint on (company, date, category, recipe)
        // prevents adding the SAME recipe multiple times, but multiple DIFFERENT recipes are allowed.
        const info = db.prepare(`
            INSERT INTO menu_plans (company_id, recipe_id, plan_date, category)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(company_id, plan_date, category, recipe_id) DO NOTHING
        `).run(company_id, recipe_id, plan_date, category);
        res.json({ message: 'Menu updated', id: info.lastInsertRowid });
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

        // Get all available recipes by category
        const allRecipes = db.prepare('SELECT id, name, category_type FROM recipes').all();
        const recipesByCategory = {
            'Breakfast': allRecipes.filter(r => r.category_type === 'Breakfast'),
            'Lunch': allRecipes.filter(r => r.category_type === 'Lunch'),
            'Dinner': allRecipes.filter(r => r.category_type === 'Dinner'),
            'Evening Snacks': allRecipes.filter(r => r.category_type === 'Evening Snacks')
        };

        // Get previous week's plans and previous day's plans for strict non-repetition
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
        // Track actual yesterday's selection per category (separate from full-week set)
        const lastDaySelections = { 'Breakfast': new Set(), 'Lunch': new Set(), 'Dinner': new Set(), 'Evening Snacks': new Set() };

        let prevDayDate = format(addDays(startDate, -1), 'yyyy-MM-dd');

        for (const [dayIdx, day] of days.entries()) {
            const dateStr = format(day, 'yyyy-MM-dd');
            const sameDayLastWeekStr = format(addDays(day, -7), 'yyyy-MM-dd');
            
            ['Breakfast', 'Lunch', 'Dinner', 'Evening Snacks'].forEach(category => {
                let pool = recipesByCategory[category];
                if (!pool.length) return;

                // Rule 1: No repeat from actual yesterday (first day: check DB, subsequent: last selection)
                const yesterdayIds = dayIdx === 0
                    ? new Set(getPrevIds(prevDayDate, category))
                    : lastDaySelections[category];

                // Rule 2: No repeat from same day last week
                const lastWeekIds = new Set(getPrevIds(sameDayLastWeekStr, category));

                // Rule 3: No repeat within this week's shuffle
                const thisWeekIds = usedThisShuffle[category];

                // Level 1: Avoid all three rules
                let available = pool.filter(r =>
                    !yesterdayIds.has(r.id) && !lastWeekIds.has(r.id) && !thisWeekIds.has(r.id)
                );

                // Level 2: Relax "this week" rule (allow repeats from earlier this week)
                if (available.length === 0) {
                    available = pool.filter(r => !yesterdayIds.has(r.id) && !lastWeekIds.has(r.id));
                }

                // Level 3: Relax last-week rule too (only avoid yesterday)
                if (available.length === 0) {
                    available = pool.filter(r => !yesterdayIds.has(r.id));
                }

                // Level 4: No rules (pick any)
                if (available.length === 0) {
                    available = pool;
                }

                if (available.length > 0) {
                    const selected = available[Math.floor(Math.random() * available.length)];
                    newPlans.push({
                        company_id,
                        recipe_id: selected.id,
                        plan_date: dateStr,
                        category
                    });
                    usedThisShuffle[category].add(selected.id);
                    lastDaySelections[category] = new Set([selected.id]);
                }
            });
            prevDayDate = dateStr;
        }

        // Transactional insert; we allow multi-item in assign, but shuffle replaces the week
        // To keep it clean, maybe we delete existing for the week first or just append?
        // User said "smart automate", usually implies a fresh start for that week.
        const insertStmt = db.prepare(`
            INSERT INTO menu_plans (company_id, recipe_id, plan_date, category)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(company_id, plan_date, category, recipe_id) DO NOTHING
        `);

        const deleteStmt = db.prepare(`
            DELETE FROM menu_plans WHERE company_id = ? AND plan_date BETWEEN ? AND ?
        `);

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

// COPY WEEK FROM ANOTHER COMPANY
router.post('/copy-week', (req, res) => {
    const { from_company_id, to_company_id, start_date } = req.body;
    try {
        const startDate = new Date(start_date);
        const endDate = format(addDays(startDate, 6), 'yyyy-MM-dd');

        // Get plans from source company
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

        const deleteStmt = db.prepare(`
            DELETE FROM menu_plans WHERE company_id = ? AND plan_date BETWEEN ? AND ?
        `);

        const transaction = db.transaction((plans) => {
            deleteStmt.run(to_company_id, start_date, endDate);
            for (const plan of plans) {
                insertStmt.run(to_company_id, plan.recipe_id, plan.plan_date, plan.category);
            }
        });

        transaction(sourcePlans);
        res.json({ message: `Successfully copied ${sourcePlans.length} menu items!` });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CLEAR WEEK FOR A COMPANY
router.post('/clear-week', (req, res) => {
    const { company_id, start_date } = req.body;
    try {
        const startDate = new Date(start_date);
        const endDate = format(addDays(startDate, 6), 'yyyy-MM-dd');

        db.prepare(`
            DELETE FROM menu_plans 
            WHERE company_id = ? AND plan_date BETWEEN ? AND ?
        `).run(company_id, start_date, endDate);

        res.json({ message: 'Week cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
