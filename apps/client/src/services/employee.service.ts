import { supabase } from '../lib/supabase';
import { UserProfile, Role, UserStatus } from '@antigravity/shared';

export interface CreateEmployeeInput {
  name: string;
  email: string;
  role: Role;
  department?: string;
  password?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update employee: ${error.message}`);
    }

    return data;
  },

  async toggleStatus(id: string, currentStatus: UserStatus): Promise<UserProfile> {
    const newStatus: UserStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.updateEmployee(id, { status: newStatus });
  },
};
