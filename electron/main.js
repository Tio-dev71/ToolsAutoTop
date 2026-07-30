const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc-handlers');
const { Database } = require('./modules/database');
const { ProfileManager } = require('./modules/profile-manager');
const { BrowserManager } = require('./modules/browser-manager');
const { ProxyManager } = require('./modules/proxy-manager');
const { FingerprintEngine } = require('./modules/fingerprint-engine');
const { ExtensionManager } = require('./modules/extension-manager');
const { ScreenshotService } = require('./modules/screenshot-service');
const { AutomationEngine } = require('./modules/automation-engine');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let tray = null;

// App data paths
const APP_DATA_PATH = path.join(app.getPath('userData'), 'mkt-browser');
const PROFILES_PATH = path.join(APP_DATA_PATH, 'profiles');
const EXTENSIONS_PATH = path.join(APP_DATA_PATH, 'extensions');
const DB_PATH = path.join(APP_DATA_PATH, 'mkt-browser.db');

// Initialize core modules
const db = new Database(DB_PATH);
const profileManager = new ProfileManager(db, PROFILES_PATH);
const proxyManager = new ProxyManager(db);
const fingerprintEngine = new FingerprintEngine();
const extensionManager = new ExtensionManager(db, EXTENSIONS_PATH);
const browserManager = new BrowserManager(profileManager, proxyManager, fingerprintEngine, extensionManager, PROFILES_PATH);
const screenshotService = new ScreenshotService(browserManager);
const automationEngine = new AutomationEngine(browserManager, db);

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'TOPMANAGER',
    backgroundColor: '#0a0e1a',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (e) => {
    const runningCount = browserManager.getRunningCount();
    if (runningCount > 0) {
      e.preventDefault();
      mainWindow.webContents.send('app:confirm-close', { runningCount });
    }
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show TOPMANAGER', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Close All Browsers', click: () => browserManager.closeAll() },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      browserManager.closeAll();
      app.quit();
    }},
  ]);
  tray.setToolTip('TOPMANAGER');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  // Ensure data directories exist
  const fs = require('fs');
  [APP_DATA_PATH, PROFILES_PATH, EXTENSIONS_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Initialize database
  db.initialize();

  // Register IPC handlers
  registerIpcHandlers(ipcMain, {
    browserManager,
    profileManager,
    proxyManager,
    fingerprintEngine,
    extensionManager,
    screenshotService,
    automationEngine,
    db,
  });

  createMainWindow();
  // createTray(); // Uncomment when app icon is ready

  // Screenshot polling — sends thumbnails to renderer every 4 seconds
  setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const thumbnails = await screenshotService.captureAll();
    mainWindow.webContents.send('browser:thumbnails', thumbnails);
  }, 4000);

  // Send resource stats every 5 seconds
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const stats = browserManager.getResourceStats();
    mainWindow.webContents.send('app:stats', stats);
  }, 5000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    browserManager.closeAll();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  browserManager.closeAll();
});
