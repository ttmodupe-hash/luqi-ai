import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
const require = createRequire(new URL('../app/electron/package.json', import.meta.url));
const pkg = require('./package.json'), lock = require('./package-lock.json');
const filename = 'electron-v45.0.0-linux-x64.zip';

test('desktop pins the exact Electron version and official archive hashes without disabling verification', () => {
 assert.equal(pkg.devDependencies.electron, '45.0.0');
 assert.equal(lock.packages[''].devDependencies.electron, '45.0.0');
 assert.equal(lock.packages['node_modules/electron'].version, '45.0.0');
 const options = pkg.build.electronDownload;
 assert.notEqual(options.isVerifyChecksum, false);
 // The explicit false also selects electron-builder 26's ElectronGetOptions
 // branch; the legacy branch drops the checksums map before @electron/get.
 assert.equal(options.unsafelyDisableChecksums, false);
 assert.equal(pkg.build.electronDist, undefined);
 assert.equal(options.checksums[filename], '22f6a10bd3f7fef987ddbb379d3375ce664ad0c98a9a50f80c89f1718a0c3e3a');
 for (const target of ['linux-x64','linux-arm64','darwin-x64','darwin-arm64','win32-x64','win32-arm64','mas-x64','mas-arm64']) {
  assert.match(options.checksums[`electron-v45.0.0-${target}.zip`], /^[a-f0-9]{64}$/);
 }
});

test('the real builder adapter preserves configured hashes and rejects tampering without a remote checksum request', async () => {
 const { downloadElectronArtifactZip } = require('app-builder-lib/out/util/electronGet.js');
 const data = Buffer.from('Synthetic builder adapter fixture, never an executable.');
 const requests = [];
 const server = createServer((req,res) => {
  requests.push(req.url);
  if (req.url !== `/v45.0.0/${filename}`) {res.writeHead(500);res.end('Remote checksum lookup is forbidden in this fixture');return;}
  res.writeHead(200, {'Content-Type':'application/octet-stream','Content-Length':data.length});res.end(data);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const directory = await mkdtemp(join(tmpdir(),'luqi-builder-hash-'));
 const oldMirror = process.env.ELECTRON_MIRROR;
 try {
  process.env.ELECTRON_MIRROR = `http://127.0.0.1:${server.address().port}/`;
  const options = {version:'45.0.0',platformName:'linux',arch:'x64',artifactName:'electron'};
  const expected = createHash('sha256').update(data).digest('hex');
  // Use the actual package configuration shape; adding mirrorOptions here
  // would accidentally select the correct branch and hide the regression.
  const electronDownload = {...pkg.build.electronDownload,checksums:{[filename]:expected}};
  const file = await downloadElectronArtifactZip({...options,electronDownload,cacheDir:join(directory,'valid')});
  assert.deepEqual(await readFile(file),data);
  await assert.rejects(downloadElectronArtifactZip({...options,cacheDir:join(directory,'tampered'),
   electronDownload:{...electronDownload,checksums:{[filename]:'0'.repeat(64)}}}), /checksum|SHA256|hash/i);
  assert.ok(requests.length >= 2);
  assert.ok(requests.every(path=>path === `/v45.0.0/${filename}`));
 } finally {
  if (oldMirror === undefined) delete process.env.ELECTRON_MIRROR; else process.env.ELECTRON_MIRROR = oldMirror;
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});
 }
});

test('the real Electron downloader checks pinned hashes and rejects tampered bytes without fetching a checksum file', async () => {
 const { downloadArtifact } = await import(pathToFileURL(require.resolve('@electron/get')).href);
 const data = Buffer.from('Synthetic downloader fixture. This is not an executable or a real Electron archive.');
 const requests = [];
 const server = createServer((req,res) => {
  requests.push(req.url);
  if (req.url !== `/v45.0.0/${filename}`) {res.writeHead(500);res.end('Unexpected fixture path');return;}
  res.writeHead(200, {'Content-Type':'application/octet-stream','Content-Length':data.length});res.end(data);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const directory=await mkdtemp(join(tmpdir(),'luqi-electron-hash-'));
 try {
  const port=server.address().port;
  const options={version:'45.0.0',platform:'linux',arch:'x64',artifactName:'electron',
   mirrorOptions:{mirror:`http://127.0.0.1:${port}/`}};
  const expected=createHash('sha256').update(data).digest('hex');
  const file=await downloadArtifact({...options,cacheRoot:join(directory,'valid'),checksums:{[filename]:expected}});
  assert.deepEqual(await readFile(file),data);
  await assert.rejects(downloadArtifact({...options,cacheRoot:join(directory,'tampered'),checksums:{[filename]:'0'.repeat(64)}}), /checksum|SHA256|hash/i);
  assert.ok(requests.length >= 2);
  assert.ok(requests.every(path=>path === `/v45.0.0/${filename}`));
 } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
