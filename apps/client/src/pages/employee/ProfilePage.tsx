import React, { useState, useEffect } from 'react';
import { Save, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from '../../utils/sound';
import { supabase } from '../../lib/supabase';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  // Initialize from saved preferences or user object
  const [department, setDepartment] = useState(() => {
    return user?.department || localStorage.getItem(`inspection_pref_dept_${user?.id}`) || 'Backend Engineering';
  });

  const [emailAlerts, setEmailAlerts] = useState<boolean>(() => {
    const saved = localStorage.getItem(`inspection_pref_email_${user?.id}`);
    return saved !== null ? saved === 'true' : true;
  });

  const [inAppSound, setInAppSound] = useState<boolean>(() => {
    return isSoundEnabled(user?.id);
  });

  useEffect(() => {
    if (user?.id) {
      setInAppSound(isSoundEnabled(user.id));
      const savedDept = localStorage.getItem(`inspection_pref_dept_${user.id}`);
      if (savedDept) setDepartment(savedDept);
      else if (user.department) setDepartment(user.department);
    }
  }, [user?.id]);

  const handleSoundToggle = (enabled: boolean) => {
    setInAppSound(enabled);
    setSoundEnabled(enabled, user?.id);
    if (enabled) {
      playNotificationSound();
      showToast('Notification chime enabled (sample sound played)', 'info');
    } else {
      showToast('Notification chime muted', 'info');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Persist preferences to localStorage
      if (user?.id) {
        localStorage.setItem(`inspection_pref_dept_${user.id}`, department);
        localStorage.setItem(`inspection_pref_email_${user.id}`, String(emailAlerts));
        setSoundEnabled(inAppSound, user.id);
      }

      // 2. Try to update department in Supabase profiles if possible
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ department })
          .eq('id', user.id);
      }

      showToast('Profile preferences saved successfully!', 'success');
    } catch (err: any) {
      console.warn('Could not update remote profile, saved locally:', err);
      showToast('Preferences saved to browser storage!', 'success');
    } finally {
      setSaving(false);
    }
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
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${inAppSound ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  {inAppSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 block">Audio Notification Chimes</span>
                    {inAppSound && (
                      <button
                        type="button"
                        onClick={() => playNotificationSound()}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                        title="Test sound"
                      >
                        (Test Chime)
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">Play a subtle chime when real-time alerts arrive.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={inAppSound}
                onChange={(e) => handleSoundToggle(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
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
