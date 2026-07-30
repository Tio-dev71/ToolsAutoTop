class ScreenshotService {
  constructor(browserManager) {
    this.browserManager = browserManager;
  }

  async captureAll() {
    const thumbnails = {};
    for (const [profileId, instance] of this.browserManager.instances) {
      if (instance.status === 'running' && instance.page && !instance.page.isClosed()) {
        try {
          // Fast, low quality JPEG screenshot for thumbnail grid
          const buffer = await instance.page.screenshot({ 
            type: 'jpeg', 
            quality: 30,
            encoding: 'base64' 
          });
          thumbnails[profileId] = `data:image/jpeg;base64,${buffer}`;
        } catch (e) {
          // Ignore errors like "Target closed"
          thumbnails[profileId] = null;
        }
      }
    }
    return thumbnails;
  }
}

module.exports = { ScreenshotService };
