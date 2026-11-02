import { MAX_PILOT_QUESTION_CHARS } from '../src/lib/pilot-input';
import { describe, expect, it, vi } from 'vitest';
import { askPilot, pilotAvailability } from '../src/lib/ai-pilot';

describe('same-origin, explicitly submitted AI trial', () => {
  it('requires connected persistence and configured pilot, without treating health as inference proof', async () => {
    for (const [status, state, database, expected] of [
      [200, 'configured_not_verified', 'connected', true], [503, 'disabled', 'connected', false],
      [200, 'configured_not_verified', 'unavailable', false], [200, 'healthy', 'connected', false],
    ] as const) {
      const request = vi.fn(async () => Response.json({ checks: { persistence: database, ai_pilot: state } }, { status }));
      expect(await pilotAvailability(new AbortController().signal, request)).toBe(expected);
      expect(request.mock.calls).toHaveLength(1);
    }
  });
  it('sends only the explicit question, with no note history or browser credentials', async () => {
    const request = vi.fn(async () => Response.json({ status: 'success', response: 'Hello', provider: 'gemini', provider_model: 'fixture-model' }));
    const signal = new AbortController().signal;
    expect((await askPilot('synthetic-token', ' Hello ', signal, request)).response).toBe('Hello');
    expect(request).toHaveBeenCalledExactlyOnceWith('/api/v1/luqi-core', {
      method: 'POST', signal: expect.any(AbortSignal), credentials: 'omit', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-token' },
      body: JSON.stringify({ user_input: 'Hello' }),
    });
  });
  it('does not send empty, oversized or unauthenticated requests', async () => {
    const request = vi.fn(); const signal = new AbortController().signal;
    for (const [token, prompt] of [['', 'Hi'], ['token', ' '], ['token', 'x'.repeat(6001)]]) {
      await expect(askPilot(token, prompt, signal, request)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    }
    expect(request).not.toHaveBeenCalled();
  });
  it('does not retry uncertain, malformed or oversized replies and drops raw diagnostics', async () => {
    for (const response of [new Error('private fixture diagnostic'), new Response('{'),
      new Response('x'.repeat(65_537)), Response.json({ status: 'success', response: 'made up', provider: 'other' })]) {
      const request = vi.fn(async () => { if (response instanceof Error) throw response; return response; });
      await expect(askPilot('token', 'Hi', new AbortController().signal, request)).rejects.toMatchObject({ code: 'RESPONSE_UNCONFIRMED' });
      expect(request).toHaveBeenCalledTimes(1);
    }
  });
  it.each([['AI_USER_DAILY_QUOTA_EXHAUSTED', 429], ['AI_PROVIDER_BUDGET_EXHAUSTED', 429],
    ['AI_PROVIDER_UNAVAILABLE', 503], ['untrusted-private-message', 500]] as const)('bounds failure codes for %s', async (code, status) => {
    const request = vi.fn(async () => Response.json({ code }, { status }));
    await expect(askPilot('token', 'Hi', new AbortController().signal, request)).rejects.toMatchObject({
      code: code === 'untrusted-private-message' ? 'RESPONSE_UNCONFIRMED' : code,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
});

it('refuses a question that fits the raw API field but not the complete input', async () => {
  const request = vi.fn();
  await expect(askPilot('token', 'x'.repeat(MAX_PILOT_QUESTION_CHARS + 1), new AbortController().signal, request))
    .rejects.toMatchObject({ code: 'AI_INPUT_TOO_LARGE' });
  expect(request).not.toHaveBeenCalled();
});
it('sends the full exact-limit question including its final qualifier', async () => {
  const question = 'x'.repeat(MAX_PILOT_QUESTION_CHARS - 8) + 'END-TEST';
  const request = vi.fn(async () => Response.json({ status: 'success', response: 'Hello', provider: 'gemini', provider_model: 'fixture-model' }));
  await askPilot('token', question, new AbortController().signal, request);
  expect(JSON.parse((request.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).user_input).toBe(question);
  expect(request).toHaveBeenCalledTimes(1);
});
it.each(['AI_INPUT_TOO_LARGE', 'INVALID_INPUT'])('recognizes a server pre-spend rejection: %s', async code => {
  const request = vi.fn(async () => Response.json({ code }, { status: 400 }));
  await expect(askPilot('token', 'Hello', new AbortController().signal, request)).rejects.toMatchObject({ code });
  expect(request).toHaveBeenCalledTimes(1);
});

it('does not send a request after caller cancellation', async () => {
  const controller = new AbortController(); controller.abort(); const request = vi.fn();
  await expect(askPilot('token', 'Hello', controller.signal, request)).rejects.toMatchObject({ code: 'RESPONSE_UNCONFIRMED' });
  expect(request).not.toHaveBeenCalled();
});
it('does not trust an input-rejection code delivered with a server error', async () => {
  const request = vi.fn(async () => Response.json({ code: 'INVALID_INPUT' }, { status: 500 }));
  await expect(askPilot('token', 'Hello', new AbortController().signal, request)).rejects.toMatchObject({ code: 'RESPONSE_UNCONFIRMED' });
  expect(request).toHaveBeenCalledTimes(1);
});
it('requires JSON media type even for a plausible success body', async () => {
  const request = vi.fn(async () => new Response(JSON.stringify({ status: 'success', response: 'fixture', provider: 'gemini', provider_model: 'fixture' })));
  await expect(askPilot('token', 'Hello', new AbortController().signal, request)).rejects.toMatchObject({ code: 'RESPONSE_UNCONFIRMED' });
  expect(request).toHaveBeenCalledTimes(1);
});

it('sends only explicitly opted-in bounded recent turns, never notes or account metadata', async () => {
  const history = [
    { sender: 'user' as const, text: 'I am visiting Ghana' },
    { sender: 'ai' as const, text: 'What kind of visit?' },
  ];
  const request = vi.fn(async () => Response.json({
    status: 'success', response: 'What matters most?', provider: 'gemini', provider_model: 'fixture-model',
  }));
  const response = await askPilot('synthetic-token', 'Help me plan', new AbortController().signal, request, history);
  expect(response.response).toBe('What matters most?');
  const body = JSON.parse((request.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
  expect(body).toEqual({ user_input: 'Help me plan', history });
  expect(JSON.stringify(body)).not.toContain('accountEmail');
  expect(request).toHaveBeenCalledTimes(1);
});

it('rejects oversized or unreviewed context before a paid request', async () => {
  const request = vi.fn();
  const signal = new AbortController().signal;
  await expect(askPilot('token', 'Hello', signal, request, [
    { sender: 'ai', text: 'x'.repeat(351) },
  ])).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  await expect(askPilot('token', 'Hello', signal, request, Array(5).fill({
    sender: 'user' as const, text: 'x',
  }))).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(request).not.toHaveBeenCalled();
});

it('only includes a whitelisted country when explicitly supplied; preserves normal request without context', async () => {
  const request = vi.fn(async () => Response.json({ status: 'success', response: 'OK', provider: 'gemini', provider_model: 'fixture' }));
  await askPilot('token', 'Plan a small business', new AbortController().signal, request, [], 'EAC_KE');
  const body = JSON.parse((request.mock.calls[0] as unknown as [string,RequestInit])[1].body as string);
  expect(body).toEqual({ user_input: 'Plan a small business', regionContext: 'EAC_KE' });
  expect(request).toHaveBeenCalledTimes(1);
  const never = vi.fn();
  await expect(askPilot('token','Hi',new AbortController().signal,never,[], 'not-a-real-country' as never))
    .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(never).not.toHaveBeenCalled();
});
