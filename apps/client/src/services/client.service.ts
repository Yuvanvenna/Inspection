import { supabase } from '../lib/supabase';
import { Client } from '@antigravity/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const ClientService = {
  async getClients(): Promise<Client[]> {
    // 1. Try Express Server API
    try {
      const res = await fetch(`${API_URL}/clients`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.map((c: any) => ({
            ...c,
            project_count: c.project_count || 1,
            active_project_count: c.active_project_count || 1,
          }));
        }
      }
    } catch (apiErr) {
      console.warn('API fetch for clients failed, falling back to Supabase:', apiErr);
    }

    // 2. Fallback to Supabase
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*, projects(id, status)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch clients from Supabase:', error.message);
      return [];
    }

    return (clients || []).map((c: any) => ({
      ...c,
      project_count: c.projects ? c.projects.length : 0,
      active_project_count: c.projects
        ? c.projects.filter((p: any) => p.status === 'ACTIVE').length
        : 0,
    }));
  },

  async createClient(clientData: {
    name: string;
    company: string;
    contact_person: string;
    contact_email: string;
    phone?: string;
    notes?: string;
  }): Promise<Client> {
    try {
      const res = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (apiErr) {
      console.warn('API create client failed, falling back to Supabase:', apiErr);
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create client: ${error.message}`);
    }

    return data;
  },

  async updateClient(
    id: string,
    updates: Partial<{
      name: string;
      company: string;
      contact_person: string;
      contact_email: string;
      phone?: string;
      notes?: string;
    }>
  ): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update client: ${error.message}`);
    }

    return data;
  },

  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete client: ${error.message}`);
    }
  },
};
