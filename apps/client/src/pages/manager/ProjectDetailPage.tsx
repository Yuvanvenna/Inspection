import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Layers,
  ArrowLeft,
  AlertTriangle,
  Clock,
  Users,
  Code2,
  FileText,
  Plus,
  X,
  Paperclip,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { EmployeeService } from '../../services/employee.service';
import { AttachmentList } from '../../components/attachments/AttachmentList';
import { Project, STAGE_DISPLAY_NAMES, Priority, UserProfile } from '@antigravity/shared';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'architecture' | 'stages' | 'team' | 'attachments'>('stages');

  // Task creation state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('MEDIUM');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Global employees list and team management state
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedNewMemberId, setSelectedNewMemberId] = useState('');
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject(id);
      loadEmployees();
    }
  }, [id]);

  const loadEmployees = async () => {
    try {
      const data = await EmployeeService.getEmployees();
      setEmployees(data || []);
    } catch (err: any) {
      console.error('Failed to load employees for task assignment:', err);
    }
  };

  const loadProject = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ProjectService.getProjectById(projectId);
      setProject(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedNewMemberId) return;
    setMemberSubmitting(true);
    try {
      await ProjectService.addMember(id, selectedNewMemberId);
      setIsAddMemberModalOpen(false);
      setSelectedNewMemberId('');
      await loadProject(id);
    } catch (err: any) {
      alert(`Failed to add team member: ${err.message}`);
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!id) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from this project team?`)) return;
    try {
      await ProjectService.removeMember(id, userId);
      await loadProject(id);
    } catch (err: any) {
      alert(`Failed to remove team member: ${err.message}`);
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

  if (error || !project) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Project Not Found</h3>
        <p className="text-xs text-slate-500">{error || 'Could not find the requested project.'}</p>
        <button
          onClick={() => navigate('/manager/projects')}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </button>
      </div>
    );
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStageId || !assignedTo || !id) {
      alert('Please select both a stage and an assigned team member.');
      return;
    }

    setTaskSubmitting(true);
    try {
      await TaskService.createTask({
        project_id: id,
        stage_id: selectedStageId,
        title: taskTitle,
        description: taskDesc || undefined,
        assigned_to: assignedTo,
        deadline: taskDeadline || new Date().toISOString(),
        priority: taskPriority,
      });

      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      await loadProject(id);
    } catch (err: any) {
      alert(`Failed to create task: ${err.message}`);
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string, stageId: string, taskTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete task "${taskTitle}"?\n\nStage progress and project overall progress will automatically recalculate.`
      )
    ) {
      return;
    }

    try {
      await TaskService.deleteTask(taskId, stageId);
      if (id) await loadProject(id);
    } catch (err: any) {
      alert(`Failed to delete task: ${err.message}`);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !id) return;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete project "${project.name}"?\n\nThis will remove all workflow stages, tasks, work updates, and project files. This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await ProjectService.deleteProject(id);
      navigate('/manager/projects');
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/manager/projects')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects Directory</span>
        </button>

        <button
          onClick={handleDeleteProject}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Project</span>
        </button>
      </div>

      {/* Project Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{project.client?.name || 'Client Org'}</span>
              </span>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {project.status}
              </span>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {project.priority} PRIORITY
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{project.name}</h2>
            <p className="text-xs text-slate-600 max-w-3xl">{project.description}</p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Overall Progress</span>
              <p className="text-3xl font-black text-indigo-600">
                {Math.round(project.overall_progress || 0)}%
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Started: {new Date(project.start_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" />
            <span>Team Members: {project.members?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Prominent Six-Stage Tracker Banner (Specification Core Requirement) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Six-Stage Workflow Tracker
          </h3>
          <span className="text-[11px] text-slate-400 font-semibold">
            Planning → Modelling → Development → Testing → 3D Modelling → Completion
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(project.stages || []).map((stage: any, idx: number) => {
            const isCompleted = stage.status === 'COMPLETED';
            const isBlocked = stage.status === 'BLOCKED';

            return (
              <div
                key={stage.id}
                onClick={() => navigate(`/manager/stages/${stage.id}`)}
                className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : isBlocked
                    ? 'bg-rose-50/40 border-rose-200'
                    : stage.effective_progress !== null
                    ? 'bg-indigo-50/30 border-indigo-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                    <span>STAGE {idx + 1}</span>
                    <span className="text-slate-600">{stage.tasks?.length || 0} tasks</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-800">
                    {STAGE_DISPLAY_NAMES[stage.name as keyof typeof STAGE_DISPLAY_NAMES]}
                  </h4>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-base font-black text-slate-900">
                      {stage.effective_progress !== null ? `${stage.effective_progress}%` : 'Not Started'}
                    </span>
                    {stage.manager_override !== null && (
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                        Override
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500' : isBlocked ? 'bg-rose-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${stage.effective_progress || 0}%` }}
                    ></div>
                  </div>

                  {stage.calculated_progress !== null && stage.manager_override !== null && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      System calculated: {stage.calculated_progress}%
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          {[
            { id: 'stages', label: 'Tasks by Stage', icon: Layers },
            { id: 'requirements', label: 'Requirements & Acceptance', icon: FileText },
            { id: 'architecture', label: 'System Architecture', icon: Code2 },
            { id: 'team', label: 'Team Roster', icon: Users },
            { id: 'attachments', label: 'Documents & Attachments', icon: Paperclip },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'stages' && (
          <button
            onClick={() => {
              if (project.stages && project.stages.length > 0) {
                setSelectedStageId(project.stages[0].id);
              }
              setIsTaskModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {/* 1. Tasks by Stage */}
      {activeTab === 'stages' && (
        <div className="space-y-4">
          {(project.stages || []).map((stage: any, idx: number) => (
            <div key={stage.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    {STAGE_DISPLAY_NAMES[stage.name as keyof typeof STAGE_DISPLAY_NAMES]}
                  </h4>
                  <span className="text-xs text-slate-400">• {stage.tasks?.length || 0} tasks</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">
                    Effective: {stage.effective_progress !== null ? `${stage.effective_progress}%` : 'Not Started'}
                  </span>
                </div>
              </div>

              {(!stage.tasks || stage.tasks.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No tasks assigned to this stage yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stage.tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{task.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Assigned to: {task.assigned_to_profile?.name || 'Unassigned'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-black text-indigo-600">{task.progress}%</span>
                          <span
                            className={`block text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                              task.status === 'BLOCKED'
                                ? 'text-rose-600'
                                : task.status === 'COMPLETED'
                                ? 'text-emerald-600'
                                : 'text-indigo-600'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteTask(task.id, stage.id, task.title)}
                          title="Delete Task"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 2. Requirements & Acceptance */}
      {activeTab === 'requirements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Client & Functional Requirements
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Client Requirements</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 whitespace-pre-line">
                  {project.client_requirements || 'No specific client requirements entered.'}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Functional Requirements</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 whitespace-pre-line">
                  {project.functional_requirements || 'No functional requirements specified.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Deliverables & Acceptance Criteria
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Deliverables</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 whitespace-pre-line">
                  {project.deliverables || 'Deliverables will be finalized during Planning stage.'}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Acceptance Criteria</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 whitespace-pre-line">
                  {project.acceptance_criteria || 'No acceptance criteria defined.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. System Architecture */}
      {activeTab === 'architecture' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
            Technical Architecture & Infrastructure Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">System Architecture</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 whitespace-pre-line">
                  {project.system_architecture || 'Architecture documentation pending.'}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Technology Stack</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1">
                  {project.technology_stack || 'Not specified.'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Database & APIs</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1">
                  {project.database_info || 'Supabase PostgreSQL'} • {project.api_info || 'REST & WebSockets'}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Infrastructure</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1">
                  {project.infrastructure_info || 'Cloud containerized relays.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Team Roster */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Assigned Project Members
              </h4>
              <p className="text-xs text-slate-400">
                Authorized staff who can access project deliverables and receive task assignments.
              </p>
            </div>
            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>
          {(!project.members || project.members.length === 0) ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">No employees assigned to this project team yet.</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Add employees to the team roster so they appear in task assignments and project tracking.
              </p>
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Team Member</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {project.members.map((m: any) => {
                const memberUser = m.user || employees.find((e) => e.id === m.user_id);
                const userName = memberUser?.name || 'Staff Member';
                const userDept = memberUser?.department || memberUser?.role || memberUser?.email || 'Engineering';
                const userId = m.user_id || m.user?.id;

                return (
                  <div
                    key={m.id || m.user_id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 group hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{userDept}</p>
                      </div>
                    </div>
                    {userId && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(userId, userName)}
                        title="Remove from project team"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Attachments & Documents */}
      {activeTab === 'attachments' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Project Documents & Deliverables</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload and manage CAD/3D models, PDF specifications, architecture diagrams, and task deliverables in Supabase Storage.
            </p>
          </div>
          <AttachmentList projectId={project.id} />
        </div>
      )}

      {/* New Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Add Task to Stage</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Target Stage *</label>
                <select
                  required
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {(project.stages || []).map((st: any, i: number) => (
                    <option key={st.id} value={st.id}>
                      Stage {i + 1}: {STAGE_DISPLAY_NAMES[st.name as keyof typeof STAGE_DISPLAY_NAMES]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Telemetry API Gateway"
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Task scope and delivery criteria..."
                  className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Assigned Employee *</label>
                  <select
                    required
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Select Team Member...</option>
                    {/* Fallback to project.members if employees list hasn't loaded yet */}
                    {employees.length === 0 && (project.members || []).map((m: any) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user?.name || m.user_id}
                      </option>
                    ))}
                    {/* All employees from Supabase profiles, with indicator if already in project team */}
                    {employees.map((emp) => {
                      const isProjectMember = (project.members || []).some(
                        (m: any) => m.user_id === emp.id || m.user?.id === emp.id
                      );
                      return (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.department || emp.role || 'Staff'}){isProjectMember ? ' • Project Team' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {employees.length === 0 && (!project.members || project.members.length === 0) && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      No employees found. Create employee accounts in the Employees page.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Deadline</label>
                  <input
                    type="date"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as Priority)}
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                >
                  {taskSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Team Member Modal */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Add Team Member to Project</span>
              </h3>
              <button onClick={() => setIsAddMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Select Employee *</label>
                <select
                  required
                  value={selectedNewMemberId}
                  onChange={(e) => setSelectedNewMemberId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select Employee to Add...</option>
                  {employees
                    .filter((emp) => !(project.members || []).some((m: any) => m.user_id === emp.id || m.user?.id === emp.id))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || emp.role || 'Staff'}) - {emp.email}
                      </option>
                    ))}
                </select>
                {employees.filter((emp) => !(project.members || []).some((m: any) => m.user_id === emp.id || m.user?.id === emp.id)).length === 0 && (
                  <p className="text-[11px] text-slate-500 mt-1.5 italic">
                    All registered employees are already part of this project team.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberSubmitting || !selectedNewMemberId}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                >
                  {memberSubmitting ? 'Adding...' : 'Add to Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
