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
  'frontend/audioflow-components.js',
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

test('design tokens build artifacts can be generated from the YAML source of truth', () => {
  assert.doesNotThrow(() => runNode(['scripts/build-tokens.js']));

  const tokensYaml = readFileSync('design-tokens/tokens.yaml', 'utf8');
  const frontendStyles = readFileSync('frontend/styles.css', 'utf8');
  const frontendTailwindConfig = readFileSync('frontend/tailwind.config.js', 'utf8');
  const canonicalCss = readFileSync('design-tokens/tokens.css', 'utf8');
  const generatedCss = readFileSync('design-tokens/tokens.generated.css', 'utf8');
  const canonicalTailwind = readFileSync('design-tokens/tokens.tailwind.js', 'utf8');
  const generatedTailwind = readFileSync('design-tokens/tokens.tailwind.generated.js', 'utf8');
  const generatedSwift = readFileSync('design-tokens/AudioFlowColors.generated.swift', 'utf8');
  const appSwift = readFileSync('AudioFlow/Sources/DesignTokens/AudioFlowColors.swift', 'utf8');

  assert.match(tokensYaml, /Source of Truth:/);
  assert.ok(existsSync('design-tokens/tokens.json'));
  assert.ok(existsSync('design-tokens/tokens.dtcg.json'));
  assert.ok(existsSync('design-tokens/tokens.css'));
  assert.ok(existsSync('design-tokens/tokens.generated.css'));
  assert.ok(existsSync('design-tokens/tokens.tailwind.js'));
  assert.ok(existsSync('design-tokens/AudioFlowColors.generated.swift'));
  assert.ok(existsSync('design-tokens/tokens.tailwind.generated.js'));
  assert.match(frontendStyles, /@import "\.\.\/design-tokens\/tokens\.css";/);
  assert.match(frontendStyles, /@config "\.\/tailwind\.config\.js";/);
  assert.match(frontendTailwindConfig, /require\('\.\.\/design-tokens\/tokens\.tailwind\.js'\)/);
  assert.match(canonicalCss, /Generated from design-tokens\/tokens\.yaml/);
  assert.equal(canonicalCss, generatedCss);
  assert.equal(canonicalTailwind, generatedTailwind);
  assert.equal(generatedSwift, appSwift);
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

test('design system docs and catalog point to real local workflows', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const readme = readFileSync('README_DESIGN_SYSTEM.md', 'utf8');
  const contributing = readFileSync('CONTRIBUTING.md', 'utf8');
  const storybookMain = readFileSync('.storybook/main.js', 'utf8');
  const demoHtml = readFileSync('frontend/design-system-demo.html', 'utf8');

  assert.match(packageJson.scripts.storybook, /npm run build && .*storybook dev -p 6006 -c \.storybook/);
  assert.match(packageJson.scripts['storybook:build'], /npm run build && .*storybook build -c \.storybook -o storybook-static/);
  assert.match(readme, /npm --prefix frontend install/);
  assert.match(readme, /npm run storybook/);
  assert.match(readme, /npm run storybook:build/);
  assert.match(contributing, /npm --prefix frontend install/);
  assert.match(contributing, /npm run storybook/);
  assert.match(storybookMain, /stories:\s*\['\.\/stories\/\*\*\/\*\.stories/);
  assert.match(demoHtml, /\/dist\/styles\.css/);
});

test('shared component entrypoints and brand assets stay incrementally adoptable', () => {
  const componentsIndex = readFileSync('frontend/components/index.tsx', 'utf8');
  const brandAssetsSource = readFileSync('frontend/lib/brand-assets.js', 'utf8');
  const vanillaBridge = readFileSync('frontend/audioflow-components.js', 'utf8');
  const serverSource = readFileSync('frontend/server.js', 'utf8');
  const storybookMain = readFileSync('.storybook/main.js', 'utf8');
  const demoHtml = readFileSync('frontend/design-system-demo.html', 'utf8');
  const swiftComponents = readFileSync('AudioFlow/Sources/Components/AudioFlowComponents.swift', 'utf8');

  assert.ok(existsSync('AudioFlow/Assets/logo.svg'));
  assert.ok(existsSync('AudioFlow/Assets/logo-transparent.svg'));
  assert.match(componentsIndex, /audioFlowComponentLibrary/);
  assert.match(componentsIndex, /brandAssets/);
  assert.match(brandAssetsSource, /sharedAssetsBasePath.*\/logo\.svg/);
  assert.match(vanillaBridge, /window\.AudioFlowComponents/);
  assert.match(vanillaBridge, /AudioFlowBrandAssets/);
  assert.match(serverSource, /app\.use\('\/shared-assets', express\.static\(SHARED_ASSETS_DIR\)\)/);
  assert.match(storybookMain, /staticDirs:/);
  assert.match(demoHtml, /\/shared-assets\/logo\.svg/);
  assert.match(swiftComponents, /enum AudioFlowBrandAsset: String, CaseIterable/);
  assert.match(swiftComponents, /enum AudioFlowBranding/);
});
