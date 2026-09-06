import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  actionIcon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
  actionIcon: ActionIcon = Plus,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300/90 p-12 text-center space-y-4 shadow-sm/30">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto shadow-inner">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>

      {actionLabel && (
        <div className="pt-2">
          {actionHref ? (
            <Link
              to={actionHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
            >
              <ActionIcon className="w-4 h-4" />
              <span>{actionLabel}</span>
            </Link>
          ) : (
            <button
              onClick={onActionClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30"
            >
              <ActionIcon className="w-4 h-4" />
              <span>{actionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
