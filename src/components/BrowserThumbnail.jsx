import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

const BrowserThumbnail = ({ profile, statusInfo }) => {
  const [thumbnail, setThumbnail] = useState(null);
  
  const isRunning = statusInfo?.status === 'running';

  useEffect(() => {
    if (!isRunning) {
      setThumbnail(null);
      return;
    }

    // Subscribe to thumbnail updates for this specific profile
    let unsub;
    if (window.electronAPI) {
      unsub = window.electronAPI.browser.onThumbnails((thumbs) => {
        if (thumbs[profile.id]) {
          setThumbnail(thumbs[profile.id]);
        } else {
           setThumbnail(null); // Clear if target closed
        }
      });
    }
    return () => unsub && unsub();
  }, [profile.id, isRunning]);

  const handleLaunch = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.browser.launch(profile.id);
      if (res && !res.success) {
        alert(`Failed to launch browser: ${res.error}`);
      }
    }
  };

  const handleClose = async () => {
    if (window.electronAPI) await window.electronAPI.browser.close(profile.id);
  };
  
  const handleFocus = async () => {
      if (window.electronAPI) await window.electronAPI.browser.openFullscreen(profile.id);
  };

  return (
    <div className="glass-panel overflow-hidden flex flex-col group relative">
      {/* Header */}
      <div className="px-3 py-2 bg-dark/50 border-b border-border flex justify-between items-center z-10">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isRunning ? 'bg-accent-green shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 
            statusInfo?.status === 'launching' ? 'bg-yellow-400 animate-pulse' : 
            statusInfo?.status === 'error' ? 'bg-accent-red' : 
            'bg-muted'
          }`} />
          <span className="text-sm font-medium truncate" title={profile.name}>{profile.name}</span>
        </div>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 bg-black relative flex items-center justify-center min-h-[140px]">
        {thumbnail ? (
          <img src={thumbnail} alt="Browser View" className="w-full h-full object-contain cursor-pointer" onClick={handleFocus} />
        ) : (
          <div className="text-muted text-xs flex flex-col items-center">
            <span className="text-2xl mb-1">📴</span>
            {statusInfo?.status === 'launching' ? 'Launching...' : 'Offline'}
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {isRunning ? (
            <>
              <button onClick={handleFocus} className="bg-accent-blue hover:bg-blue-600 text-white p-2 rounded-full shadow-lg" title="Focus Window">
                🔍
              </button>
              <button onClick={handleClose} className="bg-accent-red hover:bg-red-600 text-white p-2 rounded-full shadow-lg" title="Stop">
                🛑
              </button>
            </>
          ) : (
            <button onClick={handleLaunch} className="bg-accent-green hover:bg-green-600 text-white p-2 rounded-full shadow-lg" title="Start">
              ▶️
            </button>
          )}
        </div>
      </div>
      
      {/* Footer / Info */}
      <div className="px-3 py-2 bg-dark/80 text-[10px] flex justify-between items-center border-t border-border">
         <span className="text-muted truncate max-w-[70%]">
           {profile.proxy_host ? `${profile.proxy_country ? '🏳️' : '🌐'} ${profile.proxy_host}` : 'No Proxy'}
         </span>
         {isRunning && statusInfo?.uptime > 0 && (
            <span className="text-accent-blue">
              {Math.floor(statusInfo.uptime / 60000)}m
            </span>
         )}
      </div>
    </div>
  );
};

export default BrowserThumbnail;
