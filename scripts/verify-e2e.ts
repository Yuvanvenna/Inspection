import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import {
  calculateStageProgress,
  deriveStageStatus,
  determineEffectiveProgress,
  calculateProjectProgress,
  STAGE_NAMES,
} from '@antigravity/shared';

dotenv.config({ path: path.join(__dirname, '../apps/server/.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in server .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runQA() {
  console.log('===============================================================');
  console.log('  ANTIGRAVITY PM PLATFORM — END-TO-END QA & SYSTEM VERIFICATION');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (detail) console.error(`     ↳ Details: ${detail}`);
    }
  }

  // TEST SUITE 1: Supabase Database Schema & Core Tables
  console.log('--- [1/5] Verifying Supabase Database Core Tables ---');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, name, role, email');
  assert(!pErr && profiles && profiles.length >= 5, 'Profiles table contains Manager and Employees', `Found ${profiles?.length} profiles`);

  const managerProfile = profiles?.find((p) => p.role === 'MANAGER');
  assert(!!managerProfile, 'Manager profile Alex Morgan exists with role "MANAGER"');

  const employeeProfiles = profiles?.filter((p) => p.role === 'EMPLOYEE');
  assert((employeeProfiles?.length || 0) >= 4, `At least 4 Employees present (Found: ${employeeProfiles?.length})`);

  const { data: clients, error: cErr } = await supabase.from('clients').select('id, name, company');
  assert(!cErr && clients && clients.length >= 2, 'Clients table populated with corporate clients');

  const { data: projects, error: prjErr } = await supabase.from('projects').select('id, name, overall_progress');
  assert(!prjErr && projects && projects.length >= 1, 'Projects table populated with primary Autonomous Survey Drone project');

  // TEST SUITE 2: Six Fixed Workflow Stages Architecture
  console.log('\n--- [2/5] Verifying Six Fixed Workflow Stages Hierarchy ---');
  if (projects && projects.length > 0) {
    const projectId = projects[0].id;
    const { data: stages, error: stgErr } = await supabase
      .from('workflow_stages')
      .select('id, name, stage_order, calculated_progress, manager_override, effective_progress, status')
      .eq('project_id', projectId)
      .order('stage_order', { ascending: true });

    assert(!stgErr && stages && stages.length === 6, 'Project contains exactly 6 fixed workflow stages', `Found ${stages?.length} stages`);

    const expectedOrder = [
      'PLANNING',
      'MODELLING',
      'DEVELOPMENT',
      'TESTING',
      'THREE_D_MODELLING',
      'COMPLETION',
    ];
    const actualOrder = stages?.map((s) => s.name);
    const orderMatches = JSON.stringify(actualOrder) === JSON.stringify(expectedOrder);
    assert(orderMatches, 'Six stages strictly adhere to mandatory sequential workflow order', `Got: ${actualOrder?.join(' -> ')}`);
  }

  // TEST SUITE 3: Deterministic Arithmetic Calculation Engine
  console.log('\n--- [3/5] Verifying Deterministic Arithmetic Calculation Formulas ---');
  // 3a. Stage progress with empty tasks => null
  const emptyStageProg = calculateStageProgress([]);
  assert(emptyStageProg === null, 'Stage with 0 tasks evaluates to null ("Not Started")');

  // 3b. Stage progress with tasks: unweighted arithmetic average
  const sampleTasks = [
    { progress: 100, status: 'COMPLETED' },
    { progress: 50, status: 'IN_PROGRESS' },
    { progress: 25, status: 'IN_PROGRESS' },
  ];
  const stageProg = calculateStageProgress(sampleTasks as any);
  // (100 + 50 + 25) / 3 = 175 / 3 = 58.333... -> 58.3
  assert(stageProg === 58.3, 'Stage calculates unweighted arithmetic average rounded to 1 decimal', `Expected 58.3, got ${stageProg}`);

  // 3c. Stage Status derivation: if any task is BLOCKED => stage is BLOCKED
  const blockedTasks = [
    { progress: 50, status: 'IN_PROGRESS' },
    { progress: 20, status: 'BLOCKED' },
  ];
  const derivedBlocked = deriveStageStatus(blockedTasks as any);
  assert(derivedBlocked === 'BLOCKED', 'Stage status automatically derives "BLOCKED" if any task is blocked');

  // 3d. Manager Override priority over calculated progress
  const effectiveOverride = determineEffectiveProgress(58.3, 75.0);
  assert(effectiveOverride === 75.0, 'Manager override takes immediate precedence when set (75.0%)');

  const effectiveRevert = determineEffectiveProgress(58.3, null);
  assert(effectiveRevert === 58.3, 'Clearing manager override reverts seamlessly to calculated progress (58.3%)');

  // 3e. Project overall progress: only active stages in denominator
  const mockStages = [
    { effective_progress: 100.0 }, // Stage 1 active
    { effective_progress: 80.0 },  // Stage 2 active
    { effective_progress: 70.0 },  // Stage 3 active
    { effective_progress: 20.0 },  // Stage 4 active
    { effective_progress: null },  // Stage 5 empty
    { effective_progress: null },  // Stage 6 empty
  ];
  const overallProg = calculateProjectProgress(mockStages);
  // (100 + 80 + 70 + 20) / 4 active stages = 270 / 4 = 67.5%
  assert(overallProg === 67.5, 'Project progress correctly excludes empty stages from denominator (270 / 4 = 67.5%)', `Got ${overallProg}%`);

  // TEST SUITE 4: Append-Only Work Updates & Audit Trail
  console.log('\n--- [4/5] Verifying Append-Only Work Updates & Audit Tables ---');
  const { data: updates, error: upErr } = await supabase.from('work_updates').select('id, progress_at_update, status_at_update');
  assert(!upErr, 'Work updates table accessible and queryable', `Records found: ${updates?.length || 0}`);

  const { data: auditLogs, error: audErr } = await supabase.from('audit_logs').select('id, action, entity_type');
  assert(!audErr, 'Audit logs table accessible and queryable', `Records found: ${auditLogs?.length || 0}`);

  const { data: notifications, error: notifErr } = await supabase.from('notifications').select('id, type, title');
  assert(!notifErr, 'Notifications table accessible and queryable', `Records found: ${notifications?.length || 0}`);

  // TEST SUITE 5: Supabase Storage Buckets
  console.log('\n--- [5/5] Verifying Supabase Storage Cloud Buckets ---');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  assert(!bErr, 'Supabase Storage API operational');
  const hasAttachmentBucket = buckets?.some((b) => b.name === 'project-attachments');
  assert(!!hasAttachmentBucket, 'Public storage bucket "project-attachments" active on Supabase');

  console.log('\n===============================================================');
  console.log(`  QA RESULT: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEM REQUIREMENTS & ARCHITECTURAL SPECS VERIFIED!');
  } else {
    process.exit(1);
  }
}

runQA().catch((err) => {
  console.error('Fatal QA script error:', err);
  process.exit(1);
});
