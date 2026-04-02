const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes (to be implemented)
app.get('/', (req, res) => {
    res.json({ message: 'Menu Planner API is running' });
});

// Import and use routes
const companyRoutes = require('./routes/companies');
const ingredientRoutes = require('./routes/ingredients');
const recipeRoutes = require('./routes/recipes');
const plannerRoutes = require('./routes/planner');

app.use('/api/companies', companyRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/planner', plannerRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
