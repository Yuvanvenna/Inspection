import {
  Role,
  UserStatus,
  Priority,
  ProjectStatus,
  StageName,
  StageStatus,
  TaskStatus,
  NotificationType,
} from './enums';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  department?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  contact_person: string;
  contact_email: string;
  phone?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  project_count?: number;
}

export interface Project {
  id: string;
  client_id: string;
  client?: Client;
  name: string;
  description: string;
  start_date: string;
  deadline: string;
  priority: Priority;
  status: ProjectStatus;
  overall_progress: number;
  
  // Specifications
  client_requirements?: string | null;
  functional_requirements?: string | null;
  technical_requirements?: string | null;
  deliverables?: string | null;
  acceptance_criteria?: string | null;
  additional_notes?: string | null;
  
  // Architecture & Tech
  system_architecture?: string | null;
  technology_stack?: string | null;
  database_info?: string | null;
  api_info?: string | null;
  infrastructure_info?: string | null;
  technical_notes?: string | null;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  stages?: WorkflowStage[];
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  user?: UserProfile;
  assigned_at: string;
}

export interface WorkflowStage {
  id: string;
  project_id: string;
  name: StageName;
  stage_order: number;
  calculated_progress: number | null; // null if 0 tasks
  manager_override: number | null;
  effective_progress: number | null;
  status: StageStatus;
  created_at: string;
  updated_at: string;
  tasks?: Task[];
  task_count?: number;
  blocked_count?: number;
}

export interface StageOverrideHistory {
  id: string;
  stage_id: string;
  previous_override: number | null;
  new_override: number | null;
  reason?: string | null;
  created_by: string;
  created_by_profile?: UserProfile;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  project?: Project;
  stage_id: string;
  stage?: WorkflowStage;
  title: string;
  description?: string | null;
  assigned_to: string;
  assigned_to_profile?: UserProfile;
  deadline: string;
  priority: Priority;
  status: TaskStatus;
  progress: number; // 0 - 100
  blocker_reason?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  work_updates?: WorkUpdate[];
}

export interface WorkUpdate {
  id: string;
  task_id: string;
  employee_id: string;
  employee?: UserProfile;
  message: string;
  progress_at_update: number;
  status_at_update: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  actor?: UserProfile;
  entity_type: string;
  entity_id: string;
  action: string;
  details?: Record<string, any> | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  project_id: string;
  task_id?: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by: string;
  uploader?: UserProfile;
  created_at: string;
}

