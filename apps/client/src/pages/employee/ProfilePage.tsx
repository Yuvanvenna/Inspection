import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [department, setDepartment] = useState(user?.department || 'Backend Engineering');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppSound, setInAppSound] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast('Profile preferences saved successfully!', 'success');
    }, 300);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Profile & Preferences</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal Inspection account details and task alert preferences.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-indigo-500/20">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{user?.name}</h3>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
              {user?.role || 'EMPLOYEE'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Full Name</label>
            <input
              type="text"
              disabled
              value={user?.name || ''}
              className="mt-1 w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="mt-1 w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Department / Specialization</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Access Level</label>
            <input
              type="text"
              disabled
              value={user?.role === 'MANAGER' ? 'Full Project & Stage Management' : 'Assigned Tasks & Append-Only Updates'}
              className="mt-1 w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Personal Notification Preferences
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Task Assignment Email Alerts</span>
                <p className="text-[11px] text-slate-500">Receive an email when new tasks are assigned to you.</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </div>
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Audio Notification Chimes</span>
                <p className="text-[11px] text-slate-500">Play a subtle chime when real-time alerts arrive.</p>
              </div>
              <input
                type="checkbox"
                checked={inAppSound}
                onChange={(e) => setInAppSound(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
