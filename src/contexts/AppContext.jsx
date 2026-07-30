import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [profiles, setProfiles] = useState([]);
  const [proxies, setProxies] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [browserStatuses, setBrowserStatuses] = useState({});
  const [stats, setStats] = useState(null);
  
  // App-wide toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProfiles = async () => {
    if (!window.electronAPI) return;
    const data = await window.electronAPI.profile.list();
    setProfiles(data);
  };

  const fetchProxies = async () => {
    if (!window.electronAPI) return;
    const data = await window.electronAPI.proxy.list();
    setProxies(data);
  };
  
  const fetchBrowserStatuses = async () => {
      if (!window.electronAPI) return;
      const data = await window.electronAPI.browser.getAllStatus();
      setBrowserStatuses(data);
  }

  useEffect(() => {
    fetchProfiles();
    fetchProxies();
    fetchBrowserStatuses();

    // Listen for resource stats
    let unsubStats;
    if (window.electronAPI) {
      unsubStats = window.electronAPI.app.onStats((newStats) => {
        setStats(newStats);
      });
      
      // Poll browser statuses every few seconds
      const statusInterval = setInterval(fetchBrowserStatuses, 3000);
      
      return () => {
        if (unsubStats) unsubStats();
        clearInterval(statusInterval);
      };
    }
  }, []);

  return (
    <AppContext.Provider value={{
      profiles, setProfiles, fetchProfiles,
      proxies, setProxies, fetchProxies,
      extensions, setExtensions,
      tasks, setTasks,
      browserStatuses, fetchBrowserStatuses,
      stats,
      toast, showToast
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
