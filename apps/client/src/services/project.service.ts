import { supabase } from '../lib/supabase';
import { Project, Priority, ProjectStatus } from '@antigravity/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface CreateProjectInput {
  client_id: string;
  name: string;
  description: string;
  start_date: string;
  deadline: string;
  priority: Priority;
  status: ProjectStatus;

  // Requirements
  client_requirements?: string;
  functional_requirements?: string;
  technical_requirements?: string;
  deliverables?: string;
  acceptance_criteria?: string;
  additional_notes?: string;

  // Architecture & Tech
  system_architecture?: string;
  technology_stack?: string;
  database_info?: string;
  api_info?: string;
  infrastructure_info?: string;
  technical_notes?: string;

  member_ids?: string[];
}

export const ProjectService = {
  async getProjects(): Promise<Project[]> {
    // 1. Try Express Server API
    try {
      const res = await fetch(`${API_URL}/projects`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (apiErr) {
      console.warn('API fetch for projects failed, falling back to Supabase:', apiErr);
    }

    // 2. Fallback to direct Supabase query
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name, company),
        stages:workflow_stages(id, name, stage_order, calculated_progress, manager_override, effective_progress, status),
        members:project_members(id, user:profiles(id, name, email, role))
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return data || [];
  },

  async getAssignedProjects(employeeId: string): Promise<Project[]> {
    // 1. Try Express Server API (bypasses RLS with service role)
    try {
      const res = await fetch(`${API_URL}/projects?assignedTo=${employeeId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (apiErr) {
      console.warn('API fetch for assigned projects failed, falling back to client query:', apiErr);
    }

    // 2. Direct client fallback
    const { data: memberRows } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', employeeId);

    const projectIds = (memberRows || []).map((m) => m.project_id);
    if (projectIds.length === 0) return [];

    const { data: projs } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(name, company),
        stages:workflow_stages(id, name, stage_order, effective_progress, status)
      `)
      .in('id', projectIds)
      .order('deadline', { ascending: true });

    return projs || [];
  },

  async getProjectById(id: string): Promise<Project> {
    // 1. Try Express Server API
    try {
      const res = await fetch(`${API_URL}/projects/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (apiErr) {
      console.warn('API fetch for project by id failed, falling back to Supabase:', apiErr);
    }

    // 2. Fallback to Supabase
    const { data, error } = await supabase
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
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    if (data.stages) {
      data.stages.sort((a: any, b: any) => a.stage_order - b.stage_order);
    }

    return data;
  },

  async createProject(input: CreateProjectInput, creatorId?: string): Promise<Project> {
    // 1. Try Express Server API
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, created_by: creatorId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (apiErr) {
      console.warn('API create project failed, falling back to Supabase:', apiErr);
    }

    // 2. Fallback to Supabase
    const { member_ids, ...projectFields } = input;

    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert([
        {
          ...projectFields,
          created_by: creatorId || null,
          overall_progress: 0.0,
        },
      ])
      .select()
      .single();

    if (projectError || !newProject) {
      throw new Error(`Failed to create project: ${projectError?.message}`);
    }

    if (member_ids && member_ids.length > 0) {
      const memberRows = member_ids.map((userId) => ({
        project_id: newProject.id,
        user_id: userId,
      }));

      await supabase.from('project_members').insert(memberRows);
    }

    return newProject;
  },

  async updateProject(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      status: ProjectStatus;
      priority: Priority;
      deadline: string;
      client_requirements: string;
      functional_requirements: string;
      technical_requirements: string;
      deliverables: string;
      acceptance_criteria: string;
      system_architecture: string;
      technology_stack: string;
      database_info: string;
      api_info: string;
    }>
  ): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }

    return data;
  },
};
