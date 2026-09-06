import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { ProgressService } from '../services/progress.service';
import { NotificationService } from '../services/notification.service';

export const taskRouter = Router();

// GET /api/tasks - List tasks with filters
taskRouter.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { projectId, stageId, assignedTo } = req.query;

    let query = supabaseAdmin
      .from('tasks')
      .select(`
        *,
        stage:workflow_stages(id, name, stage_order),
        project:projects(id, name, client:clients(name)),
        assigned_to_profile:profiles(id, name, email, department),
        work_updates:work_updates(*)
      `)
      .order('deadline', { ascending: true });

    if (projectId) {
      query = query.eq('project_id', String(projectId));
    }
    if (stageId) {
      query = query.eq('stage_id', String(stageId));
    }
    if (assignedTo && assignedTo !== 'undefined') {
      query = query.eq('assigned_to', String(assignedTo));
    }

    const { data, error } = await query;
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const formatted = (data || []).map((t: any) => ({
      ...t,
      assigned_to_profile: t.assigned_to_profile || t.assigned_profile,
      assigned_profile: t.assigned_to_profile || t.assigned_profile,
    }));

    return res.json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks - Create task (Bypasses RLS with service role)
taskRouter.post('/tasks', async (req: Request, res: Response) => {
  try {
    const {
      project_id,
      stage_id,
      title,
      description,
      assigned_to,
      deadline,
      priority,
      status,
      progress,
    } = req.body;

    if (!title || !project_id || !stage_id) {
      return res.status(400).json({
        success: false,
        error: 'title, project_id, and stage_id are required',
      });
    }

    // 1. Insert Task with supabaseAdmin
    const { data: newTask, error: insertError } = await supabaseAdmin
      .from('tasks')
      .insert([
        {
          project_id,
          stage_id,
          title,
          description: description || null,
          assigned_to: assigned_to || null,
          deadline: deadline || new Date(Date.now() + 14 * 86400000).toISOString(),
          priority: priority || 'MEDIUM',
          status: status || 'NOT_STARTED',
          progress: progress || 0,
        },
      ])
      .select(`
        *,
        stage:workflow_stages(id, name, stage_order),
        project:projects(id, name),
        assigned_to_profile:profiles(id, name)
      `)
      .single();

    if (insertError || !newTask) {
      return res.status(400).json({
        success: false,
        error: `Failed to create task: ${insertError?.message}`,
      });
    }

    // 2. Cascade atomic stage recalculation
    try {
      await ProgressService.recalculateStage(stage_id);
    } catch (recErr) {
      console.warn('Recalculation error after task creation:', recErr);
    }

    // 3. Ensure employee is in project_members so project is listed for them
    if (assigned_to) {
      const { data: existingMember } = await supabaseAdmin
        .from('project_members')
        .select('id')
        .eq('project_id', project_id)
        .eq('user_id', assigned_to)
        .maybeSingle();

      if (!existingMember) {
        await supabaseAdmin
          .from('project_members')
          .insert([{ project_id, user_id: assigned_to }]);
      }

      // Send in-app notification
      NotificationService.sendNotification(
        assigned_to,
        'TASK_ASSIGNED',
        'New Task Assigned',
        `You have been assigned to task: "${title}". Deadline: ${new Date(newTask.deadline).toLocaleDateString()}.`,
        `/tasks/${newTask.id}`
      ).catch(console.error);
    }

    return res.status(201).json({ success: true, data: newTask });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/tasks/:id - Update task progress, status, or details
taskRouter.patch('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        stage:workflow_stages(id, name, stage_order),
        project:projects(id, name),
        assigned_to_profile:profiles(id, name)
      `)
      .single();

    if (updateError || !updatedTask) {
      return res.status(400).json({
        success: false,
        error: `Failed to update task: ${updateError?.message}`,
      });
    }

    // Recalculate stage progress
    if (updatedTask.stage_id) {
      try {
        await ProgressService.recalculateStage(updatedTask.stage_id);
      } catch (recErr) {
        console.warn('Recalculation error:', recErr);
      }
    }

    // If marked BLOCKED, escalate to managers
    if (updates.status === 'BLOCKED') {
      NotificationService.notifyManagers(
        'TASK_BLOCKED',
        `Task Blocked: ${updatedTask.title}`,
        `Task has been marked as BLOCKED. Reason: ${updates.blocker_reason || 'No reason provided'}`,
        `/tasks/${id}`
      ).catch(console.error);
    }

    return res.json({ success: true, data: updatedTask });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/tasks/:id
taskRouter.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get stage_id before deleting
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('stage_id')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id);
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    if (task?.stage_id) {
      try {
        await ProgressService.recalculateStage(task.stage_id);
      } catch (e) {
        console.warn(e);
      }
    }

    return res.json({ success: true, message: 'Task deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/work-updates - Create append-only work update
taskRouter.post('/work-updates', async (req: Request, res: Response) => {
  try {
    const { task_id, employee_id, message, progress_at_update, status_at_update } = req.body;

    const { data: update, error } = await supabaseAdmin
      .from('work_updates')
      .insert([
        {
          task_id,
          employee_id,
          message,
          progress_at_update,
          status_at_update,
        },
      ])
      .select(`
        *,
        employee:profiles(id, name, email, department, role)
      `)
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data: update });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/work-updates - Get updates by task
taskRouter.get('/work-updates', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.query;
    let query = supabaseAdmin
      .from('work_updates')
      .select(`
        *,
        employee:profiles(id, name, email, department, role)
      `)
      .order('created_at', { ascending: false });

    if (taskId) {
      query = query.eq('task_id', String(taskId));
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

