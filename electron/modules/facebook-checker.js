const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

class FacebookChecker {
  /**
   * Check if a Facebook UID is live by querying the Graph API for its avatar
   */
  static async checkLive(uid, proxyData = null) {
    if (!uid) return { live: false, status: 'No UID' };

    let config = {
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 10000
    };

    if (proxyData && proxyData.host && proxyData.port) {
      const auth = proxyData.username ? `${proxyData.username}:${proxyData.password}@` : '';
      const proxyUrl = `${proxyData.protocol || 'http'}://${auth}${proxyData.host}:${proxyData.port}`;
      config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }

    try {
      const res = await axios.get(`https://graph.facebook.com/${uid}/picture?type=normal`, config);
      
      if (res.status === 302) {
        const location = res.headers.location || '';
        if (location.includes('rsrc.php')) {
          return { live: false, status: 'Die (Disabled)' };
        }
        return { live: true, status: 'Live' };
      } else if (res.status === 400 || res.status === 404) {
        return { live: false, status: 'Die (Not Found)' };
      } else {
        return { live: null, status: `Unknown (${res.status})` };
      }
    } catch (err) {
      return { live: null, status: 'Error (Timeout)' };
    }
  }
}

module.exports = { FacebookChecker };
