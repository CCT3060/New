const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const errorMiddleware = require('./middleware/error.middleware');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const recipeRoutes = require('./modules/recipe/recipe.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const menuPlannerRoutes = require('./modules/menu-planner/menu-planner.routes');
const rootRoutes = require('./modules/root/root.routes');
const portalRoutes = require('./modules/portal/portal.routes');
const companyRoutes = require('./modules/company/company.routes');

const app = express();

// ── Security ─────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ── Body Parsing ──────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Compression ───────────────────────────────
app.use(compression());

// ── Logging ───────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
  }));
}

// ── Health Check ───────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Central Kitchen API is running', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/menu-plans', menuPlannerRoutes);
app.use('/api/root', rootRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/company', companyRoutes);

// ── 404 Handler ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ───────────────────────
app.use(errorMiddleware);

module.exports = app;
