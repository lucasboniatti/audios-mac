const DEFAULT_WS_PORT = 3001;
const LOGIN_PATH = '/login.html';
const CLOUD_MODE = 'cloud';
const LOCAL_MODE = 'local';
const MODE_KEY = 'auth_mode';
const SUPABASE_MODULE_PATH = '/node_modules/@supabase/supabase-js/dist/module/index.mjs';

// --- Retry with Exponential Backoff ---
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

async function retryWithBackoff(fn, options = {}) {
  const { maxRetries = DEFAULT_MAX_RETRIES, baseDelayMs = DEFAULT_BASE_DELAY_MS, onRetry } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (isLastAttempt) {
        throw err;
      }

      // Don't retry on auth errors (401, 403)
      if (err.status === 401 || err.status === 403) {
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);

      if (onRetry) {
        onRetry(attempt + 1, delay, err);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

const AuthAPI = {
  runtimeConfig: null,
  supabaseModulePromise: null,

  getToken() {
    return localStorage.getItem('auth_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },

  getUsername() {
    return localStorage.getItem('auth_username') || 'Usuário';
  },

  setUsername(username) {
    if (username) {
      localStorage.setItem('auth_username', username);
    } else {
      localStorage.removeItem('auth_username');
    }
  },

  setMode(mode) {
    if (mode) {
      localStorage.setItem(MODE_KEY, mode);
    } else {
      localStorage.removeItem(MODE_KEY);
    }
  },

  getMode() {
    return localStorage.getItem(MODE_KEY);
  },

  setSession(token, username, mode = LOCAL_MODE) {
    this.setToken(token);
    this.setUsername(username);
    this.setMode(mode);
  },

  clearSession() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    localStorage.removeItem(MODE_KEY);
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  isCloudMode() {
    return this.getMode() === CLOUD_MODE;
  },

  async loadSupabaseModule() {
    if (!this.supabaseModulePromise) {
      this.supabaseModulePromise = import(SUPABASE_MODULE_PATH);
    }
    return this.supabaseModulePromise;
  },

  async ensureCloudConfig() {
    const config = await this.getRuntimeConfig();
    if (!config?.cloudAuth?.enabled) {
      throw new Error('Cloud auth não está habilitado');
    }
    return config.cloudAuth;
  },

  async getSupabaseClient(token) {
    const cloudConfig = await this.ensureCloudConfig();
    const module = await this.loadSupabaseModule();
    const clientOptions = token
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      : undefined;

    return module.createClient(cloudConfig.supabaseUrl, cloudConfig.supabaseAnonKey, clientOptions);
  },

  async getRuntimeConfig(forceRefresh = false) {
    if (!forceRefresh && this.runtimeConfig) {
      return this.runtimeConfig;
    }

    const res = await fetch('/api/runtime-config');
    if (!res.ok) {
      throw new Error('Unable to load runtime config');
    }

    this.runtimeConfig = await res.json();
    return this.runtimeConfig;
  },

  async isCloudEnabled() {
    const config = await this.getRuntimeConfig();
    return !!config.cloudAuth?.enabled;
  },

  async login(password) {
    try {
      this.clearSession();
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        let errorMessage = 'Senha incorreta';
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch (_) {}
        throw new Error(errorMessage);
      }

      const { token, username } = await res.json();
      this.setSession(token, username, LOCAL_MODE);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async cloudLogin(email, password) {
    try {
      this.clearSession();
      const client = await this.getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const token = data.session?.access_token;
      if (!token) {
        return { success: false, error: 'Token de acesso ausente' };
      }

      const username = data.user?.email || email;
      this.setSession(token, username, CLOUD_MODE);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Erro ao entrar no modo cloud' };
    }
  },

  async cloudSignup({ email, password, name }) {
    const client = await this.getSupabaseClient();
    const signupOptions = name ? { data: { full_name: name } } : undefined;

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: signupOptions,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  async logout() {
    const token = this.getToken();
    try {
      if (token) {
        await fetch('/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (_) {
    } finally {
      this.clearSession();
    }
  },

  async verifyToken() {
    const token = this.getToken();
    if (!token) {
      this.clearSession();
      return false;
    }

    try {
      const res = await fetch('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        this.clearSession();
        return false;
      }

      const { valid, username } = await res.json();
      if (valid) {
        if (username) {
          this.setUsername(username);
        }
        return true;
      }

      this.clearSession();
      return false;
    } catch (_) {
      this.clearSession();
      return false;
    }
  },

  async requireAuth() {
    const valid = await this.verifyToken();
    if (!valid) {
      this.redirectToLogin();
      return null;
    }

    return {
      token: this.getToken(),
      username: this.getUsername(),
    };
  },

  async getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const rawHost = window.location.hostname || 'localhost';
    const host = rawHost.includes(':') ? `[${rawHost}]` : rawHost;
    const token = this.getToken();

    const buildUrl = (port) => {
      const url = new URL(`${protocol}//${host}:${port}`);
      if (token) {
        url.searchParams.set('token', token);
      }
      return url.toString();
    };

    try {
      const config = await this.getRuntimeConfig();
      const port = config.wsPort || DEFAULT_WS_PORT;
      return buildUrl(port);
    } catch (_) {
      return buildUrl(DEFAULT_WS_PORT);
    }
  },

  getDownloadFilename(response, fallbackFilename) {
    const disposition = response.headers.get('Content-Disposition') || '';
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match) {
      return decodeURIComponent(utf8Match[1]);
    }

    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    if (filenameMatch) {
      return filenameMatch[1];
    }

    return fallbackFilename;
  },

  async downloadFile(url, fallbackFilename) {
    const res = await this.fetchAPI(url);
    if (!res.ok) {
      throw new Error('Download failed');
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const filename = this.getDownloadFilename(res, fallbackFilename);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return { filename };
  },

  async parseJSONResponse(response, fallbackError = 'Request failed') {
    let payload = null;

    try {
      payload = await response.json();
    } catch (_) {}

    if (!response.ok) {
      throw new Error(payload?.error || fallbackError);
    }

    return payload;
  },

  async fetchJSON(url, options = {}, fallbackError) {
    const response = await this.fetchAPI(url, options);
    return this.parseJSONResponse(response, fallbackError);
  },

  async getFavorites() {
    const data = await this.fetchJSON('/api/favorites', {}, 'Unable to load favorites');
    return data.favorites || [];
  },

  async addFavorite(id) {
    return this.fetchJSON(`/api/favorites/${id}`, { method: 'POST' }, 'Unable to add favorite');
  },

  async removeFavorite(id) {
    return this.fetchJSON(`/api/favorites/${id}`, { method: 'DELETE' }, 'Unable to remove favorite');
  },

  async getTags() {
    const data = await this.fetchJSON('/api/tags', {}, 'Unable to load tags');
    return data.tags || [];
  },

  async createTag(payload) {
    return this.fetchJSON('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 'Unable to create tag');
  },

  async getTranscriptionTags(id) {
    const data = await this.fetchJSON(`/api/transcriptions/${id}/tags`, {}, 'Unable to load transcription tags');
    return data.tags || [];
  },

  async addTagToTranscription(id, tagId) {
    return this.fetchJSON(`/api/transcriptions/${id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId }),
    }, 'Unable to attach tag');
  },

  async removeTagFromTranscription(id, tagId) {
    return this.fetchJSON(`/api/transcriptions/${id}/tags/${tagId}`, {
      method: 'DELETE',
    }, 'Unable to remove tag');
  },

  async getPreferences() {
    return this.fetchJSON('/api/preferences', {}, 'Unable to load preferences');
  },

  async updatePreferences(payload) {
    return this.fetchJSON('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 'Unable to update preferences');
  },

  async fetchAPI(url, options = {}) {
    const token = this.getToken();
    if (!token) {
      this.redirectToLogin();
      throw new Error('Not authenticated');
    }

    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      this.clearSession();
      this.redirectToLogin();
      throw new Error('Token expired');
    }

    return res;
  },

  // --- Cloud Sync Methods ---

  async getCloudTranscriptions(options = {}) {
    const { start, end, limit, offset } = options;
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);

    const url = `/api/cloud/transcriptions?${params.toString()}`;
    const res = await this.fetchAPI(url);
    return this.parseJSONResponse(res, 'Unable to load cloud transcriptions');
  },

  async getCloudStats() {
    const res = await this.fetchAPI('/api/cloud/stats');
    return this.parseJSONResponse(res, 'Unable to load cloud stats');
  },

  async getCloudTags() {
    const res = await this.fetchAPI('/api/cloud/tags');
    return this.parseJSONResponse(res, 'Unable to load cloud tags');
  },

  async createCloudTag(payload) {
    const res = await this.fetchAPI('/api/cloud/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return this.parseJSONResponse(res, 'Unable to create cloud tag');
  },

  async deleteCloudTag(id) {
    const res = await this.fetchAPI(`/api/cloud/tags/${id}`, { method: 'DELETE' });
    return this.parseJSONResponse(res, 'Unable to delete cloud tag');
  },

  async updateCloudTranscription(id, payload) {
    const res = await this.fetchAPI(`/api/cloud/transcriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return this.parseJSONResponse(res, 'Unable to update cloud transcription');
  },

  async getSyncStatus() {
    const res = await this.fetchAPI('/api/sync/status');
    return this.parseJSONResponse(res, 'Unable to get sync status');
  },

  async pushToCloud(transcriptions) {
    return retryWithBackoff(async () => {
      const res = await this.fetchAPI('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptions }),
      });
      return this.parseJSONResponse(res, 'Unable to push to cloud');
    }, { maxRetries: 3, baseDelayMs: 1000 });
  },

  async pullFromCloud() {
    return retryWithBackoff(async () => {
      const res = await this.fetchAPI('/api/sync/pull');
      return this.parseJSONResponse(res, 'Unable to pull from cloud');
    }, { maxRetries: 3, baseDelayMs: 1000 });
  },

  async pushMetadataToCloud(data) {
    const res = await this.fetchAPI('/api/sync/push-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.parseJSONResponse(res, 'Unable to push metadata to cloud');
  },

  async syncLocalToCloud() {
    return retryWithBackoff(async () => {
      // Get local transcriptions
      const localRes = await this.fetchAPI('/api/transcriptions');
      const localData = await localRes.json();

      if (!localData.transcriptions || localData.transcriptions.length === 0) {
        return { synced: 0, message: 'No local transcriptions to sync' };
      }

      // Push to cloud
      const transcriptions = localData.transcriptions.map(t => ({
        local_id: t.id,
        text: t.text,
        timestamp: t.timestamp,
        is_favorite: t.isFavorite || false,
        tags: (t.tags || []).map(tag => tag.name)
      }));

      const result = await this.pushToCloud(transcriptions);

      // Also push favorites and tags metadata
      const localTags = await this.getTags();
      const localFavorites = localData.transcriptions.filter(t => t.isFavorite).map(t => ({ local_id: t.id }));

      if (localTags.length > 0 || localFavorites.length > 0) {
        await this.pushMetadataToCloud({
          tags: localTags,
          favorites: localFavorites
        });
      }

      return result;
    }, { maxRetries: 3, baseDelayMs: 1000 });
  },

  // Get transcriptions based on current mode (cloud or local)
  async getTranscriptions(options = {}) {
    if (this.isCloudMode()) {
      return this.getCloudTranscriptions(options);
    }

    const { limit, offset } = options;
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);

    const res = await this.fetchAPI(`/api/transcriptions?${params.toString()}`);
    return this.parseJSONResponse(res, 'Unable to load transcriptions');
  },

  // Get stats based on current mode
  async getStats() {
    if (this.isCloudMode()) {
      return this.getCloudStats();
    }
    const res = await this.fetchAPI('/api/transcriptions/stats');
    return this.parseJSONResponse(res, 'Unable to load stats');
  },

  // Get tags based on current mode
  async getTagsForMode() {
    if (this.isCloudMode()) {
      const data = await this.getCloudTags();
      return data.tags || [];
    }
    const data = await this.getTags();
    return data;
  },

  // Create tag based on current mode
  async createTagForMode(payload) {
    if (this.isCloudMode()) {
      return this.createCloudTag(payload);
    }
    return this.createTag(payload);
  },

  // Toggle favorite based on current mode
  async toggleFavorite(transcriptionId, isFavorite) {
    if (this.isCloudMode()) {
      // For cloud mode, we need the cloud UUID, not local_id
      // First get the cloud transcription by local_id
      const cloudData = await this.pullFromCloud();
      const cloudTranscription = cloudData.transcriptions?.find(t => t.local_id === transcriptionId);

      if (cloudTranscription) {
        return this.updateCloudTranscription(cloudTranscription.id, { is_favorite: isFavorite });
      }
      throw new Error('Transcription not found in cloud');
    }

    // Local mode
    if (isFavorite) {
      return this.addFavorite(transcriptionId);
    } else {
      return this.removeFavorite(transcriptionId);
    }
  }
};

window.AuthAPI = AuthAPI;
