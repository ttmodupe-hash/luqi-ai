import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const webBuild = readFileSync(new URL('../.github/workflows/web-build.yml', import.meta.url), 'utf8');
const launchSafety = readFileSync(new URL('../.github/workflows/launch-safety.yml', import.meta.url), 'utf8');

test('complete production-equivalent Web Build runs on PR and every main push', () => {
  const events = webBuild.split(/^permissions:/m)[0];
  assert.match(events, /^on:\s*$/m);
  assert.match(events, /^  pull_request:\n    branches: \[main\]$/m);
  assert.match(events, /^  push:\n    branches: \[main\]$/m);
  assert.match(webBuild, /^  validate-web:\s*$/m);
  assert.match(webBuild, /^      - name: Install exactly as Railway web image$/m);
  assert.match(webBuild, /^      - name: Build public UI and API bundle$/m);
  assert.match(webBuild, /^      - name: Verify bounded merchant-hosted checkout without money movement$/m);
});

test('Web Build checkout cannot persist a token and has read-only permissions', () => {
  assert.match(webBuild, /^permissions:\n  contents: read$/m);
  assert.match(webBuild, /^      - uses: actions\/checkout@v4\n        with:\n          persist-credentials: false$/m);
  assert.doesNotMatch(webBuild, /\$\{\{\s*secrets\./);
});

test('existing launch-safety workflow enforces these checks on pull requests and main', () => {
  const events = launchSafety.split(/^permissions:/m)[0];
  assert.match(events, /^  pull_request:\n    branches: \[main\]$/m);
  assert.match(events, /^  push:\n    branches: \[main\]$/m);
  assert.match(launchSafety, /^        run: node --test tests\/main-web-build-trigger\.test\.mjs$/m);
});
