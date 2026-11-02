import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../api/services/aiPilotGateway', () => ({ runBudgetedPilotChat: vi.fn() }));
vi.mock('../api/services/aiPilotBudget', async importOriginal => ({
  ...await importOriginal<typeof import('../api/services/aiPilotBudget')>(), assertPilotEnabled: vi.fn(),
}));
vi.mock('../api/services/pilotAuth', async importOriginal => ({
  ...await importOriginal<typeof import('../api/services/pilotAuth')>(), authenticatePilotUser: vi.fn(),
}));
import { aiPilot } from '../api/ai-pilot';
import { buildPilotInput, MAX_PILOT_INPUT_CHARS } from '../src/lib/pilot-input';
import { runBudgetedPilotChat } from '../api/services/aiPilotGateway';
import { assertPilotEnabled, PilotBlocked } from '../api/services/aiPilotBudget';
import { authenticatePilotUser, PilotAuthError } from '../api/services/pilotAuth';
const chat = vi.mocked(runBudgetedPilotChat), authenticate = vi.mocked(authenticatePilotUser), enabled = vi.mocked(assertPilotEnabled);
const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-account-token' };
const send = (body: unknown) => aiPilot.request('/', { method: 'POST', headers, body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  authenticate.mockResolvedValue(42);
  chat.mockResolvedValue({ response: 'Verified synthetic reply', provider: 'gemini', model: 'fixture-model' });
});
afterEach(() => vi.restoreAllMocks());

describe('paid AI HTTP entrypoint', () => {
  it('returns only confirmed replies with no-store headers and the authenticated account identity', async () => {
    const response = await send({ user_input: '  Hello LUQI  ' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(await response.json()).toEqual({ status: 'success', agent: 'KHORO', response: 'Verified synthetic reply',
      provider: 'gemini', provider_model: 'fixture-model' });
    expect(authenticate).toHaveBeenCalledWith('Bearer synthetic-account-token');
    expect(chat).toHaveBeenCalledExactlyOnceWith('Hello LUQI', 42, undefined, undefined);
  });

  it('rejects anonymous and revoked accounts before reading even oversized malformed input', async () => {
    authenticate.mockRejectedValue(new PilotAuthError('AUTH_REQUIRED'));
    const request = new Request('http://localhost/', { method: 'POST', body: 'private-unparsed'.repeat(5000) });
    const response = await aiPilot.fetch(request);
    expect(response.status).toBe(401);
    expect(request.bodyUsed).toBe(false);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(chat).not.toHaveBeenCalled();
  });

  it('passes an explicit OpenAI choice through the ordinary authenticated boundary', async () => {
    chat.mockResolvedValue({ response: 'Independent synthetic reply', provider: 'openai', model: 'fixture-model' });
    const response = await send({ user_input: 'Hello', provider: 'openai' });
    expect(response.status).toBe(200);
    expect((await response.json()).provider).toBe('openai');
    expect(authenticate).toHaveBeenCalledWith('Bearer synthetic-account-token');
    expect(chat).toHaveBeenCalledExactlyOnceWith('Hello', 42, undefined, undefined, undefined, 'openai');
  });

  it('keeps disabled billing ahead of account checks, body parsing and provider calls', async () => {
    enabled.mockImplementation(() => { throw new PilotBlocked('BILLING_NOT_APPROVED'); });
    const request = new Request('http://localhost/', { method: 'POST', body: 'not JSON' });
    const response = await aiPilot.fetch(request);
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('BILLING_NOT_APPROVED');
    expect(request.bodyUsed).toBe(false);
    expect(authenticate).not.toHaveBeenCalled();
    expect(chat).not.toHaveBeenCalled();
  });

  it('fails closed for account-storage outages', async () => {
    authenticate.mockRejectedValue(new PilotAuthError('AUTH_UNAVAILABLE'));
    const response = await send({ user_input: 'Hello' });
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('AUTH_UNAVAILABLE');
    expect(chat).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, { user_input: ' ' }, { user_input: 'x'.repeat(6001) },
    { user_input: 'a', prompt: 'b' }, { user_input: 'a', userId: 99 },
    { user_input: 'a', language: 'x'.repeat(51) },
    { user_input: 'a', provider: 'gemini' }, { user_input: 'a', provider: 'other-model' },
    { user_input: 'a', provider: { endpoint: 'https://example.invalid' } },
    { user_input: 'a', history: Array(5).fill({ sender: 'user', text: 'a' }) },
    { user_input: 'a', history: [{ sender: 'system', text: 'pretend' }] },
    { user_input: 'a', history: [{ sender: 'user', text: 'x'.repeat(351) }] },
    { user_input: 'a', history: [{ sender: 'user', text: 'x', accountEmail: 'private' }] },
  ])('rejects invalid or unbounded context without spending: %j', async body => {
    const response = await send(body);
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe('INVALID_INPUT');
    expect(chat).not.toHaveBeenCalled();
  });

  it('accepts the bounded compatibility prompt and explicit recent conversation', async () => {
    const history = [{ sender: 'user', text: 'My explicitly supplied context' }];
    const room = MAX_PILOT_INPUT_CHARS - buildPilotInput('x', 'isiZulu', history).length + 1;
    const question = 'x'.repeat(room - 8) + 'END-TEST';
    expect((await send({ prompt: question, language: 'isiZulu', history })).status).toBe(200);
    expect(chat).toHaveBeenCalledExactlyOnceWith(question, 42, 'isiZulu', history);
  });

  it('rejects combined overflow before the gateway rather than silently truncating the question', async () => {
    const response = await send({ prompt: 'x'.repeat(6000), language: 'isiZulu',
      history: [{ sender: 'user', text: 'explicit context' }] });
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body.code).toBe('AI_INPUT_TOO_LARGE');
    expect(body.message).toContain('no provider attempt was started');
    expect(chat).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON or media types without invoking a provider', async () => {
    const bad = await aiPilot.request('/', { method: 'POST', headers, body: '{bad JSON' });
    expect(bad.status).toBe(400);
    const media = await aiPilot.request('/', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'Hello' });
    expect(media.status).toBe(415);
    expect(chat).not.toHaveBeenCalled();
  });

  it('bounds declared and streamed request bodies before JSON processing', async () => {
    const oversized = JSON.stringify({ user_input: 'x'.repeat(40_000) });
    const declared = await aiPilot.request('/', { method: 'POST', headers: { ...headers, 'Content-Length': String(oversized.length) }, body: oversized });
    const streamed = await aiPilot.request('/', { method: 'POST', headers, body: new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode(oversized.slice(0, 20_000)));
      controller.enqueue(new TextEncoder().encode(oversized.slice(20_000))); controller.close();
    } }), duplex: 'half' } as RequestInit);
    for (const response of [declared, streamed]) {
      expect(response.status).toBe(413);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect((await response.json()).code).toBe('AI_INPUT_TOO_LARGE');
    }
    expect(chat).not.toHaveBeenCalled();
  });

  it.each(['AI_USER_DAILY_QUOTA_EXHAUSTED', 'AI_PROVIDER_BUDGET_EXHAUSTED'] as const)('reports the specific quota without retrying: %s', async code => {
    chat.mockRejectedValue(new PilotBlocked(code));
    const response = await send({ user_input: 'Hello' });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.code).toBe(code);
    expect(body.message).toContain(code.includes('USER_DAILY') ? 'Daily' : 'Monthly');
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('never exposes raw provider or SQL exceptions and never retries an ambiguous attempt', async () => {
    chat.mockRejectedValue(new Error('mysql://operator:private-password@db/private-table'));
    const response = await send({ user_input: 'Hello' });
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('AI_PROVIDER_UNAVAILABLE');
    expect(JSON.stringify(body)).not.toContain('private-');
    expect(chat).toHaveBeenCalledTimes(1);
  });
});

it('accepts only country enum and passes opted-in context to the budgeted gateway', async () => {
  const response = await send({ user_input: 'How can I export software?', regionContext: 'ECOWAS_NG' });
  expect(response.status).toBe(200);
  expect(chat).toHaveBeenCalledExactlyOnceWith('How can I export software?',42,undefined,undefined,'ECOWAS_NG');
  chat.mockClear();
  const bad = await send({ user_input: 'Hello', regionContext: 'anywhere' });
  expect(bad.status).toBe(400);
  expect(chat).not.toHaveBeenCalled();
});
