import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const htmlFiles = [
  'frontend/index.html',
  'frontend/dashboard.html',
  'frontend/favorites.html',
  'frontend/login.html',
];

const jsFiles = [
  'frontend/auth.js',
  'frontend/theme.js',
  'frontend/server.js',
  'frontend/build-css.js',
];

function runNode(args) {
  execFileSync(process.execPath, args, { stdio: 'pipe' });
}

test('frontend JavaScript files pass syntax check', () => {
  for (const file of jsFiles) {
    assert.doesNotThrow(() => runNode(['--check', file]), file);
  }
});

test('inline scripts from HTML pages compile', () => {
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    const match = html.match(/<script>([\s\S]*)<\/script>/);
    assert.ok(match, `inline script not found in ${file}`);
    assert.doesNotThrow(() => new vm.Script(match[1]), file);
  }
});

test('design tokens build artifacts can be generated', () => {
  assert.doesNotThrow(() => runNode(['scripts/build-tokens.js']));
  assert.ok(existsSync('design-tokens/tokens.json'));
  assert.ok(existsSync('design-tokens/tokens.generated.css'));
  assert.ok(existsSync('design-tokens/AudioFlowColors.generated.swift'));
  assert.ok(existsSync('design-tokens/tokens.tailwind.generated.js'));
});

test('qa regression fixes stay enforced in auth and history flows', () => {
  const authSource = readFileSync('frontend/auth.js', 'utf8');
  const serverSource = readFileSync('frontend/server.js', 'utf8');
  const indexSource = readFileSync('frontend/index.html', 'utf8');
  const favoritesSource = readFileSync('frontend/favorites.html', 'utf8');

  assert.match(authSource, /searchParams\.set\('token', token\)/);
  assert.match(serverSource, /verifyClient:/);
  assert.match(serverSource, /closeSessionSockets\(token\)/);
  assert.match(serverSource, /History deletion is not supported in the read-only web companion/);
  assert.match(serverSource, /text:\s*String\(row\.ZTEXT \?\? ''\)/);
  assert.match(serverSource, /const tag = designDb\.prepare\('SELECT id FROM tags WHERE id = \?'\)\.get\(tagId\);/);
  assert.doesNotMatch(indexSource, /title="Deletar"/);
  assert.doesNotMatch(favoritesSource, /title="Deletar"/);
});
