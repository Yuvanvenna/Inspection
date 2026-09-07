import { supabase } from '../lib/supabase';
import {
  WorkflowStage,
  StageOverrideHistory,
  calculateStageProgress,
  determineEffectiveProgress,
} from '@antigravity/shared';
import { API_URL } from '../lib/api';

export const StageService = {
  async getStageById(id: string): Promise<
    WorkflowStage & {
      project?: any;
      tasks?: any[];
      override_history?: StageOverrideHistory[];
    }
  > {
    // 1. Try Express backend API (bypasses RLS with service role)
    try {
      const activeUser = localStorage.getItem('ag_active_user');
      const parsedUser = activeUser ? JSON.parse(activeUser) : null;

      const res = await fetch(`${API_URL}/stages/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(parsedUser?.id ? { 'x-user-id': parsedUser.id } : {}),
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const stage = json.data;
          if (stage.override_history) {
            stage.override_history.sort(
              (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          }
          return stage;
        }
      }
    } catch (e) {
      console.warn('Backend /api/stages error, falling back to client query:', e);
    }

    // 2. Direct client fallback
    const { data: stage, error: stageError } = await supabase
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

    if (stageError) {
      throw new Error(`Failed to fetch stage: ${stageError.message}`);
    }

    if (stage.override_history) {
      stage.override_history.sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    // Self-healing: if tasks exist, compute exact progress in case backend trigger was missed
    if (stage.tasks && stage.tasks.length > 0) {
      const liveCalc = calculateStageProgress(stage.tasks);
      if (liveCalc !== null) {
        stage.calculated_progress = liveCalc;
        stage.effective_progress = determineEffectiveProgress(liveCalc, stage.manager_override);
      }
    }

    return stage;
  },

  async setStageOverride(
    stageId: string,
    overrideValue: number | null,
    reason?: string | null
  ): Promise<any> {
    const activeUser = localStorage.getItem('ag_active_user');
    const parsedUser = activeUser ? JSON.parse(activeUser) : null;

    // 1. Call server API to perform atomic calculation & history logging
    const response = await fetch(`${API_URL}/stages/${stageId}/override`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(parsedUser?.id ? { 'x-user-id': parsedUser.id } : {}),
      },
      body: JSON.stringify({
        override: overrideValue,
        reason: reason || null,
      }),
    });

    if (!response.ok) {
      // Direct client fallback if backend server is not running during local dev
      const { data: stage } = await supabase
        .from('workflow_stages')
        .select('calculated_progress, project_id')
        .eq('id', stageId)
        .single();

      const effective = overrideValue !== null ? overrideValue : stage?.calculated_progress;

      await supabase
        .from('workflow_stages')
        .update({
          manager_override: overrideValue,
          effective_progress: effective,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stageId);

      return { effective_progress: effective };
    }

    const res = await response.json();
    return res.data;
  },

  async removeStageOverride(stageId: string): Promise<any> {
    return this.setStageOverride(stageId, null, 'Manager reverted override to system calculated progress.');
  },
};
