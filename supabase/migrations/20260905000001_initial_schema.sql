-- ============================================================================
-- ANTIGRAVITY PROJECT MANAGEMENT PLATFORM — SUPABASE POSTGRESQL SCHEMA (PHASE 1)
-- ============================================================================

-- 1. ENUMS
CREATE TYPE role_enum AS ENUM ('MANAGER', 'EMPLOYEE');
CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE project_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');
CREATE TYPE stage_name_enum AS ENUM ('PLANNING', 'MODELLING', 'DEVELOPMENT', 'TESTING', 'THREE_D_MODELLING', 'COMPLETION');
CREATE TYPE stage_status_enum AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');
CREATE TYPE task_status_enum AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');
CREATE TYPE notification_type_enum AS ENUM (
  'TASK_ASSIGNED',
  'TASK_BLOCKED',
  'TASK_COMPLETED',
  'DEADLINE_APPROACHING',
  'TASK_OVERDUE',
  'PROJECT_ASSIGNED',
  'STAGE_OVERRIDE'
);

-- 2. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role role_enum NOT NULL DEFAULT 'EMPLOYEE',
  status user_status_enum NOT NULL DEFAULT 'ACTIVE',
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CLIENTS TABLE
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PROJECTS TABLE
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  priority priority_enum NOT NULL DEFAULT 'MEDIUM',
  status project_status_enum NOT NULL DEFAULT 'ACTIVE',
  overall_progress NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  
  -- Specifications & Requirements
  client_requirements TEXT,
  functional_requirements TEXT,
  technical_requirements TEXT,
  deliverables TEXT,
  acceptance_criteria TEXT,
  additional_notes TEXT,
  
  -- Architecture & Technical Info
  system_architecture TEXT,
  technology_stack TEXT,
  database_info TEXT,
  api_info TEXT,
  infrastructure_info TEXT,
  technical_notes TEXT,
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PROJECT MEMBERS TABLE (Team assignments)
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

-- 7. WORKFLOW STAGES (Exactly 6 fixed stages per project)
CREATE TABLE public.workflow_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name stage_name_enum NOT NULL,
  stage_order INT NOT NULL CHECK (stage_order BETWEEN 1 AND 6),
  calculated_progress NUMERIC(5,2) NULL, -- null when no tasks exist
  manager_override NUMERIC(5,2) NULL,   -- null when no override active
  effective_progress NUMERIC(5,2) NULL,  -- override ?? calculated_progress
  status stage_status_enum NOT NULL DEFAULT 'NOT_STARTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_project_stage_order UNIQUE (project_id, stage_order),
  CONSTRAINT unique_project_stage_name UNIQUE (project_id, name)
);

-- 8. STAGE OVERRIDE HISTORY
CREATE TABLE public.stage_override_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id UUID NOT NULL REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  previous_override NUMERIC(5,2) NULL,
  new_override NUMERIC(5,2) NULL,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TASKS TABLE
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  deadline TIMESTAMPTZ NOT NULL,
  priority priority_enum NOT NULL DEFAULT 'MEDIUM',
  status task_status_enum NOT NULL DEFAULT 'NOT_STARTED',
  progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  blocker_reason TEXT NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. WORK UPDATES TABLE (Strictly append-only timeline)
CREATE TABLE public.work_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  progress_at_update INT NOT NULL CHECK (progress_at_update BETWEEN 0 AND 100),
  status_at_update TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AUDIT LOGS TABLE
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_override_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is Manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'MANAGER'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Managers can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_manager());

-- CLIENTS POLICIES (Manager only)
CREATE POLICY "Clients manageable by managers"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.is_manager());

-- PROJECTS POLICIES
CREATE POLICY "Managers can manage all projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.is_manager());

CREATE POLICY "Employees can view assigned projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = public.projects.id AND user_id = auth.uid()
    )
  );

-- Helper function: Check if current user is a project member (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROJECT MEMBERS POLICIES
CREATE POLICY "Managers can manage project members"
  ON public.project_members FOR ALL
  TO authenticated
  USING (public.is_manager());

CREATE POLICY "Users can view members of their projects"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    public.is_manager() OR user_id = auth.uid() OR public.is_project_member(project_id)
  );

-- WORKFLOW STAGES POLICIES
CREATE POLICY "Stages viewable by project members or managers"
  ON public.workflow_stages FOR SELECT
  TO authenticated
  USING (
    public.is_manager() OR
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = public.workflow_stages.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Stages modifiable by managers only"
  ON public.workflow_stages FOR ALL
  TO authenticated
  USING (public.is_manager());

-- TASKS POLICIES
CREATE POLICY "Managers can manage all tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (public.is_manager());

CREATE POLICY "Employees can view tasks in assigned projects"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = public.tasks.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update assigned tasks progress and status"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- WORK UPDATES POLICIES (Append-only)
CREATE POLICY "Work updates viewable by project members or managers"
  ON public.work_updates FOR SELECT
  TO authenticated
  USING (
    public.is_manager() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE t.id = public.work_updates.task_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create work updates for assigned tasks"
  ON public.work_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id AND (assigned_to = auth.uid() OR public.is_manager())
    )
  );

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view and update their own notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- AUDIT LOGS POLICIES (Manager only)
CREATE POLICY "Managers can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_manager());

-- ============================================================================
-- AUTOMATIC TRIGGER: Create all 6 fixed stages upon project creation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_project_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workflow_stages (project_id, name, stage_order, calculated_progress, manager_override, effective_progress, status)
  VALUES
    (NEW.id, 'PLANNING', 1, NULL, NULL, NULL, 'NOT_STARTED'),
    (NEW.id, 'MODELLING', 2, NULL, NULL, NULL, 'NOT_STARTED'),
    (NEW.id, 'DEVELOPMENT', 3, NULL, NULL, NULL, 'NOT_STARTED'),
    (NEW.id, 'TESTING', 4, NULL, NULL, NULL, 'NOT_STARTED'),
    (NEW.id, 'THREE_D_MODELLING', 5, NULL, NULL, NULL, 'NOT_STARTED'),
    (NEW.id, 'COMPLETION', 6, NULL, NULL, NULL, 'NOT_STARTED');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created_create_stages
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project_stages();
