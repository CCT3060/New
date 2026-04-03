const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Parse DATABASE_URL safely — handles @ in passwords by splitting on the LAST @
// Format: mysql://user:password@host:port/database
function parseMysqlUrl(url) {
  try {
    // Remove the scheme
    const withoutScheme = url.replace(/^mysql:\/\//, '');
    // Split on last @ to separate credentials from host
    const lastAt = withoutScheme.lastIndexOf('@');
    const credentials = withoutScheme.slice(0, lastAt);          // user:pass (may contain @)
    const hostPart = withoutScheme.slice(lastAt + 1);             // host:port/dbname
    // credentials: split on first :
    const firstColon = credentials.indexOf(':');
    const user = credentials.slice(0, firstColon);
    const password = credentials.slice(firstColon + 1);
    // hostPart: host:port/dbname
    const slashIdx = hostPart.indexOf('/');
    const hostPort = hostPart.slice(0, slashIdx);
    const database = hostPart.slice(slashIdx + 1);
    const colonIdx = hostPort.indexOf(':');
    const host = colonIdx !== -1 ? hostPort.slice(0, colonIdx) : hostPort;
    const port = colonIdx !== -1 ? Number(hostPort.slice(colonIdx + 1)) : 3306;
    return { host, port, user, password, database };
  } catch {
    return null;
  }
}

const parsed = parseMysqlUrl(process.env.DATABASE_URL || '');

const pool = mysql.createPool({
  host:     parsed?.host     || process.env.DB_HOST     || 'localhost',
  port:     parsed?.port     || Number(process.env.DB_PORT || 3306),
  user:     parsed?.user     || process.env.DB_USER     || 'root',
  password: parsed?.password || process.env.DB_PASSWORD || '',
  database: parsed?.database || process.env.DB_NAME     || 'recipe_management',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: false,
});

pool.getConnection()
  .then(conn => { logger.info('MySQL pool connected'); conn.release(); })
  .catch(err => logger.error('MySQL pool error:', err.message));

module.exports = pool;
