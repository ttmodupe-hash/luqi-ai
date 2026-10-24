import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { GeminiService, LegacyGeminiUnavailableError } from '../api/geminiService.ts';

const cases = [
  ['generateText', { prompt: 'PRIVATE-PROMPT', history: [{ role: 'user', parts: [{ text: 'PRIVATE-HISTORY' }] }], grounding: 'search', model: 'PRIVATE-MODEL' }],
  ['generateImage', { prompt: 'PRIVATE-IMAGE-PROMPT', aspectRatio: '16:9' }],
  ['generateVideo', { prompt: 'PRIVATE-VIDEO-PROMPT', aspectRatio: '9:16' }],
  ['transcribeAudio', { audioBase64: 'PRIVATE-AUDIO', mimeType: 'audio/wav' }],
  ['synthesizeSpeech', { text: 'PRIVATE-SPEECH', voiceName: 'PRIVATE-VOICE' }],
];
const expectedMessage = 'This legacy AI capability is unavailable. Use the authenticated text trial for supported text requests.';

async function mustReject(method, input) {
  await assert.rejects(GeminiService[method](input), error => {
    assert.ok(error instanceof LegacyGeminiUnavailableError);
    assert.equal(error.name, 'LegacyGeminiUnavailableError');
    assert.equal(error.code, 'AI_LEGACY_ROUTE_DISABLED');
    assert.equal(error.status, 503);
    assert.equal(error.message, expectedMessage);
    assert.equal(error.cause, undefined);
    assert.doesNotMatch(JSON.stringify(error) + error.stack, /PRIVATE-/);
    for (const key of ['text', 'transcript', 'imageUrl', 'videoUrl', 'operationId', 'audioBase64', 'groundingMetadata', 'fallbackToBrowserSynth']) {
      assert.equal(Object.hasOwn(error, key), false, `unavailable error must not contain ${key}`);
    }
    return true;
  });
}

for (const [method, input] of cases) {
  test(`${method}: rejects instead of returning invented output`, () => mustReject(method, input));
  for (const [label, invalid] of [['undefined', undefined], ['null', null], ['empty input', {}]]) {
    test(`${method}: ${label} still produces the same redacted unavailable error`, () => mustReject(method, invalid));
  }
  test(`${method}: does not inspect input properties`, async () => {
    let reads = 0;
    const poisoned = new Proxy({}, { get() { reads++; throw new Error('PRIVATE-INPUT-GETTER'); } });
    await mustReject(method, poisoned);
    assert.equal(reads, 0);
  });
}

test('missing and populated provider variables cannot activate legacy methods', async () => {
  const keys = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'LUQI_PILOT_GEMINI_API_KEY', 'LUQI_PILOT_OPENAI_API_KEY', 'LUQI_AI_PROVIDER_ENABLED', 'LUQI_AI_BILLING_APPROVED'];
  const saved = new Map(keys.map(key => [key, process.env[key]]));
  try {
    for (const enabled of [false, true]) {
      for (const key of keys) {
        if (!enabled) delete process.env[key];
        else process.env[key] = key.endsWith('KEY') ? 'PRIVATE-SYNTHETIC-KEY' : 'true';
      }
      for (const [method, input] of cases) await mustReject(method, input);
    }
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('all five methods perform no fetch and emit no user-content logs', async () => {
  const savedFetch = globalThis.fetch;
  const levels = ['log', 'info', 'warn', 'error', 'debug'];
  const savedConsole = new Map(levels.map(level => [level, console[level]]));
  let requests = 0;
  let logs = 0;
  try {
    globalThis.fetch = async () => { requests++; throw new Error('Unexpected provider request'); };
    for (const level of levels) console[level] = () => { logs++; };
    for (const [method, input] of cases) await mustReject(method, input);
    assert.equal(requests, 0);
    assert.equal(logs, 0);
  } finally {
    globalThis.fetch = savedFetch;
    for (const [level, original] of savedConsole) console[level] = original;
  }
});

test('concurrent calls all reject without a synthetic success or queued identifier', async () => {
  const results = await Promise.allSettled(Array.from({ length: 50 }, (_, index) => {
    const [method, input] = cases[index % cases.length];
    return GeminiService[method](input);
  }));
  for (const result of results) {
    assert.equal(result.status, 'rejected');
    assert.ok(result.reason instanceof LegacyGeminiUnavailableError);
    assert.equal(result.reason.code, 'AI_LEGACY_ROUTE_DISABLED');
  }
  assert.equal(new Set(results.map(result => result.reason)).size, 50, 'do not share mutable Error instances');
});

test('retired adapter has no runtime imports, credential reads, network calls or sample assets', async () => {
  const source = await readFile(new URL('../api/geminiService.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /\b(?:import|require|fetch)\s*\(/);
  assert.doesNotMatch(source, /process\.env|GoogleGenAI|resolveGeminiApiKey|logger\./);
  assert.doesNotMatch(source, /pendulum_simulation\.mp4|Scientific Synthesis Core|data:image|Voice captured|veo_op_/);
});
