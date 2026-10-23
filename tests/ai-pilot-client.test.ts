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
      method: 'POST', signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
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
      code: code === 'untrusted-private-message' ? 'AI_UNAVAILABLE' : code,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
