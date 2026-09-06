import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middlewares/auth';
import { AuditService } from '../services/audit.service';

const router = Router();

/**
 * GET /api/audit-logs
 * Retrieves immutable audit entries. Accessible only to Managers.
 */
router.get(
  '/',
  requireAuth,
  requireRole('MANAGER'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await AuditService.getLogs(limit);
      return res.json({ success: true, data: logs });
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      return res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to fetch audit logs' },
      });
    }
  }
);

/**
 * POST /api/audit-logs
 * Allows recording an audit event.
 */
router.post(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { entity_type, entity_id, action, details } = req.body;
      if (!entity_type || !entity_id || !action) {
        return res.status(400).json({
          success: false,
          error: { message: 'entity_type, entity_id, and action are required' },
        });
      }

      await AuditService.recordLog(
        req.user?.id || null,
        entity_type,
        entity_id,
        action,
        details
      );

      return res.json({ success: true });
    } catch (err: any) {
      console.error('Error creating audit log:', err);
      return res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to create audit log' },
      });
    }
  }
);

export default router;
