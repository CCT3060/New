require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const fixUpdatedAtDefaults = require('./src/db/fix-defaults');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  try { await fixUpdatedAtDefaults(); } catch (e) { logger.warn('DB fix-defaults:', e.message); }
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});
