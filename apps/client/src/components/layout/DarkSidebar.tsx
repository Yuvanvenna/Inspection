import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Users,
  Bell,
  Settings,
  CheckSquare,
  UserCircle,
  Layers,
  LogOut,
  History,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DarkSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export const DarkSidebar: React.FC<DarkSidebarProps> = ({ mobileOpen = false, onClose }) => {
  const { user, logout } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const managerLinks = [
    { to: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/manager/clients', label: 'Clients', icon: Building2 },
    { to: '/manager/projects', label: 'Projects', icon: FolderKanban },
    { to: '/manager/employees', label: 'Employees', icon: Users },
    { to: '/manager/notifications', label: 'Notifications', icon: Bell },
    { to: '/manager/audit-logs', label: 'Audit Trail', icon: History },
    { to: '/manager/settings', label: 'Settings', icon: Settings },
  ];

  const employeeLinks = [
    { to: '/employee/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/employee/projects', label: 'My Projects', icon: FolderKanban },
    { to: '/employee/tasks', label: 'My Tasks', icon: CheckSquare },
    { to: '/employee/notifications', label: 'Notifications', icon: Bell },
    { to: '/employee/profile', label: 'Profile', icon: UserCircle },
  ];

  const links = isManager ? managerLinks : employeeLinks;

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-tight">INSPECTION</span>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-indigo-400">
              Project Platform
            </span>
          </div>
        </div>
        {/* Close Button on Mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Indicator Banner */}
      <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-800/50 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Workspace Role</span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isManager
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
          }`}
        >
          {user?.role || 'Guest'}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-xs flex-shrink-0">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out of session"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0f172a] text-slate-300 h-screen fixed left-0 top-0 border-r border-slate-800 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-[#0f172a] text-slate-300 shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
