import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/web-build.yml', import.meta.url), 'utf8');
const updates = readFileSync(new URL('../.github/dependabot.yml', import.meta.url), 'utf8');
const group = 'luqi-web-build-${{ github.event_name }}-${{ github.event.pull_request.number || github.run_id }}';
// Evaluate only the two documented substitutions in this fixed group template.
// These are contract checks, not a simulation of GitHub runner capacity or priority.
function key(event, number, run) {
  return group.replace('${{ github.event_name }}', event)
    .replace('${{ github.event.pull_request.number || github.run_id }}', String(number || run));
}

test('concurrency is applied to the actual workflow, scoped by event and PR', () => {
  assert.ok(workflow.includes('concurrency:\n  group: ' + group + '\n'));
  assert.ok(workflow.includes("  cancel-in-progress: ${{ github.event_name == 'pull_request' }}\n"));
  assert.equal((workflow.match(/^concurrency:/gm) || []).length, 1);
});
test('new runs of the same PR share a cancellation group', () => {
  assert.equal(key('pull_request', 401, 101), key('pull_request', 401, 102));
});
test('separate PRs cannot cancel one another', () => {
  assert.notEqual(key('pull_request', 401, 101), key('pull_request', 420, 102));
});
test('main runs retain separate groups', () => {
  assert.notEqual(key('push', undefined, 101), key('push', undefined, 102));
});
test('manual runs retain separate groups', () => {
  assert.notEqual(key('workflow_dispatch', undefined, 101), key('workflow_dispatch', undefined, 102));
});
test('event names prevent PR/main/manual numeric collisions', () => {
  assert.equal(new Set(['pull_request', 'push', 'workflow_dispatch'].map(e => key(e, undefined, 401))).size, 3);
});
test('existing triggers, read-only permissions and time bound remain', () => {
  assert.match(workflow, /on:\n  pull_request:\n    branches: \[main\]\n  push:\n    branches: \[main\]\n  workflow_dispatch:/);
  assert.match(workflow, /permissions:\n  contents: read\n/);
  assert.match(workflow, /timeout-minutes: 20/);
  assert.doesNotMatch(workflow, /continue-on-error: true|permissions: write-all|actions: write/);
});
test('build, complete browser command, security and health checks remain', () => {
  for (const text of ['run: npm run build', 'run: npx playwright test\n',
    'tests/ai-pilot-auth.test.ts', 'tests/guest-capacity.test.ts', 'tests/static-file-security.test.ts',
    'tests/customer-session-boundaries.test.tsx', 'tests/tender-original-review.test.ts',
    'Smoke-test production HTTP health endpoint', 'Verify shared frontend helpers in both source trees']) {
    assert.ok(workflow.includes(text), 'Required gate missing: ' + text);
  }
  assert.ok(workflow.includes('run: node --test tests/ci-queue-policy.test.mjs'));
});
const blocks = updates.split(/^  - package-ecosystem: /m).slice(1);
test('all four original update categories remain enabled', () => {
  assert.equal(blocks.length, 4);
  assert.deepEqual(blocks.map(b => b.match(/^"([^"]+)"/)[1]), ['pip', 'npm', 'npm', 'github-actions']);
  assert.deepEqual(blocks.map(b => b.match(/    directory: "([^"]+)"/)[1]), ['/', '/', '/app', '/']);
});
test('routine open-PR limits total eight, never zero', () => {
  const limits = blocks.map(b => Number(b.match(/open-pull-requests-limit: (\d+)/)[1]));
  assert.deepEqual(limits, [2, 3, 2, 1]);
  assert.equal(limits.reduce((a, b) => a + b, 0), 8);
});
test('weekly runs are spread over four days with an explicit timezone', () => {
  assert.deepEqual(blocks.map(b => b.match(/      day: "([^"]+)"/)[1]), ['wednesday', 'monday', 'tuesday', 'thursday']);
  for (const b of blocks) {
    assert.match(b, /interval: "weekly"/);
    assert.match(b, /time: "09:00"/);
    assert.match(b, /timezone: "UTC"/);
  }
});
test('grouping targets routine minor/patch updates, not security updates', () => {
  assert.equal((updates.match(/applies-to: version-updates/g) || []).length, 6);
  assert.equal((updates.match(/update-types: \["minor", "patch"\]/g) || []).length, 6);
  assert.doesNotMatch(updates, /applies-to: security-updates|target-branch:|rebase-strategy: disabled/);
  for (const b of blocks.slice(1, 3)) {
    assert.match(b, /dependency-type: production/);
    assert.match(b, /dependency-type: development/);
  }
});
test('pre-existing major-version exclusions are preserved without new ignores', () => {
  assert.equal((updates.match(/    ignore:/g) || []).length, 2);
  for (const i of [0, 2]) assert.match(blocks[i], /update-types: \["version-update:semver-major"\]/);
  for (const i of [1, 3]) assert.doesNotMatch(blocks[i], /    ignore:/);
});
