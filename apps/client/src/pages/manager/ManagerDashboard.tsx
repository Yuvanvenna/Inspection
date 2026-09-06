import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ArrowRight,
  Layers,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { STAGE_DISPLAY_NAMES, StageName } from '@antigravity/shared';
import { KPISkeleton, StageTrackerSkeleton, TaskCardSkeleton, TimelineSkeleton } from '../../components/common/Skeletons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  deadline: string;
  overall_progress: number;
  client?: { name: string; company: string };
  stages?: any[];
}

interface BlockedTask {
  id: string;
  title: string;
  progress: number;
  blocker_reason: string;
  deadline: string;
  project?: { id: string; name: string };
  assigned_profile?: { name: string };
}

interface RecentUpdate {
  id: string;
  message: string;
  progress_at_update: number;
  status_at_update: string;
  created_at: string;
  employee?: { name: string };
  task?: { id: string; title: string; project?: { name: string } };
}

export const ManagerDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeProjectsCount, setActiveProjectsCount] = useState<number>(0);
  const [totalTasksCount, setTotalTasksCount] = useState<number>(0);
  const [blockedTasks, setBlockedTasks] = useState<BlockedTask[]>([]);
  const [overdueTasksCount, setOverdueTasksCount] = useState<number>(0);
  const [featuredProject, setFeaturedProject] = useState<ProjectSummary | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);



  const fetchDashboardData = async () => {
    try {
      // 1. Try Express API first
      try {
        const res = await fetch(`${API_URL}/dashboard/manager`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setActiveProjectsCount(json.data.activeProjectsCount ?? 0);
            setTotalTasksCount(json.data.totalTasksCount ?? 0);
            setBlockedTasks(json.data.blockedTasks || []);
            setOverdueTasksCount(json.data.overdueTasksCount ?? 0);
            setFeaturedProject(json.data.featuredProject || null);
            setRecentUpdates(json.data.recentUpdates || []);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('Dashboard API failed, falling back to Supabase:', apiErr);
      }

      // 2. Supabase Fallback
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          deadline,
          overall_progress,
          client:clients(name, company),
          stages:workflow_stages(id, name, stage_order, calculated_progress, manager_override, effective_progress, status)
        `)
        .order('created_at', { ascending: false });

      if (projectsData) {
        const active = projectsData.filter((p) => p.status === 'ACTIVE');
        setActiveProjectsCount(active.length || projectsData.length);
        if (projectsData.length > 0) {
          const feat = projectsData[0];
          if (feat.stages) {
            feat.stages.sort((a: any, b: any) => a.stage_order - b.stage_order);
          }
          setFeaturedProject(feat as any);
        }
      }

      // Tasks overview
      const { data: allTasks } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          progress,
          status,
          blocker_reason,
          deadline,
          project:projects(id, name),
          assigned_profile:profiles(name)
        `);

      if (allTasks) {
        setTotalTasksCount(allTasks.length);
        const blocked = allTasks.filter(
          (t) => t.status === 'BLOCKED' || (t.blocker_reason && t.blocker_reason.trim().length > 0)
        );
        setBlockedTasks(blocked as any);

        const now = new Date();
        const overdue = allTasks.filter(
          (t) => t.status !== 'COMPLETED' && new Date(t.deadline) < now
        );
        setOverdueTasksCount(overdue.length);
      }

      // Recent Work Updates
      const { data: updatesData } = await supabase
        .from('work_updates')
        .select(`
          id,
          message,
          progress_at_update,
          status_at_update,
          created_at,
          employee:profiles(name),
          task:tasks(id, title, project:projects(name))
        `)
        .order('created_at', { ascending: false })
        .limit(6);

      if (updatesData) {
        setRecentUpdates(updatesData as any);
      }
    } catch (err) {
      console.error('Error fetching manager dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const kpis = [
    {
      label: 'Active Projects',
      value: activeProjectsCount,
      icon: FolderKanban,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      badge: `${activeProjectsCount} Online`,
      badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      label: 'Total Tasks',
      value: totalTasksCount,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      badge: 'Active Workload',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Blocked Tasks',
      value: blockedTasks.length,
      icon: AlertTriangle,
      color: blockedTasks.length > 0 ? 'text-rose-600' : 'text-slate-400',
      bg: blockedTasks.length > 0 ? 'bg-rose-50' : 'bg-slate-50',
      badge: blockedTasks.length > 0 ? 'Action Needed' : 'Clear',
      badgeColor:
        blockedTasks.length > 0
          ? 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse'
          : 'text-slate-600 bg-slate-50 border-slate-200',
      highlight: blockedTasks.length > 0,
    },
    {
      label: 'Overdue Deadlines',
      value: overdueTasksCount,
      icon: Clock,
      color: overdueTasksCount > 0 ? 'text-amber-600' : 'text-slate-400',
      bg: overdueTasksCount > 0 ? 'bg-amber-50' : 'bg-slate-50',
      badge: overdueTasksCount > 0 ? 'Review SLAs' : 'On Track',
      badgeColor:
        overdueTasksCount > 0
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : 'text-slate-600 bg-slate-50 border-slate-200',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5 animate-pulse">
            <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
            <div className="h-3 w-72 bg-slate-200 rounded"></div>
          </div>
        </div>
        <KPISkeleton count={4} />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="h-5 w-44 bg-slate-200 rounded"></div>
          <StageTrackerSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="h-4 w-36 bg-slate-200 rounded"></div>
            <TaskCardSkeleton count={2} />
          </div>
          <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="h-4 w-36 bg-slate-200 rounded"></div>
            <TimelineSkeleton count={2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Manager Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational project overview, six-stage tracking, and employee execution updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-xs font-bold text-purple-700 flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            Executive Oversight
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between transition-all ${
                kpi.highlight ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
                <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${kpi.badgeColor}`}>
                  {kpi.badge}
                </span>
              </div>
              <div className={`p-3.5 rounded-xl ${kpi.bg}`}>
                <Icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Featured Active Project & Six-Stage Tracker */}
      {featuredProject ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{featuredProject.name}</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold uppercase">
                  {featuredProject.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Client: <span className="font-semibold text-slate-700">{featuredProject.client?.name || featuredProject.client?.company || 'Apex Aerospace'}</span> &bull; Deadline:{' '}
                <span className="font-semibold text-slate-700">
                  {new Date(featuredProject.deadline).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Progress</span>
                <p className="text-2xl font-black text-indigo-600">{featuredProject.overall_progress}%</p>
              </div>
              <Link
                to={`/manager/projects/${featuredProject.id}`}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                Inspect
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Six Fixed Stages Progress Tracker */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Six Workflow Stages Tracker
              </h4>
              <span className="text-[11px] text-slate-500">Unweighted Arithmetic Average Formula</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {featuredProject.stages && featuredProject.stages.map((stage: any) => {
                const displayName = STAGE_DISPLAY_NAMES[stage.name as StageName] || stage.name;
                const hasOverride = stage.manager_override !== null && stage.manager_override !== undefined;
                const effProg = stage.effective_progress;
                const isComplete = stage.status === 'COMPLETED' || effProg === 100;
                const isBlocked = stage.status === 'BLOCKED';

                return (
                  <Link
                    key={stage.id}
                    to={`/manager/stages/${stage.id}`}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md ${
                      isBlocked
                        ? 'bg-rose-50/50 border-rose-300'
                        : isComplete
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400">STAGE {stage.stage_order}</span>
                        {hasOverride && (
                          <span
                            className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded"
                            title="Manager Executive Override Applied"
                          >
                            OVERRIDE
                          </span>
                        )}
                        {isBlocked && (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-extrabold rounded">
                            BLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{displayName}</p>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600">Progress</span>
                        <span className={`font-black ${isBlocked ? 'text-rose-600' : isComplete ? 'text-emerald-600' : 'text-indigo-600'}`}>
                          {effProg || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isBlocked ? 'bg-rose-500' : isComplete ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(effProg || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Projects Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create your first client project to initialize the automatic six workflow stages.
          </p>
          <Link
            to="/manager/projects"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <span>Go to Projects Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Operational Two-Column Grid: Blocked Tasks & Live Work Updates Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Critical Blocked Tasks Section */}
        <div id="blocked-section" className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${blockedTasks.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
                <h3 className="text-sm font-bold text-slate-900">Blocked Tasks & Escalations</h3>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                blockedTasks.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {blockedTasks.length} Escalations
              </span>
            </div>

            {blockedTasks.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No Blocked Tasks</p>
                <p className="text-[11px] text-slate-400">All team workflows are progressing smoothly without impediment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blockedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2.5 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                            BLOCKED ({t.progress}%)
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {t.project?.name || 'Project'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-1">{t.title}</h4>
                      </div>
                      <Link
                        to={`/manager/tasks/${t.id}`}
                        className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200 flex items-center gap-1 shadow-2xs"
                      >
                        Inspect
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="p-2.5 bg-white/80 rounded-lg border border-rose-200 text-xs text-rose-900">
                      <span className="font-bold text-[11px] block text-rose-700 mb-0.5">Blocker Rationale:</span>
                      <p className="text-[11px] leading-relaxed italic">{t.blocker_reason || 'No specific blocker note provided.'}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Assigned: <strong className="text-slate-700">{t.assigned_profile?.name || 'Unassigned'}</strong></span>
                      <span>Deadline: <strong className="text-slate-700">{new Date(t.deadline).toLocaleDateString()}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Work Updates Feed */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Live Team Work Updates</h3>
              </div>
              <span className="text-[11px] text-slate-400">Append-Only Immutable Stream</span>
            </div>

            {recentUpdates.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No Updates Yet</p>
                <p className="text-[11px] text-slate-400">Team members will log progress updates directly from assigned tasks.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUpdates.map((up) => {
                  const isBlocked = up.status_at_update === 'Blocked';
                  return (
                    <div
                      key={up.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                            {up.employee?.name ? up.employee.name.charAt(0) : 'E'}
                          </div>
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {up.employee?.name || 'Engineer'}
                          </span>
                          <span className="text-[10px] text-slate-400">&bull; {new Date(up.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-extrabold rounded ${
                              isBlocked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {up.status_at_update}
                          </span>
                          <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                            {up.progress_at_update}%
                          </span>
                        </div>
                      </div>

                      {up.task && (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                          <span className="font-semibold text-slate-600">{up.task.project?.name || 'Project'}</span>
                          <span>&rsaquo;</span>
                          <Link
                            to={`/manager/tasks/${up.task.id}`}
                            className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            {up.task.title}
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </Link>
                        </div>
                      )}

                      <p className="text-xs text-slate-700 mt-1.5 whitespace-pre-wrap leading-relaxed">
                        {up.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
