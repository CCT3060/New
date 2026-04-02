const router = require('express').Router();
const auditService = require('./audit.service');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/role.middleware');
const { success } = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

router.use(authenticate);

// GET /api/audit - all logs (Admin only)
router.get('/', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { logs, total } = await auditService.getAllLogs({ ...req.query, page, limit });
    return success(res, { logs, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/audit/entity/:entityId - logs for a specific entity
router.get('/entity/:entityId', authorize('ADMIN', 'OPS_MANAGER', 'APPROVER'), async (req, res, next) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { logs, total } = await auditService.getEntityLogs(req.params.entityId, { page, limit });
    return success(res, { logs, pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
