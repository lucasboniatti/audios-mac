import { readFileSync } from 'node:fs';
import path from 'node:path';

const cssPath = path.resolve('frontend/styles.css');
const css = readFileSync(cssPath, 'utf8');
const lines = css.split(/\r?\n/);

const allowedColorHex = new Set([
  '#007aff',
  '#000000',
  '#1c1c1e',
  '#2c2c2e',
  '#8e8e93',
  '#999999',
  '#f43f5e',
  '#e11d48',
]);

const allowedBackgroundHex = new Set([
  '#007aff',
  '#000000',
  '#1c1c1e',
  '#2c2c2e',
]);

const classPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const pxDisallowedProperties = [
  /^(margin|padding|width|height|min-width|max-width|min-height|max-height)$/,
  /^font-size$/,
  /^border-radius$/,
];

const violations = [];
let activeComment = false;

function stripComments(line) {
  let sanitized = '';
  let index = 0;

  while (index < line.length) {
    if (!activeComment && line.startsWith('/*', index)) {
      activeComment = true;
      index += 2;
      continue;
    }

    if (activeComment && line.startsWith('*/', index)) {
      activeComment = false;
      index += 2;
      continue;
    }

    if (!activeComment) {
      sanitized += line[index];
    }

    index += 1;
  }

  return sanitized;
}

function recordViolation(lineNumber, message) {
  violations.push(`${cssPath}:${lineNumber} ${message}`);
}

function validateSelector(lineNumber, selectorSource) {
  const classMatches = selectorSource.matchAll(/\.([_a-zA-Z][\w-]*)/g);

  for (const [, className] of classMatches) {
    if (!classPattern.test(className)) {
      recordViolation(lineNumber, `selector class "${className}" does not match ${classPattern}`);
    }
  }
}

function validateDeclaration(lineNumber, property, value) {
  if (pxDisallowedProperties.some((pattern) => pattern.test(property)) && /\b\d*\.?\d+px\b/.test(value)) {
    recordViolation(lineNumber, `disallowed px unit in "${property}: ${value}"`);
  }

  const hexMatches = [...value.matchAll(/#[0-9A-Fa-f]{3,6}\b/g)].map(([match]) => match.toLowerCase());
  if (hexMatches.length === 0) {
    return;
  }

  if (property === 'color') {
    for (const hex of hexMatches) {
      if (!allowedColorHex.has(hex)) {
        recordViolation(lineNumber, `disallowed hex color "${hex}" in "${property}: ${value}"`);
      }
    }
    return;
  }

  if (/^background/.test(property)) {
    for (const hex of hexMatches) {
      if (!allowedBackgroundHex.has(hex)) {
        recordViolation(lineNumber, `disallowed hex color "${hex}" in "${property}: ${value}"`);
      }
    }
    return;
  }

  if (property === 'border-color') {
    for (const hex of hexMatches) {
      recordViolation(lineNumber, `disallowed hex color "${hex}" in "${property}: ${value}"`);
    }
  }
}

for (let index = 0; index < lines.length; index += 1) {
  const rawLine = lines[index];
  const line = stripComments(rawLine).trim();
  const lineNumber = index + 1;

  if (!line) {
    continue;
  }

  if (line.includes('{')) {
    validateSelector(lineNumber, line.slice(0, line.indexOf('{')).trim());
  }

  const declarationMatch = line.match(/^([a-z-]+)\s*:\s*([^;]+);$/);
  if (declarationMatch) {
    const [, property, value] = declarationMatch;
    validateDeclaration(lineNumber, property, value.trim());
  }
}

if (violations.length > 0) {
  console.error('CSS lint failed:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('CSS lint passed for frontend/styles.css');
