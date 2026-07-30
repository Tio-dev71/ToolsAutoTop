const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

class ProfileManager {
  constructor(db, profilesBasePath) {
    this.db = db;
    this.profilesBasePath = profilesBasePath;
  }

  list() {
    const profiles = this.db.getAllProfiles();
    return profiles.map(p => this._parseProfile(p));
  }

  get(id) {
    const profile = this.db.getProfile(id);
    return profile ? this._parseProfile(profile) : null;
  }

  create(data) {
    const id = uuidv4();
    const userDataDir = path.join(this.profilesBasePath, id);

    // Ensure profile directory exists
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    const profileData = {
      id,
      name: data.name || `Profile ${Date.now()}`,
      group_name: data.group_name || 'Default',
      proxy_id: data.proxy_id || null,
      fingerprint: data.fingerprint || {},
      notes: data.notes || '',
      extensions: data.extensions || [],
      fb_account: data.fb_account || null,
      user_data_dir: userDataDir,
      cookies_path: path.join(userDataDir, 'cookies'),
    };

    return this._parseProfile(this.db.createProfile(profileData));
  }

  update(id, data) {
    const updated = this.db.updateProfile(id, data);
    return updated ? this._parseProfile(updated) : null;
  }

  delete(id) {
    const profile = this.db.getProfile(id);
    if (profile && profile.user_data_dir) {
      // Remove profile data directory
      try {
        fs.rmSync(profile.user_data_dir, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to remove profile directory: ${err.message}`);
      }
    }
    return this.db.deleteProfile(id);
  }

  clone(id) {
    const original = this.get(id);
    if (!original) throw new Error('Profile not found');

    return this.create({
      name: `${original.name} (Copy)`,
      group_name: original.group_name,
      proxy_id: original.proxy_id,
      fingerprint: original.fingerprint,
      notes: original.notes,
      extensions: original.extensions,
    });
  }

  importProfiles(profiles) {
    const results = [];
    for (const p of profiles) {
      try {
        results.push(this.create(p));
      } catch (err) {
        results.push({ error: err.message, name: p.name });
      }
    }
    return results;
  }

  exportProfiles() {
    return this.list().map(p => ({
      name: p.name,
      group_name: p.group_name,
      fingerprint: p.fingerprint,
      notes: p.notes,
      extensions: p.extensions,
    }));
  }

  updateLastUsed(id) {
    this.db.updateProfile(id, { last_used: new Date().toISOString() });
  }

  updateStatus(id, status) {
    this.db.updateProfile(id, { status });
  }

  _parseProfile(row) {
    if (!row) return null;
    return {
      ...row,
      fingerprint: typeof row.fingerprint === 'string' ? JSON.parse(row.fingerprint || '{}') : (row.fingerprint || {}),
      extensions: typeof row.extensions === 'string' ? JSON.parse(row.extensions || '[]') : (row.extensions || []),
      fb_account: typeof row.fb_account === 'string' ? JSON.parse(row.fb_account || 'null') : (row.fb_account || null),
    };
  }
}

module.exports = { ProfileManager };
