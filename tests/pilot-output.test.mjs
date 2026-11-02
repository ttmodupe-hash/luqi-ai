import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readGeminiText, readOpenAiText, readProviderJson, PilotOutputError } from '../api/services/pilotOutput.ts';
const gemini = (text = 'Sawubona') => ({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text }] } }] });
const openai = (text = 'Hello') => ({ status: 'completed', error: null, incomplete_details: null,
  output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text }] }] });
function error(code) { return value => { assert.ok(value instanceof PilotOutputError); assert.equal(value.code, code);
  assert.equal(value.message, code); assert.doesNotMatch(JSON.stringify(value), /PRIVATE/); return true; }; }
test('complete Gemini output joins actual text, not SDK convenience text or thoughts', () => {
  const response = gemini(' A'); response.text = 'PRIVATE-CONVENIENCE';
  response.candidates[0].content.parts.unshift({ thought: true, text: 'PRIVATE-THOUGHT' });
  response.candidates[0].content.parts.push({ text: 'B ' });
  assert.equal(readGeminiText(response), 'AB');
});
test('complete OpenAI output joins assistant text without reasoning metadata', () => {
  const response = openai(' A '); response.output.unshift({ type: 'reasoning', summary: [{ text: 'PRIVATE-THOUGHT' }] });
  response.output[1].content.push({ type: 'output_text', text: 'B ' });
  assert.equal(readOpenAiText(response), 'A \nB');
});
for (const code of ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY', 'IMAGE_PROHIBITED_CONTENT', 'IMAGE_RECITATION', 'MODEL_ARMOR']) {
  test('Gemini blocks ' + code + ' without returning partial text', () => {
    const response = gemini('PRIVATE-PARTIAL'); response.candidates[0].finishReason = code;
    assert.throws(() => readGeminiText(response), error('AI_RESPONSE_BLOCKED'));
  });
}
for (const reason of ['MAX_TOKENS', 'CONTINUATION']) test('Gemini incomplete ' + reason, () => {
  const response = gemini('PRIVATE-UNFINISHED'); response.candidates[0].finishReason = reason;
  assert.throws(() => readGeminiText(response), error('AI_REPLY_INCOMPLETE'));
});
test('Gemini prompt block is terminal even without candidates', () => {
  assert.throws(() => readGeminiText({ promptFeedback: { blockReason: 'SAFETY' } }), error('AI_RESPONSE_BLOCKED'));
});
for (const where of ['prompt', 'candidate']) test('Gemini explicit blocked safety rating ' + where, () => {
  const response = gemini('PRIVATE');
  if (where === 'prompt') response.promptFeedback = { safetyRatings: [{ blocked: true }] };
  else response.candidates[0].safetyRatings = [{ blocked: true }];
  assert.throws(() => readGeminiText(response), error('AI_RESPONSE_BLOCKED'));
});
for (const finish of [undefined, '', 'OTHER', 'FINISH_REASON_UNSPECIFIED', 'MALFORMED_FUNCTION_CALL', 'UNEXPECTED_TOOL_CALL']) {
  test('Gemini unknown/noncomplete finish is not success: ' + finish, () => {
    const response = gemini('PRIVATE'); response.candidates[0].finishReason = finish;
    assert.throws(() => readGeminiText(response), error('AI_RESPONSE_INVALID'));
  });
}
for (const part of [{ functionCall: { name: 'never-run' }, text: 'PRIVATE' }, { inlineData: {} }, { executableCode: {} },
  { text: 12 }, { text: 'x'.repeat(20_001) }, { thought: 'false', text: 'PRIVATE' }]) {
  test('Gemini rejects unsupported part ' + Object.keys(part).join(','), () => {
    const response = gemini(); response.candidates[0].content.parts = [part];
    assert.throws(() => readGeminiText(response), error('AI_RESPONSE_INVALID'));
  });
}
for (const status of [undefined, 'queued', 'in_progress', 'cancelled', 'failed']) test('OpenAI status is terminal and complete: ' + status, () => {
  const response = openai('PRIVATE'); response.status = status;
  assert.throws(() => readOpenAiText(response), error('AI_RESPONSE_INVALID'));
});
for (const reason of ['max_output_tokens', 'max_messages', 'steered', undefined]) test('OpenAI incomplete ' + reason, () => {
  const response = openai('PRIVATE'); response.status = 'incomplete'; response.incomplete_details = { reason };
  assert.throws(() => readOpenAiText(response), error('AI_REPLY_INCOMPLETE'));
});
test('OpenAI content-filter response never exposes partial output', () => {
  const response = openai('PRIVATE'); response.status = 'incomplete'; response.incomplete_details = { reason: 'content_filter' };
  assert.throws(() => readOpenAiText(response), error('AI_RESPONSE_BLOCKED'));
});
test('OpenAI refusal anywhere discards preceding partial text', () => {
  const response = openai('PRIVATE'); response.output[0].content.push({ type: 'refusal', refusal: 'PRIVATE-REFUSAL' });
  assert.throws(() => readOpenAiText(response), error('AI_RESPONSE_BLOCKED'));
});
for (const change of [r => r.output[0].role = 'user', r => r.output[0].type = 'function_call',
  r => r.output[0].status = 'in_progress', r => r.error = { message: 'PRIVATE' },
  r => r.incomplete_details = { reason: 'max_output_tokens' }, r => r.output[0].content[0].type = 'unknown',
  r => r.output[0].content[0].text = 'x'.repeat(20_001)]) {
  test('OpenAI rejects conflicting metadata or unsupported output', () => {
    const response = openai(); change(response);
    assert.throws(() => readOpenAiText(response), error('AI_RESPONSE_INVALID'));
  });
}
test('an incomplete OpenAI message cannot hide under completed envelope', () => {
  const response = openai(); response.output[0].status = 'incomplete';
  assert.throws(() => readOpenAiText(response), error('AI_REPLY_INCOMPLETE'));
});
for (const value of [null, [], {}, { candidates: [] }, { candidates: Array(2).fill(gemini().candidates[0]) }, gemini(' '),
  { candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ thought: true, text: 'PRIVATE' }] } }] }]) {
  test('Gemini malformed/empty payload has no fabricated answer', () => assert.throws(() => readGeminiText(value), error('AI_RESPONSE_INVALID')));
}
for (const value of [null, [], {}, { status: 'completed', output: [] }, openai(' '),
  { status: 'completed', output: [{ type: 'reasoning', summary: [{ text: 'PRIVATE' }] }] }]) {
  test('OpenAI malformed/empty payload has no fabricated answer', () => assert.throws(() => readOpenAiText(value), error('AI_RESPONSE_INVALID')));
}
test('bounded provider JSON preserves Unicode', async () => assert.deepEqual(await readProviderJson(Response.json({ text: 'Sawubona 🌍' })), { text: 'Sawubona 🌍' }));
for (const response of [new Response('PRIVATE', { headers: { 'Content-Type': 'text/html' } }),
  new Response('{PRIVATE', { headers: { 'Content-Type': 'application/json' } }),
  new Response(null, { headers: { 'Content-Type': 'application/json' } }),
  Response.json({ text: 'x'.repeat(131_073) }),
  new Response(new Uint8Array([255]), { headers: { 'Content-Type': 'application/json' } })]) {
  test('bounded provider JSON rejects unsafe/malformed body', async () => assert.rejects(readProviderJson(response), error('AI_RESPONSE_INVALID')));
}
test('provider body stream is cancelled at the bound', async () => {
  let cancelled = false;
  const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(70_000)); }, cancel() { cancelled = true; } });
  await assert.rejects(readProviderJson(new Response(body, { headers: { 'Content-Type': 'application/json' } })), error('AI_RESPONSE_INVALID'));
  assert.equal(cancelled, true);
});
