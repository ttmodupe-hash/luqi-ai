import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { assetVerificationOrigin, verifyProductionAssets } from '../scripts/verify-production-assets.mjs';

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(),'luqi-assets-'));
  await mkdir(join(root,'assets'));
  await writeFile(join(root,'index.html'), '<html>Public fixture</html>');
  await writeFile(join(root,'assets/za-province-geometry-a1B2c3D4.js'), 'export const provinces = [];');
  try { await run(root); } finally { await rm(root,{recursive:true,force:true}); }
}

test('checks the emitted module bytes through HTTP rather than assuming build output is public', async () => fixture(async publicRoot => {
  const seen = [];
  const result = await verifyProductionAssets({ publicRoot, request:async (url, options) => {
    seen.push(new URL(url).pathname); assert.equal(options.credentials,'omit'); assert.equal(options.redirect,'error'); assert.equal(options.method,'GET');
    const path = new URL(url).pathname.slice(1);
    return new Response(await readFile(join(publicRoot,path)),{headers:{'Content-Type':path.endsWith('.js')?'text/javascript':'text/html'}});
  } });
  assert.equal(result.verified,2); assert.ok(seen.includes('/assets/za-province-geometry-a1B2c3D4.js'));
}));

test('a 404, SPA fallback, changed bytes or oversized response fails the release check', async () => fixture(async publicRoot => {
  for (const response of [new Response('{}',{status:404}),new Response('<html/>',{headers:{'Content-Type':'text/html'}}),
    new Response('different',{headers:{'Content-Type':'text/javascript'}}),new Response('x'.repeat(500),{headers:{'Content-Type':'text/javascript'}})]) {
    await assert.rejects(verifyProductionAssets({publicRoot,request:async url => new URL(url).pathname === '/index.html'
      ? new Response(await readFile(join(publicRoot,'index.html')),{headers:{'Content-Type':'text/html'}}) : response}),/Published asset|Asset response/);
  }
}));

test('limits observations to the intended production origins or a local test server', () => {
  assert.equal(assetVerificationOrigin('https://app.luqi-ai.com'),'https://app.luqi-ai.com');
  for (const origin of ['http://app.luqi-ai.com','https://evil.example','https://app.luqi-ai.com/path','https://user:pass@app.luqi-ai.com','https://app.luqi-ai.com/?target=secret']) assert.throws(()=>assetVerificationOrigin(origin));
});
