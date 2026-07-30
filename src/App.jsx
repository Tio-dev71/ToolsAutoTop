import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProfilesPage from './pages/ProfilesPage';
import ProxiesPage from './pages/ProxiesPage';
import ExtensionsPage from './pages/ExtensionsPage';
import AutomationPage from './pages/AutomationPage';
import SettingsPage from './pages/SettingsPage';
import { useAppContext } from './contexts/AppContext';

// Simple Toast Component
const Toast = ({ message, type }) => {
  const bgClass = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
  return (
    <div className={`fixed bottom-4 right-4 ${bgClass} text-white px-4 py-3 rounded shadow-lg z-50 flex items-center`}>
      <span>{message}</span>
    </div>
  );
};

function App() {
  const { toast } = useAppContext();

  return (
    <Router>
      <div className="flex flex-col h-screen bg-dark text-text-main overflow-hidden">
        {/* Title Bar for dragging window */}
        <div className="h-8 w-full drag-region flex-shrink-0 z-50"></div>
        
        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          
          <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route path="/proxies" element={<ProxiesPage />} />
            <Route path="/extensions" element={<ExtensionsPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
          
          {toast && <Toast message={toast.message} type={toast.type} />}
        </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
