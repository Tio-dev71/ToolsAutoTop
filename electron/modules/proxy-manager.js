const { v4: uuidv4 } = require('uuid');

class ProxyManager {
  constructor(db) {
    this.db = db;
  }

  list() {
    return this.db.getAllProxies();
  }

  get(id) {
    return this.db.getProxy(id);
  }

  add(data) {
    const id = uuidv4();
    return this.db.createProxy({ ...data, id });
  }

  /**
   * Import multiple proxies from text format (e.g. host:port:user:pass)
   */
  addBulk(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const results = { added: 0, failed: 0, errors: [] };

    for (const line of lines) {
      try {
        let protocol = 'http';
        let host, port, username, password;
        
        let cleaned = line;
        if (cleaned.includes('://')) {
          const parts = cleaned.split('://');
          protocol = parts[0];
          cleaned = parts[1];
        }

        const parts = cleaned.split(':');
        
        if (parts.length >= 2 && parts.length <= 4) {
          host = parts[0];
          port = parseInt(parts[1], 10);
          
          if (parts.length === 4) {
            username = parts[2];
            password = parts[3];
          } else if (parts.length === 3) {
             username = parts[2];
          }

          if (isNaN(port)) throw new Error('Invalid port');

          this.add({
            name: `${host}:${port}`,
            protocol,
            host,
            port,
            username: username || '',
            password: password || ''
          });
          results.added++;
        } else {
          throw new Error('Invalid format (expected host:port or host:port:user:pass)');
        }
      } catch (err) {
        results.failed++;
        results.errors.push(`${line} - ${err.message}`);
      }
    }
    return results;
  }

  update(id, data) {
    return this.db.updateProxy(id, data);
  }

  delete(id) {
    return this.db.deleteProxy(id);
  }

  /**
   * Test a proxy to see if it works and get its location
   * (Simplified mock implementation. In real world, use an HTTP client via the proxy)
   */
  async test(id) {
    const proxy = this.get(id);
    if (!proxy) throw new Error('Proxy not found');

    this.update(id, { status: 'testing' });

    try {
      // TODO: Implement actual proxy testing via HTTP client (like axios + https-proxy-agent)
      // For now, mock a successful test after 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updated = this.update(id, {
        status: 'working',
        latency: Math.floor(Math.random() * 200) + 50, // mock latency
        country: proxy.country || 'US', // mock country
        last_tested: new Date().toISOString()
      });
      return { success: true, proxy: updated };
    } catch (err) {
      const updated = this.update(id, {
        status: 'failed',
        last_tested: new Date().toISOString()
      });
      return { success: false, error: err.message, proxy: updated };
    }
  }

  async testAll() {
    const proxies = this.list();
    const results = [];
    // Process in batches or all at once (for mock, all at once is fine)
    for (const p of proxies) {
      results.push(await this.test(p.id));
    }
    return results;
  }
}

module.exports = { ProxyManager };
