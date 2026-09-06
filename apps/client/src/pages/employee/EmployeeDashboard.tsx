import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Send,
  User,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { TaskService } from '../../services/task.service';
import { WorkUpdateService } from '../../services/work-update.service';
import { STAGE_DISPLAY_NAMES, StageName, TaskStatus } from '@antigravity/shared';
import { KPISkeleton, TaskCardSkeleton, TimelineSkeleton } from '../../components/common/Skeletons';

interface EmployeeTask {
  id: string;
  stage_id: string;
  title: string;
  description: string;
  priority: string;
  status: TaskStatus;
  progress: number;
  blocker_reason?: string;
  deadline: string;
  project?: { id: string; name: string };
  stage?: { id: string; name: string };
}

interface EmployeeUpdate {
  id: string;
  message: string;
  progress_at_update: number;
  status_at_update: string;
  created_at: string;
  task?: { id: string; title: string; project?: { name: string } };
}

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<EmployeeUpdate[]>([]);

  // Composer Form state
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateStatus, setUpdateStatus] = useState<TaskStatus>('IN_PROGRESS');
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [blockerReason, setBlockerReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [composerSuccess, setComposerSuccess] = useState(false);

  const fetchEmployeeData = async () => {
    if (!user) return;

    try {
      // 1. Fetch user's assigned tasks via TaskService (uses Express API with RLS bypass)
      const tasksData = await TaskService.getTasks({ assignedTo: user.id });
      if (tasksData) {
        setTasks(tasksData as any);
        if (tasksData.length > 0 && !selectedTaskId) {
          const first = tasksData[0];
          setSelectedTaskId(first.id);
          setUpdateProgress(first.progress);
          setUpdateStatus(first.status as TaskStatus);
          setBlockerReason(first.blocker_reason || '');
        }
      }

      // 2. Fetch recent work updates created by this user
      const { data: updatesData, error: updatesError } = await supabase
        .from('work_updates')
        .select(`
          id,
          message,
          progress_at_update,
          status_at_update,
          created_at,
          task:tasks(id, title, project:projects(name))
        `)
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (updatesError) {
        console.error('Error fetching employee work updates:', updatesError);
      } else if (updatesData) {
        setRecentUpdates(updatesData as any);
      }
    } catch (err) {
      console.error('Error loading employee dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmployeeData();
  };

  const handleSelectTaskForUpdate = (task: EmployeeTask) => {
    setSelectedTaskId(task.id);
    setUpdateProgress(task.progress);
    setUpdateStatus(task.status);
    setBlockerReason(task.blocker_reason || '');
    setComposerSuccess(false);
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !updateMessage.trim() || !user) return;

    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return;

    setSubmitting(true);
    try {
      await WorkUpdateService.createWorkUpdate({
        task_id: task.id,
        stage_id: task.stage_id,
        employee_id: user.id,
        message: updateMessage.trim(),
        progress_at_update: updateProgress,
        status_at_update: updateStatus,
        blocker_reason: updateStatus === 'BLOCKED' ? blockerReason.trim() : null,
      });

      setUpdateMessage('');
      setComposerSuccess(true);
      setTimeout(() => setComposerSuccess(false), 3500);
      // Reload updated tasks and updates
      await fetchEmployeeData();
    } catch (err) {
      console.error('Failed to post work update:', err);
      alert('Could not submit update. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics calculation
  const activeTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
  const soonLimit = new Date();
  soonLimit.setDate(soonLimit.getDate() + 5);

  const dueSoonTasks = tasks.filter((t) => {
    if (t.status === 'COMPLETED') return false;
    const d = new Date(t.deadline);
    return d <= soonLimit;
  });

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5 animate-pulse">
            <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
            <div className="h-3 w-64 bg-slate-200 rounded"></div>
          </div>
        </div>
        <KPISkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="h-4 w-40 bg-slate-200 rounded"></div>
            <TaskCardSkeleton count={3} />
          </div>
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="h-4 w-36 bg-slate-200 rounded"></div>
            <TimelineSkeleton count={2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Welcome back, {user?.name || 'Engineer'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Your personal task queue, live progress recording, and incremental work logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Live Tasks"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 flex items-center gap-1.5 shadow-sm">
            <User className="w-3.5 h-3.5" />
            Active Contributor
          </span>
          <Link
            to="/employee/tasks"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <CheckSquare className="w-4 h-4" />
            Full Task Console
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Tasks</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activeTasks.length}</p>
          </div>
          <div className="w-11 h-11 rounded-xl border border-indigo-200 bg-indigo-50 flex items-center justify-center text-indigo-600">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        <div className={`bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between ${
          blockedTasks.length > 0 ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
        }`}>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Blocked Tasks</p>
            <p className={`text-2xl font-black mt-1 ${blockedTasks.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {blockedTasks.length}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl border border-rose-200 bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className={`bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between ${
          dueSoonTasks.length > 0 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
        }`}>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Due Soon / Overdue</p>
            <p className={`text-2xl font-black mt-1 ${dueSoonTasks.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {dueSoonTasks.length}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{completedTasks.length}</p>
          </div>
          <div className="w-11 h-11 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Focus: Assigned Tasks + Fast Work Update Composer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assigned Task Queue */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Current Task Assignments</h3>
                <p className="text-xs text-slate-500">Select a task to post a progress update or review status</p>
              </div>
              <Link to="/employee/tasks" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800">You're All Caught Up!</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No active tasks are assigned to your account right now. Check back when your manager assigns tasks.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isSelected = task.id === selectedTaskId;
                  const isBlocked = task.status === 'BLOCKED';
                  const isCompleted = task.status === 'COMPLETED';
                  const stageDisplay = task.stage ? STAGE_DISPLAY_NAMES[task.stage.name as StageName] || task.stage.name : 'Workflow';

                  return (
                    <div
                      key={task.id}
                      onClick={() => handleSelectTaskForUpdate(task)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-100 shadow-sm'
                          : isBlocked
                          ? 'border-rose-200 bg-rose-50/20 hover:bg-rose-50/50'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded">
                              {stageDisplay}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">
                              {task.project?.name || 'Project'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border shadow-sm ${
                              isBlocked
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-white text-indigo-700 border-indigo-200'
                            }`}
                          >
                            {task.progress}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">
                            {task.status}
                          </span>
                        </div>
                      </div>

                      {isBlocked && task.blocker_reason && (
                        <div className="mt-2.5 p-2 rounded-lg bg-rose-100/60 border border-rose-200 text-xs text-rose-900">
                          <strong className="font-bold">Blocked: </strong>
                          {task.blocker_reason}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-200/60 mt-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Due: {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <Link
                          to={`/employee/tasks/${task.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          Task History <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Work Update Composer & History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Work Update Composer */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Post Live Work Update</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                Append-Only
              </span>
            </div>

            {composerSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Work update published and progress synchronized!
              </div>
            )}

            {selectedTask ? (
              <form onSubmit={handlePostUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Task</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span className="truncate">{selectedTask.title}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold ml-2 shrink-0">
                      {selectedTask.project?.name || ''}
                    </span>
                  </div>
                </div>

                {/* Progress Slider & Quick Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Set New Progress</label>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {updateProgress}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={updateProgress}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setUpdateProgress(val);
                      if (val === 100) setUpdateStatus('COMPLETED');
                      else if (val > 0 && updateStatus === 'NOT_STARTED') setUpdateStatus('IN_PROGRESS');
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[0, 25, 50, 75, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setUpdateProgress(val);
                          if (val === 100) setUpdateStatus('COMPLETED');
                        }}
                        className={`flex-1 py-1 text-[11px] font-bold rounded border transition-colors ${
                          updateProgress === val
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Execution Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as TaskStatus)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="NOT_STARTED">NOT_STARTED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="BLOCKED">BLOCKED (Impediment)</option>
                    <option value="COMPLETED">COMPLETED (100%)</option>
                  </select>
                </div>

                {/* Blocker Reason if Blocked */}
                {updateStatus === 'BLOCKED' && (
                  <div>
                    <label className="block text-xs font-bold text-rose-700 mb-1">
                      Blocker Reason <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={blockerReason}
                      onChange={(e) => setBlockerReason(e.target.value)}
                      placeholder="Explain what is blocking completion (e.g. missing CAD specs, API down)..."
                      className="w-full text-xs p-2.5 bg-rose-50/40 border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                {/* Work Update Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    What Did You Accomplish? <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={updateMessage}
                    onChange={(e) => setUpdateMessage(e.target.value)}
                    placeholder="Describe specific engineering progress, test results, or changes made..."
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !updateMessage.trim()}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Recording Immutable Update...' : 'Post Work Update'}
                </button>
              </form>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                Please select a task from your queue to post an update.
              </p>
            )}
          </div>

          {/* My Recent Activity Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">My Recent Updates</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Personal Log</span>
            </div>

            {recentUpdates.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                You haven't posted any work updates yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentUpdates.map((up) => (
                  <div key={up.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 truncate max-w-[200px]">
                        {up.task?.title || 'Task'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {up.progress_at_update}%
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(up.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {up.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
