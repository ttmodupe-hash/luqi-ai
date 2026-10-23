/** Observe the expected public revision before and after read-only release
 * probes. No Railway/GitHub/provider credentials, deployment or AI generation.
 */
import { pathToFileURL } from 'node:url';

export const PUBLIC_RELEASE_ORIGIN = 'https://web-production-a4b79.up.railway.app';
const SHA = /^[a-f0-9]{40}$/;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function readPublicRevision(request = fetch, timeoutMs = 5000) {
  const response = await request(PUBLIC_RELEASE_ORIGIN + '/v1/release', {
    method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error',
    headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.body) return null;
  const reader = response.body.getReader();
  try {
    if (response.status !== 200 || response.headers.get('Cache-Control') !== 'no-store' ||
        response.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return null;
    const chunks = []; let bytes = 0;
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > 4096) return null;
      chunks.push(Buffer.from(next.value));
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'commit,format' ||
        body.format !== 'luqi.release.v1' || typeof body.commit !== 'string' || !SHA.test(body.commit)) return null;
    return body.commit;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function waitForPublicRevision(expected, options = {}) {
  if (typeof expected !== 'string' || !SHA.test(expected)) throw new Error('Expected a full public commit SHA');
  const { request = fetch, pause = wait, clock = () => performance.now(), timeoutMs = 300_000 } = options;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300_000) throw new Error('Invalid observation deadline');
  const end = clock() + timeoutMs;
  for (let attempt = 0; attempt < 60 && clock() < end; attempt++) {
    let observed = null;
    try { observed = await readPublicRevision(request, Math.max(1, Math.min(5000, Math.ceil(end - clock())))); }
    catch { /* Untrusted response/transport details never reach CI logs. */ }
    if (observed === expected) return;
    const remaining = end - clock();
    if (remaining > 0) await pause(Math.min(5000, remaining));
  }
  throw new Error('Expected production revision was not observed before the deadline');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.env.LUQI_VERIFY_PUBLIC !== 'true') throw new Error('Public verification not authorized');
    const expected = process.env.LUQI_EXPECTED_COMMIT;
    await waitForPublicRevision(expected);
    console.log('Observed expected production revision before release probes.');
    await import('./verify-public-release.mjs');
    if (await readPublicRevision() !== expected) throw new Error('Production revision changed during verification');
    console.log('Verified expected production revision after release probes: ' + expected);
  } catch {
    console.error('Public release verification failed: expected revision or safety probes were not verified.');
    process.exitCode = 1;
  }
}
