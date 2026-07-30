const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Browser Management ────────────────────────────────
  browser: {
    launch: (profileId) => ipcRenderer.invoke('browser:launch', profileId),
    close: (profileId) => ipcRenderer.invoke('browser:close', profileId),
    closeAll: () => ipcRenderer.invoke('browser:close-all'),
    getStatus: (profileId) => ipcRenderer.invoke('browser:status', profileId),
    getAllStatus: () => ipcRenderer.invoke('browser:status-all'),
    openFullscreen: (profileId) => ipcRenderer.invoke('browser:open-fullscreen', profileId),
    openDevTools: (profileId) => ipcRenderer.invoke('browser:open-devtools', profileId),
    onThumbnails: (callback) => {
      const sub = (_event, data) => callback(data);
      ipcRenderer.on('browser:thumbnails', sub);
      return () => ipcRenderer.removeListener('browser:thumbnails', sub);
    },
  },

  // ─── Profile Management ────────────────────────────────
  profile: {
    list: () => ipcRenderer.invoke('profile:list'),
    get: (id) => ipcRenderer.invoke('profile:get', id),
    create: (data) => ipcRenderer.invoke('profile:create', data),
    update: (id, data) => ipcRenderer.invoke('profile:update', id, data),
    delete: (id) => ipcRenderer.invoke('profile:delete', id),
    clone: (id) => ipcRenderer.invoke('profile:clone', id),
    import: (data) => ipcRenderer.invoke('profile:import', data),
    export: () => ipcRenderer.invoke('profile:export'),
    checkLive: (id) => ipcRenderer.invoke('profile:checkLive', id),
    checkLiveAll: () => ipcRenderer.invoke('profile:checkLiveAll'),
  },

  // ─── Proxy Management ──────────────────────────────────
  proxy: {
    list: () => ipcRenderer.invoke('proxy:list'),
    add: (data) => ipcRenderer.invoke('proxy:add', data),
    addBulk: (text) => ipcRenderer.invoke('proxy:add-bulk', text),
    update: (id, data) => ipcRenderer.invoke('proxy:update', id, data),
    delete: (id) => ipcRenderer.invoke('proxy:delete', id),
    test: (id) => ipcRenderer.invoke('proxy:test', id),
    testAll: () => ipcRenderer.invoke('proxy:test-all'),
  },

  // ─── Fingerprint ───────────────────────────────────────
  fingerprint: {
    generate: (options) => ipcRenderer.invoke('fingerprint:generate', options),
    getProfiles: () => ipcRenderer.invoke('fingerprint:get-profiles'),
  },

  // ─── Extensions ────────────────────────────────────────
  extension: {
    list: () => ipcRenderer.invoke('extension:list'),
    add: (extPath) => ipcRenderer.invoke('extension:add', extPath),
    remove: (id) => ipcRenderer.invoke('extension:remove', id),
    selectFolder: () => ipcRenderer.invoke('extension:select-folder'),
  },

  // ─── Automation Tasks ──────────────────────────────────
  task: {
    list: () => ipcRenderer.invoke('task:list'),
    create: (data) => ipcRenderer.invoke('task:create', data),
    start: (id) => ipcRenderer.invoke('task:start', id),
    stop: (id) => ipcRenderer.invoke('task:stop', id),
    delete: (id) => ipcRenderer.invoke('task:delete', id),
    getLogs: (taskId) => ipcRenderer.invoke('task:get-logs', taskId),
  },

  // ─── App ───────────────────────────────────────────────
  app: {
    getStats: () => ipcRenderer.invoke('app:get-stats'),
    getSettings: () => ipcRenderer.invoke('app:get-settings'),
    updateSettings: (data) => ipcRenderer.invoke('app:update-settings', data),
    selectChromiumPath: () => ipcRenderer.invoke('app:select-chromium'),
    onStats: (callback) => {
      const sub = (_event, data) => callback(data);
      ipcRenderer.on('app:stats', sub);
      return () => ipcRenderer.removeListener('app:stats', sub);
    },
    onConfirmClose: (callback) => {
      const sub = (_event, data) => callback(data);
      ipcRenderer.on('app:confirm-close', sub);
      return () => ipcRenderer.removeListener('app:confirm-close', sub);
    },
    forceQuit: () => ipcRenderer.invoke('app:force-quit'),
  },
});
