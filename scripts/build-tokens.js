#!/usr/bin/env node

/**
 * AudioFlow Design Tokens Build Script
 * Transforms tokens.yaml into multiple formats
 *
 * Usage: node scripts/build-tokens.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Paths
const TOKENS_YAML_PATH = path.join(__dirname, '../design-tokens/tokens.yaml');
const OUTPUT_DIR = path.join(__dirname, '../design-tokens');

function getNestedValue(object, pathSegments) {
  return pathSegments.reduce((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return current[segment];
  }, object);
}

function getTokenGroup(object, pathOptions) {
  for (const pathSegments of pathOptions) {
    const group = getNestedValue(object, pathSegments);
    if (group && typeof group === 'object') {
      return group;
    }
  }

  return {};
}

function getTokenEntries(group) {
  return Object.entries(group).filter(([key, value]) => {
    return key !== '$type' && key !== 'description' && typeof value === 'object' && value !== null && '$value' in value;
  });
}

function normalizeTokenKey(key) {
  return key
    .replace(/DEFAULT/g, 'default')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

// Load tokens
function loadTokens() {
  try {
    const fileContents = fs.readFileSync(TOKENS_YAML_PATH, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    console.error('❌ Error loading tokens.yaml:', error.message);
    process.exit(1);
  }
}

// Generate JSON
function generateJSON(tokens) {
  console.log('📦 Generating tokens.json...');
  const outputPath = path.join(OUTPUT_DIR, 'tokens.json');
  fs.writeFileSync(outputPath, JSON.stringify(tokens, null, 2));
  console.log('✅ tokens.json generated');
}

// Generate CSS Custom Properties
function generateCSS(tokens) {
  console.log('🎨 Generating tokens.css...');
  let css = `/* AudioFlow Design Tokens - Generated */\n/* Do not edit manually - generated from tokens.yaml */\n\n`;
  css += `:root {\n`;
  const coreTokens = getNestedValue(tokens, ['layers', 'core']) || {};
  const spacingTokens = getTokenGroup(coreTokens, [['spacing']]);
  const typographyTokens = getTokenGroup(coreTokens, [['typography']]);
  const fontFamilyTokens = getTokenGroup(typographyTokens, [['font-family'], ['fontFamily']]);
  const fontSizeTokens = getTokenGroup(typographyTokens, [['font-size'], ['fontSize']]);
  const fontWeightTokens = getTokenGroup(typographyTokens, [['font-weight'], ['fontWeight']]);
  const borderRadiusTokens = getTokenGroup(coreTokens, [['borderRadius'], ['border-radius']]);
  const shadowTokens = getTokenGroup(coreTokens, [['shadow'], ['shadows']]);

  // Colors
  css += `  /* Colors */\n`;
  getTokenEntries(getTokenGroup(coreTokens, [['color'], ['colors']])).forEach(([key, value]) => {
    css += `  --color-${normalizeTokenKey(key)}: ${value['$value']};\n`;
  });

  // Spacing
  css += `\n  /* Spacing */\n`;
  getTokenEntries(spacingTokens).forEach(([key, value]) => {
    css += `  --spacing-${normalizeTokenKey(key)}: ${value['$value']};\n`;
  });

  // Typography
  css += `\n  /* Typography */\n`;
  getTokenEntries(fontFamilyTokens).forEach(([key, value]) => {
    css += `  --font-family-${normalizeTokenKey(key)}: ${value['$value']};\n`;
  });
  getTokenEntries(fontSizeTokens).forEach(([key, value]) => {
    css += `  --font-size-${normalizeTokenKey(key)}: ${value['$value']};\n`;
  });
  getTokenEntries(fontWeightTokens).forEach(([key, value]) => {
    css += `  --font-weight-${normalizeTokenKey(key)}: ${value['$value']};\n`;
  });

  // Border Radius
  css += `\n  /* Border Radius */\n`;
  getTokenEntries(borderRadiusTokens).forEach(([key, value]) => {
    css += `  --radius-${normalizeTokenKey(key)}: ${value['$value']};\n`;
  });

  // Shadows
  css += `\n  /* Shadows */\n`;
  getTokenEntries(shadowTokens).forEach(([key, value]) => {
    css += `  --shadow-${normalizeTokenKey(key)}: ${value['$value']};\n`;
  });

  css += `}\n`;

  const outputPath = path.join(OUTPUT_DIR, 'tokens.generated.css');
  fs.writeFileSync(outputPath, css);
  console.log('✅ tokens.generated.css generated');
}

// Generate Swift
function generateSwift(tokens) {
  console.log('📱 Generating AudioFlowColors.generated.swift...');
  let swift = `//\n//  AudioFlowColors.swift (Generated)\n//  Do not edit manually\n//\n\nimport SwiftUI\n\nextension Color {\n`;

  const colorTokens = getTokenGroup(tokens, [['layers', 'core', 'color'], ['layers', 'core', 'colors']]);
  getTokenEntries(colorTokens).forEach(([key, value]) => {
    const swiftName = normalizeTokenKey(key).replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());
    swift += `    static let ${swiftName} = Color(hex: "${value['$value']}")\n`;
  });

  swift += `}\n`;

  const outputPath = path.join(OUTPUT_DIR, 'AudioFlowColors.generated.swift');
  fs.writeFileSync(outputPath, swift);
  console.log('✅ AudioFlowColors.generated.swift generated');
}

// Generate Tailwind Config
function generateTailwind(tokens) {
  console.log(' ⚡ Generating tokens.tailwind.generated.js...');
  const coreTokens = getNestedValue(tokens, ['layers', 'core']) || {};
  const typographyTokens = getTokenGroup(coreTokens, [['typography']]);

  const tailwindConfig = {
    theme: {
      extend: {
        colors: {},
        spacing: {},
        fontSize: {},
        borderRadius: {},
        boxShadow: {},
        fontFamily: {},
        fontWeight: {},
      }
    }
  };

  // Extract colors
  getTokenEntries(getTokenGroup(coreTokens, [['color'], ['colors']])).forEach(([key, value]) => {
    tailwindConfig.theme.extend.colors[normalizeTokenKey(key)] = value['$value'];
  });

  // Extract spacing
  getTokenEntries(getTokenGroup(coreTokens, [['spacing']])).forEach(([key, value]) => {
    tailwindConfig.theme.extend.spacing[normalizeTokenKey(key)] = value['$value'];
  });

  getTokenEntries(getTokenGroup(typographyTokens, [['font-size'], ['fontSize']])).forEach(([key, value]) => {
    tailwindConfig.theme.extend.fontSize[normalizeTokenKey(key)] = value['$value'];
  });

  getTokenEntries(getTokenGroup(typographyTokens, [['font-family'], ['fontFamily']])).forEach(([key, value]) => {
    tailwindConfig.theme.extend.fontFamily[normalizeTokenKey(key)] = value['$value'];
  });

  getTokenEntries(getTokenGroup(typographyTokens, [['font-weight'], ['fontWeight']])).forEach(([key, value]) => {
    tailwindConfig.theme.extend.fontWeight[normalizeTokenKey(key)] = value['$value'];
  });

  getTokenEntries(getTokenGroup(coreTokens, [['borderRadius'], ['border-radius']])).forEach(([key, value]) => {
    tailwindConfig.theme.extend.borderRadius[normalizeTokenKey(key)] = value['$value'];
  });

  getTokenEntries(getTokenGroup(coreTokens, [['shadow'], ['shadows']])).forEach(([key, value]) => {
    tailwindConfig.theme.extend.boxShadow[normalizeTokenKey(key)] = value['$value'];
  });

  const outputPath = path.join(OUTPUT_DIR, 'tokens.tailwind.generated.js');
  fs.writeFileSync(outputPath, `module.exports = ${JSON.stringify(tailwindConfig, null, 2)};`);
  console.log('✅ tokens.tailwind.generated.js generated');
}

// Main build function
function build() {
  console.log('🚀 Building AudioFlow Design Tokens...\n');

  const tokens = loadTokens();

  generateJSON(tokens);
  generateCSS(tokens);
  generateSwift(tokens);
  generateTailwind(tokens);

  console.log('\n✨ Build complete!');
}

// Run
build();
