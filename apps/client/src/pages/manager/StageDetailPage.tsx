import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  User,
  Sliders,
  RotateCcw,
  X,
  History,
} from 'lucide-react';
import { StageService } from '../../services/stage.service';
import { STAGE_DISPLAY_NAMES } from '@antigravity/shared';

export const StageDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stage, setStage] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Override Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideValue, setOverrideValue] = useState<number>(70);
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  useEffect(() => {
    if (id) {
      loadStage(id);
    }
  }, [id]);

  const loadStage = async (stageId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await StageService.getStageById(stageId);
      setStage(data);
      if (data.manager_override !== null) {
        setOverrideValue(data.manager_override);
      } else if (data.calculated_progress !== null) {
        setOverrideValue(data.calculated_progress);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load stage');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage) return;

    setSubmittingOverride(true);
    try {
      await StageService.setStageOverride(stage.id, overrideValue, overrideReason);
      setIsOverrideModalOpen(false);
      setOverrideReason('');
      await loadStage(stage.id);
    } catch (err: any) {
      alert(`Failed to set override: ${err.message}`);
    } finally {
      setSubmittingOverride(false);
    }
  };

  const handleRemoveOverride = async () => {
    if (!stage) return;
    if (!window.confirm('Remove manager override and revert to system calculated progress?')) {
      return;
    }

    try {
      await StageService.removeStageOverride(stage.id);
      await loadStage(stage.id);
    } catch (err: any) {
      alert(`Failed to remove override: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse"></div>
        <div className="h-44 bg-slate-100 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  if (error || !stage) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Stage Not Found</h3>
        <p className="text-xs text-slate-500">{error || 'Could not find the requested stage.'}</p>
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

  const isBlocked = stage.status === 'BLOCKED';
  const isCompleted = stage.status === 'COMPLETED';
  const blockedTasks = (stage.tasks || []).filter((t: any) => t.status === 'BLOCKED');

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (stage.project?.id) {
              navigate(`/manager/projects/${stage.project.id}`);
            } else {
              navigate(-1);
            }
          }}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {stage.project?.name || 'Project'}</span>
        </button>
      </div>

      {/* Stage Header & Progress Calibration Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                STAGE {stage.stage_order} OF 6
              </span>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isBlocked
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                {stage.status}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {STAGE_DISPLAY_NAMES[stage.name as keyof typeof STAGE_DISPLAY_NAMES]} Stage
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Project: <strong>{stage.project?.name}</strong> • Client: {stage.project?.client?.name}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setIsOverrideModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{stage.manager_override !== null ? 'Edit Override' : 'Set Override'}</span>
            </button>
            {stage.manager_override !== null && (
              <button
                onClick={handleRemoveOverride}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                title="Revert to system calculated progress"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Effective Progress
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900">
                {stage.effective_progress !== null ? `${stage.effective_progress}%` : 'Not Started'}
              </span>
              {stage.manager_override !== null && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                  Manager Adjusted
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Primary progress used in overall project rollup.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              System Calculated
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-indigo-600">
                {stage.calculated_progress !== null ? `${stage.calculated_progress}%` : 'N/A'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Unweighted average of all {stage.tasks?.length || 0} task(s).
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Manager Override
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-purple-700">
                {stage.manager_override !== null ? `${stage.manager_override}%` : 'None'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stage.manager_override !== null ? 'Calibrated by project manager.' : 'Automatic tracking active.'}
            </p>
          </div>
        </div>
      </div>

      {/* Blocked Tasks Alert (if any) */}
      {blockedTasks.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Blocked Tasks in this Stage ({blockedTasks.length})</span>
          </div>
          <div className="space-y-2">
            {blockedTasks.map((bt: any) => (
              <div key={bt.id} className="bg-white p-3.5 rounded-xl border border-rose-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{bt.title}</span>
                  <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    BLOCKED
                  </span>
                </div>
                <p className="text-rose-900 font-medium">
                  <strong>Blocker Reason:</strong> {bt.blocker_reason || 'No reason provided.'}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Assigned: {bt.assigned_to_profile?.name || 'Engineer'}</span>
                  <span>Progress: {bt.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks in this Stage */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Tasks in this Stage ({stage.tasks?.length || 0})
          </h3>
        </div>

        {(!stage.tasks || stage.tasks.length === 0) ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            No tasks have been created in this stage yet. Calculated progress remains Not Started.
          </p>
        ) : (
          <div className="space-y-3">
            {stage.tasks.map((task: any) => (
              <div
                key={task.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{task.title}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        task.status === 'BLOCKED'
                          ? 'bg-rose-100 text-rose-700'
                          : task.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  {task.description && <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>}
                </div>

                <div className="flex items-center gap-6 flex-shrink-0 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.assigned_to_profile?.name || 'Unassigned'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due {new Date(task.deadline).toLocaleDateString()}</span>
                  </div>

                  <div className="text-right w-16">
                    <span className="text-xs font-black text-indigo-600">{task.progress}%</span>
                    <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${task.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manager Override History Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <History className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Manager Override History</h3>
        </div>

        {(!stage.override_history || stage.override_history.length === 0) ? (
          <p className="text-xs text-slate-400 italic py-2">
            No manager overrides have been logged for this stage.
          </p>
        ) : (
          <div className="space-y-3">
            {stage.override_history.map((item: any) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Logged by: {item.created_by_profile?.name || 'Project Manager'}</span>
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span>Previous: {item.previous_override !== null ? `${item.previous_override}%` : 'Auto'}</span>
                  <span>→</span>
                  <span className="text-indigo-600">
                    New Override: {item.new_override !== null ? `${item.new_override}%` : 'Removed (Reverted to Auto)'}
                  </span>
                </div>
                {item.reason && <p className="text-slate-600 italic">“{item.reason}”</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Override Stage Progress</span>
              </h3>
              <button onClick={() => setIsOverrideModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              System calculated progress ({stage.calculated_progress || 0}%) will remain intact. Your override will become the effective progress used in project rollups.
            </p>

            <form onSubmit={handleApplyOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Override Percentage (0–100%): <strong className="text-indigo-600">{overrideValue}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Override Reason / Audit Note</label>
                <textarea
                  rows={2}
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Unblocked external dependencies or factored in offline client approvals..."
                  className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                >
                  {submittingOverride ? 'Saving...' : 'Apply Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
