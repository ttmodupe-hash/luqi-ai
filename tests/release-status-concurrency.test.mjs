import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflows = [
  ['custom-domain-https.yml', 'luqi-custom-https', 11, 'scripts/verify-custom-domain.mjs'],
  ['public-release-checks.yml', 'luqi-public-release', 10, 'scripts/verify-deployed-release.mjs'],
];
const scope = "${{ github.event_name == 'status' && github.run_id || github.ref }}";
const cancellation = "${{ github.event_name != 'status' }}";
const canonicalGuard = `    if: >-
      github.event_name != 'status' ||
      (github.event.state == 'success' &&
       github.event.context == 'kind-spontaneity - web' &&
       github.event.sha == github.sha &&
       startsWith(github.event.target_url, 'https://railway.com/project/9f627cb8-3136-4b30-89d2-32ca648a1e5f/service/a9b293e0-1966-43be-80ef-3dd27acc6ab7') &&
       contains(github.event.target_url, 'environmentId=1e192ef3-1fa6-4684-81fc-60165c7b0e22'))`;

// Substitute only the fixed GitHub expressions above. This checks key-isolation
// semantics, not real runner availability, event authenticity or production health.
function key(prefix, { event, runId, ref }) {
  const template = prefix + '-${{ github.event_name }}-' + scope;
  return template.replace('${{ github.event_name }}', event)
    .replace(scope, event === 'status' ? String(runId) : ref);
}

for (const [file, prefix, timeout, probe] of workflows) {
  const text = readFileSync(new URL('../.github/workflows/' + file, import.meta.url), 'utf8');
  test(file + ': each status delivery has its own workflow-level group', () => {
    assert.ok(text.includes('  group: ' + prefix + '-${{ github.event_name }}-' + scope + '\n'));
    assert.equal((text.match(/^concurrency:/gm) || []).length, 1);
  });
  test(file + ': only non-status events may supersede earlier work', () => {
    assert.ok(text.includes('  cancel-in-progress: ' + cancellation + '\n'));
    assert.doesNotMatch(text, /cancel-in-progress: true/);
  });
  test(file + ': the entire canonical success/origin/environment/SHA guard is unchanged', () => {
    assert.ok(text.includes(canonicalGuard));
    assert.ok(text.includes('run: node scripts/check-canonical-railway-status.mjs'));
    assert.ok(text.includes('LUQI_MAIN_SHA: ${{ github.sha }}'));
  });
  test(file + ': live verification remains exact-commit and status/manual only', () => {
    assert.ok(text.includes("if: github.event_name == 'status' || github.event_name == 'workflow_dispatch'"));
    assert.ok(text.includes('LUQI_VERIFY_PUBLIC: "true"'));
    assert.ok(text.includes("LUQI_EXPECTED_COMMIT: ${{ github.event_name == 'status' && github.event.sha || github.sha }}"));
    assert.ok(text.includes('run: node ' + probe));
  });
  test(file + ': tests are wired into the existing workflow and path trigger', () => {
    assert.ok(text.includes('- "tests/release-status-concurrency.test.mjs"'));
    assert.ok(text.includes('node --test tests/canonical-railway-status.test.mjs tests/release-status-concurrency.test.mjs'));
    assert.ok(text.includes('  status:\n'));
    assert.ok(text.includes('  workflow_dispatch:\n'));
    assert.ok(text.includes('  push:\n    branches: [main]'));
  });
  test(file + ': permissions, credentials policy and original timeout stay bounded', () => {
    assert.ok(text.includes('permissions:\n  contents: read\n'));
    assert.ok(text.includes('persist-credentials: false'));
    assert.ok(text.includes('timeout-minutes: ' + timeout));
    assert.doesNotMatch(text, /actions: write|write-all|continue-on-error|workflow_run:|pull_request_target:/);
  });
}
const production = { event: 'status', runId: 100, ref: 'refs/heads/main' };
const preview = { ...production, runId: 101 };
test('a preview with the same status context cannot share the production group', () => {
  for (const [, prefix] of workflows) assert.notEqual(key(prefix, production), key(prefix, preview));
});
test('a later pending/failure/stale status cannot share the original group either', () => {
  for (const runId of [102, 103, 104]) assert.notEqual(key('luqi-custom-https', production), key('luqi-custom-https', { ...production, runId }));
});
test('separate verification workflows remain isolated', () => {
  assert.notEqual(key('luqi-custom-https', production), key('luqi-public-release', production));
});
test('main push runs retain per-ref supersession', () => {
  assert.equal(key('luqi-public-release', { ...production, event: 'push' }), key('luqi-public-release', { ...preview, event: 'push' }));
});
test('different branches and PR refs cannot cancel each other', () => {
  const a = { ...production, event: 'pull_request', ref: 'refs/pull/401/merge' };
  const b = { ...preview, event: 'pull_request', ref: 'refs/pull/422/merge' };
  assert.notEqual(key('luqi-public-release', a), key('luqi-public-release', b));
});
test('event kinds keep push/manual/status runs separate', () => {
  const keys = ['push', 'workflow_dispatch', 'status'].map(event => key('luqi-public-release', { ...production, event }));
  assert.equal(new Set(keys).size, 3);
});
