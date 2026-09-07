import { supabase } from '../lib/supabase';
import { Notification, NotificationType } from '@antigravity/shared';
import { API_URL } from '../lib/api';

export const NotificationService = {
  /**
   * Fetches all notifications for the authenticated user.
   */
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }

    return (data as Notification[]) || [];
  },

  /**
   * Fetches unread notifications count for badge display.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Marks a single notification as read.
   */
  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Failed to mark notification as read:', error);
    } else {
      window.dispatchEvent(new CustomEvent('inspection:notification-change'));
    }
  },

  /**
   * Marks all notifications for a user as read.
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Failed to mark all notifications as read:', error);
    } else {
      window.dispatchEvent(new CustomEvent('inspection:notification-change'));
    }
  },

  /**
   * Sends a targeted notification via the server API.
   */
  async sendNotification(input: {
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    link_url?: string;
  }): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Extract current active user from localStorage if available
      let currentUserId = input.user_id;
      try {
        const stored = localStorage.getItem('ag_active_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id) currentUserId = parsed.id;
        }
      } catch {}

      const res = await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        // Fallback: direct insert to supabase notifications table
        await supabase.from('notifications').insert([{
          user_id: input.user_id,
          type: input.type,
          title: input.title,
          message: input.message,
          link_url: input.link_url || null,
        }]);
      }

      window.dispatchEvent(new CustomEvent('inspection:notification-change'));
    } catch (err) {
      console.error('Failed to send notification via API, using direct insert:', err);
      try {
        await supabase.from('notifications').insert([{
          user_id: input.user_id,
          type: input.type,
          title: input.title,
          message: input.message,
          link_url: input.link_url || null,
        }]);
        window.dispatchEvent(new CustomEvent('inspection:notification-change'));
      } catch (insertErr) {
        console.error('Direct notification insert failed:', insertErr);
      }
    }
  },

  /**
   * Broadcasts an escalation alert to all active managers.
   */
  async notifyManagers(input: {
    type: NotificationType;
    title: string;
    message: string;
    link_url?: string;
  }): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let currentUserId = '';
      try {
        const stored = localStorage.getItem('ag_active_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id) currentUserId = parsed.id;
        }
      } catch {}

      await fetch(`${API_URL}/notifications/notify-managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUserId ? { 'x-user-id': currentUserId } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      });

      window.dispatchEvent(new CustomEvent('inspection:notification-change'));
    } catch (err) {
      console.error('Failed to notify managers via API:', err);
    }
  },
};
