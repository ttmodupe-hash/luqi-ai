import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';

export function isLegacyQueryModule(id) {
  const name = id.replaceAll('\\', '/').split('?')[0];
  return name.endsWith('/src/providers/trpc.tsx') ||
    /\/node_modules\/(?:@trpc\/|@tanstack\/(?:react-query|query-core)\/|superjson\/)/.test(name);
}

// Count the entire static entry dependency graph, not just the file named index.
// Dynamic chunks are excluded from startup size but INCLUDED in the safety guard.
export function summarizeBundle(output) {
  if (!Array.isArray(output) || output.length === 0) throw new Error('Build output is missing');
  const chunks = output.filter(item => item.type === 'chunk');
  const entries = chunks.filter(item => item.isEntry);
  if (entries.length !== 1) throw new Error('Expected one canonical browser entry');
  const byName = new Map(output.map(item => [item.fileName, item]));
  if (byName.size !== output.length) throw new Error('Duplicate emitted filenames');
  const visited = new Set();
  const cssNames = new Set();
  let rawBytes = 0, gzipBytes = 0;
  function visit(fileName) {
    if (visited.has(fileName)) return;
    const chunk = byName.get(fileName);
    if (!chunk || chunk.type !== 'chunk' || typeof chunk.code !== 'string' || !Array.isArray(chunk.imports)) {
      throw new Error('Unresolved static chunk: ' + fileName);
    }
    visited.add(fileName);
    const bytes = Buffer.from(chunk.code);
    rawBytes += bytes.length;
    gzipBytes += gzipSync(bytes).length;
    for (const name of chunk.viteMetadata?.importedCss ?? []) cssNames.add(name);
    for (const name of chunk.imports) visit(name);
  }
  visit(entries[0].fileName);
  let cssBytes = 0;
  for (const name of cssNames) {
    const item = byName.get(name);
    if (!item || item.type !== 'asset' || item.source == null) throw new Error('Unresolved CSS: ' + name);
    cssBytes += Buffer.byteLength(item.source);
  }
  const legacyModules = [...new Set(chunks.flatMap(chunk => {
    if (!chunk.modules || typeof chunk.modules !== 'object') throw new Error('Module evidence is missing');
    return Object.keys(chunk.modules).filter(isLegacyQueryModule);
  }))];
  return { entry: entries[0].fileName, startupChunks: [...visited].sort(),
    startupJavaScriptBytes: rawBytes, startupJavaScriptGzipBytes: gzipBytes,
    startupCssBytes: cssBytes, dynamicChunkCount: chunks.length - visited.size,
    legacyQueryModuleCount: legacyModules.length };
}

export function assertProviderFree(report) {
  if (!Number.isSafeInteger(report.legacyQueryModuleCount) || report.legacyQueryModuleCount !== 0) {
    throw new Error('A shipped route still includes the removed query provider or its runtime dependencies');
  }
}

async function main() {
  const [rootArg, reportFile, guard] = process.argv.slice(2);
  if (!rootArg || !reportFile || (guard && guard !== '--assert-provider-free')) {
    throw new Error('Usage: measure-startup-bundle.mjs ROOT REPORT [--assert-provider-free]');
  }
  const root = resolve(rootArg), destination = resolve(reportFile);
  process.chdir(root);
  const { build } = await import('vite');
  const result = await build({ root, configFile: resolve(root, 'vite.config.ts'),
    logLevel: 'warn', build: { write: false } });
  const builds = Array.isArray(result) ? result : [result];
  if (builds.length !== 1 || !Array.isArray(builds[0]?.output)) throw new Error('Unexpected build output');
  const report = summarizeBundle(builds[0].output);
  if (guard) assertProviderFree(report);
  await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  console.log('Build-byte measurement only, not measured network latency or full launch approval.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
