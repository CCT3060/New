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
            INSERT OR IGNORE INTO menu_plans SELECT * FROM menu_plans_old;
            DROP TABLE menu_plans_old;
            COMMIT;
        `);
        console.log('[DB] Migrated menu_plans to 4-column unique constraint.');
    }
} catch (err) {
    console.error('[DB] Migration error:', err.message);
}

module.exports = db;
