/**
 * Fix Prisma-generated tables that have `updatedAt DATETIME(3) NOT NULL`
 * without a DEFAULT value. Prisma handles @updatedAt in the ORM layer,
 * but since we use raw SQL inserts this causes failures.
 *
 * Runs idempotently on server startup.
 */
const db = require('./mysql');
const logger = require('../utils/logger');

const TABLES = [
  'users', 'clients', 'warehouses', 'inventory_items', 'recipes',
  'recipe_ingredients', 'recipe_steps', 'recipe_costs', 'menu_plans',
  'kitchens', 'stores', 'units', 'pax_entries',
];

async function fixUpdatedAtDefaults() {
  for (const table of TABLES) {
    try {
      const [[col]] = await db.query(
        `SELECT COLUMN_DEFAULT, IS_NULLABLE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'updatedAt'`,
        [table]
      );
      if (!col) continue; // table or column doesn't exist
      if (col.COLUMN_DEFAULT) continue; // already has a default

      await db.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`
      );
      logger.info(`Fixed updatedAt default on table: ${table}`);
    } catch (err) {
      logger.warn(`Could not fix updatedAt on ${table}: ${err.message}`);
    }
  }
}

module.exports = fixUpdatedAtDefaults;
