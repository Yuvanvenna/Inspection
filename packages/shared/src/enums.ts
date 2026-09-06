export type Role = 'MANAGER' | 'EMPLOYEE';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export type StageName =
  | 'PLANNING'
  | 'MODELLING'
  | 'DEVELOPMENT'
  | 'TESTING'
  | 'THREE_D_MODELLING'
  | 'COMPLETION';

export const STAGE_DISPLAY_NAMES: Record<StageName, string> = {
  PLANNING: 'Planning',
  MODELLING: 'Modelling',
  DEVELOPMENT: 'Development',
  TESTING: 'Testing',
  THREE_D_MODELLING: '3D Modelling',
  COMPLETION: 'Completion',
};

export const FIXED_STAGE_ORDER: StageName[] = [
  'PLANNING',
  'MODELLING',
  'DEVELOPMENT',
  'TESTING',
  'THREE_D_MODELLING',
  'COMPLETION',
];

export type StageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_BLOCKED'
  | 'TASK_COMPLETED'
  | 'DEADLINE_APPROACHING'
  | 'TASK_OVERDUE'
  | 'PROJECT_ASSIGNED'
  | 'STAGE_OVERRIDE';
