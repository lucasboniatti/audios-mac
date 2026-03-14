#!/usr/bin/env node

/**
 * AudioFlow Design Tokens Build Script
 * Transforms tokens.yaml into the canonical token artifacts consumed by this repo.
 *
 * Source of truth: design-tokens/tokens.yaml
 * Usage: node scripts/build-tokens.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const TOKENS_YAML_PATH = path.join(__dirname, '../design-tokens/tokens.yaml');
const OUTPUT_DIR = path.join(__dirname, '../design-tokens');
const SWIFT_CONSUMER_PATH = path.join(__dirname, '../AudioFlow/Sources/DesignTokens/AudioFlowColors.swift');

const OUTPUT_FILES = {
  json: 'tokens.json',
  dtcg: 'tokens.dtcg.json',
  css: 'tokens.css',
  cssGenerated: 'tokens.generated.css',
  tailwind: 'tokens.tailwind.js',
  tailwindGenerated: 'tokens.tailwind.generated.js',
  swiftGenerated: 'AudioFlowColors.generated.swift',
};

const FILE_HEADER = 'Generated from design-tokens/tokens.yaml. Do not edit manually.';

function getNestedValue(object, pathSegments) {
  return pathSegments.reduce((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return current[segment];
  }, object);
}

function getTokenEntries(group) {
  return Object.entries(group).filter(([key, value]) => {
    return (
      key !== '$type' &&
      key !== 'description' &&
      key !== '$description' &&
      typeof value === 'object' &&
      value !== null &&
      '$value' in value
    );
  });
}

function normalizeTokenKey(key) {
  return key
    .replace(/DEFAULT/g, 'default')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function toCamelCase(key) {
  return normalizeTokenKey(key).replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function isReference(value) {
  return typeof value === 'string' && /^\{[^}]+\}$/.test(value.trim());
}

function resolveReference(tokens, reference, stack = []) {
  const tokenPath = reference.trim().slice(1, -1);

  if (stack.includes(tokenPath)) {
    throw new Error(`Circular token reference detected: ${stack.join(' -> ')} -> ${tokenPath}`);
  }

  const node = getNestedValue(tokens, tokenPath.split('.'));

  if (node === undefined) {
    throw new Error(`Token reference not found: ${tokenPath}`);
  }

  return resolveNodeValue(tokens, node, stack.concat(tokenPath));
}

function resolveNodeValue(tokens, node, stack = []) {
  if (node && typeof node === 'object' && '$value' in node) {
    return resolveValue(tokens, node.$value, stack);
  }

  if (Array.isArray(node)) {
    return node.map(item => resolveNodeValue(tokens, item, stack));
  }

  if (node && typeof node === 'object') {
    const resolved = {};
    for (const [key, value] of Object.entries(node)) {
      resolved[key] = resolveNodeValue(tokens, value, stack);
    }
    return resolved;
  }

  return node;
}

function resolveValue(tokens, value, stack = []) {
  if (isReference(value)) {
    return resolveReference(tokens, value, stack);
  }

  return value;
}

function resolveTokenPath(tokens, tokenPath) {
  return resolveReference(tokens, `{${tokenPath}}`);
}

function writeOutputFile(filename, contents) {
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, contents.endsWith('\n') ? contents : `${contents}\n`);
  console.log(`✅ ${filename} generated`);
}

function writeAbsoluteOutputFile(outputPath, contents, label) {
  fs.writeFileSync(outputPath, contents.endsWith('\n') ? contents : `${contents}\n`);
  console.log(`✅ ${label} generated`);
}

function writeCanonicalAndGenerated(canonicalName, generatedName, contents) {
  writeOutputFile(canonicalName, contents);
  writeOutputFile(generatedName, contents);
}

function formatCssBlock(selector, variables) {
  const body = Object.entries(variables)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join('\n');

  return `${selector} {\n${body}\n}`;
}

function loadTokens() {
  try {
    const fileContents = fs.readFileSync(TOKENS_YAML_PATH, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    console.error('❌ Error loading tokens.yaml:', error.message);
    process.exit(1);
  }
}

function generateJSON(tokens) {
  console.log('📦 Generating tokens.json...');
  writeOutputFile(OUTPUT_FILES.json, JSON.stringify(tokens, null, 2));
}

function generateDTCG(tokens) {
  console.log('🔁 Generating tokens.dtcg.json...');
  writeOutputFile(OUTPUT_FILES.dtcg, JSON.stringify(tokens, null, 2));
}

function collectResolvedEntries(tokens, groupPath, prefix, target) {
  const group = getNestedValue(tokens, groupPath);
  if (!group) {
    return;
  }

  getTokenEntries(group).forEach(([key, value]) => {
    target[`${prefix}-${normalizeTokenKey(key)}`] = resolveNodeValue(tokens, value);
  });
}

function assignResolvedAliases(tokens, mapping) {
  const resolved = {};

  for (const [alias, tokenPath] of Object.entries(mapping)) {
    resolved[alias] = resolveTokenPath(tokens, tokenPath);
  }

  return resolved;
}

function generateCSS(tokens) {
  console.log('🎨 Generating tokens.css...');

  const rootVariables = assignResolvedAliases(tokens, {
    'color-primary': 'layers.semantic.color.interactive-primary',
    'color-primary-hover': 'layers.semantic.color.interactive-primary-hover',
    'color-primary-active': 'layers.semantic.color.interactive-primary-active',
    'color-primary-bg': 'layers.semantic.color.interactive-primary-background',
    'color-primary-border': 'layers.semantic.color.interactive-primary-border',
    'color-background': 'layers.semantic.color.background-primary-dark',
    'color-surface': 'layers.semantic.color.background-surface-dark',
    'color-elevated': 'layers.semantic.color.background-elevated-dark',
    'color-text-primary': 'layers.semantic.color.text-primary-dark',
    'color-text-secondary': 'layers.semantic.color.text-secondary-dark',
    'color-text-tertiary': 'layers.semantic.color.text-tertiary-dark',
    'color-text-disabled': 'layers.semantic.color.text-disabled-dark',
    'color-text-label': 'layers.semantic.color.text-label-dark',
    'color-border-subtle': 'layers.semantic.color.border-subtle-dark',
    'color-border-default': 'layers.semantic.color.border-default-dark',
    'color-border-strong': 'layers.semantic.color.border-strong-dark',
    'color-destructive': 'layers.semantic.color.destructive',
    'color-destructive-hover': 'layers.semantic.color.destructive-hover',
    'color-destructive-bg': 'layers.semantic.color.destructive-background',
    'color-success': 'layers.semantic.color.success',
    'color-success-hover': 'layers.semantic.color.success-hover',
    'color-success-bg': 'layers.semantic.color.success-background',
    'color-warning': 'layers.semantic.color.warning',
    'color-warning-hover': 'layers.semantic.color.warning-hover',
    'color-warning-bg': 'layers.semantic.color.warning-background',
    'shadow-sm': 'layers.core.shadow.dark-sm',
    'shadow-default': 'layers.core.shadow.dark-DEFAULT',
    'shadow-md': 'layers.core.shadow.dark-md',
    'shadow-lg': 'layers.core.shadow.dark-lg',
    'shadow-primary-glow': 'layers.core.shadow.primary-glow',
    'shadow-primary-lg': 'layers.core.shadow.primary-lg',
  });

  collectResolvedEntries(tokens, ['layers', 'core', 'spacing'], 'spacing', rootVariables);
  collectResolvedEntries(tokens, ['layers', 'core', 'typography', 'font-family'], 'font-family', rootVariables);
  collectResolvedEntries(tokens, ['layers', 'core', 'typography', 'font-size'], 'font-size', rootVariables);
  collectResolvedEntries(tokens, ['layers', 'core', 'typography', 'font-weight'], 'font-weight', rootVariables);
  collectResolvedEntries(tokens, ['layers', 'core', 'typography', 'line-height'], 'line-height', rootVariables);
  collectResolvedEntries(tokens, ['layers', 'core', 'typography', 'letter-spacing'], 'letter-spacing', rootVariables);
  collectResolvedEntries(tokens, ['layers', 'core', 'borderRadius'], 'radius', rootVariables);

  const lightVariables = assignResolvedAliases(tokens, {
    'color-background': 'layers.semantic.color.background-primary-light',
    'color-surface': 'layers.semantic.color.background-surface-light',
    'color-elevated': 'layers.semantic.color.background-elevated-light',
    'color-text-primary': 'layers.semantic.color.text-primary-light',
    'color-text-secondary': 'layers.semantic.color.text-secondary-light',
    'color-text-tertiary': 'layers.semantic.color.text-tertiary-light',
    'color-text-disabled': 'layers.semantic.color.text-disabled-light',
    'color-text-label': 'layers.semantic.color.text-label-light',
    'color-border-subtle': 'layers.semantic.color.border-subtle-light',
    'color-border-default': 'layers.semantic.color.border-default-light',
    'color-border-strong': 'layers.semantic.color.border-strong-light',
    'shadow-sm': 'layers.core.shadow.light-sm',
    'shadow-default': 'layers.core.shadow.light-DEFAULT',
    'shadow-md': 'layers.core.shadow.light-md',
    'shadow-lg': 'layers.core.shadow.light-lg',
  });

  const darkVariables = assignResolvedAliases(tokens, {
    'color-background': 'layers.semantic.color.background-primary-dark',
    'color-surface': 'layers.semantic.color.background-surface-dark',
    'color-elevated': 'layers.semantic.color.background-elevated-dark',
    'color-text-primary': 'layers.semantic.color.text-primary-dark',
    'color-text-secondary': 'layers.semantic.color.text-secondary-dark',
    'color-text-tertiary': 'layers.semantic.color.text-tertiary-dark',
    'color-text-disabled': 'layers.semantic.color.text-disabled-dark',
    'color-text-label': 'layers.semantic.color.text-label-dark',
    'color-border-subtle': 'layers.semantic.color.border-subtle-dark',
    'color-border-default': 'layers.semantic.color.border-default-dark',
    'color-border-strong': 'layers.semantic.color.border-strong-dark',
    'shadow-sm': 'layers.core.shadow.dark-sm',
    'shadow-default': 'layers.core.shadow.dark-DEFAULT',
    'shadow-md': 'layers.core.shadow.dark-md',
    'shadow-lg': 'layers.core.shadow.dark-lg',
  });

  const css = [
    `/* ${FILE_HEADER} */`,
    '',
    formatCssBlock(':root', rootVariables),
    '',
    formatCssBlock('[data-theme="light"]', lightVariables),
    '',
    formatCssBlock('[data-theme="dark"]', darkVariables),
  ].join('\n');

  writeCanonicalAndGenerated(OUTPUT_FILES.css, OUTPUT_FILES.cssGenerated, css);
}

function parseFontFamily(value) {
  return String(value)
    .split(',')
    .map(part => part.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function collectFlatObject(tokens, groupPath, keyTransform) {
  const group = getNestedValue(tokens, groupPath);
  const object = {};

  if (!group) {
    return object;
  }

  getTokenEntries(group).forEach(([key, value]) => {
    const nextKey = keyTransform ? keyTransform(key) : normalizeTokenKey(key);
    object[nextKey] = resolveNodeValue(tokens, value);
  });

  return object;
}

function generateTailwind(tokens) {
  console.log('⚡ Generating tokens.tailwind.js...');

  const fontFamilies = collectFlatObject(tokens, ['layers', 'core', 'typography', 'font-family']);
  Object.keys(fontFamilies).forEach(key => {
    fontFamilies[key] = parseFontFamily(fontFamilies[key]);
  });

  const borderRadius = collectFlatObject(tokens, ['layers', 'core', 'borderRadius'], key => {
    return key === 'DEFAULT' ? 'DEFAULT' : normalizeTokenKey(key);
  });

  const tailwindConfig = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: resolveTokenPath(tokens, 'layers.semantic.color.interactive-primary'),
            500: resolveTokenPath(tokens, 'layers.semantic.color.interactive-primary'),
            hover: resolveTokenPath(tokens, 'layers.semantic.color.interactive-primary-hover'),
            active: resolveTokenPath(tokens, 'layers.semantic.color.interactive-primary-active'),
            bg: resolveTokenPath(tokens, 'layers.semantic.color.interactive-primary-background'),
            border: resolveTokenPath(tokens, 'layers.semantic.color.interactive-primary-border'),
          },
          background: {
            DEFAULT: 'var(--color-background)',
            surface: 'var(--color-surface)',
            elevated: 'var(--color-elevated)',
          },
          surface: {
            DEFAULT: 'var(--color-surface)',
            elevated: 'var(--color-elevated)',
          },
          text: {
            primary: 'var(--color-text-primary)',
            secondary: 'var(--color-text-secondary)',
            tertiary: 'var(--color-text-tertiary)',
            disabled: 'var(--color-text-disabled)',
            label: 'var(--color-text-label)',
          },
          border: {
            subtle: 'var(--color-border-subtle)',
            DEFAULT: 'var(--color-border-default)',
            strong: 'var(--color-border-strong)',
          },
          destructive: {
            DEFAULT: resolveTokenPath(tokens, 'layers.semantic.color.destructive'),
            hover: resolveTokenPath(tokens, 'layers.semantic.color.destructive-hover'),
            bg: resolveTokenPath(tokens, 'layers.semantic.color.destructive-background'),
          },
          success: {
            DEFAULT: resolveTokenPath(tokens, 'layers.semantic.color.success'),
            hover: resolveTokenPath(tokens, 'layers.semantic.color.success-hover'),
            bg: resolveTokenPath(tokens, 'layers.semantic.color.success-background'),
          },
          warning: {
            DEFAULT: resolveTokenPath(tokens, 'layers.semantic.color.warning'),
            hover: resolveTokenPath(tokens, 'layers.semantic.color.warning-hover'),
            bg: resolveTokenPath(tokens, 'layers.semantic.color.warning-background'),
          },
        },
        spacing: collectFlatObject(tokens, ['layers', 'core', 'spacing'], key => String(key)),
        fontFamily: fontFamilies,
        fontSize: collectFlatObject(tokens, ['layers', 'core', 'typography', 'font-size']),
        fontWeight: collectFlatObject(tokens, ['layers', 'core', 'typography', 'font-weight']),
        lineHeight: collectFlatObject(tokens, ['layers', 'core', 'typography', 'line-height']),
        letterSpacing: collectFlatObject(tokens, ['layers', 'core', 'typography', 'letter-spacing']),
        borderRadius,
        boxShadow: {
          sm: 'var(--shadow-sm)',
          DEFAULT: 'var(--shadow-default)',
          md: 'var(--shadow-md)',
          lg: 'var(--shadow-lg)',
          'primary-glow': 'var(--shadow-primary-glow)',
          'primary-lg': 'var(--shadow-primary-lg)',
        },
      },
    },
    plugins: [],
  };

  const contents = [
    '/**',
    ` * ${FILE_HEADER}`,
    ' */',
    `module.exports = ${JSON.stringify(tailwindConfig, null, 2)};`,
  ].join('\n');

  writeCanonicalAndGenerated(OUTPUT_FILES.tailwind, OUTPUT_FILES.tailwindGenerated, contents);
}

function rgbaToSwiftExpression(value) {
  const match = String(value)
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);

  if (!match) {
    return null;
  }

  const [, red, green, blue, alpha = '1'] = match;

  return `Color(.sRGB, red: ${red} / 255, green: ${green} / 255, blue: ${blue} / 255, opacity: ${alpha})`;
}

function swiftColorExpression(value) {
  const tokenValue = String(value).trim();

  if (/^#?[0-9a-f]{3,8}$/i.test(tokenValue)) {
    const hex = tokenValue.startsWith('#') ? tokenValue.slice(1) : tokenValue;
    return `Color(tokenHex: "${hex}")`;
  }

  const rgbaExpression = rgbaToSwiftExpression(tokenValue);
  if (rgbaExpression) {
    return rgbaExpression;
  }

  throw new Error(`Unsupported color token for Swift generation: ${tokenValue}`);
}

function collectSwiftColorTokens(tokens, groupPath) {
  const group = getNestedValue(tokens, groupPath) || {};

  return getTokenEntries(group).map(([key, value]) => {
    return {
      name: toCamelCase(key),
      expression: swiftColorExpression(resolveNodeValue(tokens, value)),
    };
  });
}

function generateSwift(tokens) {
  console.log('📱 Generating AudioFlowColors.generated.swift...');

  const swiftTokens = [
    ...collectSwiftColorTokens(tokens, ['layers', 'core', 'color']),
    ...collectSwiftColorTokens(tokens, ['layers', 'semantic', 'color']),
  ];
  const compatibilityAliases = {
    primaryHover: 'primary600',
    primaryActive: 'primary700',
    backgroundDark: 'darkBackground',
    surfaceDark: 'darkSurface',
    surfaceElevated: 'darkElevated',
    textPrimary: 'darkTextPrimary',
    textSecondary: 'darkTextSecondary',
    textTertiary: 'darkTextTertiary',
    textDisabled: 'darkTextDisabled',
    textLabel: 'darkTextLabel',
    borderSubtle: 'darkBorderSubtle',
    borderDefault: 'darkBorderDefault',
    borderStrong: 'darkBorderStrong',
    destructiveDefault: 'destructive',
  };

  const swiftSections = [
    '//',
    '//  AudioFlowColors.generated.swift',
    `//  ${FILE_HEADER}`,
    '//',
    '',
    'import SwiftUI',
    '',
    'extension Color {',
  ];

  swiftTokens.forEach(({ name, expression }) => {
    swiftSections.push(`    static let ${name} = ${expression}`);
  });

  swiftSections.push('');
  swiftSections.push('    // Compatibility aliases used by the current SwiftUI component layer.');

  Object.entries(compatibilityAliases).forEach(([alias, source]) => {
    swiftSections.push(`    static let ${alias} = ${source}`);
  });

  swiftSections.push('}');
  swiftSections.push('');
  swiftSections.push('extension Color {');
  swiftSections.push('    init(tokenHex: String) {');
  swiftSections.push('        let hex = tokenHex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)');
  swiftSections.push('        var int: UInt64 = 0');
  swiftSections.push('        Scanner(string: hex).scanHexInt64(&int)');
  swiftSections.push('        let a, r, g, b: UInt64');
  swiftSections.push('');
  swiftSections.push('        switch hex.count {');
  swiftSections.push('        case 3:');
  swiftSections.push('            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)');
  swiftSections.push('        case 6:');
  swiftSections.push('            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)');
  swiftSections.push('        case 8:');
  swiftSections.push('            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)');
  swiftSections.push('        default:');
  swiftSections.push('            (a, r, g, b) = (255, 0, 0, 0)');
  swiftSections.push('        }');
  swiftSections.push('');
  swiftSections.push('        self.init(');
  swiftSections.push('            .sRGB,');
  swiftSections.push('            red: Double(r) / 255,');
  swiftSections.push('            green: Double(g) / 255,');
  swiftSections.push('            blue: Double(b) / 255,');
  swiftSections.push('            opacity: Double(a) / 255');
  swiftSections.push('        )');
  swiftSections.push('    }');
  swiftSections.push('}');

  const swift = `${swiftSections.join('\n')}\n`;

  writeOutputFile(OUTPUT_FILES.swiftGenerated, swift);
  writeAbsoluteOutputFile(SWIFT_CONSUMER_PATH, swift, 'AudioFlow/Sources/DesignTokens/AudioFlowColors.swift');
}

function build() {
  console.log('🚀 Building AudioFlow Design Tokens...\n');

  const tokens = loadTokens();

  generateJSON(tokens);
  generateDTCG(tokens);
  generateCSS(tokens);
  generateTailwind(tokens);
  generateSwift(tokens);

  console.log('\n✨ Build complete!');
}

build();
