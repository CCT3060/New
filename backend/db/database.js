const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'menu_planner.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Initialize database
const db = new Database(dbPath);

// Create Tables from schema if they don't exist
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Migration: ensure menu_plans uses the 4-column unique constraint
// (allows multiple different recipes in the same slot)
try {
    const tableInfo = db.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='menu_plans'"
    ).get();

    if (tableInfo && !/UNIQUE\s*\([^)]*recipe_id[^)]*\)/i.test(tableInfo.sql)) {
        // Old schema detected — migrate to 4-column unique constraint
        console.log('[DB] Found old menu_plans schema. Migrating to 4-column uniqueness...');
        
        db.exec(`
            BEGIN;
            ALTER TABLE menu_plans RENAME TO menu_plans_old;
            
            CREATE TABLE menu_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                recipe_id INTEGER NOT NULL,
                plan_date DATE NOT NULL,
                category TEXT NOT NULL,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
                UNIQUE(company_id, plan_date, category, recipe_id)
            );

            -- Safer approach: Specify core columns for migration
            INSERT OR IGNORE INTO menu_plans (id, company_id, recipe_id, plan_date, category)
            SELECT id, company_id, recipe_id, plan_date, category FROM menu_plans_old;
            
            DROP TABLE menu_plans_old;
            COMMIT;
        `);
        console.log('[DB] Migrated menu_plans successfully.');
    }
} catch (err) {
    console.error('[DB] Migration error:', err.message);
}

// Migration: add cost_per_unit to ingredients (price per unit in ₹)
try {
    db.exec('ALTER TABLE ingredients ADD COLUMN cost_per_unit REAL DEFAULT 0');
    console.log('[DB] Added cost_per_unit column to ingredients.');
} catch (_) { /* column already exists — safe to ignore */ }

// Migration: add base_serves to recipes (how many people base quantities serve)
try {
    db.exec('ALTER TABLE recipes ADD COLUMN base_serves INTEGER DEFAULT 1');
    console.log('[DB] Added base_serves column to recipes.');
} catch (_) { /* column already exists — safe to ignore */ }

// Migration: add pax_count to menu_plans (default pax per plan entry)
try {
    db.exec('ALTER TABLE menu_plans ADD COLUMN pax_count INTEGER DEFAULT 1');
    console.log('[DB] Added pax_count column to menu_plans.');
} catch (_) { /* column already exists — safe to ignore */ }

module.exports = db;
