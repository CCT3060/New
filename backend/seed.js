const db = require('./db/database');

const seedData = () => {
    const companies = [
        ['Google', 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png', 'Tech Giant'],
        ['Microsoft', 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageMW/RWOTN6?ver=0b2b', 'Software Leader'],
    ];

    const ingredients = [
        ['Potato', 'kg'], ['Onion', 'kg'], ['Tomato', 'kg'], ['Chicken', 'kg'],
        ['Rice', 'kg'], ['Paneer', 'kg'], ['Milk', 'ltr'], ['Egg', 'pcs'],
        ['Oil', 'ltr'], ['Salt', 'gm'], ['Spices', 'gm'], ['Bread', 'pkt']
    ];

    const recipes = [
        ['Poha', 'Classic Breakfast', 'Breakfast'],
        ['Upma', 'Healthy Semolina', 'Breakfast'],
        ['Bread Omelette', 'Quick Protein', 'Breakfast'],
        ['Masala Dosa', 'South Indian', 'Breakfast'],
        ['Fruit Bowl', 'Fresh Fruits', 'Breakfast'],
        ['Idli Sambhar', 'Steamed Rice Cakes', 'Breakfast'],
        ['Paratha', 'Stuffed Wheat Flatbread', 'Breakfast'],
        
        ['Chicken Biryani', 'Spicy Rice & Chicken', 'Lunch'],
        ['Paneer Butter Masala', 'Creamy Tomato Base', 'Lunch'],
        ['Dal Tadka', 'Lentil Soup', 'Lunch'],
        ['Veg Pulav', 'Mixed Veggie Rice', 'Lunch'],
        ['Fish Curry', 'Coastal Special', 'Lunch'],
        ['Mutton Rogan Josh', 'Rich Lamb Curry', 'Lunch'],
        ['Mix Veg Sabzi', 'Daily Veggies', 'Lunch'],
        ['Egg Curry', 'Boiled Eggs in Gravy', 'Lunch'],

        ['Butter Chicken', 'Smoky & Creamy', 'Dinner'],
        ['Rajma Chawal', 'Kidney Beans & Rice', 'Dinner'],
        ['Palak Paneer', 'Spinach & Cottge Cheese', 'Dinner'],
        ['Pasta Alfredo', 'White Sauce Pasta', 'Dinner'],
        ['Grilled Chicken', 'Low Carb Meal', 'Dinner'],
        ['Chole Bhature', 'Chickpeas with Fried Bread', 'Dinner'],
        ['Fried Rice', 'Chinese Style', 'Dinner'],
        ['Khichdi', 'Comfort Food', 'Dinner'],

        ['Samosa', 'Fried Pastry', 'Evening Snacks'],
        ['Tea & Biscuits', 'Evening Ritual', 'Evening Snacks'],
        ['Vada Pav', 'Mumbai Special', 'Evening Snacks'],
        ['Bhel Puri', 'Tangy Puffed Rice', 'Evening Snacks']
    ];

    const insertCompany = db.prepare('INSERT INTO companies (name, logo_url, description) VALUES (?, ?, ?)');
    const insertIngredient = db.prepare('INSERT INTO ingredients (name, unit) VALUES (?, ?)');
    const insertRecipe = db.prepare('INSERT INTO recipes (name, description, category_type) VALUES (?, ?, ?)');
    const insertRecipeIngredient = db.prepare('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)');

    db.transaction(() => {
        // Companies
        for (const c of companies) insertCompany.run(...c);
        
        // Ingredients
        for (const i of ingredients) insertIngredient.run(...i);
        
        // Recipes & Random Ingredients
        for (const r of recipes) {
            const info = insertRecipe.run(...r);
            const recipeId = info.lastInsertRowid;
            
            // Map 2-4 random ingredients
            const count = Math.floor(Math.random() * 3) + 2;
            for(let j = 0; j < count; j++) {
                const ingId = Math.floor(Math.random() * ingredients.length) + 1;
                insertRecipeIngredient.run(recipeId, ingId, (Math.random() * 2 + 0.1).toFixed(2));
            }
        }
    })();

    console.log('Seeding complete! 🚀');
};

seedData();
