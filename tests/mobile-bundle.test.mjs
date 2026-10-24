import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initialJs, verifyDeferred } from '../scripts/verify-mobile-bundle.mjs';

test('counts the complete static graph without eagerly counting dynamic imports', () => {
  const manifest = {
    'index.html': { isEntry: true, file: 'assets/main.js', imports: ['common'], dynamicImports: ['tool'] },
    common: { file: 'assets/common.js', imports: ['vendor'] },
    vendor: { file: 'assets/vendor.js' },
    tool: { file: 'assets/tool.js', isDynamicEntry: true },
  };
  assert.deepEqual(initialJs(manifest), ['assets/common.js', 'assets/main.js', 'assets/vendor.js']);
});
test('shared imports and cycles are counted once', () => {
  assert.deepEqual(initialJs({ first: { isEntry: true, file: 'assets/a.js', imports: ['second'] },
    second: { file: 'assets/b.js', imports: ['first'] } }), ['assets/a.js', 'assets/b.js']);
});
test('all HTML entries are included, not only the smallest entry', () => {
  assert.deepEqual(initialJs({ a: { isEntry: true, file: 'assets/a.js' }, b: { isEntry: true, file: 'assets/b.js' } }), ['assets/a.js', 'assets/b.js']);
});
for (const manifest of [null, [], {}, { entry: { isEntry: true, file: 'assets/main.js', imports: ['missing'] } },
  { entry: { isEntry: true, file: '../secret.js' } }, { entry: { isEntry: true, file: 'assets/../secret.js' } },
  { entry: { isEntry: true, file: 'https://example.invalid/script.js' } },
  { entry: { isEntry: true, file: 'assets/main.js', imports: 'other' } }]) {
  test('rejects malformed or incomplete bundle inventory: ' + JSON.stringify(manifest), () => assert.throws(() => initialJs(manifest)));
}
test('a dynamic label cannot conceal a tool in the static graph', () => {
  const manifest = Object.fromEntries(['PendulumLabPage','VideoStudioPage','CertMasterPage'].map(name =>
    [`src/pages/${name}.tsx`, { file: `assets/${name}.js`, isDynamicEntry: true }]));
  verifyDeferred(manifest, ['assets/main.js']);
  assert.throws(() => verifyDeferred(manifest, ['assets/PendulumLabPage.js']));
  assert.throws(() => verifyDeferred({}, ['assets/main.js']));
});
test('both frontend trees retain exactly the same safe fallback', async () => {
  assert.equal(await readFile(new URL('../src/components/RouteLoadBoundary.tsx', import.meta.url), 'utf8'),
    await readFile(new URL('../app/src/components/RouteLoadBoundary.tsx', import.meta.url), 'utf8'));
});
