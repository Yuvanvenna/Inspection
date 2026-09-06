import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  AlertTriangle,
  Send,
  Building2,
  Layers,
  MessageSquare,
  History,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WorkUpdateService } from '../../services/work-update.service';
import { AttachmentList } from '../../components/attachments/AttachmentList';
import { useAuth } from '../../context/AuthContext';
import { WorkUpdate, TaskStatus, STAGE_DISPLAY_NAMES } from '@antigravity/shared';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<any | null>(null);
  const [updates, setUpdates] = useState<WorkUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer Form state
  const [message, setMessage] = useState('');
  const [newProgress, setNewProgress] = useState<number>(0);
  const [newStatus, setNewStatus] = useState<TaskStatus>('IN_PROGRESS');
  const [blockerReason, setBlockerReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadTaskData(id);
    }
  }, [id]);

  const loadTaskData = async (taskId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name, client:clients(name)),
          stage:workflow_stages(id, name, stage_order),
          assigned_to_profile:profiles(id, name, email, department)
        `)
        .eq('id', taskId)
        .single();

      if (taskError || !taskData) {
        throw new Error('Task not found');
      }

      setTask(taskData);
      setNewProgress(taskData.progress);
      setNewStatus(taskData.status);
      if (taskData.blocker_reason) {
        setBlockerReason(taskData.blocker_reason);
      }

      const updateList = await WorkUpdateService.getUpdatesByTaskId(taskId);
      setUpdates(updateList);
    } catch (err: any) {
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !task || !user) return;

    if (newStatus === 'BLOCKED' && !blockerReason.trim()) {
      alert('Please provide a blocker reason when marking a task blocked.');
      return;
    }

    setSubmitting(true);
    try {
      await WorkUpdateService.createWorkUpdate({
        task_id: task.id,
        stage_id: task.stage_id,
        employee_id: user.id,
        message,
        progress_at_update: newProgress,
        status_at_update: newStatus,
        blocker_reason: newStatus === 'BLOCKED' ? blockerReason : null,
      });

      setMessage('');
      await loadTaskData(task.id);
    } catch (err: any) {
      alert(`Failed to post update: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse"></div>
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Task Not Found</h3>
        <p className="text-xs text-slate-500">{error || 'Could not find the requested task.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  const isBlocked = task.status === 'BLOCKED';
  const isCompleted = task.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Task Header Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{task.project?.name || 'Project'}</span>
              </span>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>
                  Stage {task.stage?.stage_order}: {STAGE_DISPLAY_NAMES[task.stage?.name as keyof typeof STAGE_DISPLAY_NAMES]}
                </span>
              </span>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
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

            <h2 className="text-xl font-black text-slate-900 tracking-tight">{task.title}</h2>
            {task.description && <p className="text-xs text-slate-600 max-w-2xl">{task.description}</p>}
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 self-start md:self-auto">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Current Progress</span>
              <p className="text-3xl font-black text-indigo-600">{task.progress}%</p>
            </div>
          </div>
        </div>

        {/* Task Metadata Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Assigned: <strong className="text-slate-800">{task.assigned_to_profile?.name || 'Unassigned'}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Due Date: <strong className="text-slate-800">{new Date(task.deadline).toLocaleDateString()}</strong></span>
          </div>
          <div>
            <span>Priority: <strong className="text-slate-800">{task.priority}</strong></span>
          </div>
        </div>

        {/* Blocker Alert if active */}
        {isBlocked && task.blocker_reason && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Active Blocker Reason:
            </span>
            <p className="text-xs text-rose-900 font-medium">{task.blocker_reason}</p>
          </div>
        )}
      </div>

      {/* Grid: Work Update Composer & Chronological Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Work Update Composer Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Post Work Update</h3>
          </div>
          <p className="text-xs text-slate-500">
            Log incremental progress, feature completion, or report blockers. This update will be permanently recorded in the task timeline.
          </p>

          <form onSubmit={handlePostUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Update Progress Percentage: <strong className="text-indigo-600">{newProgress}%</strong>
              </label>
              <div className="flex items-center gap-1.5">
                {[0, 25, 50, 75, 80, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setNewProgress(pct);
                      if (pct === 100) setNewStatus('COMPLETED');
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      newProgress === pct
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="COMPLETED">Completed</option>
                <option value="NOT_STARTED">Not Started</option>
              </select>
            </div>

            {newStatus === 'BLOCKED' && (
              <div>
                <label className="block text-xs font-semibold text-rose-700 mb-1">
                  Blocker Reason * (Required)
                </label>
                <textarea
                  rows={2}
                  required
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  placeholder="Explain what is blocking progress (e.g. waiting for API keys)..."
                  className="w-full p-2.5 bg-rose-50/40 border border-rose-200 rounded-lg text-xs text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                ></textarea>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Update Message *
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What was completed today? Any architectural decisions or technical notes for the manager?"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Post Update to Timeline'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Chronological Work Update Timeline */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Work Update Timeline</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{updates.length} updates logged</span>
          </div>

          {updates.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No Work Updates Yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Post the first update using the composer to begin tracking incremental progress.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map((up: any) => {
                const author = up.employee?.name || 'Engineer';
                const isBlockedState = up.status_at_update === 'Blocked' || up.status_at_update === 'BLOCKED';

                return (
                  <div
                    key={up.id}
                    className={`p-4 rounded-xl border space-y-2 transition-all ${
                      isBlockedState ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                          {author.charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900">{author}</span>
                          <span className="text-[11px] text-slate-400 font-medium ml-2">
                            {new Date(up.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs font-black text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {up.progress_at_update}%
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isBlockedState
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {up.status_at_update}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 whitespace-pre-line pl-9">
                      {up.message}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Task Deliverables & Attachments */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Task Deliverables & File Attachments</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload CAD files, test logs, code exports, diagrams, or design specifications tied to this task in Supabase Storage.
          </p>
        </div>
        <AttachmentList projectId={task.project_id} taskId={task.id} />
      </div>
    </div>
  );
};
