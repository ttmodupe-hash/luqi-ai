// Explicitly authorised public, unauthenticated GET checks only. No account,
// inference, email, database mutation or third-party embedding request.
const origin = 'https://web-production-a4b79.up.railway.app';
const expected = process.env.LUQI_EXPECTED_COMMIT;
if (process.env.LUQI_VERIFY_PUBLIC !== 'true' || !/^[a-f0-9]{40}$/.test(expected || '')) {
  console.error('Public framing checks require explicit approval and an exact revision.'); process.exit(1);
}
async function get(path) {
  return fetch(origin + path, { redirect: 'error', credentials: 'omit', cache: 'no-store',
    signal: AbortSignal.timeout(8000) });
}
async function revision() {
  const response = await get('/v1/release');
  if (response.status !== 200 || (await response.json()).commit !== expected) throw new Error();
}
try {
  await revision();
  const root = await get('/');
  if (root.status !== 200 || root.headers.get('x-frame-options') !== 'DENY' ||
      root.headers.get('content-security-policy') !== "frame-ancestors 'none'") throw new Error();
  await root.body?.cancel();
  console.log('PASS public account shell is non-frameable');
  for (const lab of ['biology', 'chemistry', 'algebra', 'geometry']) {
    const response = await get(`/labs/${lab}_lab.html`);
    if (response.status !== 200 || !/^text\/html(?:;|$)/i.test(response.headers.get('content-type') || '') ||
        response.headers.get('x-frame-options') !== 'SAMEORIGIN' ||
        response.headers.get('content-security-policy') !== "frame-ancestors 'self'") throw new Error();
    const html = await response.text();
    if (html.length > 100000 || !html.includes('<canvas') || !html.includes('<h1')) throw new Error();
    console.log(`PASS public ${lab} teaching document and restricted framing headers`);
  }
  await revision();
  console.log('PASS exact production revision before and after five public framing checks');
} catch {
  console.error('Public framing verification failed; response details suppressed.'); process.exitCode = 1;
}
