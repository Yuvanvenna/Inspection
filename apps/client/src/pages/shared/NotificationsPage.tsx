import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Layers,
  CheckSquare,
  Clock,
  ExternalLink,
  CheckCheck,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationService } from '../../services/notification.service';
import { Notification, NotificationType } from '@antigravity/shared';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | NotificationType>('ALL');

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await NotificationService.getNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleEvent = () => {
      loadNotifications();
    };
    window.addEventListener('inspection:notification-change', handleEvent);

    return () => {
      window.removeEventListener('inspection:notification-change', handleEvent);
    };
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await NotificationService.markAllAsRead(user.id);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read_at) {
      await NotificationService.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    }
    if (notif.link_url) {
      navigate(notif.link_url);
    }
  };

  const filteredList = notifications.filter((n) => {
    if (filter === 'ALL') return true;
    if (filter === 'UNREAD') return !n.read_at;
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'TASK_BLOCKED':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'TASK_COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'STAGE_OVERRIDE':
        return <Layers className="w-5 h-5 text-purple-600" />;
      case 'TASK_ASSIGNED':
      default:
        return <CheckSquare className="w-5 h-5 text-indigo-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Loading Notifications...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Notification Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational alerts, task assignments, stage overrides, and blocker notices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-indigo-600" />
              Mark All as Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'All Notifications', count: notifications.length },
          { key: 'UNREAD', label: 'Unread', count: unreadCount },
          { key: 'TASK_BLOCKED', label: 'Blockers' },
          { key: 'TASK_ASSIGNED', label: 'Task Assignments' },
          { key: 'STAGE_OVERRIDE', label: 'Stage Overrides' },
          { key: 'TASK_COMPLETED', label: 'Completed Tasks' },
        ].map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {filteredList.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Notifications</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {filter === 'UNREAD'
                ? 'You have read all your notifications.'
                : 'No alerts match the selected filter category.'}
            </p>
          </div>
        ) : (
          filteredList.map((notif) => {
            const isUnread = !notif.read_at;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 transition-all flex items-start gap-4 cursor-pointer hover:bg-slate-50/80 ${
                  isUnread ? 'bg-indigo-50/25 border-l-4 border-l-indigo-600' : 'bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {notif.title}
                      </h4>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                    {notif.message}
                  </p>

                  {notif.link_url && (
                    <div className="mt-2 flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                      View Linked Workflow Target
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
