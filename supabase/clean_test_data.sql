-- ============================================================================
-- CLEANUP SCRIPT: PREPARE PLATFORM FOR CLIENT HANDOFF
-- ============================================================================
-- This script removes all test business data while keeping all login details,
-- manager accounts, and employee profiles 100% intact.
--
-- What gets DELETED:
--   - Test work updates timeline
--   - Test tasks and blockers
--   - Test attachments metadata
--   - Test stage overrides and workflow stages
--   - Test project members
--   - Test projects
--   - Test clients
--   - Test notifications
--   - Test audit logs
--
-- What is PRESERVED (NOT deleted):
--   - auth.users (All login credentials & passwords)
--   - public.profiles (Alex Morgan, employees, roles, departments)
-- ============================================================================

BEGIN;

-- 1. Remove task updates and attachments
DELETE FROM public.work_updates;
DELETE FROM public.attachments;
DELETE FROM public.stage_override_history;
DELETE FROM public.tasks;

-- 2. Remove project workflow stages, members, and projects
DELETE FROM public.workflow_stages;
DELETE FROM public.project_members;
DELETE FROM public.projects;

-- 3. Remove test clients
DELETE FROM public.clients;

-- 4. Remove test notifications and audit records
DELETE FROM public.notifications;
DELETE FROM public.audit_logs;

COMMIT;

-- Verify that users & profiles are still intact:
SELECT id, name, email, role, department FROM public.profiles;
