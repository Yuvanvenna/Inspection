import { supabase } from '../lib/supabase';
import { WorkUpdate } from '@antigravity/shared';
import { TaskService } from './task.service';
import { API_URL } from '../lib/api';

export const WorkUpdateService = {
  async getUpdatesByTaskId(taskId: string): Promise<WorkUpdate[]> {
    try {
      const res = await fetch(`${API_URL}/work-updates?taskId=${taskId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Backend /api/work-updates fetch failed, trying direct query:', e);
    }

    const { data, error } = await supabase
      .from('work_updates')
      .select(`
        *,
        employee:profiles(id, name, email, department, role)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch work updates: ${error.message}`);
    }

    return data || [];
  },

  async createWorkUpdate(input: {
    task_id: string;
    stage_id: string;
    employee_id: string;
    message: string;
    progress_at_update: number;
    status_at_update: string;
    blocker_reason?: string | null;
  }): Promise<WorkUpdate> {
    let createdUpdate: WorkUpdate | null = null;

    // 1. Try Express API (service role bypasses RLS)
    try {
      const activeUser = localStorage.getItem('ag_active_user');
      const parsedUser = activeUser ? JSON.parse(activeUser) : null;

      const res = await fetch(`${API_URL}/work-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(parsedUser?.id ? { 'x-user-id': parsedUser.id } : {}),
        },
        body: JSON.stringify({
          task_id: input.task_id,
          employee_id: input.employee_id,
          message: input.message,
          progress_at_update: input.progress_at_update,
          status_at_update: input.status_at_update,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          createdUpdate = json.data;
        }
      }
    } catch (e) {
      console.warn('Backend work-update creation failed, trying direct insert:', e);
    }

    // Direct fallback if API not reachable
    if (!createdUpdate) {
      const { data, error } = await supabase
        .from('work_updates')
        .insert([
          {
            task_id: input.task_id,
            employee_id: input.employee_id,
            message: input.message,
            progress_at_update: input.progress_at_update,
            status_at_update: input.status_at_update,
          },
        ])
        .select(`
          *,
          employee:profiles(id, name, email, department, role)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create work update: ${error.message}`);
      }
      createdUpdate = data;
    }

    // 2. Also synchronize parent task's progress and status
    await TaskService.updateTaskProgress(
      input.task_id,
      input.stage_id,
      input.progress_at_update,
      input.status_at_update as any,
      input.blocker_reason || null
    );

    return createdUpdate!;
  },
};
