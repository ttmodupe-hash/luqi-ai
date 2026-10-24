import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build, resolveConfig } from 'vite';

// Same working directory and automatic config selection as `npm run build`.
// This operates on source/build artifacts only, never accounts or API services.
const root = process.cwd();
const config = await resolveConfig({}, 'build');
assert.equal(config.root, root, 'production build must use the repository root');
assert.equal(config.build.modulePreload, false, 'retain manual WebKit loading recovery');
const result = await build({ logLevel: 'error', build: { write: false } });
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
assert.deepEqual(entriesRelative, ['index.html'], 'nested app entry must never replace the tested root frontend');
assert.ok(frontends.some(id => id === 'src/main.tsx'), 'canonical browser entry required');
assert.equal(frontends.filter(id => id.startsWith('app/src/')).length, 0, 'do not mix the two frontend trees');
assert.equal(providers.length, 1, 'all deferred tools must share one query provider module');
assert.match(providers[0], /^src\/providers\/trpc\.(ts|tsx)$/);
// Confirm inspection described the JavaScript bytes actually emitted by npm build.
for (const chunk of chunks) {
  assert.equal(await readFile(path.join(config.build.outDir, chunk.fileName), 'utf8'), chunk.code,
    'emitted JavaScript differs from the inspected graph: ' + chunk.fileName);
}
console.log('PASS canonical production entry, one frontend/provider graph, emitted JavaScript identity and loading policy');
