import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'vite';

// Use the same automatic config and production defaults as `vite build`.
// Do not call resolveConfig with its development defaults before this build:
// that would change NODE_ENV and invalidate the emitted-byte comparison.
// No account, database, provider or environment values are read or printed.
const root = process.cwd();
let config;
const result = await build({
  logLevel: 'error', build: { write: false },
  plugins: [{ name: 'luqi-inspect-production-graph', configResolved(value) { config = value; } }],
});
assert.ok(config, 'resolved build configuration is required');
assert.equal(config.root, root, 'production build must use the repository root');
assert.equal(config.build.modulePreload, false, 'retain manual WebKit loading recovery');
assert.ok(!Array.isArray(result) && 'output' in result, 'expected one client build');
const chunks = result.output.filter(item => item.type === 'chunk');
const entries = chunks.filter(chunk => chunk.isEntry);
const moduleIds = [...new Set(chunks.flatMap(chunk => Object.keys(chunk.modules)))];
const relative = id => path.relative(root, id.split('?')[0]).replaceAll('\\', '/');
const entriesRelative = entries.map(chunk => relative(chunk.facadeModuleId || ''));
const frontends = moduleIds.map(relative).filter(id => /^(src|app\/src)\//.test(id));
const providers = frontends.filter(id => /\/providers\/trpc\.(ts|tsx)$/.test(id));
console.log(JSON.stringify({ format: 'luqi.frontend-graph.v1', config: relative(config.configFile), entries: entriesRelative,
  rootModules: frontends.filter(id => id.startsWith('src/')).length,
  nestedModules: frontends.filter(id => id.startsWith('app/src/')).length,
  providers }, null, 2));
assert.ok(entriesRelative.length === 1 && entriesRelative[0] === 'index.html',
  'LUQI_FRONTEND_TREE_DRIFT: nested app entry replaced the tested root frontend');
assert.ok(frontends.some(id => id === 'src/main.tsx'), 'canonical browser entry required');
assert.equal(frontends.filter(id => id.startsWith('app/src/')).length, 0, 'do not mix the two frontend trees');
assert.equal(providers.length, 1, 'all deferred tools must share one query provider module');
assert.match(providers[0], /^src\/providers\/trpc\.(ts|tsx)$/);
const manifest = [];
// Validate the existing emitted files, not just a second independently rebuilt graph.
for (const item of result.output) {
  if (item.type !== 'chunk' && !item.fileName.endsWith('.css')) continue;
  const emitted = await readFile(path.join(config.build.outDir, item.fileName));
  const inspected = Buffer.from(item.type === 'chunk' ? item.code : item.source);
  assert.ok(emitted.equals(inspected), 'emitted code differs from inspected graph: ' + item.fileName);
  manifest.push({ file: item.fileName, bytes: emitted.length, sha256: createHash('sha256').update(emitted).digest('hex') });
}
manifest.sort((a, b) => a.file.localeCompare(b.file, 'en'));
await writeFile('.luqi-frontend-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('PASS canonical production entry, one frontend/provider graph, emitted JavaScript/CSS identity and loading policy');
