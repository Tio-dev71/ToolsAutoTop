import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import BrowserThumbnail from '../components/BrowserThumbnail';

const DashboardPage = () => {
  const { profiles, browserStatuses, showToast } = useAppContext();
  const [gridSize, setGridSize] = useState('grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5');
  const [filter, setFilter] = useState('all'); // all, running, stopped

  const handleLaunchAll = async () => {
    if (!window.electronAPI) return;
    for (const profile of profiles) {
      if (browserStatuses[profile.id]?.status !== 'running') {
        const res = await window.electronAPI.browser.launch(profile.id);
        if (res && !res.success) {
           showToast(`Failed to launch ${profile.name}: ${res.error}`, 'error');
        }
        // Stagger launches to prevent CPU spike
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  };

  const handleCloseAll = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.browser.closeAll();
  };

  const filteredProfiles = profiles.filter(p => {
    const isRunning = browserStatuses[p.id]?.status === 'running';
    if (filter === 'running') return isRunning;
    if (filter === 'stopped') return !isRunning;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-dark">
      {/* Header Bar */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0 drag-region">
        <div className="no-drag-region">
          <h2 className="text-xl font-bold text-white">Live Dashboard</h2>
        </div>
        
        <div className="flex items-center gap-4 no-drag-region">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-dark border border-border text-sm rounded px-3 py-1.5 focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Profiles</option>
            <option value="running">Running Only</option>
            <option value="stopped">Stopped Only</option>
          </select>

          <select 
            value={gridSize}
            onChange={(e) => setGridSize(e.target.value)}
            className="bg-dark border border-border text-sm rounded px-3 py-1.5 focus:outline-none focus:border-accent-blue"
          >
            <option value="grid-cols-1 md:grid-cols-2">Large View</option>
            <option value="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">Grid View</option>
            <option value="grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">Dense View</option>
          </select>

          <div className="h-6 w-px bg-border mx-2"></div>

          <button onClick={handleLaunchAll} className="bg-accent-blue hover:bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
            Launch All
          </button>
          <button onClick={handleCloseAll} className="bg-accent-red hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
            Stop All
          </button>
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        {filteredProfiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg">No profiles found.</p>
            <p className="text-sm">Go to Profiles page to create one.</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${gridSize}`}>
            {filteredProfiles.map(profile => (
              <BrowserThumbnail 
                key={profile.id} 
                profile={profile} 
                statusInfo={browserStatuses[profile.id]} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
