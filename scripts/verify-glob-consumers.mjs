// Exercise the real consumers after security updates across glob/minimatch majors.
// No network, credentials, publishing or customer files.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2] || '.';
assert.ok(['.', 'app', 'app/electron'].includes(target));
const require = createRequire(join(root, target, 'package.json'));
const { glob, globSync } = require('glob');
assert.deepEqual((await glob('package*.json', { cwd: join(root, target) })).sort(),
  globSync('package*.json', { cwd: join(root, target) }).sort());

if (target !== 'app/electron') {
  const { ESLint } = require('eslint');
  const lint = new ESLint({ overrideConfigFile: true,
    overrideConfig: [{ files: ['**/*.js'], rules: { 'no-unused-vars': 'error' } }] });
  const result = await lint.lintText('const unused = 1;', { filePath: 'fixture.js' });
  assert.equal(result[0].messages[0].ruleId, 'no-unused-vars');
} else {
  const asar = require('@electron/asar');
  assert.equal(typeof require('@electron/universal').makeUniversalApp, 'function');
  const dir = await mkdtemp(join(tmpdir(), 'luqi-dependency-fixture-'));
  try {
    const source = join(dir, 'src');
    const archive = join(dir, 'fixture.asar');
    await mkdir(source);
    await writeFile(join(source, 'index.js'), 'console.log("fixture")');
    await writeFile(join(source, 'notes.txt'), 'fixture only');
    await asar.createPackageWithOptions(source, archive, { unpack: '*.txt' });
    assert.equal(asar.extractFile(archive, 'index.js').toString(), 'console.log("fixture")');
    assert.equal(asar.statFile(archive, 'notes.txt').unpacked, true);
    const { FileList } = require('filelist');
    const list = new FileList(join(source, '*'));
    list.exclude(join(source, '*.txt'));
    assert.deepEqual(list.toArray(), [join(source, 'index.js')]);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
console.log(`Dependency consumer compatibility passed: ${target}`);
