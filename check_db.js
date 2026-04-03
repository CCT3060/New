const Database = require('better-sqlite3');
const path = require('path');

// Fix: point to the correct, actual database file used by the backend
const dbPath = path.resolve(__dirname, 'backend/db/menu_planner.db');
const db = new Database(dbPath);

try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='menu_plans'").get();
    console.log("Current menu_plans schema:");
    if (tableInfo) {
        console.log(tableInfo.sql);
    } else {
        console.log("Table 'menu_plans' not found.");
    }

    const migrationInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log("\nAll tables in database:");
    migrationInfo.forEach(t => console.log(`- ${t.name}`));

} catch (error) {
    console.error("Error fetching schema:", error.message);
} finally {
    db.close();
}
