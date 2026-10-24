import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

// --list only loads config and collects cases. It starts no server/browser and
// performs no database/provider operation. Never use a real credential here.
const clean = { ...process.env };
for (const key of ['LUQI_BROWSER_BASE_URL', 'LUQI_MYSQL_CI_FIXTURE', 'DATABASE_URL', 'GITHUB_ACTIONS']) delete clean[key];
const exactFixture = { LUQI_MYSQL_CI_FIXTURE: 'true', GITHUB_ACTIONS: 'true',
  DATABASE_URL: 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci' };
function collect(env) {
  const result = spawnSync(process.execPath,
    // Do not emit a JSON acceptance report for collection alone.
    ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.mysql-webkit.config.ts', '--list', '--reporter=list'],
    { env: { ...clean, ...env }, encoding: 'utf8', timeout: 20_000, maxBuffer: 2 * 1024 * 1024 });
  assert.equal(result.error, undefined, 'Collection failed to start');
  assert.equal(result.signal, null, 'Collection timed out or was interrupted');
  return { status: result.status, text: result.stdout + result.stderr };
}
for (const [label, env] of [
  ['missing fixture approval', { ...exactFixture, LUQI_MYSQL_CI_FIXTURE: 'false' }],
  ['not GitHub Actions', { ...exactFixture, GITHUB_ACTIONS: 'false' }],
  ['different database', { ...exactFixture, DATABASE_URL: 'mysql://synthetic:unused@example.invalid/other' }],
]) {
  test('WebKit account suite refuses ' + label, () => {
    const result = collect(env); assert.notEqual(result.status, 0);
    // A syntax/import failure is not proof of a working target guard.
    assert.ok(result.text.includes('Refusing real-browser writes outside the exact disposable MySQL CI fixture'), result.text);
  });
}
test('WebKit account suite refuses browser target overrides', () => {
  const result = collect({ ...exactFixture, LUQI_BROWSER_BASE_URL: 'https://example.invalid' });
  assert.notEqual(result.status, 0);
  assert.ok(result.text.includes('WebKit MySQL checks refuse a caller-selected browser URL'), result.text);
});
test('exact disposable fixture collects both real WebKit layouts', () => {
  const result = collect(exactFixture); assert.equal(result.status, 0, result.text);
  assert.match(result.text, /\[webkit-mysql-desktop\]/);
  assert.match(result.text, /\[webkit-mysql-mobile\]/);
  assert.match(result.text, /Total: [1-9][0-9]* tests/);
});
