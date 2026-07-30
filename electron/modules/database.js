const Store = require('electron-store');
const path = require('path');
const fs = require('fs');

class Database {
  constructor(appPath) {
    // electron-store automatically handles user-data dir
    this.store = new Store({
      name: 'mkt-browser-db',
      defaults: {
        profiles: [],
        proxies: [],
        extensions: [],
        tasks: [],
        settings: {}
      }
    });
  }

  initialize() {
    // Migration logic if needed
    console.log('Database initialized (electron-store)');
  }

  // --- PROFILES ---
  getAllProfiles() {
    return this.store.get('profiles') || [];
  }
  
  getProfile(id) {
      const profiles = this.getAllProfiles();
      return profiles.find(p => p.id === id);
  }

  createProfile(profile) {
    const profiles = this.getAllProfiles();
    profiles.push(profile);
    this.store.set('profiles', profiles);
    return profile;
  }

  updateProfile(id, updates) {
    const profiles = this.getAllProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...updates, updated_at: new Date().toISOString() };
      this.store.set('profiles', profiles);
      return profiles[index];
    }
    return null;
  }

  deleteProfile(id) {
    const profiles = this.getAllProfiles();
    const newProfiles = profiles.filter(p => p.id !== id);
    this.store.set('profiles', newProfiles);
    return { success: true };
  }

  // --- PROXIES ---
  getAllProxies() {
    return this.store.get('proxies') || [];
  }

  getProxy(id) {
    const proxies = this.getAllProxies();
    return proxies.find(p => p.id === id);
  }

  createProxy(proxy) {
    const proxies = this.getAllProxies();
    proxies.push(proxy);
    this.store.set('proxies', proxies);
    return proxy;
  }

  updateProxy(id, updates) {
    const proxies = this.getAllProxies();
    const index = proxies.findIndex(p => p.id === id);
    if (index !== -1) {
      proxies[index] = { ...proxies[index], ...updates };
      this.store.set('proxies', proxies);
      return proxies[index];
    }
    return null;
  }

  deleteProxy(id) {
    const proxies = this.getAllProxies();
    const newProxies = proxies.filter(p => p.id !== id);
    this.store.set('proxies', newProxies);
    return { success: true };
  }
  
  // --- EXTENSIONS ---
  getAllExtensions() {
    return this.store.get('extensions') || [];
  }
  
  createExtension(extension) {
    const extensions = this.getAllExtensions();
    extensions.push(extension);
    this.store.set('extensions', extensions);
    return extension;
  }

  deleteExtension(id) {
    const extensions = this.getAllExtensions();
    const newExtensions = extensions.filter(e => e.id !== id);
    this.store.set('extensions', newExtensions);
    return { success: true };
  }
  
  // --- TASKS ---
  listTasks() {
    return this.store.get('tasks') || [];
  }

  createTask(task) {
    const tasks = this.listTasks();
    const newTask = {
      ...task,
      created_at: new Date().toISOString(),
      status: 'idle',
      profile_ids: JSON.stringify(task.profile_ids || []),
      config: JSON.stringify(task.config || {})
    };
    tasks.push(newTask);
    this.store.set('tasks', tasks);
    return newTask;
  }

  updateTask(id, updates) {
    const tasks = this.listTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates, updated_at: new Date().toISOString() };
      this.store.set('tasks', tasks);
      return tasks[index];
    }
    return null;
  }

  deleteTask(id) {
    const tasks = this.listTasks();
    const newTasks = tasks.filter(t => t.id !== id);
    this.store.set('tasks', newTasks);
    // Also delete logs
    const logs = this.store.get('task_logs') || [];
    this.store.set('task_logs', logs.filter(l => l.task_id !== id));
    return { success: true };
  }

  addTaskLog(log) {
    const logs = this.store.get('task_logs') || [];
    logs.push({
      ...log,
      timestamp: new Date().toISOString()
    });
    // Keep only last 1000 logs to prevent bloat
    if (logs.length > 1000) logs.shift();
    this.store.set('task_logs', logs);
  }

  getTaskLogs(taskId) {
    const logs = this.store.get('task_logs') || [];
    return logs.filter(l => l.task_id === taskId).reverse(); // newest first
  }
}

module.exports = { Database };
