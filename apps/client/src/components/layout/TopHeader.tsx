import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  CheckSquare,
  ExternalLink,
  CheckCheck,
  Menu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationService } from '../../services/notification.service';
import { Notification, NotificationType } from '@antigravity/shared';

export const TopHeader: React.FC<{ title?: string; onMenuClick?: () => void }> = ({
  title,
  onMenuClick,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotificationData = async () => {
    if (!user) return;
    try {
      const [count, list] = await Promise.all([
        NotificationService.getUnreadCount(user.id),
        NotificationService.getNotifications(user.id),
      ]);
      setUnreadCount(count);
      setNotifications(list.slice(0, 5)); // top 5 for the quick flyout
    } catch (err) {
      console.error('Error fetching notification header data:', err);
    }
  };

  useEffect(() => {
    fetchNotificationData();
    // Poll every 30 seconds for live notifications
    const interval = setInterval(fetchNotificationData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await NotificationService.markAllAsRead(user.id);
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read_at) {
      await NotificationService.markAsRead(notif.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    }
    setPopoverOpen(false);
    if (notif.link_url) {
      navigate(notif.link_url);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'TASK_BLOCKED':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'TASK_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'STAGE_OVERRIDE':
        return <Layers className="w-4 h-4 text-purple-600" />;
      case 'TASK_ASSIGNED':
      default:
        return <CheckSquare className="w-4 h-4 text-indigo-600" />;
    }
  };

  const notificationsUrl =
    user?.role === 'MANAGER' ? '/manager/notifications' : '/employee/notifications';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm/50">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight truncate">{title}</h1>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar Input */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects, tasks..."
            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 transition-all"
          />
        </div>

        {/* Notifications Icon & Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            title="Notifications"
            onClick={() => setPopoverOpen(!popoverOpen)}
            className={`relative p-2 rounded-lg transition-colors ${
              popoverOpen
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Floating Dropdown Popover */}
          {popoverOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center space-y-1">
                    <Bell className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No Notifications</p>
                    <p className="text-[11px] text-slate-400">You're all caught up with your project updates.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.read_at;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 hover:bg-slate-50 ${
                          isUnread ? 'bg-indigo-50/20' : 'bg-white'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                          {getNotificationIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                              {n.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                        {isUnread && (
                          <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <Link
                  to={notificationsUrl}
                  onClick={() => setPopoverOpen(false)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 py-1"
                >
                  View All Notifications
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200">
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>
          <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
            {user?.name}
          </span>
        </div>
      </div>
    </header>
  );
};
