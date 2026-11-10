import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { probeLocalHttp, summarizeDurations } from '../scripts/http-load-probe.mjs';

test('calculates per-request average and nearest-rank percentiles, not wall time divided by concurrency', () => {
  assert.deepEqual(summarizeDurations([100, 200, 300, 400, 500]), {
    samples: 5, mean_ms: 300, p50_ms: 300, p95_ms: 500, p99_ms: 500, max_ms: 500,
  });
  for (const data of [[], [NaN], [-1], [Infinity]]) assert.throws(() => summarizeDurations(data));
});

test('rejects public/custom destinations, credentials, paths and excessive traffic before requesting', async () => {
  const invalid = ['https://app.luqi-ai.com', 'http://localhost:3000', 'http://127.0.0.1:3000/route',
    'http://127.0.0.1:3000?token=secret', 'http://name:pass@127.0.0.1:3000', 'http://127.0.0.1:99999'];
  let calls = 0;
  const request = async () => { calls++; };
  for (const origin of invalid) await assert.rejects(probeLocalHttp({ origin, request }));
  for (const options of [{ concurrency: 21 }, { concurrency: 0 }, { concurrency: 1.5 }, { total: 201 }, { timeoutMs: 6000 }]) {
    await assert.rejects(probeLocalHttp({ origin: 'http://127.0.0.1:3000', request, ...options }));
  }
  assert.equal(calls, 0);
});

test('measures actual HTTP responses with bounded concurrency and waits for complete bodies', async () => {
  let active = 0, peak = 0; const paths = new Set(); const methods = new Set();
  const server = createServer((req, res) => {
    active++; peak = Math.max(peak, active); paths.add(req.url); methods.add(req.method);
    const html = req.url === '/';
    res.setHeader('Content-Type', html ? 'text/html' : 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(200);
    const body = html ? '<html><script src="/fixture.js"></script></html>' :
      JSON.stringify(req.url === '/v1/health' ? { status: 'healthy' } : { format: 'luqi.release.v1', commit: 'a'.repeat(40) });
    res.write(body.slice(0, 4));
    setTimeout(() => { active--; res.end(body.slice(4)); }, 15);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await probeLocalHttp({ origin: `http://127.0.0.1:${server.address().port}`, concurrency: 5, total: 15 });
    assert.equal(result.passed, true);
    assert.equal(result.succeeded, 15);
    assert.equal(result.failed, 0);
    assert.ok(peak > 1 && peak <= 5);
    assert.ok(result.latency.mean_ms >= 10);
    assert.equal(result.latency.samples, 15);
    assert.equal(result.production_capacity_verified, false);
    assert.deepEqual([...methods], ['GET']);
    assert.deepEqual([...paths].sort(), ['/', '/v1/health', '/v1/release']);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('stops dispatching after repeated errors, reports failure, and times out stalled bodies', async () => {
  let mode = 'status';
  const server = createServer((_req, res) => {
    if (mode === 'status') { res.writeHead(503); res.end('failure-marker'); }
    else { res.setHeader('Content-Type', 'application/json'); res.writeHead(200); res.write('{'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (mode of ['status', 'stalled']) {
      const report = await probeLocalHttp({ origin, concurrency: 2, total: 20, timeoutMs: 60 });
      assert.equal(report.passed, false);
      assert.ok(report.attempted >= 5 && report.attempted <= 6);
      assert.equal(report.succeeded, 0);
      assert.equal(JSON.stringify(report).includes('failure-marker'), false);
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
