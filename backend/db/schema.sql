-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ingredients Table (Master)
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL, -- e.g., kg, gm, ltr, pcs, etc.
    is_active INTEGER DEFAULT 1
);

-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category_type TEXT NOT NULL, -- Breakfast, Lunch, Dinner, Evening Snacks
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Ingredients Mapping
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Menu Plans Table
CREATE TABLE IF NOT EXISTS menu_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    plan_date DATE NOT NULL,
    category TEXT NOT NULL, -- Breakfast, Lunch, Dinner, Evening Snacks
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE(company_id, plan_date, category, recipe_id) -- Prevent duplicate identical recipes in the same slot
);
