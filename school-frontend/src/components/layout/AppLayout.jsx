import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const AppLayout = () => {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content-wrapper">
        <Navbar />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
