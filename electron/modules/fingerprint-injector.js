class FingerprintInjector {
  /**
   * Inject fingerprint into Puppeteer Page using CDP and evaluateOnNewDocument
   */
  async inject(page, fingerprint) {
    const client = await page.createCDPSession();

    // 1. Override User-Agent & Client Hints
    await client.send('Network.setUserAgentOverride', {
      userAgent: fingerprint.userAgent,
      acceptLanguage: fingerprint.locale || 'en-US,en;q=0.9',
      platform: fingerprint.platform || 'Win32'
    });

    // 2. Emulate Timezone
    if (fingerprint.timezone) {
      await client.send('Emulation.setTimezoneOverride', {
        timezoneId: fingerprint.timezone
      });
    }

    // 3. Emulate Geolocation if needed (usually matches proxy)
    // if (fingerprint.geolocation) {
    //   await client.send('Emulation.setGeolocationOverride', fingerprint.geolocation);
    // }

    // 4. Inject JavaScript overrides (Navigator, WebGL, Canvas, etc.)
    await page.evaluateOnNewDocument((fp) => {
      // Overwrite navigator properties
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      if (fp.hardwareConcurrency) {
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => fp.hardwareConcurrency });
      }
      if (fp.deviceMemory) {
        Object.defineProperty(navigator, 'deviceMemory', { get: () => fp.deviceMemory });
      }
      if (fp.platform) {
        Object.defineProperty(navigator, 'platform', { get: () => fp.platform });
      }

      // Spoof WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL = 37445
        if (parameter === 37445 && fp.webgl && fp.webgl.vendor) {
          return fp.webgl.vendor;
        }
        // UNMASKED_RENDERER_WEBGL = 37446
        if (parameter === 37446 && fp.webgl && fp.webgl.renderer) {
          return fp.webgl.renderer;
        }
        return getParameter.apply(this, arguments);
      };

      // Add basic Canvas noise (simplified example)
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function() {
        const context = this.getContext('2d');
        if (context) {
          const shift = {
            r: Math.floor(Math.random() * 10) - 5,
            g: Math.floor(Math.random() * 10) - 5,
            b: Math.floor(Math.random() * 10) - 5
          };
          const width = this.width;
          const height = this.height;
          if (width && height) {
            const imageData = context.getImageData(0, 0, width, height);
            for (let i = 0; i < height; i++) {
              for (let j = 0; j < width; j++) {
                const n = (i * width + j) * 4;
                imageData.data[n] = imageData.data[n] + shift.r;
                imageData.data[n + 1] = imageData.data[n + 1] + shift.g;
                imageData.data[n + 2] = imageData.data[n + 2] + shift.b;
              }
            }
            context.putImageData(imageData, 0, 0);
          }
        }
        return originalToDataURL.apply(this, arguments);
      };

      // Block WebRTC Local IP leaks
      const originalRTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function(...args) {
        const pc = new originalRTCPeerConnection(...args);
        // Implement WebRTC leak protection here (advanced)
        return pc;
      };
      
    }, fingerprint);
  }
}

module.exports = { FingerprintInjector };
