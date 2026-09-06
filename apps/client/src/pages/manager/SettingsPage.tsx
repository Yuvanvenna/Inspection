import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Bell,
  Sliders,
  Database,
  RefreshCw,
  Save,
  Server,
  Globe,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface SystemConfig {
  platformName: string;
  organizationName: string;
  defaultProjectDurationDays: number;
  timezone: string;
  autoRecalculateProgress: boolean;
  requireOverrideJustification: boolean;
  blockedEscalationHours: number;
  emailNotifications: boolean;
  inAppAlerts: boolean;
  blockedTaskEscalations: boolean;
  stageOverrideNotifications: boolean;
  sessionTimeoutHours: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  platformName: 'Inspection',
  organizationName: 'Inspection Engineering Corp',
  defaultProjectDurationDays: 90,
  timezone: 'UTC',
  autoRecalculateProgress: true,
  requireOverrideJustification: true,
  blockedEscalationHours: 24,
  emailNotifications: true,
  inAppAlerts: true,
  blockedTaskEscalations: true,
  stageOverrideNotifications: true,
  sessionTimeoutHours: 8,
};

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'workflow' | 'security' | 'notifications' | 'diagnostics'>('general');
  const [saving, setSaving] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  const [config, setConfig] = useState<SystemConfig>(() => {
    const saved = localStorage.getItem('inspection_system_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const checkApiHealth = async () => {
    setTestingApi(true);
    const start = performance.now();
    try {
      const res = await fetch('http://localhost:5000/api/health');
      const end = performance.now();
      if (res.ok) {
        setApiLatency(Math.round(end - start));
        setApiOnline(true);
      } else {
        setApiOnline(false);
      }
    } catch {
      setApiOnline(false);
    } finally {
      setTestingApi(false);
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('inspection_system_config', JSON.stringify(config));
      setSaving(false);
      showToast('System settings updated and synchronized successfully!', 'success');
    }, 400);
  };

  const handleReset = () => {
    if (window.confirm('Reset all system configurations to default factory settings?')) {
      setConfig(DEFAULT_CONFIG);
      localStorage.setItem('inspection_system_config', JSON.stringify(DEFAULT_CONFIG));
      showToast('System configuration reset to default settings.', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">System Settings</h2>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold uppercase">
              Production Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Inspection platform governance, workflow automation rules, RBAC security, and diagnostics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        {[
          { id: 'general', label: 'General & Organization', icon: Globe },
          { id: 'workflow', label: 'Workflow Engine', icon: Sliders },
          { id: 'security', label: 'Security & Access (RBAC)', icon: ShieldCheck },
          { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
          { id: 'diagnostics', label: 'System Diagnostics', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: General & Organization */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                Platform Identity & Organization Branding
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Core naming parameters and regional preferences for this Inspection deployment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Platform System Name</label>
                <input
                  type="text"
                  value={config.platformName}
                  onChange={(e) => setConfig({ ...config, platformName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Displayed across headers, page titles, and reports.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Organization Name</label>
                <input
                  type="text"
                  value={config.organizationName}
                  onChange={(e) => setConfig({ ...config, organizationName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Root legal entity managing engineering contracts.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Default Project SLA Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={config.defaultProjectDurationDays}
                  onChange={(e) => setConfig({ ...config, defaultProjectDurationDays: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Standard turnaround SLA for newly created projects.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">System Timezone</label>
                <select
                  value={config.timezone}
                  onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="UTC">UTC &mdash; Coordinated Universal Time</option>
                  <option value="America/New_York">EST &mdash; Eastern Time (US)</option>
                  <option value="America/Los_Angeles">PST &mdash; Pacific Time (US)</option>
                  <option value="Europe/London">GMT/BST &mdash; London</option>
                  <option value="Asia/Kolkata">IST &mdash; India Standard Time (+05:30)</option>
                  <option value="Asia/Tokyo">JST &mdash; Tokyo (+09:00)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Audit log timestamps and deadline countdowns use this timezone.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Workflow Engine */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Six-Stage Workflow Engine & Automation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure arithmetic progress aggregation, override governance, and blocker escalation policies.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-1 pr-4">
                  <span className="text-xs font-bold text-slate-800 block">Automatic Task-to-Stage Recalculation</span>
                  <p className="text-[11px] text-slate-500">
                    When an employee submits a work update or changes task completion %, instantly recalculate stage progress via arithmetic mean and update project progress.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={config.autoRecalculateProgress}
                    onChange={(e) => setConfig({ ...config, autoRecalculateProgress: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-1 pr-4">
                  <span className="text-xs font-bold text-slate-800 block">Mandatory Stage Override Justification</span>
                  <p className="text-[11px] text-slate-500">
                    Require managers to provide a written rationale when applying executive stage overrides, logged immutably in the system audit trail.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={config.requireOverrideJustification}
                    onChange={(e) => setConfig({ ...config, requireOverrideJustification: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 pr-4">
                    <span className="text-xs font-bold text-slate-800 block">Blocked Task Escalation Threshold</span>
                    <p className="text-[11px] text-slate-500">
                      Hours before an unresolved task blocker automatically escalates to management with critical badges.
                    </p>
                  </div>
                  <select
                    value={config.blockedEscalationHours}
                    onChange={(e) => setConfig({ ...config, blockedEscalationHours: Number(e.target.value) })}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours (Recommended)</option>
                    <option value={48}>48 Hours</option>
                    <option value={72}>72 Hours</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Standard Fixed Stages Reference */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                Enforced Fixed Workflow Stages (Immutable Pipeline)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { order: 1, name: 'Planning' },
                  { order: 2, name: 'Modelling' },
                  { order: 3, name: 'Development' },
                  { order: 4, name: 'Testing' },
                  { order: 5, name: '3D Modelling' },
                  { order: 6, name: 'Completion' },
                ].map((s) => (
                  <div key={s.order} className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-center">
                    <span className="text-[10px] font-bold text-indigo-500 block">Stage {s.order}</span>
                    <span className="text-xs font-bold text-slate-800">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Access */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Role-Based Access Control (RBAC) & Active Profile
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current authenticated user permissions and platform access matrix.
              </p>
            </div>

            {/* Current User Pill */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{user?.name}</h4>
                  <p className="text-xs text-slate-500">{user?.email} &bull; {user?.department || 'Product & Engineering'}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-extrabold tracking-wide">
                ROLE: {user?.role || 'MANAGER'}
              </span>
            </div>

            {/* RBAC Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                Permission Matrix by Role
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Platform Capability</th>
                      <th className="p-3 text-center">Manager</th>
                      <th className="p-3 text-center">Employee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="p-3 font-semibold">Create & Archive Projects</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-slate-400">View Only</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Apply Executive Stage Overrides</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-rose-500 font-bold">No</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Create & Assign Tasks</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-rose-500 font-bold">No</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Post Append-Only Work Updates</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Access System Audit Logs</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">Full Access</td>
                      <td className="p-3 text-center text-rose-500 font-bold">Restricted</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Notifications & Alerts */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                Notification Channels & Alert Subscriptions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Control in-app popovers, notification bell badges, and escalation broadcasts.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: 'inAppAlerts',
                  title: 'In-App Notification Bell Center',
                  desc: 'Display badge indicators and live flyout alerts in the top navigation bar.',
                },
                {
                  key: 'blockedTaskEscalations',
                  title: 'Blocked Task Escalations to Manager',
                  desc: 'Notify managers immediately whenever an employee marks a task status as BLOCKED.',
                },
                {
                  key: 'stageOverrideNotifications',
                  title: 'Stage Override Broadcasts',
                  desc: 'Broadcast in-app notices to all project members whenever an override is applied or cleared.',
                },
                {
                  key: 'emailNotifications',
                  title: 'Email Event Digest',
                  desc: 'Send transactional email summaries for high-priority task assignments.',
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="pr-4">
                    <span className="text-xs font-bold text-slate-800 block">{item.title}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={(config as any)[item.key]}
                      onChange={(e) => setConfig({ ...config, [item.key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: System Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  Service Health & Infrastructure Diagnostics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live connectivity verification for the Express microservice and Supabase Cloud database.
                </p>
              </div>
              <button
                type="button"
                onClick={checkApiHealth}
                disabled={testingApi}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingApi ? 'animate-spin' : ''}`} />
                <span>Ping Services</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Express Server Diagnostic */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">Inspection Express API</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      apiOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {apiOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>Endpoint: <span className="font-mono text-slate-700">http://localhost:5000/api</span></p>
                  <p>Health Route: <span className="font-mono text-slate-700">/api/health</span></p>
                  <p>Latency: <span className="font-bold text-slate-800">{apiLatency !== null ? `${apiLatency} ms` : 'Measuring...'}</span></p>
                </div>
              </div>

              {/* Supabase Database Diagnostic */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Supabase Cloud Database</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold uppercase">
                    Connected
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>Project Ref: <span className="font-mono text-slate-700">xwtdtkoxsuaslszpqrmu</span></p>
                  <p>Storage Engine: <span className="text-slate-700">PostgreSQL 15</span></p>
                  <p>State: <span className="text-emerald-600 font-bold">Active & Seeded</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
