require('dotenv').config();
const db = require('./src/db/mysql');
(async () => {
  // Get a real menu plan item for today
  const [items] = await db.query(
    `SELECT mpi.id AS itemId, mpi.menuPlanId, r.recipeName, mp.planDate, mp.mealType
     FROM menu_plan_items mpi
     JOIN menu_plans mp ON mp.id = mpi.menuPlanId
     JOIN recipes r ON r.id = mpi.recipeId
     WHERE mp.planDate = '2026-04-08' AND mp.isActive = 1`
  );
  console.log('Items for today:');
  items.forEach(i => console.log(`  planId=${i.menuPlanId}, itemId=${i.itemId}, recipe=${i.recipeName} [${i.mealType}]`));
  
  if (items.length > 0) {
    // Test: can we find items by id only?
    const testItem = items[0];
    const [[found]] = await db.query('SELECT id FROM menu_plan_items WHERE id = ?', [testItem.itemId]);
    console.log('\nTest lookup by itemId only:', found ? 'FOUND' : 'NOT FOUND');
    
    // Test with null planId (what the frontend sends)
    const [[found2]] = await db.query('SELECT id FROM menu_plan_items WHERE id = ? AND menuPlanId = ?', [testItem.itemId, 'null']);
    console.log('Test lookup with planId="null":', found2 ? 'FOUND' : 'NOT FOUND');
  }
  
  process.exit(0);
})();
