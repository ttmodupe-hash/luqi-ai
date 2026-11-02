import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as root from '../src/components/workspace-catalog.ts';
import * as app from '../app/src/components/workspace-catalog.ts';

const ids = tools => tools.map(tool => tool.id);
for (const [name, { findWorkspaceTools: find, workspaceTools: tools }] of [['root', root], ['app', app]]) {
  const check = (label, fn) => test(`${name}: ${label}`, fn);
  check('empty search retains catalog order and original tool objects', () => {
    assert.deepEqual(find(''), [...tools]);
    assert.ok(find('').every((tool, index) => tool === tools[index]));
  });
  check('blank Unicode whitespace behaves like an empty query', () => {
    assert.deepEqual(ids(find(' \t\n\u00a0\u2003 ')), ids(tools));
  });
  check('case and word order are ignored', () => {
    assert.deepEqual(ids(find('STUDIO content')), ['academy']);
    assert.deepEqual(ids(find('content studio')), ['academy']);
  });
  check('extra spaces, tabs and line breaks separate search words', () => {
    assert.deepEqual(ids(find(' \tstudio\n\u00a0 content   ')), ['academy']);
  });
  check('words can match separate catalog fields', () => {
    assert.deepEqual(ids(find('subtitles content')), ['academy']);
  });
  check('every word must match the same tool', () => {
    assert.deepEqual(find('physics omega'), []);
  });
  check('duplicate words do not duplicate or remove results', () => {
    assert.deepEqual(ids(find('studio studio content')), ['academy']);
  });
  check('single-word and substring behavior remains compatible', () => {
    for (const query of ['notes', 'gemini', 'pendul', 'read-only', '3D']) {
      const expected = tools.filter(tool => `${tool.title} ${tool.category} ${tool.description} ${tool.status}`.toLowerCase().includes(query.toLowerCase()));
      assert.deepEqual(find(query), expected);
    }
  });
  check('ready filter never promotes a development-only capability', () => {
    assert.deepEqual(find('african languages', 'ready'), []);
    assert.ok(find('', 'ready').every(tool => tool.ready));
  });
  check('preview search preserves unavailable status and absence of a route', () => {
    const results = find('languages african', 'preview');
    assert.deepEqual(ids(results), ['languages']);
    assert.equal(results[0].path, null);
    assert.equal(results[0].status, 'In development');
    assert.equal(results[0].ready, false);
  });
  check('trial results retain sign-in and availability limitations', () => {
    const results = find('consent GEMINI', 'ready');
    assert.deepEqual(ids(results), ['ai-trial']);
    assert.equal(results[0].status, 'Limited trial · sign-in required');
    assert.match(results[0].description, /Availability is checked before sending/);
  });
  check('literal punctuation is not interpreted as a regex or markup', () => {
    for (const query of ['.*', '[', '^.*$', '<script>', "' OR 1=1", '(a+)+$']) assert.deepEqual(find(query), []);
  });
  check('unknown and long unmatched queries return no results', () => {
    assert.deepEqual(find('tool-that-does-not-exist'), []);
    assert.deepEqual(find('x'.repeat(10_000)), []);
  });
  check('result-array edits do not mutate the catalog or later searches', () => {
    const before = JSON.stringify(tools);
    find('').reverse().pop();
    assert.equal(JSON.stringify(tools), before);
    assert.deepEqual(ids(find('')), ids(tools));
  });
  check('only the query is lowercased after the static index is built', t => {
    const lower = String.prototype.toLowerCase;
    const spy = t.mock.method(String.prototype, 'toLowerCase', function () { return lower.call(this); });
    const results = find('CONTENT studio subtitles');
    const count = spy.mock.callCount();
    t.mock.restoreAll();
    assert.deepEqual(ids(results), ['academy']);
    assert.equal(count, 1);
  });
  check('typing and filtering make no fetch calls', t => {
    const spy = t.mock.method(globalThis, 'fetch', () => { throw new Error('Search must remain local'); });
    find('notes'); find('languages african', 'preview'); find('consent gemini');
    assert.equal(spy.mock.callCount(), 0);
  });
}
test('both shipped frontend catalogs remain byte-for-byte identical', () => {
  assert.equal(readFileSync(new URL('../src/components/workspace-catalog.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('../app/src/components/workspace-catalog.ts', import.meta.url), 'utf8'));
});
