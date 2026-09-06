import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DarkSidebar } from './DarkSidebar';
import { TopHeader } from './TopHeader';

export const AppLayout: React.FC<{ title?: string }> = ({ title }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Responsive Left Sidebar */}
      <DarkSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main Workspace Area */}
      <div className="flex-1 md:ml-64 ml-0 flex flex-col min-w-0 transition-all duration-200">
        <TopHeader title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
