/** Offline contract for predeploy lab CI vs independently evidenced postdeploy checks.
 * No HTTP requests, accounts, secrets, production writes or paid providers. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/lab-framing.yml', import.meta.url), 'utf8');
const pre = workflow.split('  production-browser-boundary:\n')[1]?.split('  public-framing:\n')[0];
const post = workflow.split('  public-framing:\n')[1];

test('predeployment PR/main job remains mandatory and contains actual sandbox/real-server acceptance', () => {
  assert.ok(pre, 'predeploy job was removed');
  assert.match(workflow, /^  pull_request:\n    branches: \[main\]$/m);
  assert.match(workflow, /^  push:\n    branches: \[main\]$/m);
  assert.match(pre, /^    if: github.event_name == 'pull_request' \|\| github.event_name == 'push'$/m);
  for (const required of [
    'tests/lab-framing-release-gates.test.mjs',
    'tests/frame-policy.test.ts', 'tests/lab-static-fallback.test.ts', 'tests/http-safety.test.ts',
    'npm run build', 'playwright.framing.config.ts',
  ]) assert.ok(pre.includes(required), 'Predeploy safety step missing: ' + required);
  assert.doesNotMatch(pre, /LUQI_VERIFY_PUBLIC|LUQI_EXPECTED_COMMIT|verify-deployed-release|verify-lab-framing/);
});

test('live lab acceptance is status-triggered after canonical Railway SUCCESS, never push/PR', () => {
  assert.ok(post, 'postdeploy job was removed');
  assert.match(workflow, /^  status:\s*$/m);
  assert.match(post, /^    if: >-$/m);
  const required = [
    "github.event_name == 'status'", "github.event.state == 'success'",
    "github.event.context == 'kind-spontaneity - web'", 'github.event.sha == github.sha',
    '9f627cb8-3136-4b30-89d2-32ca648a1e5f',
    'a9b293e0-1966-43be-80ef-3dd27acc6ab7',
    '1e192ef3-1fa6-4684-81fc-60165c7b0e22',
    'LUQI_MAIN_SHA: ${{ github.sha }}',
    'run: node scripts/check-canonical-railway-status.mjs',
    'run: node scripts/verify-deployed-release.mjs',
    'run: node scripts/verify-lab-framing.mjs',
  ];
  for (const item of required) assert.ok(post.includes(item), 'Missing independent release guard: ' + item);
  assert.equal((post.match(/LUQI_EXPECTED_COMMIT: \$\{\{ github.event.sha \}\}/g) ?? []).length, 2);
  assert.doesNotMatch(post, /LUQI_EXPECTED_COMMIT: \$\{\{ github.sha \}\}/);
  assert.doesNotMatch(post, /github.event_name == 'push'|github.event_name == 'pull_request'/);
  assert.doesNotMatch(post, /needs: production-browser-boundary/);
});

test('no live endpoint self-revision is treated as an expected approved commit', () => {
  assert.doesNotMatch(workflow, /LUQI_OBSERVE_LIVE_BASELINE|site[_ -]?returned[_ -]?sha|continue-on-error/i);
  assert.match(post, /LUQI_EXPECTED_COMMIT: \$\{\{ github.event.sha \}\}/);
  assert.ok(post.indexOf('check-canonical-railway-status.mjs') <
    post.indexOf('verify-deployed-release.mjs'), 'Canonical success must be authenticated before live probe');
});

test('status events cannot cancel independent postdeploy acceptance; main checks are noncancellable', () => {
  assert.match(workflow, /group: lab-framing-\$\{\{ github.event_name \}\}-\$\{\{ github.event_name == 'status' && github.run_id \|\| github.ref \}\}/);
  assert.match(workflow, /cancel-in-progress: \$\{\{ github.event_name == 'pull_request' \}\}/);
  assert.doesNotMatch(workflow, /cancel-in-progress: true/);
});

test('no escalation in permissions or live credentials', () => {
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.doesNotMatch(workflow, /pull_request_target:|workflow_run:|actions: write|write-all|secrets\.|RAILWAY_TOKEN|DATABASE_URL/);
  assert.equal((workflow.match(/persist-credentials: false/g) ?? []).length, 2);
  assert.match(pre, /timeout-minutes: 12/);
  assert.match(post, /timeout-minutes: 12/);
});
