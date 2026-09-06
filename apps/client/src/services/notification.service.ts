import { supabase } from '../lib/supabase';
import { Notification, NotificationType } from '@antigravity/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

      await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      });
    } catch (err) {
      console.error('Failed to send notification via API:', err);
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

      await fetch(`${API_URL}/notifications/notify-managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(input),
      });
    } catch (err) {
      console.error('Failed to notify managers via API:', err);
    }
  },
};
