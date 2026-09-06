import { supabaseAdmin } from '../config/supabase';
import { AuditLog } from '@antigravity/shared';

export class AuditService {
  /**
   * Records an immutable system audit entry.
   */
  static async recordLog(
    actorId: string | null,
    entityType: string,
    entityId: string,
    action: string,
    details?: Record<string, any> | null
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin.from('audit_logs').insert({
        actor_id: actorId,
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        details: details || null,
      });

      if (error) {
        console.error('Failed to record audit log:', error);
      }
    } catch (err) {
      console.error('AuditService recordLog exception:', err);
    }
  }

  /**
   * Retrieves recent audit entries with actor profile information.
   */
  static async getLogs(limit: number = 100): Promise<AuditLog[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        actor:profiles(id, name, email, role, department)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    return (data as any) || [];
  }
}
