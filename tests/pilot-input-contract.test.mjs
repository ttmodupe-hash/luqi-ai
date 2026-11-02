import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildPilotInput, PilotInputError, MAX_PILOT_INPUT_CHARS, MAX_PILOT_QUESTION_CHARS } from '../src/lib/pilot-input.ts';
import { buildPilotInput as appBuild } from '../app/src/lib/pilot-input.ts';

function fails(prompt, language, history, code = 'INVALID_INPUT') {
  assert.throws(() => buildPilotInput(prompt, language, history), error => {
    assert.ok(error instanceof PilotInputError);
    assert.equal(error.code, code);
    assert.doesNotMatch(error.message + JSON.stringify(error), /PRIVATE-CONTENT/);
    return true;
  });
}

test('default question allowance includes all fixed request formatting', () => {
  assert.equal(MAX_PILOT_INPUT_CHARS, 6000);
  assert.equal(MAX_PILOT_QUESTION_CHARS, 5946);
  const text = 'x'.repeat(MAX_PILOT_QUESTION_CHARS - 8) + 'END-TEST';
  const input = buildPilotInput(text);
  assert.equal(input.length, 6000);
  assert.ok(input.endsWith('User: ' + text));
});
test('one unit over the complete limit is rejected, not clipped', () => {
  fails('x'.repeat(MAX_PILOT_QUESTION_CHARS + 1), undefined, undefined, 'AI_INPUT_TOO_LARGE');
  fails('x'.repeat(6001), undefined, undefined, 'AI_INPUT_TOO_LARGE');
});
test('four complete 350-unit history turns and their separators are never cut at 1400', () => {
  const history = Object.freeze(Array.from({ length: 4 }, (_, i) => Object.freeze({ sender: i % 2 ? 'ai' : 'user', text: String(i).repeat(342) + 'HIST-END' })));
  const language = 'isiZulu';
  const overhead = buildPilotInput('q', language, history).length - 1;
  const question = 'q'.repeat(6000 - overhead - 8) + 'END-TEST';
  const input = buildPilotInput(question, language, history);
  assert.equal(input.length, 6000);
  for (const turn of history) assert.ok(input.includes(`${turn.sender}: ${turn.text}`));
  assert.ok(input.endsWith(question));
  fails(question + 'x', language, history, 'AI_INPUT_TOO_LARGE');
});
test('accepted Unicode and whitespace are preserved exactly, not split or normalized', () => {
  const text = '🙂'.repeat(2972) + 'é!';
  assert.equal(text.length, MAX_PILOT_QUESTION_CHARS);
  assert.ok(buildPilotInput(text).endsWith(text));
  assert.ok(buildPilotInput('  Umbuzo\nDo not remove the final condition.  ').endsWith('  Umbuzo\nDo not remove the final condition.  '));
});
for (const prompt of [null, undefined, 1, {}, [], '', ' \n\t']) {
  test(`rejects invalid prompt (${String(prompt)})`, () => fails(prompt));
}
for (const language of [null, 1, {}, '', ' ', 'l'.repeat(51)]) {
  test(`rejects invalid language (${String(language)})`, () => fails('PRIVATE-CONTENT', language));
}
for (const [label, history] of [
  ['null', null], ['object', {}], ['string', 'PRIVATE-CONTENT'],
  ['too many turns', Array(5).fill({ sender: 'user', text: 'x' })],
  ['oversized turn', [{ sender: 'user', text: 'x'.repeat(351) }]],
  ['unsupported role', [{ sender: 'system', text: 'PRIVATE-CONTENT' }]],
  ['missing text', [{ sender: 'user' }]], ['non-string text', [{ sender: 'user', text: 123 }]],
  ['extra private field', [{ sender: 'user', text: 'x', email: 'PRIVATE-CONTENT' }]],
  ['null turn', [null]], ['array turn', [[]]],
]) {
  test('rejects invalid history: ' + label, () => fails('question', 'auto', history));
}
test('maximum supported language is retained; empty history text stays explicit', () => {
  const language = 'a'.repeat(50);
  assert.equal(buildPilotInput('Q', language, [{ sender: 'ai', text: '' }]),
    `Language preference: ${language}\nRecent conversation:\nai: \nUser: Q`);
});
test('boundary combinations never shorten accepted text and both frontend trees agree', () => {
  for (let turns = 0; turns <= 4; turns++) for (const size of [0, 1, 100, 350]) {
    const history = Array.from({ length: turns }, (_, i) => ({ sender: i % 2 ? 'ai' : 'user', text: 'h'.repeat(size) }));
    for (const language of ['auto', 'isiXhosa', 'a'.repeat(50)]) {
      const overhead = buildPilotInput('q', language, history).length - 1;
      const question = 'q'.repeat(6000 - overhead - 8) + 'END-TEST';
      const expected = buildPilotInput(question, language, history);
      assert.equal(expected.length, 6000);
      assert.ok(expected.endsWith('User: ' + question));
      assert.equal(appBuild(question, language, history), expected);
      fails(question + 'q', language, history, 'AI_INPUT_TOO_LARGE');
    }
  }
});
test('the shared pure contract remains identical in both frontend trees', async () => {
  assert.equal(await readFile(new URL('../src/lib/pilot-input.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../app/src/lib/pilot-input.ts', import.meta.url), 'utf8'));
});
