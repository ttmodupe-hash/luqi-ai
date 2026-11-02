import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('the PWA installs Luqi from the canonical same-origin site, not a sideload', async () => {
  for (const path of ['public/manifest.json', 'app/public/manifest.json']) {
    const manifest = JSON.parse(await source(path));
    assert.equal(manifest.name, 'Luqi — Your everyday workspace');
    assert.equal(manifest.short_name, 'Luqi');
    assert.equal(manifest.start_url, '/#/chat');
    assert.equal(manifest.scope, '/');
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
    assert.ok(manifest.icons.some(icon => icon.sizes === '512x512'));
    assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
    assert.ok(manifest.icons.every(icon => icon.src.startsWith('/')));
  }
});

test('frontend trees expose the same install route and safe browser UI', async () => {
  for (const path of ['pages/InstallAppPage.tsx', 'lib/pwa-install.ts']) {
    assert.equal(await source('src/' + path), await source('app/src/' + path));
  }
  for (const path of ['App.tsx', 'components/WorkspaceLayout.tsx', 'pages/Home.tsx', 'pages/StartPage.tsx']) {
    const text = await source('src/' + path);
    assert.match(text, /\/install/);
  }
  const page = await source('src/pages/InstallAppPage.tsx');
  assert.match(page, /Add to Home Screen/);
  assert.match(page, /browser may create its own managed Android package/);
  assert.match(page, /Huawei, Xiaomi, Oppo and other Android phones/);
  assert.match(page, /Keep Luqi up to date/);
  assert.match(page, /Do not choose “Install anyway”, switch off Play Protect or other protections/);
  assert.doesNotMatch(page, /https?:\/\/(?!app\.luqi-ai\.com)/);
});

test('installer does not make a provider call or treat request as completed install', async () => {
  const installer = await source('src/lib/pwa-install.ts');
  assert.match(installer, /beforeinstallprompt/);
  assert.match(installer, /appinstalled/);
  assert.match(installer, /candidate\.prompt\(\)/);
  assert.doesNotMatch(installer, /fetch\s*\(/);
  assert.doesNotMatch(installer, /localStorage|sessionStorage/);
  for (const path of ['index.html', 'app/index.html']) {
    assert.match(await source(path), /apple-mobile-web-app-title" content="Luqi"/);
  }
});
