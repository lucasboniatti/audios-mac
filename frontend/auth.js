// Authentication management
const DEFAULT_WS_PORT = 3001;
const LOGIN_PATH = '/login.html';

const AuthAPI = {
  runtimeConfig: null,

  getToken() {
    return localStorage.getItem('auth_token');
  },

  setToken(token) {
    localStorage.setItem('auth_token', token);
  },

  getUsername() {
    return localStorage.getItem('auth_username') || 'Usuário';
  },

  setUsername(username) {
    localStorage.setItem('auth_username', username);
  },

  clearSession() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    this.runtimeConfig = null;
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  redirectToLogin() {
    if (window.location.pathname !== LOGIN_PATH) {
      window.location.href = LOGIN_PATH;
    }
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
      this.setToken(token);
      this.setUsername(username);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async logout() {
    const token = this.getToken();
    try {
      if (token) {
        await fetch('/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
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
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        this.clearSession();
        return false;
      }

      const { valid, username } = await res.json();
      if (valid && username) {
        this.setUsername(username);
        return true;
      }

      this.clearSession();
      return false;
    } catch (_) {
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

  async getRuntimeConfig(forceRefresh = false) {
    if (!forceRefresh && this.runtimeConfig) {
      return this.runtimeConfig;
    }

    const res = await this.fetchAPI('/api/runtime-config');
    if (!res.ok) {
      throw new Error('Unable to load runtime config');
    }

    this.runtimeConfig = await res.json();
    return this.runtimeConfig;
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

    const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      this.clearSession();
      this.redirectToLogin();
      throw new Error('Token expired');
    }

    return res;
  },
};

window.AuthAPI = AuthAPI;
