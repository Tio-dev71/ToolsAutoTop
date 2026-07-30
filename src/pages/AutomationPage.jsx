import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

const AutomationPage = () => {
  const { profiles, showToast } = useAppContext();
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form state
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState('fb_auto_interact');
  const [targetUrl, setTargetUrl] = useState('');
  const [actionCount, setActionCount] = useState(5);
  const [comments, setComments] = useState('Thật tuyệt vời!\nHay quá bạn ơi\nQuá đỉnh');
  const [selectedProfiles, setSelectedProfiles] = useState(new Set());

  const fetchTasks = async () => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.task.list();
      setTasks(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!window.electronAPI) return;
    if (selectedProfiles.size === 0) {
      showToast('Please select at least one profile', 'error');
      return;
    }

    const config = {
      targetUrl: targetUrl.trim(),
      actionCount: parseInt(actionCount) || 5,
      comments: comments.split('\n').map(c => c.trim()).filter(Boolean)
    };

    try {
      await window.electronAPI.task.create({
        name: taskName || (taskType === 'fb_farm_reels' ? 'Farm Reels' : 'Auto Interact'),
        type: taskType,
        profile_ids: Array.from(selectedProfiles),
        config
      });
      showToast('Task created successfully', 'success');
      setShowModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const resetForm = () => {
    setTaskName('');
    setTargetUrl('');
    setActionCount(5);
    setComments('Thật tuyệt vời!\nHay quá bạn ơi\nQuá đỉnh');
    setSelectedProfiles(new Set());
  };

  const handleStart = async (id) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.task.start(id);
      showToast('Task started', 'success');
      fetchTasks();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleStop = async (id) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.task.stop(id);
      showToast('Task stopped', 'success');
      fetchTasks();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.electronAPI) return;
    if (confirm('Delete this task?')) {
      try {
        await window.electronAPI.task.delete(id);
        showToast('Task deleted', 'success');
        fetchTasks();
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      }
    }
  };

  const toggleProfileSelect = (id) => {
    setSelectedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-dark">
      <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
        <h2 className="text-xl font-bold text-white">Automation Scripts</h2>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-accent-blue hover:bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
        >
          + New Task
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark/50 border-b border-border text-muted text-sm">
                <th className="p-4 font-medium">Task Name</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Profiles</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} className="border-b border-border/50 hover:bg-hover/50 transition-colors">
                  <td className="p-4 font-medium text-white">{task.name}</td>
                  <td className="p-4 text-muted">
                    {task.type === 'fb_farm_reels' ? 'Farm Reels' : task.type === 'fb_auto_interact' ? 'Auto Interact' : task.type}
                  </td>
                  <td className="p-4 text-muted">{task.profile_ids.length} profiles</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      task.status === 'running' ? 'bg-accent-blue/20 text-accent-blue' : 'bg-border text-muted'
                    }`}>
                      {task.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {task.status !== 'running' ? (
                      <button onClick={() => handleStart(task.id)} className="text-accent-blue hover:text-blue-400 text-sm font-medium">Start</button>
                    ) : (
                      <button onClick={() => handleStop(task.id)} className="text-orange-400 hover:text-orange-300 text-sm font-medium">Stop</button>
                    )}
                    <button onClick={() => handleDelete(task.id)} className="text-accent-red hover:text-red-400 text-sm font-medium ml-3">Delete</button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-muted">
                    <p className="text-4xl mb-3">⚡</p>
                    <p>No automation tasks yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE TASK MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-dark/50">
              <h3 className="text-lg font-bold text-white">Create New Automation Task</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="task-form" onSubmit={handleCreateTask} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">Task Type</label>
                  <select 
                    value={taskType}
                    onChange={e => setTaskType(e.target.value)}
                    className="w-full bg-dark border border-border rounded p-2 text-white outline-none focus:border-accent-blue transition-colors"
                  >
                    <option value="fb_auto_interact">Auto Interact (News Feed)</option>
                    <option value="fb_farm_reels">Farm Reels (Fanpage / Feed)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">Task Name</label>
                    <input 
                      type="text" 
                      value={taskName} 
                      onChange={e => setTaskName(e.target.value)} 
                      className="w-full bg-dark border border-border rounded p-2 text-white outline-none focus:border-accent-blue transition-colors"
                      placeholder="e.g. Farm Profiles 1-10"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">Action Count</label>
                    <input 
                      type="number" 
                      value={actionCount} 
                      onChange={e => setActionCount(e.target.value)} 
                      className="w-full bg-dark border border-border rounded p-2 text-white outline-none focus:border-accent-blue transition-colors"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">Target URL (Fanpage, Group... Leave empty for generic feed)</label>
                  <input 
                    type="url" 
                    value={targetUrl} 
                    onChange={e => setTargetUrl(e.target.value)} 
                    className="w-full bg-dark border border-border rounded p-2 text-white outline-none focus:border-accent-blue transition-colors"
                    placeholder="https://www.facebook.com/groups/..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">Custom Comments (One per line)</label>
                  <textarea 
                    value={comments} 
                    onChange={e => setComments(e.target.value)} 
                    className="w-full h-24 bg-dark border border-border rounded p-2 text-white outline-none focus:border-accent-blue transition-colors"
                    placeholder="Enter comments..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">Select Profiles to Run</label>
                  <div className="border border-border rounded p-2 max-h-40 overflow-y-auto bg-dark space-y-1">
                    {profiles.length === 0 ? (
                      <p className="text-muted text-sm italic p-2">No profiles available.</p>
                    ) : (
                      profiles.map(p => (
                        <label key={p.id} className="flex items-center gap-2 text-sm p-1 hover:bg-hover rounded cursor-pointer transition-colors text-white">
                          <input 
                            type="checkbox" 
                            checked={selectedProfiles.has(p.id)}
                            onChange={() => toggleProfileSelect(p.id)}
                            className="w-4 h-4 rounded border-border bg-dark text-accent-blue focus:ring-accent-blue focus:ring-offset-dark"
                          />
                          {p.name} {p.group_name !== 'Default' && <span className="text-muted text-xs">({p.group_name})</span>}
                        </label>
                      ))
                    )}
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-dark/50 shrink-0">
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded text-sm font-medium text-white hover:bg-hover transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="task-form"
                className="bg-accent-blue hover:bg-blue-600 px-6 py-2 rounded text-sm font-bold text-white transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationPage;
