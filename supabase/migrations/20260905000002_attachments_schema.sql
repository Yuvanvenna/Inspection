-- ============================================================================
-- ATTACHMENTS TABLE & SUPABASE STORAGE BUCKET
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_attachments_project_id ON public.attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON public.attachments(task_id);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- Project members and managers can view attachments
CREATE POLICY "Project members and managers can view attachments"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (
    public.is_manager() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = public.attachments.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Project members and managers can insert attachments
CREATE POLICY "Project members and managers can insert attachments"
  ON public.attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND (
      public.is_manager() OR
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = public.attachments.project_id
          AND pm.user_id = auth.uid()
      )
    )
  );

-- Delete policy: Managers or uploader can delete
CREATE POLICY "Uploader or manager can delete attachments"
  ON public.attachments FOR DELETE
  TO authenticated
  USING (
    public.is_manager() OR uploaded_by = auth.uid()
  );
