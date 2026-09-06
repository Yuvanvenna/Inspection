import { supabase } from '../lib/supabase';
import { AuditLog } from '@antigravity/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuditClientService = {
  /**
   * Retrieves audit logs for manager inspection.
   */
  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/audit-logs?limit=${limit}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch audit logs: ${res.statusText}`);
      }

      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.error('AuditClientService error:', err);
      // Fallback: Query supabase directly if authenticated as manager
      const { data } = await supabase
        .from('audit_logs')
        .select(`
          *,
          actor:profiles(id, name, email, role, department)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (data as any) || [];
    }
  },
};
