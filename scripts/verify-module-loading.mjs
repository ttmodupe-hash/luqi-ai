import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
// Resolve the real production configuration, not a second test-only config.
const config = await resolveConfig({ root, configFile: path.join(root, 'vite.config.ts') }, 'build');
assert.equal(config.build.modulePreload, false, 'optional preloading must not break manual recovery');
const standalone = await readFile(path.join(root, 'app/vite.config.ts'), 'utf8');
assert.match(standalone, /\bmodulePreload:\s*false\b/, 'standalone build must retain the same explicit policy');
const output = config.build.outDir;
const html = await readFile(path.join(output, 'index.html'), 'utf8');
assert.doesNotMatch(html, /<link\b[^>]*\brel\s*=\s*["']modulepreload["']/i);
assert.match(html, /<script\b[^>]*\btype\s*=\s*["']module["']/i);
const files = await readdir(path.join(output, 'assets'));
for (const name of ['PendulumLabPage', 'VideoStudioPage']) {
  assert.ok(files.some(file => file.startsWith(name + '-') && file.endsWith('.js')),
    name + ' must remain separately code-split');
}
assert.ok(files.some(file => file.startsWith('VideoStudioPage-') && file.endsWith('.css')),
  'optional studio CSS must remain emitted');
console.log('PASS resolved root loading policy, standalone policy guard, public module entry and separate tool/CSS assets');
// Browser suites separately prove on-demand loading, manual recovery, styling,
// no automatic retries and no write/provider requests. This is not that proof.
