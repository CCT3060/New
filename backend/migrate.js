const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: 'root', password: 'Pa@24224365',
    database: 'recipe_management'
  });

  try {
    await conn.execute('ALTER TABLE menu_plans ADD COLUMN unitId CHAR(36) NULL AFTER description');
    console.log('✓ Added unitId to menu_plans');
  } catch (e) {
    console.log('unitId already exists or error:', e.message);
  }

  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pax_entries (
        id        CHAR(36)       NOT NULL DEFAULT (UUID()),
        companyId CHAR(36)       NOT NULL,
        date      DATE           NOT NULL,
        recipeId  CHAR(36)       NOT NULL,
        mealType  VARCHAR(50)    NOT NULL DEFAULT 'LUNCH',
        unitId    CHAR(36)       NOT NULL,
        paxCount  DECIMAL(10,2)  NOT NULL DEFAULT 0,
        uom       VARCHAR(20)    NOT NULL DEFAULT 'pax',
        createdAt DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_pax_entry (companyId, date, recipeId, unitId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Created pax_entries table');
  } catch (e) {
    console.log('Error creating pax_entries:', e.message);
  }

  await conn.end();
  console.log('Migration complete');
}

migrate().catch(console.error);
