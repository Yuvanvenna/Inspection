import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layers, ArrowRight, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { Role } from '@antigravity/shared';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Sign up fields
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const [department, setDepartment] = useState('Engineering');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, signUp } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      if (res.role === 'MANAGER') {
        navigate('/manager/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    setError(null);
    setLoading(true);

    const res = await signUp({
      name,
      email,
      password: password || 'Password123!',
      role,
      department,
    });
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      if (res.role === 'MANAGER' || role === 'MANAGER') {
        navigate('/manager/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center text-white shadow-xl shadow-indigo-500/25 mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">INSPECTION</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
          Project Management Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          {/* Sign In vs Sign Up Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register / Sign Up</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signin' ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@antigravity.io"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password123!"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign in to Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form className="space-y-3.5" onSubmit={handleSignUp}>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Email address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@company.com"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="EMPLOYEE">Employee (Tasks & Updates)</option>
                    <option value="MANAGER">Manager (Full Oversight)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. QA / 3D CAD"
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password123!"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account & Enter'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
