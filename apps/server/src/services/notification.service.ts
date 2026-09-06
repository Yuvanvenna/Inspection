import { supabaseAdmin } from '../config/supabase';
import { NotificationType, Notification } from '@antigravity/shared';

export class NotificationService {
  /**
   * Inserts a notification using service role privileges.
   */
  static async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    linkUrl?: string | null
  ): Promise<Notification | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          type: type,
          title: title,
          message: message,
          link_url: linkUrl || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create notification:', error);
        return null;
      }

      return data as Notification;
    } catch (err) {
      console.error('NotificationService exception:', err);
      return null;
    }
  }

  /**
   * Broadcasts a notification to all active managers.
   */
  static async notifyManagers(
    type: NotificationType,
    title: string,
    message: string,
    linkUrl?: string | null
  ): Promise<void> {
    try {
      const { data: managers } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'MANAGER')
        .eq('status', 'ACTIVE');

      if (!managers || managers.length === 0) return;

      const rows = managers.map((m) => ({
        user_id: m.id,
        type: type,
        title: title,
        message: message,
        link_url: linkUrl || null,
      }));

      await supabaseAdmin.from('notifications').insert(rows);
    } catch (err) {
      console.error('notifyManagers exception:', err);
    }
  }

  /**
   * Broadcasts a notification to all team members assigned to a project.
   */
  static async notifyProjectMembers(
    projectId: string,
    type: NotificationType,
    title: string,
    message: string,
    linkUrl?: string | null,
    excludeUserId?: string | null
  ): Promise<void> {
    try {
      const { data: members } = await supabaseAdmin
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);

      if (!members || members.length === 0) return;

      const targetUserIds = members
        .map((m) => m.user_id)
        .filter((id) => !excludeUserId || id !== excludeUserId);

      if (targetUserIds.length === 0) return;

      const rows = targetUserIds.map((uid) => ({
        user_id: uid,
        type: type,
        title: title,
        message: message,
        link_url: linkUrl || null,
      }));

      await supabaseAdmin.from('notifications').insert(rows);
    } catch (err) {
      console.error('notifyProjectMembers exception:', err);
    }
  }
}
