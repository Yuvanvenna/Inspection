import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth';
import { NotificationService } from '../services/notification.service';

const router = Router();

/**
 * POST /api/notifications
 * Sends a notification to a specific user.
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { user_id, type, title, message, link_url } = req.body;
    if (!user_id || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: { message: 'user_id, type, title, and message are required' },
      });
    }

    const notification = await NotificationService.sendNotification(
      user_id,
      type,
      title,
      message,
      link_url
    );

    return res.json({ success: true, data: notification });
  } catch (err: any) {
    console.error('Error sending notification:', err);
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to send notification' },
    });
  }
});

/**
 * POST /api/notifications/notify-managers
 * Broadcasts an urgent notification to all managers (e.g. task blocked).
 */
router.post('/notify-managers', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, title, message, link_url } = req.body;
    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: { message: 'type, title, and message are required' },
      });
    }

    await NotificationService.notifyManagers(type, title, message, link_url);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error notifying managers:', err);
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to notify managers' },
    });
  }
});

export default router;
