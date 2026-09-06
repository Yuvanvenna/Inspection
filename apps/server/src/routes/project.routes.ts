import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { FIXED_STAGE_ORDER } from '@antigravity/shared';

export const projectRouter = Router();

// GET /api/projects - List all projects with client and stages (optionally filtered by assigned employee)
projectRouter.get('/projects', async (req: Request, res: Response) => {
  try {
    const { assignedTo } = req.query;

    let projectIds: string[] | null = null;
    if (assignedTo) {
      // 1. Get projects where user is explicitly in project_members
      const { data: memberProjects } = await supabaseAdmin
        .from('project_members')
        .select('project_id')
        .eq('user_id', String(assignedTo));

      // 2. Get projects where user has any assigned tasks
      const { data: taskProjects } = await supabaseAdmin
        .from('tasks')
        .select('project_id')
        .eq('assigned_to', String(assignedTo));

      const memberIds = (memberProjects || []).map((m) => m.project_id);
      const taskPIds = (taskProjects || []).map((t) => t.project_id);
      const combined = Array.from(new Set([...memberIds, ...taskPIds]));

      if (combined.length === 0) {
        return res.json({ success: true, data: [] });
      }
      projectIds = combined;
    }

    let query = supabaseAdmin
      .from('projects')
      .select(`
        *,
        client:clients(id, name, company),
        stages:workflow_stages(id, name, stage_order, calculated_progress, manager_override, effective_progress, status),
        members:project_members(id, user:profiles(id, name, email, role))
      `)
      .order('created_at', { ascending: false });

    if (projectIds) {
      query = query.in('id', projectIds);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/projects/:id - Get project by ID with full details
projectRouter.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        client:clients(id, name, company, contact_person, contact_email, phone),
        stages:workflow_stages(
          id, name, stage_order, calculated_progress, manager_override, effective_progress, status,
          tasks:tasks(id, title, status, progress, priority, deadline, assigned_to_profile:profiles(id, name))
        ),
        members:project_members(id, user_id, user:profiles(id, name, email, role, department))
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: error.message });
    }

    if (data?.stages) {
      data.stages.sort((a: any, b: any) => a.stage_order - b.stage_order);
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects - Create a new project and initialize stages
projectRouter.post('/projects', async (req: Request, res: Response) => {
  try {
    const { member_ids, ...projectFields } = req.body;

    if (!projectFields.name) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }

    // 1. Ensure client_id exists or pick first client as fallback
    let clientId = projectFields.client_id;
    if (!clientId) {
      const { data: clients } = await supabaseAdmin.from('clients').select('id').limit(1);
      if (clients && clients.length > 0) {
        clientId = clients[0].id;
      }
    }

    // 2. Insert Project
    const { data: newProject, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert([
        {
          ...projectFields,
          client_id: clientId,
          overall_progress: 0.0,
        },
      ])
      .select()
      .single();

    if (projectError || !newProject) {
      return res.status(400).json({
        success: false,
        error: `Failed to create project: ${projectError?.message}`,
      });
    }

    // 3. Ensure 6 stages exist (in case DB trigger is absent)
    const { data: existingStages } = await supabaseAdmin
      .from('workflow_stages')
      .select('id')
      .eq('project_id', newProject.id);

    if (!existingStages || existingStages.length === 0) {
      const stageRows = FIXED_STAGE_ORDER.map((name, idx) => ({
        project_id: newProject.id,
        name,
        stage_order: idx + 1,
        calculated_progress: 0.0,
        effective_progress: 0.0,
        status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      }));

      await supabaseAdmin.from('workflow_stages').insert(stageRows);
    }

    // 4. Assign members if provided
    if (member_ids && member_ids.length > 0) {
      const memberRows = member_ids.map((userId: string) => ({
        project_id: newProject.id,
        user_id: userId,
      }));
      await supabaseAdmin.from('project_members').insert(memberRows);
    }

    return res.status(201).json({ success: true, data: newProject });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/members - Add member to project
projectRouter.post('/projects/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const { data: existing } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabaseAdmin
        .from('project_members')
        .insert([{ project_id: id, user_id }]);

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
    }

    return res.json({ success: true, message: 'Member added to project successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId - Remove member from project
projectRouter.delete('/projects/:id/members/:userId', async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;

    const { error } = await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('project_id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, message: 'Member removed from project' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/manager - Aggregate live metrics for Manager Dashboard
projectRouter.get('/dashboard/manager', async (req: Request, res: Response) => {
  try {
    const [projectsRes, tasksRes, updatesRes] = await Promise.all([
      supabaseAdmin
        .from('projects')
        .select(`
          id, name, status, deadline, overall_progress,
          client:clients(name, company),
          stages:workflow_stages(id, name, stage_order, calculated_progress, manager_override, effective_progress, status)
        `)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('tasks')
        .select(`
          id, title, progress, status, blocker_reason, deadline,
          project:projects(id, name),
          assigned_profile:profiles(name)
        `),
      supabaseAdmin
        .from('work_updates')
        .select(`
          id, message, progress_at_update, status_at_update, created_at,
          employee:profiles(name),
          task:tasks(id, title, project:projects(name))
        `)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const projects = projectsRes.data || [];
    const tasks = tasksRes.data || [];
    const updates = updatesRes.data || [];

    const activeCount = projects.filter((p) => p.status === 'ACTIVE').length || projects.length;
    const blockedTasks = tasks.filter(
      (t) => t.status === 'BLOCKED' || (t.blocker_reason && t.blocker_reason.trim().length > 0)
    );
    const now = new Date();
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'COMPLETED' && new Date(t.deadline) < now
    );

    let featuredProject = null;
    if (projects.length > 0) {
      const feat = { ...projects[0] };
      if (feat.stages) {
        feat.stages.sort((a: any, b: any) => a.stage_order - b.stage_order);
      }
      featuredProject = feat;
    }

    return res.json({
      success: true,
      data: {
        activeProjectsCount: activeCount,
        totalTasksCount: tasks.length,
        blockedTasks,
        overdueTasksCount: overdueTasks.length,
        featuredProject,
        recentUpdates: updates,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
