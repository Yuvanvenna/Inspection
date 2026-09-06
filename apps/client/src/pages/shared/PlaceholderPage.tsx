import React from 'react';

export const PlaceholderPage: React.FC<{ title: string; phase: string }> = ({ title, phase }) => {
  return (
    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-3">
      <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mx-auto">
        This module is scheduled for implementation in <strong>{phase}</strong> per the Antigravity Master Build Specification.
      </p>
      <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
        Phase 1 Shell Active
      </div>
    </div>
  );
};
