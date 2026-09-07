import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Mail,
  Briefcase,
  UserCheck,
  UserX,
  Search,
  AlertCircle,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { EmployeeService } from '../../services/employee.service';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, Role } from '@antigravity/shared';

export const EmployeesPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await EmployeeService.getEmployees();
      setEmployees(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingEmployee(null);
    setName('');
    setEmail('');
    setRole('EMPLOYEE');
    setDepartment('');
    setPassword('');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: UserProfile) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setEmail(emp.email);
    setRole(emp.role);
    setDepartment(emp.department || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!editingEmployee && (!password || password.length < 6)) {
        setError('Please provide a temporary password of at least 6 characters');
        setSubmitting(false);
        return;
      }

      if (editingEmployee) {
        await EmployeeService.updateEmployee(editingEmployee.id, {
          name,
          department: department || undefined,
          role,
        });
      } else {
        await EmployeeService.createEmployee({
          name,
          email,
          role,
          department: department || undefined,
          password,
        });
      }
      setIsModalOpen(false);
      await fetchEmployees();
    } catch (err: any) {
      setError(err.message || 'Failed to save employee profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp: any) => {
    const action = emp.status === 'ACTIVE' ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${emp.name}'s account?`)) {
      return;
    }

    try {
      await EmployeeService.toggleStatus(emp.id, emp.status);
      await fetchEmployees();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDeleteEmployee = async (emp: any) => {
    if (currentUser?.id === emp.id) {
      alert('You cannot delete your own manager account.');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to permanently delete ${emp.name}'s account?\n\nThis will remove their profile and login credentials.`
      )
    ) {
      return;
    }

    try {
      await EmployeeService.deleteEmployee(emp.id);
      await fetchEmployees();
    } catch (err: any) {
      alert(`Failed to delete employee: ${err.message}`);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Employees Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage engineering talent, assign roles, and monitor active task workloads.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredEmployees.length} team members
        </span>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Employees Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Employees Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery ? 'No match found for your search.' : 'Add your team members to begin assigning tasks.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEmployees.map((emp) => {
            const isManager = emp.role === 'MANAGER';
            const isActive = emp.status === 'ACTIVE';

            return (
              <div
                key={emp.id}
                className={`bg-white rounded-xl border p-5 flex flex-col justify-between shadow-sm transition-all ${
                  isActive ? 'border-slate-200 hover:border-indigo-200' : 'border-slate-200 bg-slate-50/60 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${
                          isManager
                            ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                            : 'bg-gradient-to-br from-indigo-500 to-blue-600'
                        }`}
                      >
                        {emp.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{emp.name}</h3>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span>{emp.department || 'Engineering'}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isManager
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {emp.role}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                  </div>

                  {/* Workload Stats */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Assigned Tasks
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        {emp.task_count || 0} ({emp.active_task_count || 0} active)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Projects
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        {emp.project_count || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                    }`}
                  >
                    {emp.status}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(emp)}
                      title="Edit Profile"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(emp)}
                      title={isActive ? 'Deactivate Account' : 'Activate Account'}
                      className={`p-1.5 rounded-md transition-colors ${
                        isActive
                          ? 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                          : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'
                      }`}
                    >
                      {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp)}
                      title={currentUser?.id === emp.id ? 'Cannot delete own account' : 'Delete Employee'}
                      disabled={currentUser?.id === emp.id}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {editingEmployee ? 'Edit Employee Profile' : 'Add New Employee'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Work Email *</label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingEmployee)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maya@company.com"
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Backend / 3D"
                    className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create temporary password (min 6 characters)"
                    className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Employee will use this password to sign in to their dashboard.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingEmployee ? 'Update Profile' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
