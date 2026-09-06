import React from 'react';

export const KPISkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between animate-pulse"
        >
          <div className="space-y-2">
            <div className="h-3 w-20 bg-slate-200 rounded"></div>
            <div className="h-7 w-12 bg-slate-200 rounded-md"></div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200"></div>
        </div>
      ))}
    </div>
  );
};

export const StageTrackerSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-6 bg-slate-200 rounded"></div>
            <div className="h-2.5 w-8 bg-slate-200 rounded"></div>
          </div>
          <div className="h-3.5 w-24 bg-slate-200 rounded"></div>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between">
              <div className="h-4 w-10 bg-slate-200 rounded"></div>
              <div className="h-2.5 w-12 bg-slate-200 rounded"></div>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TaskCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-3 w-20 bg-slate-200 rounded"></div>
                <div className="h-3 w-16 bg-slate-200 rounded"></div>
              </div>
              <div className="h-4 w-48 bg-slate-300 rounded"></div>
              <div className="h-3 w-64 bg-slate-200 rounded"></div>
            </div>
            <div className="h-6 w-12 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="h-3 w-24 bg-slate-200 rounded"></div>
            <div className="h-3 w-20 bg-slate-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 animate-pulse">
      <div className="p-4 bg-slate-50 flex items-center justify-between">
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
        <div className="h-4 w-24 bg-slate-200 rounded"></div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-36 bg-slate-200 rounded"></div>
              <div className="h-2.5 w-24 bg-slate-100 rounded"></div>
            </div>
          </div>
          <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
          <div className="h-4 w-16 bg-slate-200 rounded"></div>
        </div>
      ))}
    </div>
  );
};

export const TimelineSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200"></div>
              <div className="h-3.5 w-28 bg-slate-200 rounded"></div>
            </div>
            <div className="h-4 w-12 bg-slate-200 rounded"></div>
          </div>
          <div className="h-3 w-full bg-slate-200 rounded pl-9"></div>
          <div className="h-3 w-3/4 bg-slate-200 rounded pl-9"></div>
        </div>
      ))}
    </div>
  );
};
