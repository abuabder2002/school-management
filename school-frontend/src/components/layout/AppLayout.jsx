import React, { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { SchoolModulesProvider } from '../../context/SchoolModulesContext';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SchoolModulesProvider>
      <div className="app-shell">
        {/* Mobile Backdrop Overlay */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-content-wrapper">
          <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="page-container">
            <Suspense fallback={<div className="page-loading" style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </SchoolModulesProvider>
  );
};
