const puppeteer = require('puppeteer-core');
const { BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');
const { FacebookAutomator } = require('./facebook-automator');

class BrowserManager {
  constructor(profileManager, proxyManager, fingerprintEngine, extensionManager, profilesBasePath) {
    this.profileManager = profileManager;
    this.proxyManager = proxyManager;
    this.fingerprintEngine = fingerprintEngine;
    this.extensionManager = extensionManager;
    this.profilesBasePath = profilesBasePath;

    // Map of profileId → { browser, page, status, pid }
    this.instances = new Map();
    this.windowIndex = 0;
  }

  /**
   * Find Chromium/Chrome executable on the system
   */
  _findChromiumPath() {
    const platform = os.platform();
    const possiblePaths = [];

    if (platform === 'darwin') {
      possiblePaths.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      );
    } else if (platform === 'win32') {
      const programFiles = process.env['PROGRAMFILES'] || 'C:\\Program Files';
      const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
      const localAppData = process.env['LOCALAPPDATA'] || '';
      possiblePaths.push(
        path.join(programFiles, 'Google/Chrome/Application/chrome.exe'),
        path.join(programFilesX86, 'Google/Chrome/Application/chrome.exe'),
        path.join(localAppData, 'Google/Chrome/Application/chrome.exe'),
        path.join(programFiles, 'Chromium/Application/chrome.exe'),
      );
    } else {
      possiblePaths.push(
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
      );
    }

    const fs = require('fs');
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Launch a Chromium instance for a profile
   */
  async launch(profileId) {
    if (this.instances.has(profileId)) {
      const instance = this.instances.get(profileId);
      if (instance.status === 'running') {
        throw new Error('Browser already running for this profile');
      }
      if (instance.status === 'launching') {
        throw new Error('Browser is currently launching. Please wait.');
      }
    }

    const profile = this.profileManager.get(profileId);
    if (!profile) throw new Error('Profile not found');

    // Update status
    this.profileManager.updateStatus(profileId, 'launching');
    this.instances.set(profileId, { browser: null, page: null, status: 'launching', pid: null });

    try {
      const chromiumPath = this._findChromiumPath();
      if (!chromiumPath) throw new Error('Chromium not found. Please set the path in Settings.');

      // Build launch arguments
      const args = this._buildLaunchArgs(profile);

      const browser = await puppeteer.launch({
        executablePath: chromiumPath,
        headless: false,
        userDataDir: profile.user_data_dir,
        args,
        defaultViewport: null,
        ignoreDefaultArgs: [
          '--enable-automation',
          '--enable-blink-features=IdleDetection',
        ],
      });

      const pages = await browser.pages();
      const page = pages[0] || await browser.newPage();

      // Inject fingerprint
      if (profile.fingerprint && Object.keys(profile.fingerprint).length > 0) {
        await this.fingerprintEngine.inject(page, profile.fingerprint);
      }

      // Get browser PID
      const proc = browser.process();
      const pid = proc ? proc.pid : null;

      this.instances.set(profileId, {
        browser,
        page,
        status: 'running',
        pid,
        launchedAt: Date.now(),
      });

      this.profileManager.updateStatus(profileId, 'running');
      this.profileManager.updateLastUsed(profileId);

      // Handle browser disconnect
      browser.on('disconnected', () => {
        this.instances.delete(profileId);
        this.profileManager.updateStatus(profileId, 'ready');
      });

      // Auto-Login Facebook if credentials exist
      if (profile.fb_account && profile.fb_account.uid) {
        // Run async so it doesn't block launch returning
        FacebookAutomator.login(page, profile.fb_account).then(res => {
          console.log(`[BrowserManager] Auto-login result for ${profileId}:`, res);
        }).catch(err => {
          console.error(`[BrowserManager] Auto-login failed for ${profileId}:`, err);
        });
      } else {
        // Navigate to Facebook as default
        page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      }

      return { success: true, pid };
    } catch (err) {
      this.instances.delete(profileId);
      this.profileManager.updateStatus(profileId, 'error');
      throw err;
    }
  }

  /**
   * Build Chrome launch arguments based on profile config
   */
  _buildLaunchArgs(profile) {
    const args = [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process,PasswordManager,CredentialManagementAPI',
      '--password-store=basic',
      '--flag-switches-begin',
      '--flag-switches-end',
    ];

    // Proxy
    if (profile.proxy_id && profile.proxy_host) {
      const protocol = profile.proxy_protocol || 'http';
      args.push(`--proxy-server=${protocol}://${profile.proxy_host}:${profile.proxy_port}`);
    }

    // Window size and position for tiling
    const fp = profile.fingerprint || {};
    const width = fp.screen?.width || 360;
    const height = fp.screen?.height || 640;
    args.push(`--window-size=${width},${height}`);

    const screenWidth = 1920; 
    const screenHeight = 1080;
    
    const maxCols = Math.max(1, Math.floor(screenWidth / width));
    const maxRows = Math.max(1, Math.floor(screenHeight / height));
    
    const col = this.windowIndex % maxCols;
    const row = Math.floor(this.windowIndex / maxCols) % maxRows;
    
    const x = col * width;
    const y = row * height;
    
    args.push(`--window-position=${x},${y}`);
    this.windowIndex++;

    // Extensions
    const extensions = this._getExtensionPaths(profile);
    if (extensions.length > 0) {
      const paths = extensions.join(',');
      args.push(`--load-extension=${paths}`);
    }

    // Timezone (via TZ env is handled separately, but Chrome flag helps)
    if (fp.timezone) {
      // Timezone is injected via CDP, not launch arg
    }

    // Language
    if (fp.locale) {
      args.push(`--lang=${fp.locale}`);
    }

    return args;
  }

  _getExtensionPaths(profile) {
    const paths = [];
    const allExtensions = this.extensionManager.list();
    const profileExtIds = profile.extensions || [];

    for (const ext of allExtensions) {
      if (ext.enabled && (profileExtIds.length === 0 || profileExtIds.includes(ext.id))) {
        paths.push(ext.path);
      }
    }
    return paths;
  }

  /**
   * Close a specific browser instance
   */
  async close(profileId) {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    try {
      if (instance.browser) {
        await instance.browser.close();
      }
    } catch (err) {
      // Force kill if graceful close fails
      if (instance.pid) {
        try { process.kill(instance.pid, 'SIGKILL'); } catch (_) {}
      }
    }

    this.instances.delete(profileId);
    this.profileManager.updateStatus(profileId, 'ready');
  }

  /**
   * Close all browser instances
   */
  async closeAll() {
    const promises = [];
    for (const [profileId] of this.instances) {
      promises.push(this.close(profileId));
    }
    await Promise.allSettled(promises);
    this.windowIndex = 0;
  }

  /**
   * Get status of a specific browser
   */
  getStatus(profileId) {
    const instance = this.instances.get(profileId);
    if (!instance) return { status: 'stopped' };
    return {
      status: instance.status,
      pid: instance.pid,
      launchedAt: instance.launchedAt,
      uptime: instance.launchedAt ? Date.now() - instance.launchedAt : 0,
    };
  }

  /**
   * Get all browser statuses
   */
  getAllStatus() {
    const result = {};
    for (const [profileId, instance] of this.instances) {
      result[profileId] = {
        status: instance.status,
        pid: instance.pid,
        launchedAt: instance.launchedAt,
      };
    }
    return result;
  }

  /**
   * Get the running page for a profile (used by automation & screenshot)
   */
  getPage(profileId) {
    const instance = this.instances.get(profileId);
    return instance?.page || null;
  }

  /**
   * Get running browser instance
   */
  getBrowser(profileId) {
    const instance = this.instances.get(profileId);
    return instance?.browser || null;
  }

  /**
   * Open browser in a separate fullscreen window
   */
  async openFullscreen(profileId) {
    const instance = this.instances.get(profileId);
    if (!instance || !instance.browser) throw new Error('Browser not running');

    // Focus the browser window — since puppeteer launched it headful,
    // the window already exists on screen. We bring it to front.
    const pages = await instance.browser.pages();
    if (pages.length > 0) {
      await pages[0].bringToFront();
    }
  }

  /**
   * Open DevTools for debugging
   */
  async openDevTools(profileId) {
    const instance = this.instances.get(profileId);
    if (!instance || !instance.page) throw new Error('Browser not running');
    
    const client = await instance.page.createCDPSession();
    await client.send('Page.inspect');
  }

  /**
   * Get count of running browsers
   */
  getRunningCount() {
    let count = 0;
    for (const [, instance] of this.instances) {
      if (instance.status === 'running') count++;
    }
    return count;
  }

  /**
   * Get resource usage stats
   */
  getResourceStats() {
    const running = this.getRunningCount();
    const memUsage = process.memoryUsage();
    
    return {
      runningBrowsers: running,
      totalProfiles: this.profileManager.list().length,
      memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      totalMemoryMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
    };
  }
}

module.exports = { BrowserManager };
