import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Calendar,
  FileText,
  Code2,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from 'lucide-react';
import { ProjectService } from '../../services/project.service';
import { useAuth } from '../../context/AuthContext';
import { Project, STAGE_DISPLAY_NAMES } from '@antigravity/shared';
import { AttachmentList } from '../../components/attachments/AttachmentList';

export const EmployeeProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadAssignedProjects();
    }
  }, [user]);

  const loadAssignedProjects = async () => {
    setLoading(true);
    try {
      const projs = await ProjectService.getAssignedProjects(user!.id);
      setProjects(projs || []);
    } catch (err) {
      console.error('Failed to load assigned projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedProjectId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">My Assigned Projects</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Read-only specifications, functional requirements, and stage trackers for projects you are assigned to.
        </p>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Projects Assigned</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You are not currently assigned to any active project team. Your manager will assign you when work is ready.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {projects.map((project) => {
            const isExpanded = expandedProjectId === project.id;
            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {project.client?.name || 'Client Org'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{project.name}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">{project.description}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500">Overall Progress</span>
                      <p className="text-2xl font-black text-indigo-600">
                        {Math.round(project.overall_progress || 0)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Six-Stage Strip */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Six Workflow Stages
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
                    {(project.stages || []).map((stage: any, idx: number) => (
                      <div
                        key={stage.id}
                        className={`p-2.5 rounded-lg border text-left ${
                          stage.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : stage.effective_progress !== null
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span>S{idx + 1}</span>
                          <span>{stage.effective_progress !== null ? `${stage.effective_progress}%` : 'Not Started'}</span>
                        </div>
                        <p className="text-xs font-bold truncate mt-0.5">
                          {STAGE_DISPLAY_NAMES[stage.name as keyof typeof STAGE_DISPLAY_NAMES]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer and Context Drawer Toggle */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => toggleExpand(project.id)}
                    className="flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <span>{isExpanded ? 'Hide Specifications & Documents' : 'View Specifications & Documents'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expandable Technical Context Drawer */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          Requirements & Acceptance Criteria
                        </h4>
                        <p className="text-xs text-slate-700 whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
                          {project.client_requirements || project.functional_requirements || project.acceptance_criteria || 'No technical specifications documented yet.'}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                          <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                          System Architecture & Stack
                        </h4>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                          <p><strong>Tech Stack:</strong> {project.technology_stack || 'Not specified'}</p>
                          <p><strong>Architecture:</strong> {project.system_architecture || 'Pending design'}</p>
                          <p><strong>Database:</strong> {project.database_info || 'PostgreSQL'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Attached Project Documents & Deliverables */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Project Documents & Specifications
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">Shared Project Deliverables</span>
                      </div>
                      <AttachmentList projectId={project.id} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
