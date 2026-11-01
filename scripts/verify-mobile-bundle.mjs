import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

/** Include every static dependency, not just the HTML entry chunk.
 * Dynamic imports are intentionally excluded: browser tests prove on-demand use.
 */
export function initialJs(manifest) {
  assert.ok(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'Invalid manifest');
  const roots = Object.keys(manifest).filter(key => manifest[key]?.isEntry === true);
  assert.ok(roots.length > 0, 'Missing entry');
  const seen = new Set(), files = new Set();
  function visit(key) {
    if (seen.has(key)) return;
    assert.ok(Object.hasOwn(manifest, key), 'Missing static dependency');
    seen.add(key);
    const item = manifest[key];
    assert.ok(item && typeof item.file === 'string' && /^assets\/[A-Za-z0-9_./-]+\.js$/.test(item.file), 'Invalid JS asset');
    assert.ok(!item.file.split('/').some(part => part === '.' || part === '..'), 'Invalid asset path');
    files.add(item.file);
    assert.ok(item.imports === undefined || Array.isArray(item.imports), 'Invalid static imports');
    for (const dependency of item.imports ?? []) {
      assert.equal(typeof dependency, 'string', 'Invalid dependency');
      visit(dependency);
    }
  }
  roots.forEach(visit);
  return [...files].sort();
}

/** Vite may fold a thin wrapper (VideoStudioPage) into an already lazy
 * module as its import graph evolves. Validate the actual *deferred graph*
 * rather than requiring a particular file's isDynamicEntry flag.
 * Nothing on the HTML entry's static graph may contain these tools.
 */
export function verifyDeferred(manifest, files) {
  const roots = Object.keys(manifest).filter(key => manifest[key]?.isEntry === true);
  const deferred = new Set(), visited = new Set();
  function walk(key, afterLazy) {
    const marker = key + ':' + afterLazy;
    if (visited.has(marker)) return;
    visited.add(marker);
    const item = manifest[key];
    assert.ok(item && typeof item.file === 'string', 'Broken manifest import graph: ' + key);
    if (afterLazy) deferred.add(key);
    for (const dependency of item.imports ?? []) walk(dependency, afterLazy);
    for (const dependency of item.dynamicImports ?? []) walk(dependency, true);
  }
  roots.forEach(root => walk(root, false));
  for (const key of ['src/pages/PendulumLabPage.tsx', 'src/pages/VideoStudioPage.tsx', 'src/pages/CertMasterPage.tsx']) {
    // Rollup may assign a synthetic manifest key to the Studio facade when
    // the dynamically imported route reuses a shared Content Studio module.
    // In that case resolve the single exact VideoStudioPage chunk by its
    // build output name; never accept a generic bundle or an unknown route.
    const matching = Object.entries(manifest).filter(([candidate, output]) => {
      const file = output?.file ?? '';
      const prefix = 'assets/VideoStudioPage-';
      const digest = file.startsWith(prefix) && file.endsWith('.js')
        ? file.slice(prefix.length, -3) : '';
      return key === 'src/pages/VideoStudioPage.tsx' && candidate !== key &&
        /^[A-Za-z0-9_-]+$/.test(digest);
    });
    const resolvedKey = manifest[key] ? key : matching.length === 1 ? matching[0][0] : key;
    const item = manifest[resolvedKey];
    assert.ok(item && typeof item.file === 'string',
      'Lazy tool is missing from the build: ' + key + '; candidate entries: ' +
      JSON.stringify(Object.keys(manifest).filter(name => /StudioPage|Studio-|studio/i.test(name)).slice(0,12)));
    assert.ok(!files.includes(item.file), 'Tool is still initially loaded: ' + key);
    // The synthetic chunk must be reachable only through a dynamic boundary.
    assert.ok(item.isDynamicEntry === true || deferred.has(resolvedKey),
      'Tool has no verified lazy entry: ' + key + ' (' + resolvedKey + ')');
  }
}

async function measure(directory) {
  const manifest = JSON.parse(await readFile(resolve(directory, '.vite/manifest.json'), 'utf8'));
  const files = initialJs(manifest);
  let rawBytes = 0, gzipBytes = 0;
  for (const file of files) {
    const data = await readFile(resolve(directory, file));
    rawBytes += data.byteLength;
    gzipBytes += gzipSync(data).byteLength;
  }
  return { manifest, files, rawBytes, gzipBytes };
}

export async function compareMobileBundles(beforePath, afterPath) {
  const before = await measure(beforePath), after = await measure(afterPath);
  verifyDeferred(after.manifest, after.files);
  // Preserve the existing public release observer's core-code checks exactly.
  const entry = Object.values(after.manifest).find(item => item.isEntry === true);
  const entryText = await readFile(resolve(afterPath, entry.file), 'utf8');
  for (const marker of ['Review before queuing', 'Retry same submission', 'Export selected conversation',
    'Download all saved notes', 'luqi.private-notes.v1']) assert.ok(entryText.includes(marker), 'Core release marker left entry bundle');
  const report = { format: 'luqi.mobile-payload.v1',
    before: { files: before.files, rawBytes: before.rawBytes, gzipBytes: before.gzipBytes },
    after: { files: after.files, rawBytes: after.rawBytes, gzipBytes: after.gzipBytes },
    rawReductionPercent: Number((100 * (1 - after.rawBytes / before.rawBytes)).toFixed(2)),
    gzipReductionPercent: Number((100 * (1 - after.gzipBytes / before.gzipBytes)).toFixed(2)),
    limits: 'Initial JavaScript static graph only; gzip is a build estimate, not measured network latency. CSS, images and later tool downloads are excluded.' };
  assert.ok(before.rawBytes > 0 && before.gzipBytes > 0);
  assert.ok(after.rawBytes <= before.rawBytes * 0.8, 'Need at least 20% less initial raw JS');
  assert.ok(after.gzipBytes <= before.gzipBytes * 0.9, 'Need at least 10% less initial gzip JS');
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.equal(process.argv.length, 4, 'Expected two build directories');
  console.log(JSON.stringify(await compareMobileBundles(process.argv[2], process.argv[3]), null, 2));
}
