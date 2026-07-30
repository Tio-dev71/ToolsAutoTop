const { dialog, app } = require('electron');

/**
 * Register all IPC handlers for main ↔ renderer communication
 */
function registerIpcHandlers(ipcMain, modules) {
  const {
    browserManager,
    profileManager,
    proxyManager,
    fingerprintEngine,
    extensionManager,
    screenshotService,
    automationEngine,
    db,
  } = modules;

  // ═══════════════════════════════════════════════════════
  //  BROWSER
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('browser:launch', async (_event, profileId) => {
    try {
      await browserManager.launch(profileId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('browser:close', async (_event, profileId) => {
    try {
      await browserManager.close(profileId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('browser:close-all', async () => {
    try {
      await browserManager.closeAll();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('browser:status', (_event, profileId) => {
    return browserManager.getStatus(profileId);
  });

  ipcMain.handle('browser:status-all', () => {
    return browserManager.getAllStatus();
  });

  ipcMain.handle('browser:open-fullscreen', async (_event, profileId) => {
    try {
      await browserManager.openFullscreen(profileId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('browser:open-devtools', async (_event, profileId) => {
    try {
      await browserManager.openDevTools(profileId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ═══════════════════════════════════════════════════════
  //  PROFILES
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('profile:list', () => {
    return profileManager.list();
  });

  ipcMain.handle('profile:get', (_event, id) => {
    return profileManager.get(id);
  });

  ipcMain.handle('profile:create', (_event, data) => {
    return profileManager.create(data);
  });

  ipcMain.handle('profile:update', (_event, id, data) => {
    return profileManager.update(id, data);
  });

  ipcMain.handle('profile:delete', async (_event, id) => {
    // Close browser if running
    try { await browserManager.close(id); } catch (_) {}
    return profileManager.delete(id);
  });

  ipcMain.handle('profile:clone', (_event, id) => {
    return profileManager.clone(id);
  });

  ipcMain.handle('profile:import', (_event, data) => {
    return profileManager.importProfiles(data);
  });

  ipcMain.handle('profile:export', () => {
    return profileManager.exportProfiles();
  });

  ipcMain.handle('profile:checkLive', async (_event, id) => {
    const profile = profileManager.get(id);
    if (!profile || !profile.fb_account || !profile.fb_account.uid) {
      return { success: false, error: 'No UID found for profile' };
    }
    const proxy = profile.proxy_id ? proxyManager.get(profile.proxy_id) : null;
    const { FacebookChecker } = require('./modules/facebook-checker');
    const result = await FacebookChecker.checkLive(profile.fb_account.uid, proxy);
    
    // Update profile fb_status
    if (result.status) {
      profileManager.update(id, { fb_status: result.status });
    }
    
    return { success: true, ...result };
  });

  ipcMain.handle('profile:checkLiveAll', async () => {
    const profiles = profileManager.list();
    const results = [];
    const { FacebookChecker } = require('./modules/facebook-checker');

    for (const profile of profiles) {
      if (profile.fb_account && profile.fb_account.uid) {
        const proxy = profile.proxy_id ? proxyManager.get(profile.proxy_id) : null;
        const result = await FacebookChecker.checkLive(profile.fb_account.uid, proxy);
        if (result.status) {
          profileManager.update(profile.id, { fb_status: result.status });
        }
        results.push({ id: profile.id, ...result });
      }
    }
    return { success: true, results };
  });

  // ═══════════════════════════════════════════════════════
  //  PROXIES
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('proxy:list', () => {
    return proxyManager.list();
  });

  ipcMain.handle('proxy:add', (_event, data) => {
    return proxyManager.add(data);
  });

  ipcMain.handle('proxy:add-bulk', (_event, text) => {
    return proxyManager.addBulk(text);
  });

  ipcMain.handle('proxy:update', (_event, id, data) => {
    return proxyManager.update(id, data);
  });

  ipcMain.handle('proxy:delete', (_event, id) => {
    return proxyManager.delete(id);
  });

  ipcMain.handle('proxy:test', async (_event, id) => {
    return await proxyManager.test(id);
  });

  ipcMain.handle('proxy:test-all', async () => {
    return await proxyManager.testAll();
  });

  // ═══════════════════════════════════════════════════════
  //  FINGERPRINT
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('fingerprint:generate', (_event, options) => {
    return fingerprintEngine.generate(options);
  });

  ipcMain.handle('fingerprint:get-profiles', () => {
    return fingerprintEngine.getDeviceProfiles();
  });

  // ═══════════════════════════════════════════════════════
  //  EXTENSIONS
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('extension:list', () => {
    return extensionManager.list();
  });

  ipcMain.handle('extension:add', (_event, extPath) => {
    return extensionManager.add(extPath);
  });

  ipcMain.handle('extension:remove', (_event, id) => {
    return extensionManager.remove(id);
  });

  ipcMain.handle('extension:select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Extension Folder',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return extensionManager.add(result.filePaths[0]);
  });

  // ═══════════════════════════════════════════════════════
  //  AUTOMATION
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('task:list', () => {
    return automationEngine.listTasks();
  });

  ipcMain.handle('task:create', (_event, data) => {
    return automationEngine.createTask(data);
  });

  ipcMain.handle('task:start', async (_event, id) => {
    return await automationEngine.startTask(id);
  });

  ipcMain.handle('task:stop', (_event, id) => {
    return automationEngine.stopTask(id);
  });

  ipcMain.handle('task:delete', (_event, id) => {
    return automationEngine.deleteTask(id);
  });

  ipcMain.handle('task:get-logs', (_event, taskId) => {
    return automationEngine.getTaskLogs(taskId);
  });

  // ═══════════════════════════════════════════════════════
  //  APP / SETTINGS
  // ═══════════════════════════════════════════════════════
  ipcMain.handle('app:get-stats', () => {
    return browserManager.getResourceStats();
  });

  ipcMain.handle('app:get-settings', () => {
    return db.getSettings();
  });

  ipcMain.handle('app:update-settings', (_event, data) => {
    return db.updateSettings(data);
  });

  ipcMain.handle('app:select-chromium', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Select Chromium Executable',
      filters: [
        { name: 'Executable', extensions: ['app', 'exe', ''] }
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('app:force-quit', () => {
    browserManager.closeAll();
    app.exit(0);
  });
}

module.exports = { registerIpcHandlers };
