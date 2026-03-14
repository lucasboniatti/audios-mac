/**
 * AudioFlow Component Library - Vanilla JS
 * Usável em HTML sem build step
 */

// Design Tokens
const AudioFlowTokens = {
  colors: {
    primary: { 500: '#007AFF', hover: '#0056CC', active: '#0044A8' },
    background: { dark: '#000000', surface: '#1C1C1E', elevated: '#2C2C2E' },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.8)',
      tertiary: 'rgba(255, 255, 255, 0.6)',
      disabled: '#8E8E93',
      label: '#999999'
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.05)',
      default: 'rgba(255, 255, 255, 0.10)',
      strong: 'rgba(255, 255, 255, 0.20)'
    },
    destructive: { default: '#F43F5E', hover: '#E11D48' }
  },
  spacing: {
    1: '4px', 2: '8px', 3: '12px', 4: '16px',
    6: '24px', 8: '32px', 16: '64px'
  },
  borderRadius: {
    sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px'
  },
  shadows: {
    primaryGlow: '0 0 20px rgba(0, 122, 255, 0.4)',
    primaryLg: '0 10px 15px -3px rgba(0, 122, 255, 0.3)'
  }
};

const SHARED_ASSETS_BASE_PATH = '/shared-assets';

const AudioFlowBrandAssets = {
  logos: {
    primary: `${SHARED_ASSETS_BASE_PATH}/logo.svg`,
    transparent: `${SHARED_ASSETS_BASE_PATH}/logo-transparent.svg`,
    whiteBackground: `${SHARED_ASSETS_BASE_PATH}/logo-white-bg.svg`
  },
  animated: {
    default: `${SHARED_ASSETS_BASE_PATH}/logo-animated.gif`,
    compact: `${SHARED_ASSETS_BASE_PATH}/logo-animated-44.gif`
  },
  icons: {
    app1024: `${SHARED_ASSETS_BASE_PATH}/app-icon-1024.png`
  }
};

// Button Component
class AudioFlowButton {
  constructor(options = {}) {
    this.variant = options.variant || 'primary';
    this.text = options.text || 'Button';
    this.onClick = options.onClick || (() => {});
    this.disabled = options.disabled || false;
  }

  render() {
    const button = document.createElement('button');
    button.className = `btn-${this.variant}`;
    button.textContent = this.text;
    button.disabled = this.disabled;

    if (!this.disabled) {
      button.addEventListener('click', this.onClick);
    }

    return button;
  }
}

// Card Component
class AudioFlowCard {
  constructor(options = {}) {
    this.variant = options.variant || 'default';
    this.content = options.content || '';
    this.onClick = options.onClick || null;
  }

  render() {
    const card = document.createElement('div');
    card.className = this.variant === 'elevated' ? 'card-elevated' : 'card';

    if (typeof this.content === 'string') {
      card.innerHTML = this.content;
    } else if (this.content instanceof HTMLElement) {
      card.appendChild(this.content);
    }

    if (this.onClick) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', this.onClick);
      card.classList.add('card-interactive');
    }

    return card;
  }
}

// Chip Component
class AudioFlowChip {
  constructor(options = {}) {
    this.text = options.text || '';
    this.count = options.count || null;
    this.active = options.active || false;
    this.onClick = options.onClick || null;
  }

  render() {
    const chip = document.createElement('div');
    chip.className = this.onClick ? 'chip-filter' : 'chip';

    if (this.active && this.onClick) {
      chip.classList.add('active');
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = this.text;
    chip.appendChild(textSpan);

    if (this.count) {
      const countSpan = document.createElement('span');
      countSpan.style.cssText = `
        background: ${AudioFlowTokens.colors.background.elevated};
        padding: 0 8px;
        border-radius: ${AudioFlowTokens.borderRadius.full};
        font-size: 10px;
        font-weight: 700;
        color: ${AudioFlowTokens.colors.primary[500]};
        margin-left: 8px;
      `;
      countSpan.textContent = this.count;
      chip.appendChild(countSpan);
    }

    if (this.onClick) {
      chip.addEventListener('click', () => this.onClick(this));
      chip.style.cursor = 'pointer';
    }

    return chip;
  }
}

// FAB Component
class AudioFlowFAB {
  constructor(options = {}) {
    this.icon = options.icon || 'mic';
    this.onClick = options.onClick || (() => {});
  }

  render() {
    const fab = document.createElement('button');
    fab.className = 'fab';

    if (this.icon.startsWith('material-')) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'material-symbols-outlined';
      iconSpan.style.fontSize = '32px';
      iconSpan.textContent = this.icon.replace('material-', '');
      fab.appendChild(iconSpan);
    } else {
      fab.textContent = this.icon;
    }

    fab.addEventListener('click', this.onClick);

    return fab;
  }
}

const AudioFlowComponentLibrary = {
  tokens: AudioFlowTokens,
  brandAssets: AudioFlowBrandAssets,
  createButton(options = {}) {
    return new AudioFlowButton(options).render();
  },
  createCard(options = {}) {
    return new AudioFlowCard(options).render();
  },
  createChip(options = {}) {
    return new AudioFlowChip(options).render();
  },
  createFAB(options = {}) {
    return new AudioFlowFAB(options).render();
  }
};

if (typeof window !== 'undefined') {
  window.AudioFlowComponents = {
    tokens: AudioFlowTokens,
    brandAssets: AudioFlowBrandAssets,
    AudioFlowButton,
    AudioFlowCard,
    AudioFlowChip,
    AudioFlowFAB,
    library: AudioFlowComponentLibrary
  };
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AudioFlowTokens,
    AudioFlowBrandAssets,
    AudioFlowButton,
    AudioFlowCard,
    AudioFlowChip,
    AudioFlowFAB,
    AudioFlowComponentLibrary
  };
}
