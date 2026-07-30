import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

const ProxiesPage = () => {
  const { proxies, fetchProxies, showToast } = useAppContext();
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.proxy.addBulk(bulkText);
      showToast(`Imported ${result.added} proxies. Failed: ${result.failed}`, 'info');
      setShowBulkModal(false);
      setBulkText('');
      fetchProxies();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.electronAPI) return;
    if (confirm('Are you sure you want to delete this proxy?')) {
      try {
        await window.electronAPI.proxy.delete(id);
        showToast('Proxy deleted', 'success');
        fetchProxies();
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      }
    }
  };

  const handleTest = async (id) => {
    if (!window.electronAPI) return;
    try {
      showToast('Testing proxy...', 'info');
      await window.electronAPI.proxy.test(id);
      fetchProxies();
      showToast('Test complete', 'success');
    } catch (err) {
      showToast(`Test failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark">
      <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
        <h2 className="text-xl font-bold text-white">Proxy Manager</h2>
        <div className="flex gap-2">
          <button className="bg-dark border border-border hover:bg-hover text-white px-4 py-1.5 rounded text-sm font-medium">
            Test All
          </button>
          <button onClick={() => setShowBulkModal(true)} className="bg-accent-blue hover:bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium">
            Bulk Import
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark/50 border-b border-border text-muted text-sm">
                <th className="p-4 font-medium">Protocol</th>
                <th className="p-4 font-medium">Host:Port</th>
                <th className="p-4 font-medium">Auth</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {proxies.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-hover/50 transition-colors">
                  <td className="p-4 text-muted uppercase text-xs">{p.protocol}</td>
                  <td className="p-4 font-medium text-white">{p.host}:{p.port}</td>
                  <td className="p-4 text-muted text-sm">{p.username ? 'Yes' : 'No'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs border ${
                      p.status === 'working' ? 'bg-accent-green/20 border-accent-green text-accent-green' :
                      p.status === 'failed' ? 'bg-accent-red/20 border-accent-red text-accent-red' :
                      'bg-dark border-border text-muted'
                    }`}>
                      {p.status} {p.latency ? `(${p.latency}ms)` : ''}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button onClick={() => handleTest(p.id)} className="text-accent-blue hover:text-blue-400 text-sm">Test</button>
                    <button onClick={() => handleDelete(p.id)} className="text-accent-red hover:text-red-400 text-sm">Delete</button>
                  </td>
                </tr>
              ))}
              {proxies.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-muted">No proxies found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-[500px] shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Bulk Import Proxies</h3>
            <p className="text-xs text-muted mb-4">Format: host:port:user:pass OR protocol://host:port:user:pass (one per line)</p>
            <form onSubmit={handleBulkImport} className="space-y-4">
              <textarea 
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows="8"
                className="w-full bg-dark border border-border rounded p-2 text-white text-sm font-mono whitespace-pre"
                placeholder="192.168.1.1:8080&#10;socks5://10.0.0.1:1080:admin:pass"
              ></textarea>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowBulkModal(false)} className="px-4 py-2 rounded text-sm text-muted hover:text-white">Cancel</button>
                <button type="submit" className="bg-accent-blue hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">Import</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProxiesPage;
