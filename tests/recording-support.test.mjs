import assert from 'node:assert/strict';
import { test } from 'node:test';
import { supportedRecordingType, browserRecordingType, STUDIO_VIDEO_TYPES } from '../src/lib/recording-support.ts';

test('a non-browser runtime reports unavailable without touching media', () => assert.equal(browserRecordingType(), null));
test('missing canvas capture never probes codecs', () => {
  let calls = 0; assert.equal(supportedRecordingType(false, () => { calls++; return true; }), null); assert.equal(calls, 0);
});
test('missing codec API does not promise support', () => assert.equal(supportedRecordingType(true), null));
test('no compatible codec reports unavailable', () => assert.equal(supportedRecordingType(true, () => false), null));
test('throwing probes cannot escape as raw browser errors', () => assert.equal(supportedRecordingType(true, () => { throw new Error('private diagnostic'); }), null));
test('truthy non-boolean results do not establish codec support', () => assert.equal(supportedRecordingType(true, () => 'yes'), null));
for (const type of STUDIO_VIDEO_TYPES) test(`selects supported format ${type}`, () => assert.equal(supportedRecordingType(true, value => value === type), type));
test('a failing format does not prevent checking a later compatible one', () => assert.equal(supportedRecordingType(true, type => { if (type === 'video/webm') return true; throw new Error('unavailable'); }), 'video/webm'));
test('stops at the first supported format', () => {
  const calls = []; assert.equal(supportedRecordingType(true, type => { calls.push(type); return true; }), STUDIO_VIDEO_TYPES[0]);
  assert.deepEqual(calls, [STUDIO_VIDEO_TYPES[0]]);
});
