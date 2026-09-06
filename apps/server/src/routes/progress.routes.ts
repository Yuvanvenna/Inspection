import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middlewares/auth';
import { ProgressService } from '../services/progress.service';
import { supabaseAdmin } from '../config/supabase';

export const progressRouter = Router();

/**
 * GET /api/stages/:id
 * Fetch single stage details including tasks, project, client, and override history (RLS bypass)
 */
progressRouter.get('/stages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: stage, error: stageError } = await supabaseAdmin
      .from('workflow_stages')
      .select(`
        *,
        project:projects(id, name, client:clients(name)),
        tasks:tasks(
          id, title, description, status, progress, priority, deadline, blocker_reason,
          assigned_to_profile:profiles(id, name, email, department)
        ),
        override_history:stage_override_history(
          id, previous_override, new_override, reason, created_at,
          created_by_profile:profiles(id, name)
        )
      `)
      .eq('id', id)
      .single();

    if (stageError || !stage) {
      return res.status(404).json({
        success: false,
        error: { message: stageError ? stageError.message : 'Stage not found' },
      });
    }

    if (stage.override_history) {
      stage.override_history.sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return res.json({
      success: true,
      data: stage,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { message: err.message },
    });
  }
});

const overrideSchema = z.object({
  override: z.number().min(0).max(100).nullable(),
  reason: z.string().optional().nullable(),
});

/**
 * PATCH /api/stages/:id/override
 * Manager sets or clears a stage override
 */
progressRouter.patch(
  '/stages/:id/override',
  requireAuth,
  requireRole('MANAGER'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = overrideSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid override value', details: parsed.error.format() },
        });
      }

      const result = await ProgressService.setStageOverride(
        id,
        parsed.data.override,
        parsed.data.reason || null,
        req.user!.id
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { message: err.message },
      });
    }
  }
);

/**
 * POST /api/stages/:id/recalculate
 * Explicit recalculation trigger
 */
progressRouter.post(
  '/stages/:id/recalculate',
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await ProgressService.recalculateStage(id);
      return res.json({ success: true, message: 'Stage recalculated successfully' });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { message: err.message },
      });
    }
  }
);

