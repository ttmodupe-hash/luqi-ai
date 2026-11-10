/** Verify actual emitted public files through the production HTTP server.
 * Never request credentials, source files, accounts or provider operations.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_FILES = 500, MAX_BYTES = 8 * 1024 * 1024;
const digest = data => createHash('sha256').update(data).digest('hex');

export function assetVerificationOrigin(value) {
  const url = new URL(value);
  const local = url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
  const publicHost = url.protocol === 'https:' && ['app.luqi-ai.com', 'web-production-a4b79.up.railway.app'].includes(url.hostname) && !url.port;
  if ((!local && !publicHost) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Unapproved asset verification origin');
  return url.origin;
}

export async function publishedAssets(publicRoot) {
  const root = resolve(publicRoot), files = ['index.html'];
  async function visit(directory) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes:true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      if (entry.isSymbolicLink() || entry.name.startsWith('.')) throw new Error('Unexpected public asset entry');
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (/\.(?:js|css|wasm)$/.test(entry.name)) files.push(relative(root, path).split(sep).join('/'));
      if (files.length > MAX_FILES) throw new Error('Public asset count exceeded verification bound');
    }
  }
  await visit(join(root, 'assets'));
  await visit(join(root, 'checkout-assets'));
  if (files.length < 2) throw new Error('No emitted application assets to verify');
  const result = [];
  for (const path of files.sort()) {
    const bytes = await readFile(join(root, path));
    if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Invalid emitted public asset size');
    result.push({ path, bytes:bytes.length, sha256:digest(bytes) });
  }
  return result;
}

async function responseDigest(response, max) {
  if (!response.body) throw new Error('Empty asset response');
  const reader = response.body.getReader(), hash = createHash('sha256'); let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > max) throw new Error('Asset response exceeded expected size');
      hash.update(next.value);
    }
    return { bytes, sha256:hash.digest('hex') };
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function verifyProductionAssets({ publicRoot = 'dist/public', origin = 'http://127.0.0.1:8765', request = fetch } = {}) {
  const target = assetVerificationOrigin(origin);
  const files = await publishedAssets(publicRoot);
  // Four bounded reads at a time; no retries, redirects, cookies or writes.
  for (let start = 0; start < files.length; start += 4) {
    await Promise.all(files.slice(start, start + 4).map(async asset => {
      const response = await request(target + '/' + asset.path, { method:'GET', redirect:'error', credentials:'omit', cache:'no-store',
        headers:{ 'Cache-Control':'no-cache' }, signal:AbortSignal.timeout(15_000) });
      const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
      const expected = asset.path.endsWith('.js') ? ['text/javascript','application/javascript'] : asset.path.endsWith('.css') ? ['text/css'] : asset.path.endsWith('.wasm') ? ['application/wasm'] : ['text/html'];
      if (response.status !== 200 || !expected.includes(type)) {
        await response.body?.cancel().catch(() => {});
        throw new Error('Published asset is unavailable or has the wrong type: ' + asset.path);
      }
      const observed = await responseDigest(response, asset.bytes);
      if (observed.bytes !== asset.bytes || observed.sha256 !== asset.sha256) throw new Error('Published asset differs from the build: ' + asset.path);
    }));
  }
  return { verified:files.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyProductionAssets({ origin:process.env.LUQI_ASSET_VERIFY_ORIGIN || 'http://127.0.0.1:8765' });
    console.log('Verified ' + result.verified + ' emitted public files through the production server.');
  } catch (error) { console.error('Production asset verification failed: ' + error.message); process.exitCode = 1; }
}
