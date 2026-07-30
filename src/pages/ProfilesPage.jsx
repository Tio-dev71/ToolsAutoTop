import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

const ProfilesPage = () => {
  const { profiles, proxies, fetchProfiles, showToast } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', group_name: 'Default', proxy_id: '', fb_credentials: '' });
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleDelete = async (id) => {
    if (!window.electronAPI) return;
    if (confirm('Are you sure you want to delete this profile?')) {
      try {
        await window.electronAPI.profile.delete(id);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast('Profile deleted', 'success');
        fetchProfiles();
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (!window.electronAPI) return;
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected profiles?`)) {
      try {
        for (const id of selectedIds) {
          await window.electronAPI.profile.delete(id);
        }
        setSelectedIds(new Set());
        showToast('Selected profiles deleted', 'success');
        fetchProfiles();
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      }
    }
  };

  const [editId, setEditId] = useState(null);

  const handleEditClick = (profile) => {
    let fbCreds = '';
    if (profile.fb_account && profile.fb_account.uid) {
      fbCreds = `${profile.fb_account.uid} | ${profile.fb_account.password || ''} | ${profile.fb_account.twoFactor || ''}`;
    }
    setFormData({
      name: profile.name,
      group_name: profile.group_name || '',
      proxy_id: profile.proxy_id || '',
      fb_credentials: fbCreds
    });
    setEditId(profile.id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!window.electronAPI) return;
    try {
      let fb_account = null;
      if (formData.fb_credentials) {
        const parts = formData.fb_credentials.split('|').map(s => s.trim());
        if (parts[0]) {
          fb_account = {
            uid: parts[0],
            password: parts[1] || '',
            twoFactor: parts[2] || ''
          };
        }
      }
      
      if (editId) {
        await window.electronAPI.profile.update(editId, { ...formData, fb_account });
        showToast('Profile updated successfully', 'success');
      } else {
        await window.electronAPI.profile.create({ ...formData, fb_account });
        showToast('Profile created successfully', 'success');
      }
      
      setShowModal(false);
      setFormData({ name: '', group_name: 'Default', proxy_id: '', fb_credentials: '' });
      setEditId(null);
      fetchProfiles();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setFormData({ name: '', group_name: 'Default', proxy_id: '', fb_credentials: '' });
  };

  const [isChecking, setIsChecking] = useState(null);

  const handleCheck = async (id) => {
    if (!window.electronAPI) return;
    setIsChecking(id);
    try {
      const res = await window.electronAPI.profile.checkLive(id);
      if (res.success) {
        showToast(`Profile ${res.status === 'Live' ? 'is Live' : 'is ' + res.status}`, res.status === 'Live' ? 'success' : 'error');
      } else {
        showToast(`Error: ${res.error}`, 'error');
      }
      fetchProfiles();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
    setIsChecking(null);
  };

  const handleCheckAll = async () => {
    if (!window.electronAPI) return;
    setIsChecking('all');
    try {
      showToast('Checking all profiles...', 'info');
      await window.electronAPI.profile.checkLiveAll();
      showToast('Finished checking all profiles', 'success');
      fetchProfiles();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
    setIsChecking(null);
  };

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState({ group_name: 'Default', proxy_id: '', raw_accounts: '' });

  const handleBulkCreate = async (e) => {
    e.preventDefault();
    if (!window.electronAPI) return;
    
    const lines = bulkData.raw_accounts.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      showToast('Please enter at least one account', 'error');
      return;
    }
    
    const profilesToCreate = lines.map((line, index) => {
      const parts = line.split('|').map(s => s.trim());
      const fb_account = {
        uid: parts[0] || '',
        password: parts[1] || '',
        twoFactor: parts[2] || ''
      };
      return {
        name: fb_account.uid ? fb_account.uid : `Profile ${Date.now() + index}`,
        group_name: bulkData.group_name || 'Default',
        proxy_id: bulkData.proxy_id || null,
        fb_account: fb_account
      };
    });

    try {
      showToast(`Importing ${profilesToCreate.length} profiles...`, 'info');
      await window.electronAPI.profile.import(profilesToCreate);
      showToast('Bulk import completed', 'success');
      setShowBulkModal(false);
      setBulkData({ group_name: 'Default', proxy_id: '', raw_accounts: '' });
      fetchProfiles();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark">
      <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
        <h2 className="text-xl font-bold text-white">Browser Profiles</h2>
        <div className="flex space-x-3">
          {selectedIds.size > 0 && (
            <button onClick={handleBulkDelete} className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-4 py-1.5 rounded text-sm font-medium transition-colors">
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button onClick={handleCheckAll} disabled={isChecking !== null} className="bg-dark border border-border hover:bg-hover text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50 transition-colors">
            {isChecking === 'all' ? 'Checking...' : 'Check Live All'}
          </button>
          <button onClick={() => setShowBulkModal(true)} className="bg-dark border border-border hover:bg-hover text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
            + Bulk Add
          </button>
          <button onClick={() => setShowModal(true)} className="bg-accent-blue hover:bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium">
            + New Profile
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark/50 border-b border-border text-muted text-sm">
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={profiles.length > 0 && selectedIds.size === profiles.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(profiles.map(p => p.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="accent-accent-blue"
                  />
                </th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Group</th>
                <th className="p-4 font-medium">Proxy</th>
                <th className="p-4 font-medium">FB Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-hover/50 transition-colors">
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(p.id)}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        setSelectedIds(next);
                      }}
                      className="accent-accent-blue"
                    />
                  </td>
                  <td className="p-4 font-medium text-white">{p.name}</td>
                  <td className="p-4 text-muted">{p.group_name}</td>
                  <td className="p-4 text-muted">
                    {p.proxy_host ? `${p.proxy_host}:${p.proxy_port}` : 'Direct'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs border ${
                      p.fb_status === 'Live' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                      p.fb_status && p.fb_status.includes('Die') ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                      p.fb_status ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                      'bg-dark border-border text-muted'
                    }`}>
                      {p.fb_status || 'Unknown'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleCheck(p.id)} disabled={isChecking === p.id || isChecking === 'all'} className="text-accent-blue hover:text-blue-400 text-sm disabled:opacity-50">
                      {isChecking === p.id ? 'Checking...' : 'Check'}
                    </button>
                    <button onClick={() => handleEditClick(p)} className="text-muted hover:text-white text-sm">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-accent-red hover:text-red-400 text-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-muted">No profiles found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-[500px] shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Bulk Add Profiles</h3>
            <form onSubmit={handleBulkCreate} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-1">Group</label>
                  <input type="text" value={bulkData.group_name} onChange={e => setBulkData({...bulkData, group_name: e.target.value})} className="w-full bg-dark border border-border rounded p-2 text-white text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-muted mb-1">Proxy</label>
                  <select value={bulkData.proxy_id} onChange={e => setBulkData({...bulkData, proxy_id: e.target.value})} className="w-full bg-dark border border-border rounded p-2 text-white text-sm">
                    <option value="">Direct (No Proxy)</option>
                    {proxies.map(px => (
                      <option key={px.id} value={px.id}>{px.host}:{px.port}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Accounts List (One per line)</label>
                <textarea 
                  required
                  value={bulkData.raw_accounts} 
                  onChange={e => setBulkData({...bulkData, raw_accounts: e.target.value})} 
                  className="w-full bg-dark border border-border rounded p-2 text-white text-sm font-mono whitespace-pre" 
                  placeholder="UID|Password&#10;UID|Password|2FA&#10;..." 
                  rows="8"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowBulkModal(false)} className="px-4 py-2 rounded text-sm text-muted hover:text-white">Cancel</button>
                <button type="submit" className="bg-accent-blue hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">Create Profiles</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">{editId ? 'Edit Profile' : 'Create Profile'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1">Profile Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-dark border border-border rounded p-2 text-white text-sm" placeholder="e.g. Account 1" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Group</label>
                <input type="text" value={formData.group_name} onChange={e => setFormData({...formData, group_name: e.target.value})} className="w-full bg-dark border border-border rounded p-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Proxy (Optional)</label>
                <select value={formData.proxy_id} onChange={e => setFormData({...formData, proxy_id: e.target.value})} className="w-full bg-dark border border-border rounded p-2 text-white text-sm">
                  <option value="">Direct Connection (No Proxy)</option>
                  {proxies.map(px => (
                    <option key={px.id} value={px.id}>{px.host}:{px.port}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Facebook Account (Optional)</label>
                <textarea 
                  value={formData.fb_credentials} 
                  onChange={e => setFormData({...formData, fb_credentials: e.target.value})} 
                  className="w-full bg-dark border border-border rounded p-2 text-white text-sm" 
                  placeholder="Format: UID | Password" 
                  rows="2"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded text-sm text-muted hover:text-white">Cancel</button>
                <button type="submit" className="bg-accent-blue hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">{editId ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilesPage;
