import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { MONITOR_ORIGINS, observeProduction } from '../scripts/production-health-monitor.mjs';

const commit = 'a'.repeat(40), now = 1794280000000;
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
});
function fixture({ mutate = (_url, result) => result, ai = 'disabled' } = {}) {
  const calls = [];
  return { calls, request: async (url, options) => {
    calls.push({ url, options });
    const path = new URL(url).pathname;
    let result;
    if (path === '/v1/release') result = json({ format: 'luqi.release.v1', commit });
    else if (path === '/v1/health') result = json({ status: 'healthy', service: 'luqi-ai-engine', timestamp: now });
    else if (path === '/v1/readiness') result = json({ checks: {
      runtime: 'up', persistence: 'connected', expected_database_driver: 'mysql', ai_pilot: ai,
    } }, ai === 'configured_not_verified' ? 200 : 503);
    else if (path === '/') result = new Response('<html><script type="module" src="/assets/index-fixture.js"></script></html>',
      { headers: { 'Content-Type': 'text/html' } });
    else if (path === '/assets/index-fixture.js') result = new Response('console.log("fixture");',
      { headers: { 'Content-Type': 'text/javascript' } });
    else throw Error('Unexpected probe');
    return mutate(url, result, calls);
  } };
}
const run = options => observeProduction({ expectedCommit: commit, now: () => now, ...options });

test('checks real contracts on both fixed hosts without interpreting disabled AI as an outage', async () => {
  for (const ai of ['disabled', 'billing_unapproved', 'configured_not_verified']) {
    const f = fixture({ ai });
    const report = await run({ request: f.request });
    assert.equal(report.result, 'core_checks_passed');
    assert.equal(report.observations.length, 2);
    assert.equal(report.full_launch_approved, false);
    assert.equal(report.inference_tested, false);
    assert.equal(report.recovery_tested, false);
    assert.equal(report.notification_delivery_tested, false);
    assert.equal(f.calls.length, 10);
    for (const { url, options } of f.calls) {
      assert.ok(MONITOR_ORIGINS.includes(new URL(url).origin));
      assert.equal(options.method, 'GET');
      assert.equal(options.credentials, 'omit');
      assert.equal(options.redirect, 'error');
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.headers.Cookie, undefined);
    }
  }
});

test('rejects stale or changing revisions and checks the second host independently', async () => {
  for (const mode of ['before', 'after', 'second-host']) {
    const f = fixture({ mutate: (url, result, calls) => {
      const release = url.endsWith('/v1/release');
      const bad = mode === 'before' || (mode === 'after' && calls.length > 1) ||
        (mode === 'second-host' && url.startsWith(MONITOR_ORIGINS[1]));
      return release && bad ? json({ format: 'luqi.release.v1', commit: 'b'.repeat(40) }) : result;
    } });
    await assert.rejects(run({ request: f.request }));
  }
});

test('rejects database failures, faulty AI configuration, stale health and cached/oversized JSON', async () => {
  const mutations = [
    (url, r) => url.endsWith('/v1/readiness') ? json({ checks: { persistence: 'unreachable' } }, 503) : r,
    (url, r) => url.endsWith('/v1/health') ? json({ status: 'healthy', service: 'luqi-ai-engine', timestamp: now - 300001 }) : r,
    (url, r) => url.endsWith('/v1/release') ? json({ padding: 'x'.repeat(4097) }) : r,
    (url, r) => url.endsWith('/v1/release') ? json({ format: 'luqi.release.v1', commit }, 200, { 'Cache-Control': 'public' }) : r,
  ];
  for (const mutate of mutations) await assert.rejects(run({ request: fixture({ mutate }).request }));
  await assert.rejects(run({ request: fixture({ ai: 'ledger_unavailable' }).request }));
});

test('fails when the frontend chunk is unavailable or is an HTML fallback, even with healthy API', async () => {
  for (const response of [new Response('missing', { status: 404 }),
    new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/javascript' } })]) {
    const f = fixture({ mutate: (url, r) => url.endsWith('.js') ? response : r });
    await assert.rejects(run({ request: f.request }));
  }
  const f = fixture({ mutate: (url, r) => url.endsWith('/') ? new Response(
    '<script src="https://untrusted.invalid/collect.js"></script>', { headers: { 'Content-Type': 'text/html' } }) : r });
  await assert.rejects(run({ request: f.request }));
  assert.equal(f.calls.some(c => c.url.includes('untrusted.invalid')), false);
});

test('requires an exact commit before network and never prints a supplied secret on CLI refusal', async () => {
  let calls = 0;
  await assert.rejects(run({ expectedCommit: 'bad', request: async () => { calls++; } }));
  assert.equal(calls, 0);
  const child = spawnSync(process.execPath, ['scripts/production-health-monitor.mjs'], {
    encoding: 'utf8', env: { PATH: process.env.PATH, LUQI_EXPECTED_COMMIT: 'private-marker-not-a-commit' },
  });
  assert.equal(child.status, 1);
  assert.ok(!(child.stdout + child.stderr).includes('private-marker'));
});


test('a matching but unapproved revision on BOTH live hosts is rejected, not self-authorized', async () => {
  const unapproved = 'b'.repeat(40);
  const f = fixture({ mutate: (url, response) => url.endsWith('/v1/release')
    ? json({ format: 'luqi.release.v1', commit: unapproved }) : response });
  await assert.rejects(run({ request: f.request }));
  let calls = 0;
  await assert.rejects(observeProduction({ request: async () => { calls++; } }));
  assert.equal(calls, 0, 'Missing independent SHA must fail BEFORE fetching any host');
  await assert.rejects(run({ expectedCommit: 'short', request: async () => { calls++; } }));
  assert.equal(calls, 0);
});

test('PR checks cannot demand a not-yet-deployed SHA; live observer stays independently pinned', () => {
  const workflow = readFileSync(new URL('../.github/workflows/production-operations.yml', import.meta.url), 'utf8');
  const pre = workflow.split('\n  monitor-contracts:\n')[1]?.split('\n  mysql-load-restart-rollback:\n')[0];
  const post = workflow.split('\n  observe-production:\n')[1];
  assert.ok(pre && post, 'Missing pre/post deployment jobs');
  assert.match(pre, /github.event_name == 'pull_request'/);
  assert.match(post, /github.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(post, /github.event_name == 'pull_request'|github.event.pull_request.base.sha/);
  assert.match(post, /github.event_name == 'schedule'/);
  assert.match(post, /github.event_name == 'workflow_dispatch'/);
  assert.match(post, /github.event_name == 'status'/);
  assert.match(post, /github.event.sha == github.sha/);
  assert.match(post, /run: node scripts\/check-canonical-railway-status.mjs/);
  assert.ok(post.indexOf('check-canonical-railway-status.mjs') < post.indexOf('production-health-monitor.mjs'));
  assert.match(post, /vars.LUQI_APPROVED_DEPLOYED_SHA/);
  assert.match(post, /github.event_name == 'status' && github.event.sha/);
  assert.doesNotMatch(post, /LUQI_OBSERVE_LIVE_BASELINE|baselineOnly|site[_ -]?returned[_ -]?sha|continue-on-error/);
  assert.match(workflow, /cancel-in-progress: \$\{\{ github.event_name == 'pull_request' \}\}/);
  assert.doesNotMatch(workflow, /pull_request_target:|workflow_run:|permissions:[\s\S]*?contents: write/);
});
