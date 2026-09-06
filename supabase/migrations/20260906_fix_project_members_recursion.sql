-- ============================================================================
-- FIX: Infinite recursion detected in policy for relation "project_members"
-- ============================================================================

-- 1. Create a SECURITY DEFINER helper function to evaluate membership
-- Since SECURITY DEFINER functions bypass RLS during execution,
-- querying project_members inside this function will never trigger recursion.
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;

-- 3. Recreate the policy using the SECURITY DEFINER function & direct user_id check
CREATE POLICY "Users can view members of their projects"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    public.is_manager() OR
    user_id = auth.uid() OR
    public.is_project_member(project_id)
  );
