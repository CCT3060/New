const prisma = require('../../db/prisma');
const logger = require('../../utils/logger');

/**
 * Log an audit event
 * @param {object} params
 */
const log = async ({ module, entityId, action, oldValue = null, newValue = null, userId }) => {
  try {
    await prisma.auditLog.create({
      data: { module, entityId, action, oldValue, newValue, userId },
    });
  } catch (err) {
    // Audit logging failures should not break the main flow
    logger.error('Failed to write audit log:', err.message);
  }
};

/**
 * Get audit logs for an entity
 */
const getEntityLogs = async (entityId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where: { entityId } }),
  ]);
  return { logs, total };
};

/**
 * Get all audit logs with filters
 */
const getAllLogs = async ({ module, action, userId, page = 1, limit = 50 } = {}) => {
  const where = {};
  if (module) where.module = module;
  if (action) where.action = action;
  if (userId) where.userId = userId;

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
};

module.exports = { log, getEntityLogs, getAllLogs };
