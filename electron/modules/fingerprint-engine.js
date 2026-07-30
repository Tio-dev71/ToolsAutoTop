const fs = require('fs');
const path = require('path');
const { FingerprintInjector } = require('./fingerprint-injector');

class FingerprintEngine {
  constructor() {
    this.profilesPath = path.join(__dirname, '..', 'data', 'device-profiles.json');
    this.deviceProfiles = this._loadDeviceProfiles();
    this.injector = new FingerprintInjector();
  }

  _loadDeviceProfiles() {
    try {
      if (fs.existsSync(this.profilesPath)) {
        return JSON.parse(fs.readFileSync(this.profilesPath, 'utf8'));
      }
    } catch (err) {
      console.error('Failed to load device profiles:', err);
    }
    // Return empty array if no profiles exist yet
    return [];
  }

  getDeviceProfiles() {
    return this.deviceProfiles;
  }

  /**
   * Generate a coherent fingerprint based on options
   */
  generate(options = {}) {
    const os = options.os || 'Windows 10'; // Default OS
    const browser = options.browser || 'Chrome'; // Default browser

    // Filter matching base profiles
    const matchingProfiles = this.deviceProfiles.filter(
      p => p.os.includes(os) && p.browser.includes(browser)
    );

    // Pick a random base profile or use a default fallback
    let baseProfile = matchingProfiles.length > 0
      ? matchingProfiles[Math.floor(Math.random() * matchingProfiles.length)]
      : this._generateFallbackProfile(os, browser);

    // Apply custom overrides
    const fingerprint = {
      ...baseProfile,
      screen: options.screen || baseProfile.screen,
      timezone: options.timezone || baseProfile.timezone,
      locale: options.locale || baseProfile.locale,
      userAgent: options.userAgent || baseProfile.userAgent,
      webgl: {
        vendor: options.webglVendor || baseProfile.webgl.vendor,
        renderer: options.webglRenderer || baseProfile.webgl.renderer,
      }
    };

    return fingerprint;
  }

  _generateFallbackProfile(os, browser) {
    // Fallback logic if data file is missing or no match
    const isMac = os.includes('macOS');
    return {
      os: os,
      browser: browser,
      userAgent: isMac 
        ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      screen: { width: 1920, height: 1080, colorDepth: 24, devicePixelRatio: 1 },
      timezone: 'UTC',
      locale: 'en-US',
      webgl: {
        vendor: isMac ? 'Apple' : 'Google Inc. (NVIDIA)',
        renderer: isMac ? 'Apple M1' : 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      },
      hardwareConcurrency: 8,
      deviceMemory: 8,
      platform: isMac ? 'MacIntel' : 'Win32'
    };
  }

  /**
   * Inject fingerprint into Puppeteer Page
   */
  async inject(page, fingerprint) {
    if (!fingerprint || Object.keys(fingerprint).length === 0) return;
    await this.injector.inject(page, fingerprint);
  }
}

module.exports = { FingerprintEngine };
