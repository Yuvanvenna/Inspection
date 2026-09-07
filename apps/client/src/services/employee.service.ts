import { supabase } from '../lib/supabase';
import { UserProfile, Role, UserStatus } from '@antigravity/shared';
import { API_URL } from '../lib/api';

export interface CreateEmployeeInput {
  name: string;
  email: string;
  role: Role;
  department?: string;
  password?: string;
}

export const EmployeeService = {
  async getEmployees(): Promise<
    (UserProfile & { task_count?: number; project_count?: number })[]
  > {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data.map((p: any) => ({
            ...p,
            task_count: p.tasks ? p.tasks.length : 0,
            active_task_count: p.tasks
              ? p.tasks.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'BLOCKED').length
              : 0,
            project_count: p.members ? p.members.length : 0,
          }));
        }
      }
    } catch (e) {
      console.warn('API getEmployees failed, falling back to Supabase:', e);
    }

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        *,
        tasks:tasks(id, status),
        members:project_members(id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch employees: ${error.message}`);
    }

    return (profiles || []).map((p: any) => ({
      ...p,
      task_count: p.tasks ? p.tasks.length : 0,
      active_task_count: p.tasks
        ? p.tasks.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'BLOCKED').length
        : 0,
      project_count: p.members ? p.members.length : 0,
    }));
  },

  async createEmployee(input: CreateEmployeeInput): Promise<UserProfile> {
    // 1. Call server API to create auth user and profile with service role
    const response = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to create employee');
    }

    const res = await response.json();
    return res.data;
  },

  async updateEmployee(
    id: string,
    updates: Partial<{ name: string; department: string; status: UserStatus; role: Role }>
  ): Promise<UserProfile> {
    // 1. Primary: Update via server API with service role (avoids client RLS session mismatch)
    try {
      const response = await fetch(`${API_URL}/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          return json.data;
        }
      } else {
        const errJson = await response.json().catch(() => null);
        if (errJson?.error?.message) {
          throw new Error(errJson.error.message);
        }
      }
    } catch (apiErr: any) {
      if (apiErr.message && !apiErr.message.includes('fetch')) {
        throw apiErr;
      }
      console.warn('API updateEmployee failed, trying direct Supabase fallback:', apiErr);
    }

    // 2. Direct Supabase fallback
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update employee: ${error.message}`);
    }

    if (!data) {
      throw new Error('Employee record could not be updated. Please ensure you are logged in as a manager.');
    }

    return data;
  },

  async toggleStatus(id: string, currentStatus: UserStatus): Promise<UserProfile> {
    const newStatus: UserStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.updateEmployee(id, { status: newStatus });
  },

  async deleteEmployee(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || 'Failed to delete employee');
    }
  },
};

