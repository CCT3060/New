const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'backend/db/database.db');
const db = new Database(dbPath);

try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='menu_plans'").get();
    console.log("Current menu_plans schema:");
    if (tableInfo) {
        console.log(tableInfo.sql);
    } else {
        console.log("Table 'menu_plans' not found.");
    }
} catch (error) {
    console.error("Error fetching schema:", error.message);
} finally {
    db.close();
}
