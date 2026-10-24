import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { summarizeBundle, assertProviderFree, isLegacyQueryModule } from '../scripts/measure-startup-bundle.mjs';
const chunk = (fileName, code, options = {}) => ({ type: 'chunk', fileName, code,
  imports: [], modules: {}, isEntry: false, ...options });
const entry = (options = {}) => chunk('entry.js', 'fixture-main', { isEntry: true, ...options });

test('counts raw UTF-8 and per-file gzip sizes', () => {
  const report = summarizeBundle([entry({ code: 'fixture-\u00e9' })]);
  assert.equal(report.startupJavaScriptBytes, Buffer.byteLength('fixture-\u00e9'));
  assert.equal(report.startupJavaScriptGzipBytes, gzipSync('fixture-\u00e9').length);
  assertProviderFree(report);
});
test('counts shared static dependencies once, including cycles', () => {
  const report = summarizeBundle([entry({ imports: ['a.js', 'b.js'] }),
    chunk('a.js', 'aaa', { imports: ['b.js'] }), chunk('b.js', 'bb', { imports: ['a.js'] })]);
  assert.equal(report.startupJavaScriptBytes, Buffer.byteLength('fixture-main') + 5);
  assert.deepEqual(report.startupChunks, ['a.js', 'b.js', 'entry.js']);
});
test('excludes lazy downloads from startup totals', () => {
  const report = summarizeBundle([entry({ dynamicImports: ['lazy.js'] }), chunk('lazy.js', 'optional')]);
  assert.equal(report.startupJavaScriptBytes, Buffer.byteLength('fixture-main'));
  assert.equal(report.dynamicChunkCount, 1);
});
test('guard also rejects a provider dependency inside a lazy route', () => {
  const report = summarizeBundle([entry(), chunk('lazy.js', 'optional', {
    modules: { '/repo/node_modules/@trpc/react-query/dist/index.js': {} } })]);
  assert.throws(() => assertProviderFree(report), /shipped route/);
});
test('recognizes both frontend providers, query runtimes and Windows paths', () => {
  for (const id of ['/repo/src/providers/trpc.tsx', '/repo/app/src/providers/trpc.tsx',
    '/repo/node_modules/@tanstack/query-core/build/index.js',
    '/repo/node_modules/@tanstack/react-query/build/index.js',
    'C:\\repo\\node_modules\\superjson\\dist\\index.js']) assert.equal(isLegacyQueryModule(id), true);
  assert.equal(isLegacyQueryModule('/repo/src/lib/private-conversations.ts'), false);
});
test('counts shared entry CSS once', () => {
  const report = summarizeBundle([entry({ imports: ['shared.js'], viteMetadata: { importedCss: new Set(['style.css']) } }),
    chunk('shared.js', 'shared', { viteMetadata: { importedCss: new Set(['style.css']) } }),
    { type: 'asset', fileName: 'style.css', source: 'body{}' }]);
  assert.equal(report.startupCssBytes, 6);
});
test('missing entry or output fails closed', () => {
  for (const output of [null, [], [chunk('lazy.js', 'x')]]) assert.throws(() => summarizeBundle(output));
});
test('multiple entries and duplicate names fail closed', () => {
  assert.throws(() => summarizeBundle([entry(), entry({ fileName: 'other.js' })]));
  assert.throws(() => summarizeBundle([entry(), chunk('entry.js', 'duplicate')]));
});
test('unresolved static imports and CSS fail closed', () => {
  assert.throws(() => summarizeBundle([entry({ imports: ['missing.js'] })]));
  assert.throws(() => summarizeBundle([entry({ viteMetadata: { importedCss: new Set(['missing.css']) } })]));
});
test('missing module evidence or invalid guard report fails closed', () => {
  assert.throws(() => summarizeBundle([entry({ modules: null })]));
  assert.throws(() => assertProviderFree({}));
});
