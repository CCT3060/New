const db = require('../../db/mysql');
const logger = require('../../utils/logger');

const log = async ({ module, entityId, action, oldValue = null, newValue = null, userId }) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    await db.query(
      'INSERT INTO audit_logs (id, module, entityId, action, oldValue, newValue, userId, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [uuidv4(), module, entityId, action,
       oldValue ? JSON.stringify(oldValue) : null,
       newValue ? JSON.stringify(newValue) : null,
       userId || null]
    );
  } catch (err) {
    logger.error('Failed to write audit log:', err.message);
  }
};

const getEntityLogs = async (entityId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM audit_logs WHERE entityId = ?', [entityId]);
  const [logs] = await db.query(`
    SELECT al.id, al.module, al.entityId, al.action, al.oldValue, al.newValue, al.timestamp,
           u.id AS userId, u.name AS userName, u.email AS userEmail, u.role AS userRole
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.userId
    WHERE al.entityId = ?
    ORDER BY al.timestamp DESC
    LIMIT ? OFFSET ?`, [entityId, limit, skip]
  );
  return { logs: logs.map(mapLog), total };
};

const getAllLogs = async ({ module, action, userId, page = 1, limit = 50 } = {}) => {
  const conditions = [];
  const params = [];
  if (module) { conditions.push('al.module = ?'); params.push(module); }
  if (action) { conditions.push('al.action = ?'); params.push(action); }
  if (userId) { conditions.push('al.userId = ?'); params.push(userId); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const skip = (page - 1) * limit;
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM audit_logs al ${where}`, params);
  const [logs] = await db.query(`
    SELECT al.id, al.module, al.entityId, al.action, al.oldValue, al.newValue, al.timestamp,
           u.id AS userId, u.name AS userName, u.role AS userRole
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.userId
    ${where}
    ORDER BY al.timestamp DESC
    LIMIT ? OFFSET ?`, [...params, limit, skip]
  );
  return { logs: logs.map(mapLog), total };
};

const mapLog = (r) => ({
  id: r.id, module: r.module, entityId: r.entityId, action: r.action, timestamp: r.timestamp,
  oldValue: r.oldValue ? JSON.parse(r.oldValue) : null,
  newValue: r.newValue ? JSON.parse(r.newValue) : null,
  user: r.userId ? { id: r.userId, name: r.userName, email: r.userEmail, role: r.userRole } : null,
});

module.exports = { log, getEntityLogs, getAllLogs };
