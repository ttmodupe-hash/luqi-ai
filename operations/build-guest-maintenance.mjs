/** Reproducible bundle for Railway Function; package versions match installed lockfile. */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
await build({ entryPoints: ['operations/guest-maintenance.ts'], bundle: true, platform: 'node', format: 'esm',
  packages: 'external', outfile: 'operations/guest-maintenance.railway.mjs' });
let source = readFileSync('operations/guest-maintenance.railway.mjs', 'utf8');
for (const name of ['mysql2', 'hono', 'zod', '@google/genai']) {
  const version = JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8')).version;
  source = source.replaceAll(`from "${name}"`, `from "${name}@${version}"`);
  source += `\nimport "${name}@${version}";\n`;
}
writeFileSync('operations/guest-maintenance.railway.ts', source);
