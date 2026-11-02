import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseStudioDraft, serializeStudioDraft, readStudioDraft, MAX_STUDIO_DRAFT_BYTES,
  STUDIO_DRAFT_READ_TIMEOUT_MS } from '../src/lib/studio-draft.ts';
const scenes = Array.from({ length: 6 }, (_, i) => ({ title: `Scene ${i + 1}`, caption: `Explanation ${i + 1}`, question: `Why ${i + 1}?` }));
const saved = () => JSON.parse(serializeStudioDraft(scenes, 'portrait', 2.5, 9.81, -37));
const fail = /not a supported LUQI storyboard/;

test('both source trees keep the same import/restore implementation', async () => {
  for (const path of ['lib/studio-draft.ts', 'components/StudioDraftImport.tsx'])
    assert.equal(await readFile(new URL('../src/' + path, import.meta.url), 'utf8'),
      await readFile(new URL('../app/src/' + path, import.meta.url), 'utf8'));
});
for (const aspect of ['portrait', 'landscape', 'square']) {
  test(`lossless current-format roundtrip: ${aspect}`, () => {
    const source = serializeStudioDraft(scenes, aspect, .5, 1.62, 80);
    assert.deepEqual(parseStudioDraft(source), { scenes, aspect, length: .5, gravity: 1.62, yaw: 80, legacyCamera: false });
  });
}
test('legacy v1 uses explicit original camera default, not the current draft camera', () => {
  const doc = saved(); doc.format = 'luqi.storyboard.v1'; delete doc.cameraYawDegrees;
  const result = parseStudioDraft(JSON.stringify(doc));
  assert.equal(result.yaw, 28); assert.equal(result.legacyCamera, true); assert.deepEqual(result.scenes, scenes);
});
test('keeps Unicode, whitespace, angle brackets and multiline content as plain data', () => {
  const edited = scenes.map(s => ({ ...s, caption: '  Dumelang 🌍\n<script>fixture</script>  ' }));
  assert.deepEqual(parseStudioDraft(serializeStudioDraft(edited, 'square', 1.75, 9.8, 0)).scenes, edited);
});
for (const [name, change] of [
  ['unknown version', d => d.format = 'luqi.storyboard.v9'], ['missing version', d => delete d.format],
  ['unknown root property', d => d.remoteUrl = 'https://untrusted.invalid'],
  ['prototype root key', d => Object.defineProperty(d, '__proto__', { value: {}, enumerable: true })],
  ['bad aspect', d => d.aspect = 'constructor'], ['audio claim', d => d.audio = 'generated'],
  ['publishing claim', d => d.publishing = 'connected'], ['rendering claim', d => d.rendering = 'AI'],
  ['wrong duration', d => d.durationSeconds = 89], ['camera missing', d => delete d.cameraYawDegrees],
  ['camera string', d => d.cameraYawDegrees = '28'], ['camera too high', d => d.cameraYawDegrees = 81],
  ['camera too low', d => d.cameraYawDegrees = -81], ['missing simulation', d => delete d.simulation],
  ['unexpected simulation field', d => d.simulation.url = 'fixture'],
  ['wrong model', d => d.simulation.model = 'external'], ['length zero', d => d.simulation.lengthMetres = 0],
  ['length too large', d => d.simulation.lengthMetres = 4.1], ['length string', d => d.simulation.lengthMetres = '2.5'],
  ['gravity zero', d => d.simulation.gravityMetresPerSecondSquared = 0],
  ['gravity too large', d => d.simulation.gravityMetresPerSecondSquared = 21],
  ['missing scene', d => d.scenes.pop()], ['extra scene', d => d.scenes.push(d.scenes[0])],
  ['non-array scenes', d => d.scenes = {}], ['null scene', d => d.scenes[0] = null],
  ['extra scene property', d => d.scenes[0].html = '<img>'],
  ['reordered scene timing', d => d.scenes.reverse()], ['wrong scene duration', d => d.scenes[0].durationSeconds = 14],
  ['empty title', d => d.scenes[0].title = '  '], ['long title', d => d.scenes[0].title = 'x'.repeat(65)],
  ['long caption', d => d.scenes[0].caption = 'x'.repeat(241)],
  ['long question', d => d.scenes[0].question = 'x'.repeat(141)],
  ['non-string caption', d => d.scenes[0].caption = {}], ['missing question', d => delete d.scenes[0].question],
]) test(`rejects ${name} without exposing content`, () => {
  const doc = saved(); change(doc); assert.throws(() => parseStudioDraft(JSON.stringify(doc)), fail);
});
for (const source of ['', '{', 'null', '[]', '42', '"fixture-private-text"', ' '.repeat(MAX_STUDIO_DRAFT_BYTES + 1)])
  test(`invalid JSON/document is rejected: ${source.length} bytes`, () => assert.throws(() => parseStudioDraft(source), fail));
test('counts UTF-8 bytes, not just JavaScript string length', () => {
  const doc = saved(); doc.scenes[0].caption = '🌍'.repeat(100);
  const source = JSON.stringify(doc); const bytes = new TextEncoder().encode(source).length;
  const exact = source + ' '.repeat(MAX_STUDIO_DRAFT_BYTES - bytes);
  assert.equal(new TextEncoder().encode(exact).length, MAX_STUDIO_DRAFT_BYTES);
  assert.equal(parseStudioDraft(exact).scenes[0].caption, doc.scenes[0].caption);
  assert.throws(() => parseStudioDraft(exact + ' '), fail);
});
test('serializer refuses invalid current state rather than making an unusable backup', () => {
  for (const values of [[scenes, 'constructor', 2, 9.81, 28], [scenes, 'square', 0, 9.81, 28],
    [scenes, 'square', 2, Infinity, 28], [scenes, 'square', 2, 9.81, NaN], [scenes.slice(1), 'square', 2, 9.81, 28]])
    assert.throws(() => serializeStudioDraft(...values), fail);
});

function readerFixture(t) {
  const readers = [];
  class Reader {
    readyState = 0; result = null; aborted = 0;
    onload = null; onerror = null; onabort = null;
    constructor() { readers.push(this); }
    readAsArrayBuffer(file) { this.readyState = 1; this.file = file; }
    abort() { this.aborted++; this.readyState = 2; this.onabort?.(); }
    complete(bytes) { this.result = bytes; this.readyState = 2; this.onload?.(); }
  }
  const original = globalThis.FileReader; globalThis.FileReader = Reader;
  t.after(() => { if (original === undefined) delete globalThis.FileReader; else globalThis.FileReader = original; });
  return readers;
}
const encoded = () => new TextEncoder().encode(JSON.stringify(saved()));
test('reads one selected file without HTTP and validates its exact byte length', async t => {
  const readers = readerFixture(t), bytes = encoded(); let requests = 0;
  t.mock.method(globalThis, 'fetch', () => { requests++; throw new Error('Unexpected HTTP'); });
  const file = new Blob([bytes]); const result = readStudioDraft(file);
  assert.equal(readers.length, 1); assert.equal(readers[0].file, file);
  readers[0].complete(bytes.buffer);
  assert.deepEqual((await result).scenes, scenes); assert.equal(requests, 0);
});
test('pre-aborted file read creates no reader', async t => {
  const readers = readerFixture(t), controller = new AbortController(); controller.abort();
  await assert.rejects(readStudioDraft(new Blob([encoded()]), controller.signal), { name: 'AbortError' });
  assert.equal(readers.length, 0);
});
for (const size of [0, MAX_STUDIO_DRAFT_BYTES + 1, NaN, -1, 1.5]) test(`refuses advertised file size ${size} before reading`, async t => {
  const readers = readerFixture(t); await assert.rejects(readStudioDraft({ size }), /32 KiB/); assert.equal(readers.length, 0);
});
test('explicit cancel discards a late file result and detaches handlers', async t => {
  const readers = readerFixture(t), controller = new AbortController(), bytes = encoded();
  const pending = readStudioDraft(new Blob([bytes]), controller.signal);
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  const late = readers[0].onload; controller.abort(); await rejected;
  assert.equal(readers[0].aborted, 1); assert.equal(readers[0].onload, null);
  readers[0].result = bytes.buffer; late();
});
test('fixed deadline releases a stalled file read without retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const readers = readerFixture(t);
  const pending = readStudioDraft(new Blob([encoded()])); const rejected = assert.rejects(pending, /timed out/);
  t.mock.timers.tick(STUDIO_DRAFT_READ_TIMEOUT_MS); await rejected;
  assert.equal(readers.length, 1); assert.equal(readers[0].aborted, 1);
});
for (const mode of ['invalid-utf8', 'wrong-size', 'oversized-actual', 'non-buffer', 'error']) test(`file read rejects ${mode} with fixed diagnostics`, async t => {
  const readers = readerFixture(t), bytes = encoded(); const pending = readStudioDraft(new Blob([bytes]));
  const rejected = assert.rejects(pending, mode === 'error' ? /could not be read/ : fail);
  if (mode === 'error') readers[0].onerror({ message: 'private fixture filename' });
  else readers[0].complete(mode === 'invalid-utf8' ? new Uint8Array(bytes.length).fill(0xff).buffer :
    mode === 'wrong-size' ? new ArrayBuffer(2) : mode === 'oversized-actual' ? new ArrayBuffer(MAX_STUDIO_DRAFT_BYTES + 1) : 'private fixture');
  await rejected;
});
test('completion detaches cancellation and clears the deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const readers = readerFixture(t), controller = new AbortController(), bytes = encoded();
  const result = readStudioDraft(new Blob([bytes]), controller.signal); readers[0].complete(bytes.buffer); await result;
  controller.abort(); t.mock.timers.tick(STUDIO_DRAFT_READ_TIMEOUT_MS);
  assert.equal(readers[0].aborted, 0); assert.equal(readers[0].onload, null);
});
