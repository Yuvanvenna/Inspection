import { StageStatus } from './enums';

/**
 * Task Progress: 0 - 100%
 */
export function clampProgress(value: number): number {
  if (isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Calculate Stage Progress from Task Percentages:
 * Stage calculated progress = average of all task percentages in that stage.
 * If a stage has no tasks: calculated progress = null.
 */
export function calculateStageProgress(tasks: Array<{ progress: number }>): number | null {
  if (!tasks || tasks.length === 0) {
    return null;
  }
  const sum = tasks.reduce((acc, t) => acc + clampProgress(t.progress), 0);
  const avg = sum / tasks.length;
  // Round to 1 decimal place or nearest integer
  return Math.round(avg * 10) / 10;
}

/**
 * Determine Stage Status from Tasks:
 * - If 0 tasks: NOT_STARTED
 * - If all tasks COMPLETED: COMPLETED
 * - If any task BLOCKED: BLOCKED
 * - If any task progress > 0 or IN_PROGRESS: IN_PROGRESS
 * - Otherwise: NOT_STARTED
 */
export function deriveStageStatus(
  tasks: Array<{ status: string; progress: number }>
): StageStatus {
  if (!tasks || tasks.length === 0) {
    return 'NOT_STARTED';
  }

  const allCompleted = tasks.every((t) => t.status === 'COMPLETED' || t.progress === 100);
  if (allCompleted) return 'COMPLETED';

  const anyBlocked = tasks.some((t) => t.status === 'BLOCKED');
  if (anyBlocked) return 'BLOCKED';

  const anyInProgress = tasks.some(
    (t) => t.status === 'IN_PROGRESS' || (t.progress > 0 && t.progress < 100)
  );
  if (anyInProgress) return 'IN_PROGRESS';

  return 'NOT_STARTED';
}

/**
 * Stage Effective Progress:
 * If override exists -> override
 * Otherwise -> calculated progress
 */
export function determineEffectiveProgress(
  calculatedProgress: number | null,
  managerOverride: number | null
): number | null {
  if (managerOverride !== null && managerOverride !== undefined) {
    return clampProgress(managerOverride);
  }
  return calculatedProgress;
}

/**
 * Overall Project Progress:
 * Average of the six stage progress values that have actual task-based progress (or an override).
 * Empty stages without tasks or overrides are excluded from the denominator.
 */
export function calculateProjectProgress(
  stages: Array<{ effective_progress: number | null }>
): number {
  if (!stages || stages.length === 0) {
    return 0;
  }

  const activeStages = stages.filter(
    (s) => s.effective_progress !== null && s.effective_progress !== undefined
  );

  if (activeStages.length === 0) {
    return 0;
  }

  const sum = activeStages.reduce((acc, s) => acc + (s.effective_progress ?? 0), 0);
  const avg = sum / activeStages.length;
  return Math.round(avg * 10) / 10;
}
