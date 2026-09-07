import { supabase } from '../lib/supabase';
import {
  Task,
  TaskStatus,
  Priority,
  calculateStageProgress,
  deriveStageStatus,
  determineEffectiveProgress,
  calculateProjectProgress,
} from '@antigravity/shared';
import { NotificationService } from './notification.service';
import { API_URL } from '../lib/api';

export interface CreateTaskInput {
  project_id: string;
  stage_id: string;
  title: string;
  description?: string;
  assigned_to: string;
  deadline: string;
  priority: Priority;
  status?: TaskStatus;
  progress?: number;
}

export const TaskService = {
  async getTasks(filters?: {
    projectId?: string;
    stageId?: string;
    assignedTo?: string;
  }): Promise<Task[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.projectId) params.append('projectId', filters.projectId);
      if (filters?.stageId) params.append('stageId', filters.stageId);
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);

      const res = await fetch(`${API_URL}/tasks?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Backend /api/tasks error, falling back to direct query:', e);
    }

    let query = supabase
      .from('tasks')
      .select(`
        *,
        stage:workflow_stages(id, name, stage_order),
        project:projects(id, name, client:clients(name)),
        assigned_to_profile:profiles(id, name, email, department),
        work_updates:work_updates(*)
      `)
      .order('deadline', { ascending: true });

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    if (filters?.stageId) {
      query = query.eq('stage_id', filters.stageId);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return data || [];
  },

  async createTask(input: CreateTaskInput): Promise<Task> {
    // 1. Try Express API (bypasses RLS with service role)
    try {
      const activeUser = localStorage.getItem('ag_active_user');
      const parsedUser = activeUser ? JSON.parse(activeUser) : null;

      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(parsedUser?.id ? { 'x-user-id': parsedUser.id } : {}),
        },
        body: JSON.stringify({
          project_id: input.project_id,
          stage_id: input.stage_id,
          title: input.title,
          description: input.description,
          assigned_to: input.assigned_to,
          deadline: input.deadline,
          priority: input.priority,
          status: input.status || 'NOT_STARTED',
          progress: input.progress || 0,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        return json.data;
      } else if (!res.ok && json.error) {
        throw new Error(json.error);
      }
    } catch (apiErr: any) {
      // If error was explicitly returned by backend, rethrow it
      if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      console.warn('Backend /api/tasks unreachable, trying direct client insert:', apiErr);
    }

    // 2. Direct client fallback
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          ...input,
          status: input.status || 'NOT_STARTED',
          progress: input.progress || 0,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    // Ensure assigned employee is member of the project
    if (input.assigned_to) {
      try {
        const { data: existingMember } = await supabase
          .from('project_members')
          .select('id')
          .eq('project_id', input.project_id)
          .eq('user_id', input.assigned_to)
          .maybeSingle();

        if (!existingMember) {
          await supabase
            .from('project_members')
            .insert([{ project_id: input.project_id, user_id: input.assigned_to }]);
        }
      } catch (pmErr) {
        console.warn('Could not auto-add to project_members:', pmErr);
      }
    }

    // Trigger stage recalculation via server
    await this.triggerStageRecalculate(input.stage_id);

    // Send in-app notification to assigned employee
    if (input.assigned_to) {
      NotificationService.sendNotification({
        user_id: input.assigned_to,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You have been assigned to task: "${input.title}". Deadline: ${new Date(input.deadline).toLocaleDateString()}.`,
        link_url: `/tasks/${data.id}`,
      }).catch(console.error);
    }

    return data;
  },

  async updateTask(
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      assigned_to: string;
      deadline: string;
      priority: Priority;
      stage_id: string;
      status: TaskStatus;
      progress: number;
    }>
  ): Promise<Task> {
    try {
      const activeUser = localStorage.getItem('ag_active_user');
      const parsedUser = activeUser ? JSON.parse(activeUser) : null;

      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(parsedUser?.id ? { 'x-user-id': parsedUser.id } : {}),
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Backend update error, falling back to client:', e);
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    if (data.stage_id) {
      await this.triggerStageRecalculate(data.stage_id);
    }

    return data;
  },

  async updateTaskProgress(
    id: string,
    stageId: string,
    progress: number,
    status: TaskStatus,
    blockerReason?: string | null
  ): Promise<void> {
    const updates: any = {
      progress: Math.min(100, Math.max(0, Math.round(progress))),
      status,
      blocker_reason: status === 'BLOCKED' ? blockerReason : null,
      updated_at: new Date().toISOString(),
    };

    if (status === 'COMPLETED' || progress === 100) {
      updates.status = 'COMPLETED';
      updates.progress = 100;
      updates.completed_at = new Date().toISOString();
    }

    try {
      const activeUser = localStorage.getItem('ag_active_user');
      const parsedUser = activeUser ? JSON.parse(activeUser) : null;

      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(parsedUser?.id ? { 'x-user-id': parsedUser.id } : {}),
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        await this.triggerStageRecalculate(stageId);
        return;
      }
    } catch (e) {
      console.warn('Backend task update progress error, falling back to client:', e);
    }

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('title')
      .single();

    if (error) {
      throw new Error(`Failed to update task progress: ${error.message}`);
    }

    // Trigger stage recalculation via server & direct client sync
    await this.triggerStageRecalculate(stageId);

    // Broadcast escalation if task is BLOCKED
    if (status === 'BLOCKED') {
      NotificationService.notifyManagers({
        type: 'TASK_BLOCKED',
        title: 'Task Escalation: Blocked',
        message: `Task "${updatedTask?.title || id}" was marked BLOCKED. Reason: ${blockerReason || 'None provided'}`,
        link_url: `/tasks/${id}`,
      }).catch(console.error);
    } else if (status === 'COMPLETED') {
      NotificationService.notifyManagers({
        type: 'TASK_COMPLETED',
        title: 'Task Completed',
        message: `Task "${updatedTask?.title || id}" has been completed (100%).`,
        link_url: `/tasks/${id}`,
      }).catch(console.error);
    }
  },

  async deleteTask(id: string, stageId: string): Promise<void> {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await this.triggerStageRecalculate(stageId);
        return;
      }
    } catch (e) {
      console.warn('Backend deleteTask error, falling back to direct delete:', e);
    }

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    await this.triggerStageRecalculate(stageId);
  },

  async triggerStageRecalculate(stageId: string): Promise<void> {
    // 1. First attempt to call the backend recalculate endpoint
    let apiSucceeded = false;
    try {
      const res = await fetch(`${API_URL}/stages/${stageId}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        apiSucceeded = true;
      }
    } catch {
      apiSucceeded = false;
    }

    // 2. Client-side direct recalculation fallback (ensures stage & project progress ALWAYS stay accurate)
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('progress, status')
        .eq('stage_id', stageId);

      const { data: stage } = await supabase
        .from('workflow_stages')
        .select('id, project_id, manager_override')
        .eq('id', stageId)
        .single();

      if (stage && tasks) {
        const calculatedProgress = calculateStageProgress(tasks);
        const stageStatus = deriveStageStatus(tasks);
        const effectiveProgress = determineEffectiveProgress(
          calculatedProgress,
          stage.manager_override
        );

        await supabase
          .from('workflow_stages')
          .update({
            calculated_progress: calculatedProgress,
            effective_progress: effectiveProgress,
            status: stageStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stageId);

        // Also update parent project overall progress
        const { data: allStages } = await supabase
          .from('workflow_stages')
          .select('effective_progress')
          .eq('project_id', stage.project_id);

        if (allStages) {
          const overall = calculateProjectProgress(allStages);
          await supabase
            .from('projects')
            .update({
              overall_progress: overall,
              updated_at: new Date().toISOString(),
            })
            .eq('id', stage.project_id);
        }
      }
    } catch (clientRecalcErr) {
      if (!apiSucceeded) {
        console.warn('Direct stage recalculation warning:', clientRecalcErr);
      }
    }
  },
};
