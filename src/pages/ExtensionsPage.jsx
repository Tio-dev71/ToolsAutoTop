import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

const ExtensionsPage = () => {
  const { showToast } = useAppContext();
  const [extensions, setExtensions] = useState([]);

  const fetchExtensions = async () => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.extension.list();
      setExtensions(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExtensions();
  }, []);

  const handleAddExtension = async () => {
    if (!window.electronAPI) return;
    try {
      const added = await window.electronAPI.extension.selectFolder();
      if (added) {
        showToast('Extension added successfully!', 'success');
        fetchExtensions();
      }
    } catch (err) {
      showToast(`Error adding extension: ${err.message}`, 'error');
    }
  };

  const handleRemove = async (id) => {
    if (!window.electronAPI) return;
    if (confirm('Are you sure you want to remove this extension?')) {
      try {
        await window.electronAPI.extension.remove(id);
        showToast('Extension removed', 'success');
        fetchExtensions();
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark">
      <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
        <h2 className="text-xl font-bold text-white">Extensions</h2>
        <button 
          onClick={handleAddExtension} 
          className="bg-accent-blue hover:bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
        >
          + Add Extension
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark/50 border-b border-border text-muted text-sm">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Version</th>
                <th className="p-4 font-medium">Path</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {extensions.map(ext => (
                <tr key={ext.id} className="border-b border-border/50 hover:bg-hover/50 transition-colors">
                  <td className="p-4 font-medium text-white">{ext.name}</td>
                  <td className="p-4 text-muted">{ext.version}</td>
                  <td className="p-4 text-muted text-xs truncate max-w-xs" title={ext.path}>
                    {ext.path}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => handleRemove(ext.id)} 
                      className="text-accent-red hover:text-red-400 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {extensions.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-muted">
                    <p className="text-4xl mb-3">🧩</p>
                    <p>No extensions added yet.</p>
                    <p className="text-sm mt-1">Click "+ Add Extension" to load an unpacked extension folder.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExtensionsPage;
