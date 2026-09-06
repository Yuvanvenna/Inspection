import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  X,
  AlertCircle,
} from 'lucide-react';
import { TaskService } from '../../services/task.service';
import { useAuth } from '../../context/AuthContext';
import { Task, TaskStatus, STAGE_DISPLAY_NAMES } from '@antigravity/shared';

export const MyTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Blocker Modal state
  const [blockingTask, setBlockingTask] = useState<Task | null>(null);
  const [blockerReason, setBlockerReason] = useState('');
  const [submittingBlocker, setSubmittingBlocker] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadMyTasks();
    }
  }, [user]);

  const loadMyTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TaskService.getTasks({ assignedTo: user!.id });
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (task: Task, newProgress: number) => {
    try {
      const newStatus: TaskStatus = newProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS';
      await TaskService.updateTaskProgress(
        task.id,
        task.stage_id,
        newProgress,
        newStatus,
        null
      );
      await loadMyTasks();
    } catch (err: any) {
      alert(`Failed to update progress: ${err.message}`);
    }
  };

  const handleMarkCompleted = async (task: Task) => {
    try {
      await TaskService.updateTaskProgress(
        task.id,
        task.stage_id,
        100,
        'COMPLETED',
        null
      );
      await loadMyTasks();
    } catch (err: any) {
      alert(`Failed to mark completed: ${err.message}`);
    }
  };

  const handleConfirmBlocked = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockingTask || !blockerReason.trim()) return;

    setSubmittingBlocker(true);
    try {
      // Keep current progress, set status to BLOCKED with mandatory reason
      await TaskService.updateTaskProgress(
        blockingTask.id,
        blockingTask.stage_id,
        blockingTask.progress,
        'BLOCKED',
        blockerReason
      );

      setBlockingTask(null);
      setBlockerReason('');
      await loadMyTasks();
    } catch (err: any) {
      alert(`Failed to mark blocked: ${err.message}`);
    } finally {
      setSubmittingBlocker(false);
    }
  };

  const handleUnblock = async (task: Task) => {
    try {
      await TaskService.updateTaskProgress(
        task.id,
        task.stage_id,
        task.progress,
        'IN_PROGRESS',
        null
      );
      await loadMyTasks();
    } catch (err: any) {
      alert(`Failed to unblock: ${err.message}`);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.project?.name && t.project.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">My Assigned Tasks</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Execute tasks, update progress percentages, and log blockers directly for your manager.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search your assigned tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          {['ALL', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'NOT_STARTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Tasks Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No tasks matched your current filter.'
              : 'You have no active tasks assigned right now.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const isBlocked = task.status === 'BLOCKED';
            const isCompleted = task.status === 'COMPLETED';

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border p-6 shadow-sm space-y-4 transition-all ${
                  isBlocked
                    ? 'border-rose-300 bg-rose-50/10'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        {task.project?.name || 'Project'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        {task.stage?.name
                          ? STAGE_DISPLAY_NAMES[task.stage.name as keyof typeof STAGE_DISPLAY_NAMES]
                          : 'Workflow Stage'}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isBlocked
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <h3
                      onClick={() => navigate(`/employee/tasks/${task.id}`)}
                      className="text-base font-bold text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors"
                    >
                      {task.title}
                    </h3>
                    {task.description && <p className="text-xs text-slate-600">{task.description}</p>}
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-auto">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500">Progress</span>
                      <p className="text-2xl font-black text-indigo-600">{task.progress}%</p>
                    </div>
                  </div>
                </div>

                {/* Blocker Reason Alert if Blocked */}
                {isBlocked && task.blocker_reason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-rose-800 flex items-center gap-1.5 mb-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Blocker Reason Surfaced to Manager:
                      </span>
                      <p className="text-rose-900 font-medium">{task.blocker_reason}</p>
                    </div>
                    <button
                      onClick={() => handleUnblock(task)}
                      className="px-2.5 py-1 bg-white hover:bg-rose-100 border border-rose-300 rounded text-rose-700 font-bold text-[11px] flex-shrink-0"
                    >
                      Resolve Blocker
                    </button>
                  </div>
                )}

                {/* Progress Selector Bar & Action Controls */}
                <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Quick percentage buttons (0, 25, 50, 75, 100) */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Update Task Progress:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleUpdateProgress(task, pct)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            task.progress === pct
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions: Mark Blocked, Mark Completed */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                    </div>

                    {!isBlocked && !isCompleted && (
                      <button
                        type="button"
                        onClick={() => {
                          setBlockingTask(task);
                          setBlockerReason('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Mark Blocked</span>
                      </button>
                    )}

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleMarkCompleted(task)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mark Blocked Modal */}
      {blockingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <span>Mark Task Blocked</span>
              </h3>
              <button onClick={() => setBlockingTask(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Task: <strong>{blockingTask.title}</strong>
              <br />
              <span className="text-slate-500">
                Current progress ({blockingTask.progress}%) will be retained while blocked.
              </span>
            </p>

            <form onSubmit={handleConfirmBlocked} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Blocker Reason * (Surfaced to Manager)
                </label>
                <textarea
                  rows={3}
                  required
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  placeholder="e.g. Waiting for API credentials from the client, or missing CAD specs..."
                  className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBlockingTask(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBlocker}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-rose-500/20 disabled:opacity-50"
                >
                  {submittingBlocker ? 'Updating...' : 'Confirm Blocked'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
