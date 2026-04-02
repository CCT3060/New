const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const errorMiddleware = require('./middleware/error.middleware');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const recipeRoutes = require('./modules/recipe/recipe.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const menuPlannerRoutes = require('./modules/menu-planner/menu-planner.routes');

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

// ── Rate Limiting ─────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Auth route gets a stricter limiter to protect against brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

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
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/menu-plans', menuPlannerRoutes);

// ── 404 Handler ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ───────────────────────
app.use(errorMiddleware);

module.exports = app;
