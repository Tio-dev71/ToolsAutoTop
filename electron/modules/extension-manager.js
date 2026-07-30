const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

class ExtensionManager {
  constructor(db, extensionsBasePath) {
    this.db = db;
    this.extensionsBasePath = extensionsBasePath;
  }

  list() {
    return this.db.getAllExtensions();
  }

  add(extPath) {
    if (!fs.existsSync(extPath)) {
      throw new Error('Extension path does not exist');
    }

    let manifest = null;
    const manifestPath = path.join(extPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (e) {
        console.warn('Failed to parse manifest.json', e);
      }
    }

    const id = uuidv4();
    
    return this.db.createExtension({
      id,
      name: manifest?.name || path.basename(extPath),
      version: manifest?.version || '1.0',
      description: manifest?.description || '',
      path: extPath,
      enabled: true
    });
  }

  remove(id) {
    return this.db.deleteExtension(id);
  }
}

module.exports = { ExtensionManager };
