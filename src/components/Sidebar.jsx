import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

const Sidebar = () => {
  const { stats } = useAppContext();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Profiles', path: '/profiles', icon: '👥' },
    { name: 'Proxies', path: '/proxies', icon: '🌐' },
    { name: 'Extensions', path: '/extensions', icon: '🧩' },
    { name: 'Automation', path: '/automation', icon: '⚡' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <div className="w-64 h-full bg-sidebar border-r border-border flex flex-col">
      <div className="p-6 shrink-0 drag-region">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <span className="text-accent-blue">TOP</span>MANAGER
        </h1>
        <p className="text-xs text-muted mt-1 font-medium tracking-wide uppercase">Anti-Detect Platform</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 no-drag-region">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-accent-blue/10 text-accent-blue font-medium' 
                  : 'text-text-muted hover:bg-hover hover:text-text-main'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Resource Monitor */}
      <div className="p-4 border-t border-border no-drag-region">
        <div className="bg-dark rounded-lg p-3 text-xs space-y-2">
          <div className="flex justify-between items-center text-muted">
            <span>RAM Usage</span>
            <span className={stats?.memoryUsageMB > 4000 ? 'text-accent-red' : ''}>
              {stats?.memoryUsageMB || 0} MB
            </span>
          </div>
          <div className="flex justify-between items-center text-muted">
            <span>CPU Usage</span>
            <span>{Math.round((stats?.cpuUsage?.user || 0) / 1000000)}%</span>
          </div>
          <div className="mt-2 pt-2 border-t border-border flex justify-between items-center text-white">
            <span>Running</span>
            <span className="bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded-full font-bold">
              {stats?.runningBrowsers || 0} / {stats?.totalProfiles || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
