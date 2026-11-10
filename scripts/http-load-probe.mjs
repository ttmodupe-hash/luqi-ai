/** Bounded HTTP concurrency probe. Loopback-only GETs; never stress production. */
import { pathToFileURL } from 'node:url';

const PATHS = Object.freeze(['/v1/health', '/v1/release', '/']);
const fail = () => { throw new Error('INVALID_LOCAL_LOAD_PROBE'); };
export function summarizeDurations(durations) {
  if (!Array.isArray(durations) || !durations.length ||
      durations.some(n => !Number.isFinite(n) || n < 0)) fail();
  const sorted = [...durations].sort((a, b) => a - b);
  const percentile = p => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)];
  return { samples: sorted.length, mean_ms: durations.reduce((a, b) => a + b, 0) / durations.length,
    p50_ms: percentile(.5), p95_ms: percentile(.95), p99_ms: percentile(.99), max_ms: sorted.at(-1) };
}

export async function probeLocalHttp({ origin, concurrency = 5, total = 60, timeoutMs = 5000,
  request = fetch, clock = () => performance.now() } = {}) {
  if (typeof origin !== 'string' || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(origin) ||
      Number(new URL(origin).port) > 65535 || !Number.isSafeInteger(concurrency) ||
      concurrency < 1 || concurrency > 20 || !Number.isSafeInteger(total) ||
      total < concurrency || total > 200 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) fail();
  let next = 0; let failed = 0; let succeeded = 0; let active = 0; let peak = 0;
  const durations = []; const started = clock();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < total && failed < 5) {
      const path = PATHS[next++ % PATHS.length];
      const begin = clock(); active++; peak = Math.max(peak, active);
      let reader;
      try {
        const response = await request(origin + path, {
          method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store',
          signal: AbortSignal.timeout(timeoutMs), headers: { 'Cache-Control': 'no-cache' },
        });
        reader = response.body?.getReader();
        if (!reader || response.status !== 200 || response.redirected) fail();
        let size = 0; const chunks = [];
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > (path === '/' ? 131072 : 4096)) fail();
          chunks.push(Buffer.from(part.value));
        }
        const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
        const text = Buffer.concat(chunks).toString('utf8');
        if (path === '/') {
          if (type !== 'text/html' || !text.includes('<script')) fail();
        } else {
          if (type !== 'application/json' || response.headers.get('Cache-Control') !== 'no-store') fail();
          const body = JSON.parse(text);
          if (path === '/v1/health' ? body.status !== 'healthy' :
            body.format !== 'luqi.release.v1' || !/^[a-f0-9]{40}$/.test(body.commit)) fail();
        }
        succeeded++;
      } catch { failed++; }
      finally {
        if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock(); }
        active--; durations.push(clock() - begin);
      }
    }
  }));
  const elapsed = clock() - started;
  return { format: 'luqi.local-http-load.v1', scope: 'loopback_http_only', concurrency,
    peak_in_flight: peak, requested: total, attempted: next, succeeded, failed,
    elapsed_ms: elapsed, requests_per_second: elapsed > 0 ? next * 1000 / elapsed : 0,
    latency: summarizeDurations(durations),
    passed: failed === 0 && next === total, production_capacity_verified: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.env.LUQI_LOCAL_LOAD_APPROVED !== 'true' || process.argv.length !== 2) fail();
    const result = await probeLocalHttp({ origin: process.env.LUQI_LOCAL_ORIGIN,
      concurrency: Number(process.env.LUQI_LOCAL_CONCURRENCY ?? 5), total: 60 });
    console.log(JSON.stringify(result));
    if (!result.passed) process.exitCode = 1;
  } catch { console.error('FAIL: local HTTP probe refused or failed. No target or response logged.'); process.exitCode = 1; }
}
