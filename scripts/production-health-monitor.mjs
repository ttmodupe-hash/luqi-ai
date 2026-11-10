/** Fixed-origin, read-only production observations. No accounts or AI calls. */
import { pathToFileURL } from 'node:url';

export const MONITOR_ORIGINS = Object.freeze([
  'https://app.luqi-ai.com', 'https://web-production-a4b79.up.railway.app',
]);
const SHA = /^[a-f0-9]{40}$/;
const timeoutMs = 8_000;
const fail = () => { throw new Error('PRODUCTION_OBSERVATION_FAILED'); };
class ObservationError extends Error {
  constructor(host, step) { super(`FAIL: ${host} ${step} observation failed. No raw response logged.`); }
}

async function read(request, url, { json = true, limit = 4096 } = {}) {
  const response = await request(url, {
    method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store',
    headers: { Accept: json ? 'application/json' : '*/*', 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const reader = response.body?.getReader();
  if (!reader) fail();
  try {
    const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    if (response.redirected || (json && (type !== 'application/json' ||
        response.headers.get('Cache-Control') !== 'no-store'))) fail();
    let size = 0; const chunks = [];
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > limit) fail();
      chunks.push(Buffer.from(part.value));
    }
    const text = Buffer.concat(chunks).toString('utf8');
    const body = json ? JSON.parse(text) : text;
    if (json && (!body || typeof body !== 'object' || Array.isArray(body))) fail();
    return { status: response.status, type, body };
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

function revision(result) {
  const b = result.body;
  if (result.status !== 200 || Object.keys(b).sort().join(',') !== 'commit,format' ||
      b.format !== 'luqi.release.v1' || !SHA.test(b.commit)) fail();
  return b.commit;
}

// The caller must independently supply an approved exact deployment SHA. Never derive it from a live host.
export async function observeProduction({ expectedCommit, request = fetch, now = () => Date.now() } = {}) {
  if (typeof expectedCommit !== 'string' || !SHA.test(expectedCommit)) fail();
  const observations = [];
  for (const origin of MONITOR_ORIGINS) {
    let step = 'revision_before';
    try {
      // Observations must refer to one unchanged revision, including across hosts.
      const before = revision(await read(request, origin + '/v1/release'));
      if (before !== expectedCommit) fail();
      step = 'http_health';
      const health = await read(request, origin + '/v1/health');
      if (health.status !== 200 || health.body.status !== 'healthy' ||
          health.body.service !== 'luqi-ai-engine' || !Number.isSafeInteger(health.body.timestamp) ||
          Math.abs(now() - health.body.timestamp) > 300_000) fail();
      step = 'database_readiness';
      const readiness = await read(request, origin + '/v1/readiness');
      const state = readiness.body.checks?.ai_pilot;
      const expectedStatus = state === 'configured_not_verified' ? 200 : 503;
      if (!['configured_not_verified', 'disabled', 'billing_unapproved'].includes(state) ||
          readiness.status !== expectedStatus || readiness.body.checks?.runtime !== 'up' ||
          readiness.body.checks?.persistence !== 'connected' ||
          readiness.body.checks?.expected_database_driver !== 'mysql') fail();
      if (origin === MONITOR_ORIGINS[0]) {
        // Liveness alone misses a broken SPA entry chunk. Fetch only the exact
        // same-origin Vite entry declared by the public document, never an input URL.
        step = 'frontend_document';
        const home = await read(request, origin + '/', { json: false, limit: 131072 });
        if (home.status !== 200 || home.type !== 'text/html') fail();
        const entry = home.body.match(/<script\b[^>]*\bsrc=["'](\/assets\/index-[A-Za-z0-9_-]+\.js)["'][^>]*>/);
        if (!entry) fail();
        step = 'frontend_entry';
        const script = await read(request, origin + entry[1], { json: false, limit: 8 * 1024 * 1024 });
        if (script.status !== 200 || !['text/javascript', 'application/javascript'].includes(script.type) ||
            !script.body.trim() || /^\s*</.test(script.body)) fail();
      }
      step = 'revision_after';
      if (revision(await read(request, origin + '/v1/release')) !== before) fail();
      observations.push({ host: new URL(origin).hostname, commit: before,
        http: 'observed', persistence: 'connected', ai_configuration: state });
    } catch { throw new ObservationError(origin === MONITOR_ORIGINS[0] ? 'custom_host' : 'railway_host', step); }
  }
  return { format: 'luqi.production-observation.v1', observed_at: new Date(now()).toISOString(),
    result: 'core_checks_passed', observations, inference_tested: false,
    recovery_tested: false, notification_delivery_tested: false, full_launch_approved: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 2 || process.env.LUQI_VERIFY_PUBLIC !== 'true') fail();
    console.log(JSON.stringify(await observeProduction({ expectedCommit: process.env.LUQI_EXPECTED_COMMIT })));
  } catch (error) {
    // Provider errors, responses, addresses and credentials never reach logs.
    console.error(error instanceof ObservationError ? error.message :
      'FAIL: production observation refused. Check authorization and expected commit. No source values logged.');
    process.exitCode = 1;
  }
}
