// Theme and preference initialization (load before rendering)
(function() {
  const LOCAL_THEME_KEY = 'theme';
  const LOCAL_PREFERENCES_KEY = 'audioflow_preferences';
  const DEFAULT_ACCENT = '#007AFF';
  const DEFAULT_PREFERENCES = {
    theme_mode: 'system',
    accent_color: DEFAULT_ACCENT,
    font_size_multiplier: 1,
    auto_paste_enabled: 1,
    sound_feedback_enabled: 1,
  };

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  let currentPreferences = null;
  let remoteSyncPromise = null;

  function hexToRgb(hex) {
    const normalized = hex.replace('#', '');
    const match = normalized.match(/^([0-9a-f]{6})$/i);
    if (!match) {
      return null;
    }

    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }

  function rgba(hex, alpha) {
    const rgb = hexToRgb(hex) || hexToRgb(DEFAULT_ACCENT);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function adjustHexColor(hex, amount) {
    const rgb = hexToRgb(hex) || hexToRgb(DEFAULT_ACCENT);
    const clamp = (value) => Math.max(0, Math.min(255, value));
    const next = {
      r: clamp(rgb.r + amount),
      g: clamp(rgb.g + amount),
      b: clamp(rgb.b + amount),
    };

    return `#${[next.r, next.g, next.b]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;
  }

  function normalizePreferences(rawPreferences = {}) {
    const themeMode = ['dark', 'light', 'system'].includes(rawPreferences.theme_mode)
      ? rawPreferences.theme_mode
      : (currentPreferences?.theme_mode || DEFAULT_PREFERENCES.theme_mode);
    const accentColor = /^#[0-9A-F]{6}$/i.test(rawPreferences.accent_color || '')
      ? rawPreferences.accent_color.toUpperCase()
      : (currentPreferences?.accent_color || DEFAULT_PREFERENCES.accent_color);
    const fontSizeRaw = Number(rawPreferences.font_size_multiplier);
    const fontSize = Number.isFinite(fontSizeRaw)
      ? Math.max(0.8, Math.min(1.5, fontSizeRaw))
      : (currentPreferences?.font_size_multiplier || DEFAULT_PREFERENCES.font_size_multiplier);

    return {
      theme_mode: themeMode,
      accent_color: accentColor,
      font_size_multiplier: Number(fontSize.toFixed(2)),
      auto_paste_enabled: rawPreferences.auto_paste_enabled == null
        ? (currentPreferences?.auto_paste_enabled ?? DEFAULT_PREFERENCES.auto_paste_enabled)
        : (rawPreferences.auto_paste_enabled ? 1 : 0),
      sound_feedback_enabled: rawPreferences.sound_feedback_enabled == null
        ? (currentPreferences?.sound_feedback_enabled ?? DEFAULT_PREFERENCES.sound_feedback_enabled)
        : (rawPreferences.sound_feedback_enabled ? 1 : 0),
    };
  }

  function resolveThemeMode(themeMode) {
    if (themeMode === 'system') {
      return mediaQuery.matches ? 'dark' : 'light';
    }

    return themeMode === 'light' ? 'light' : 'dark';
  }

  function persistPreferencesLocally() {
    localStorage.setItem(LOCAL_PREFERENCES_KEY, JSON.stringify(currentPreferences));
    localStorage.setItem(LOCAL_THEME_KEY, resolveThemeMode(currentPreferences.theme_mode));
  }

  function dispatchPreferenceEvents() {
    const detail = {
      ...currentPreferences,
      resolvedTheme: resolveThemeMode(currentPreferences.theme_mode),
    };

    window.dispatchEvent(new CustomEvent('audioflow:preferences-changed', { detail }));
    window.dispatchEvent(new CustomEvent('audioflow:theme-changed', { detail }));
  }

  function applyAccentColor(hex) {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', hex);
    root.style.setProperty('--color-primary-hover', adjustHexColor(hex, -12));
    root.style.setProperty('--color-primary-active', adjustHexColor(hex, -24));
    root.style.setProperty('--color-primary-bg', rgba(hex, 0.16));
    root.style.setProperty('--shadow-primary-glow', `0 0 24px ${rgba(hex, 0.35)}`);
    root.style.setProperty('--shadow-primary-lg', `0 10px 24px ${rgba(hex, 0.25)}`);
  }

  function applyFontScale(multiplier) {
    document.documentElement.style.fontSize = `${Math.round(multiplier * 100)}%`;
  }

  function applyPreferences(nextPreferences, options = {}) {
    const { persist = true, emit = true } = options;
    currentPreferences = normalizePreferences({
      ...currentPreferences,
      ...nextPreferences,
    });

    document.documentElement.setAttribute('data-theme', resolveThemeMode(currentPreferences.theme_mode));
    applyAccentColor(currentPreferences.accent_color);
    applyFontScale(currentPreferences.font_size_multiplier);

    if (persist) {
      persistPreferencesLocally();
    }

    if (emit) {
      dispatchPreferenceEvents();
    }

    return currentPreferences;
  }

  function loadLocalPreferences() {
    let storedPreferences = {};

    try {
      storedPreferences = JSON.parse(localStorage.getItem(LOCAL_PREFERENCES_KEY) || '{}');
    } catch (_) {}

    const legacyTheme = localStorage.getItem(LOCAL_THEME_KEY);
    if (!storedPreferences.theme_mode && (legacyTheme === 'dark' || legacyTheme === 'light')) {
      storedPreferences.theme_mode = legacyTheme;
    }

    return normalizePreferences({
      ...DEFAULT_PREFERENCES,
      ...storedPreferences,
    });
  }

  async function ensurePreferencesLoaded(forceRefresh = false) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return currentPreferences;
    }

    if (!forceRefresh && remoteSyncPromise) {
      return remoteSyncPromise;
    }

    remoteSyncPromise = fetch('/api/preferences', {
      headers: { 'Authorization': `Bearer ${token}` },
    }).then(async (response) => {
      if (!response.ok) {
        return currentPreferences;
      }

      const preferences = await response.json();
      return applyPreferences(preferences);
    }).catch(() => currentPreferences).finally(() => {
      remoteSyncPromise = null;
    });

    return remoteSyncPromise;
  }

  async function updatePreferences(nextPreferences) {
    const token = localStorage.getItem('auth_token');
    const normalized = normalizePreferences(nextPreferences);
    applyPreferences(normalized);

    if (!token) {
      return currentPreferences;
    }

    const response = await fetch('/api/preferences', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(normalized),
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {}

    if (!response.ok) {
      throw new Error(payload?.error || 'Não foi possível salvar as preferências');
    }

    return applyPreferences(payload);
  }

  currentPreferences = loadLocalPreferences();
  applyPreferences(currentPreferences, { persist: true, emit: false });

  const handleSystemThemeChange = () => {
    if (currentPreferences.theme_mode === 'system') {
      applyPreferences({}, { persist: true, emit: true });
    }
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleSystemThemeChange);
  }

  window.toggleDarkMode = function() {
    const nextThemeMode = resolveThemeMode(currentPreferences.theme_mode) === 'dark' ? 'light' : 'dark';
    applyPreferences({ theme_mode: nextThemeMode });
    updatePreferences({ theme_mode: nextThemeMode }).catch(() => {});
    return nextThemeMode === 'dark';
  };

  window.isDarkMode = function() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  };

  window.AudioFlowTheme = {
    getPreferences() {
      return {
        ...currentPreferences,
        resolvedTheme: resolveThemeMode(currentPreferences.theme_mode),
      };
    },
    ensurePreferencesLoaded,
    updatePreferences,
    applyPreferences,
  };

  setTimeout(() => {
    ensurePreferencesLoaded().catch(() => {});
  }, 0);
})();
