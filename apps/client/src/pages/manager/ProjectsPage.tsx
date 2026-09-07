import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Calendar,
  ArrowRight,
  Filter,
  Search,
  X,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { ProjectService, CreateProjectInput } from '../../services/project.service';
import { ClientService } from '../../services/client.service';
import { EmployeeService } from '../../services/employee.service';
import {
  Project,
  Client,
  UserProfile,
  Priority,
  ProjectStatus,
  STAGE_DISPLAY_NAMES,
} from '@antigravity/shared';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'requirements' | 'architecture' | 'team'>('basic');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState<CreateProjectInput>({
    client_id: '',
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'MEDIUM',
    status: 'ACTIVE',
    client_requirements: '',
    functional_requirements: '',
    technical_requirements: '',
    deliverables: '',
    acceptance_criteria: '',
    additional_notes: '',
    system_architecture: '',
    technology_stack: '',
    database_info: '',
    api_info: '',
    infrastructure_info: '',
    technical_notes: '',
    member_ids: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projData, clientData, empData] = await Promise.all([
        ProjectService.getProjects(),
        ClientService.getClients(),
        EmployeeService.getEmployees().catch(() => []),
      ]);

      setProjects(projData);
      setClients(clientData);
      setEmployees(empData || []);

      if (clientData.length > 0 && !formData.client_id) {
        setFormData((prev) => ({ ...prev, client_id: clientData[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setActiveTab('basic');
      setError('Project name is required');
      return;
    }

    const targetClientId = formData.client_id;
    if (!targetClientId) {
      setError('Please select a client organization. If no clients exist, create one first in the Clients section.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await ProjectService.createProject({ ...formData, client_id: targetClientId });
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMember = (empId: string) => {
    setFormData((prev) => {
      const members = prev.member_ids || [];
      if (members.includes(empId)) {
        return { ...prev, member_ids: members.filter((id) => id !== empId) };
      } else {
        return { ...prev, member_ids: [...members, empId] };
      }
    });
  };

  const handleDeleteProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to permanently delete project "${project.name}"?\n\nThis will remove all workflow stages, tasks, work updates, and project files. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await ProjectService.deleteProject(project.id);
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.client?.name && p.client.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Projects Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor client project lifecycles, six-stage workflow states, and team allocations.
          </p>
        </div>
        <button
          onClick={() => {
            setActiveTab('basic');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects, clients, specifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          {['ALL', 'ACTIVE', 'ON_HOLD', 'DRAFT', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${statusFilter === st
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

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Projects Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No projects matched your filters.'
              : 'Create a new project to start managing stages and tasks.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-indigo-300 transition-all group"
            >
              <div className="space-y-4">
                {/* Top Bar */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block mb-1">
                      {project.client?.name || 'Client'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${project.priority === 'URGENT'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : project.priority === 'HIGH'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                    >
                      {project.priority}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {project.status}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">{project.description}</p>

                {/* Overall Progress Bar */}
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-500">Overall Progress</span>
                    <span className="text-sm font-black text-indigo-600">
                      {Math.round(project.overall_progress || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${project.overall_progress || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Six Stages Mini Strip */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Six Workflow Stages
                  </span>
                  <div className="grid grid-cols-6 gap-1.5 text-center">
                    {(project.stages || []).map((stage: any, idx: number) => (
                      <div
                        key={stage.id}
                        title={`${STAGE_DISPLAY_NAMES[stage.name as keyof typeof STAGE_DISPLAY_NAMES]}: ${stage.effective_progress !== null ? `${stage.effective_progress}%` : 'Not Started'
                          }`}
                        className={`py-1.5 px-1 rounded text-[10px] font-bold border transition-colors ${stage.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : stage.effective_progress !== null
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}
                      >
                        <span>S{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Footer Details */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDeleteProject(e, project)}
                    title="Delete Project"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/manager/projects/${project.id}`)}
                    className="flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <span>View Project Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Multi-Tab Project Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Project</h3>
                <p className="text-xs text-slate-500">
                  Six workflow stages are automatically created upon project creation.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              {[
                { id: 'basic', label: '1. Basic Info' },
                { id: 'requirements', label: '2. Requirements' },
                { id: 'architecture', label: '3. Architecture' },
                { id: 'team', label: '4. Team Staffing' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateProject} noValidate className="space-y-4">
              {/* Tab 1: Basic Info */}
              {activeTab === 'basic' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Project Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Autonomous Survey Drone"
                        className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Client *</label>
                      <select
                        required
                        value={formData.client_id}
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                        className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="">Select a Client Organization...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.company})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Description *</label>
                    <textarea
                      rows={2}
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="High-level project scope and executive summary..."
                      className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Start Date</label>
                      <input
                        type="date"
                        required
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Deadline</label>
                      <input
                        type="date"
                        required
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                        className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                        className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Requirements */}
              {activeTab === 'requirements' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Client Requirements</label>
                    <textarea
                      rows={2}
                      value={formData.client_requirements}
                      onChange={(e) => setFormData({ ...formData, client_requirements: e.target.value })}
                      placeholder="Specific client commitments and expectations..."
                      className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Functional Requirements</label>
                    <textarea
                      rows={2}
                      value={formData.functional_requirements}
                      onChange={(e) => setFormData({ ...formData, functional_requirements: e.target.value })}
                      placeholder="System capabilities, user flows, and features..."
                      className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Deliverables & Acceptance Criteria</label>
                    <textarea
                      rows={2}
                      value={formData.acceptance_criteria}
                      onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })}
                      placeholder="Acceptance tests, handover criteria..."
                      className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Tab 3: Architecture & Tech */}
              {activeTab === 'architecture' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">System Architecture</label>
                    <textarea
                      rows={2}
                      value={formData.system_architecture}
                      onChange={(e) => setFormData({ ...formData, system_architecture: e.target.value })}
                      placeholder="Subsystem design, telemetry flows, communication channels..."
                      className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Technology Stack</label>
                      <input
                        type="text"
                        value={formData.technology_stack}
                        onChange={(e) => setFormData({ ...formData, technology_stack: e.target.value })}
                        placeholder="e.g. React, Node.js, WebGL, Supabase"
                        className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Database & APIs</label>
                      <input
                        type="text"
                        value={formData.database_info}
                        onChange={(e) => setFormData({ ...formData, database_info: e.target.value })}
                        placeholder="PostgreSQL, REST, WebSocket..."
                        className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Team Staffing */}
              {activeTab === 'team' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">
                      Select team members who are authorized to work on this project and receive tasks:
                    </p>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {(formData.member_ids || []).length} selected
                    </span>
                  </div>

                  {employees.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5">
                      <p className="text-xs font-bold text-slate-700">No Employee Accounts Found</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        You can create the project now and assign team members or tasks anytime from the project details page.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {employees.map((emp) => {
                        const isSelected = (formData.member_ids || []).includes(emp.id);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => toggleMember(emp.id)}
                            className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${isSelected
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                            >
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{emp.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {emp.department || emp.role || 'Staff'}
                              </p>
                            </div>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold ${isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                                }`}
                            >
                              {isSelected && '✓'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'requirements') setActiveTab('basic');
                        if (activeTab === 'architecture') setActiveTab('requirements');
                        if (activeTab === 'team') setActiveTab('architecture');
                      }}
                      className="px-3 py-1.5 text-slate-600 text-xs font-semibold hover:underline"
                    >
                      ← Previous Tab
                    </button>
                  )}
                  {activeTab !== 'team' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'basic') setActiveTab('requirements');
                        if (activeTab === 'requirements') setActiveTab('architecture');
                        if (activeTab === 'architecture') setActiveTab('team');
                      }}
                      className="px-3 py-1.5 text-indigo-600 text-xs font-bold hover:underline"
                    >
                      Next Tab →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
