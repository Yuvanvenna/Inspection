import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  RefreshCw,
  User,
  Layers,
  CheckSquare,
  FolderKanban,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock
} from 'lucide-react';
import { AuditClientService } from '../../services/audit.service';
import { AuditLog } from '@antigravity/shared';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    try {
      const data = await AuditClientService.getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit trail:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAuditLogs();
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toUpperCase()) {
      case 'STAGE':
        return <Layers className="w-4 h-4 text-purple-600" />;
      case 'TASK':
        return <CheckSquare className="w-4 h-4 text-indigo-600" />;
      case 'PROJECT':
        return <FolderKanban className="w-4 h-4 text-emerald-600" />;
      case 'CLIENT':
        return <Building2 className="w-4 h-4 text-amber-600" />;
      case 'EMPLOYEE':
      default:
        return <User className="w-4 h-4 text-slate-600" />;
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (entityFilter !== 'ALL' && log.entity_type.toUpperCase() !== entityFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const actorName = log.actor?.name?.toLowerCase() || '';
      const action = log.action.toLowerCase();
      const entityId = log.entity_id.toLowerCase();
      return actorName.includes(q) || action.includes(q) || entityId.includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Loading Immutable Audit Trail...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            System Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically timestamped, append-only activity log of sensitive overrides and actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-xs font-bold text-purple-700 flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            Manager Audit Compliance
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by actor, action, or entity..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Entity Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'STAGE', 'TASK', 'PROJECT', 'CLIENT', 'EMPLOYEE'].map((ent) => (
            <button
              key={ent}
              onClick={() => setEntityFilter(ent)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                entityFilter === ent
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {ent}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table / Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Audit Records Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              System events such as stage progress overrides and provisioning actions will log here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const actorName = log.actor?.name || 'System / Service Role';
              const actorEmail = log.actor?.email || 'automated';
              const actorRole = log.actor?.role || 'SYSTEM';

              return (
                <div key={log.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Actor & Action */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {actorName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">{actorName}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {actorRole}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{actorEmail}</p>
                      </div>
                    </div>

                    {/* Action & Entity Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1.5">
                        {getEntityIcon(log.entity_type)}
                        {log.entity_type}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-extrabold uppercase">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-2">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Details summary */}
                  {log.details && (
                    <div className="pt-2">
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        {isExpanded ? 'Hide Payload Details' : 'View Payload & Parameters'}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800">
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
