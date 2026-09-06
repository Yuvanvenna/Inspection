import { supabaseAdmin } from '../config/supabase';
import {
  calculateStageProgress,
  deriveStageStatus,
  determineEffectiveProgress,
  calculateProjectProgress,
} from '@antigravity/shared';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';

export class ProgressService {
  /**
   * Recalculates progress for a specific workflow stage and its parent project.
   */
  static async recalculateStage(stageId: string): Promise<void> {
    // 1. Fetch stage to get project_id and existing manager_override
    const { data: stage, error: stageError } = await supabaseAdmin
      .from('workflow_stages')
      .select('id, project_id, manager_override')
      .eq('id', stageId)
      .single();

    if (stageError || !stage) {
      throw new Error(`Stage not found: ${stageId}`);
    }

    // 2. Fetch all tasks for this stage
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('progress, status')
      .eq('stage_id', stageId);

    if (tasksError) {
      throw new Error(`Failed to fetch tasks for stage: ${tasksError.message}`);
    }

    const calculatedProgress = calculateStageProgress(tasks || []);
    const stageStatus = deriveStageStatus(tasks || []);
    const effectiveProgress = determineEffectiveProgress(
      calculatedProgress,
      stage.manager_override
    );

    // 3. Update stage in database
    const { error: updateError } = await supabaseAdmin
      .from('workflow_stages')
      .update({
        calculated_progress: calculatedProgress,
        effective_progress: effectiveProgress,
        status: stageStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stageId);

    if (updateError) {
      throw new Error(`Failed to update stage progress: ${updateError.message}`);
    }

    // 4. Cascade recalculation to the project
    await this.recalculateProject(stage.project_id);
  }

  /**
   * Recalculates overall project progress across all 6 stages.
   */
  static async recalculateProject(projectId: string): Promise<number> {
    const { data: stages, error: stagesError } = await supabaseAdmin
      .from('workflow_stages')
      .select('effective_progress')
      .eq('project_id', projectId);

    if (stagesError || !stages) {
      throw new Error(`Failed to fetch stages for project: ${stagesError?.message}`);
    }

    const overallProgress = calculateProjectProgress(stages);

    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        overall_progress: overallProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      throw new Error(`Failed to update project overall progress: ${updateError.message}`);
    }

    return overallProgress;
  }

  /**
   * Sets or clears a manager stage override.
   * If overrideValue is null, clears the override and reverts to calculated_progress.
   */
  static async setStageOverride(
    stageId: string,
    overrideValue: number | null,
    reason: string | null,
    managerId: string
  ): Promise<{ calculated_progress: number | null; effective_progress: number | null }> {
    // 1. Fetch current stage
    const { data: stage, error: stageError } = await supabaseAdmin
      .from('workflow_stages')
      .select('id, project_id, calculated_progress, manager_override')
      .eq('id', stageId)
      .single();

    if (stageError || !stage) {
      throw new Error(`Stage not found: ${stageId}`);
    }

    const effectiveProgress = determineEffectiveProgress(
      stage.calculated_progress,
      overrideValue
    );

    // 2. Record in stage_override_history
    await supabaseAdmin.from('stage_override_history').insert({
      stage_id: stageId,
      previous_override: stage.manager_override,
      new_override: overrideValue,
      reason: reason || null,
      created_by: managerId,
    });

    // 3. Update stage record
    const { error: updateError } = await supabaseAdmin
      .from('workflow_stages')
      .update({
        manager_override: overrideValue,
        effective_progress: effectiveProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stageId);

    if (updateError) {
      throw new Error(`Failed to apply manager override: ${updateError.message}`);
    }

    // 4. Cascade project overall progress recalculation
    await this.recalculateProject(stage.project_id);

    // 5. Record system audit log
    await AuditService.recordLog(
      managerId,
      'STAGE',
      stageId,
      'STAGE_OVERRIDE',
      {
        stage_id: stageId,
        project_id: stage.project_id,
        previous_override: stage.manager_override,
        new_override: overrideValue,
        reason: reason || null,
      }
    );

    // 6. Notify project team members about the stage calibration
    await NotificationService.notifyProjectMembers(
      stage.project_id,
      'STAGE_OVERRIDE',
      'Stage Progress Override Updated',
      overrideValue !== null
        ? `Manager set stage progress override to ${overrideValue}% (Reason: ${reason || 'Not specified'})`
        : 'Manager cleared stage progress override, reverting to calculated progress.',
      `/projects/${stage.project_id}`,
      managerId
    );

    return {
      calculated_progress: stage.calculated_progress,
      effective_progress: effectiveProgress,
    };
  }
}
