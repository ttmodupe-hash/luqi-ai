import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BIBLICAL_STUDIES, BIBLICAL_SOURCES, BIBLICAL_LAYERS, BIBLICAL_QUIZ,
  biblicalSource, biblicalStudyIsCurrent, checkBiblicalAnswer } from '../src/lib/africa-biblical-study.mjs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const study = id => BIBLICAL_STUDIES.find(value => value.id === id);
const hosts = new Set(['bible.usccb.org', 'www.thetorah.com', 'www.metmuseum.org', 'artsandculture.google.com', 'whc.unesco.org', 'www.ashmolean.org']);

test('all seven study topics and four evidence layers have unique IDs', () => {
  assert.equal(BIBLICAL_STUDIES.length, 7);
  assert.equal(new Set(BIBLICAL_STUDIES.map(s => s.id)).size, 7);
  assert.deepEqual(BIBLICAL_LAYERS.map(s => s.id), ['text', 'evidence', 'interpretation', 'reflection']);
});
for (const item of BIBLICAL_STUDIES) {
  test(`${item.id}: every factual layer cites a known source`, () => {
    for (const name of ['text', 'evidence', 'interpretation']) {
      assert.ok(item[name].body.length > 40);
      assert.ok(item[name].sourceIds.length > 0);
      for (const id of item[name].sourceIds) assert.ok(biblicalSource(id));
    }
  });
  test(`${item.id}: reflection is separate original teaching activity`, () => {
    assert.equal(item.reflection.sourceIds.length, 0);
    assert.match(item.reflection.body, /Learning activity:|Discussion:/);
  });
}
test('13 sources are unique allowlisted HTTPS text records with explicit scope', () => {
  assert.equal(BIBLICAL_SOURCES.length, 13);
  assert.equal(new Set(BIBLICAL_SOURCES.map(s => s.id)).size, BIBLICAL_SOURCES.length);
  for (const s of BIBLICAL_SOURCES) {
    const url = new URL(s.url);
    assert.equal(url.protocol, 'https:'); assert.ok(hosts.has(url.hostname));
    assert.equal(url.username, ''); assert.equal(url.password, ''); assert.ok(s.scope.length > 20);
    assert.ok(s.kind); assert.ok(s.publisher); assert.ok(s.title);
  }
});
test('unknown source IDs fail rather than inventing a citation', () => {
  for (const id of ['__proto__', '', '<script>', 'fabricated']) assert.throws(() => biblicalSource(id));
});
test('Nimrod is Cush’s son rather than grandson', () => {
  assert.match(study('nimrod').text.body, /Cush’s son/);
  assert.match(study('nimrod').text.body, /Ham’s grandson/);
});
test('curse has the correct speaker, recipient and skin-colour boundary', () => {
  assert.match(study('canaan').text.body, /Noah/); assert.match(study('canaan').text.body, /Canaan/);
  assert.match(study('canaan').text.body, /does not describe skin/);
});
test('ancient geography and uncertain Ham etymology remain distinguished', () => {
  assert.match(study('geography').evidence.body, /Canaan with the Levant/);
  assert.match(study('geography').interpretation.body, /uncertain origin/);
  assert.match(study('geography').interpretation.body, /does not use the genealogy to assign modern racial ancestry/);
});
test('Taharqa dates and Zerah commentary remain distinct from biblical text', () => {
  assert.match(study('kings').evidence.body, /690–664 BCE/);
  assert.match(study('kings').evidence.body, /701 BCE/);
  assert.match(study('kings').interpretation.body, /commentary is an interpretation/);
});
test('Simon’s geography is not mistaken for complexion evidence', () => {
  assert.match(study('simon').text.body, /does not specify his complexion/);
  assert.match(study('simon').evidence.body, /Libya/);
});
test('Acts baptism, royal title and later church foundations stay separate', () => {
  assert.match(study('acts').text.body, /royal title/);
  assert.match(study('acts').interpretation.body, /does not document a church foundation/);
  assert.match(study('acts').evidence.body, /fourth-century/);
});
for (const q of BIBLICAL_QUIZ) test(`${q.id}: all quiz choices have deterministic feedback and citations`, () => {
  assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length);
  q.options.forEach((_, i) => {
    const result = checkBiblicalAnswer(q.id, i);
    assert.equal(result.correct, i === q.correct);
    assert.ok(result.explanation);
    for (const id of result.sourceIds) assert.ok(biblicalSource(id));
  });
});
test('invalid quiz submissions do not coerce values or create feedback', () => {
  for (const input of [undefined, null, '0', -1, 3, .5, NaN, Infinity, {}]) assert.equal(checkBiblicalAnswer('parent', input), null);
  assert.equal(checkBiblicalAnswer('__proto__', 0), null);
});
test('source edition gates invalid, future and expired clocks', () => {
  assert.equal(biblicalStudyIsCurrent(new Date('2026-11-01T00:00:00+02:00')), true);
  assert.equal(biblicalStudyIsCurrent(new Date('2027-02-01T23:59:59+02:00')), true);
  for (const value of [new Date('2026-10-31T23:59:59+02:00'), new Date('2027-02-02T00:00:00+02:00'), new Date(NaN), 'today', null]) assert.equal(biblicalStudyIsCurrent(value), false);
});
test('both source trees remain identical for the new feature', () => {
  for (const file of ['lib/africa-biblical-study.mjs', 'lib/africa-biblical-study.d.mts', 'components/AfricanBiblicalStudy.tsx', 'components/african-biblical-study.css']) assert.equal(read('src/' + file), read('app/src/' + file));
});
test('component has no inference, storage, generated HTML or tracking calls', () => {
  const code = read('src/components/AfricanBiblicalStudy.tsx');
  assert.doesNotMatch(code, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|dangerouslySetInnerHTML|geolocation|console)\b/);
  assert.match(code, /noopener noreferrer/);
  assert.match(code, /was not transcribed/);
  assert.match(code, /Luqi-designed activity/);
});
test('a text-only study cannot silently embed a third-party video or portrait', () => {
  assert.doesNotMatch(read('src/components/AfricanBiblicalStudy.tsx'), /<(?:iframe|img|video|audio)\b/);
});
test('existing history route integrates the study without changing guide/session selection', () => {
  const page = read('src/pages/ComparativeEvidencePage.tsx');
  assert.equal(page, read('app/src/pages/ComparativeEvidencePage.tsx'));
  assert.match(page, /<AfricanBiblicalStudy\s*\/>/);
  assert.match(page, /readGuide\(customerSessionBoundary/);
  assert.match(page, /EVIDENCE_CASES\.map/);
  assert.match(page, /to="\/chat"/);
});
