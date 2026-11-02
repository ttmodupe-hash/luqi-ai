import { it, expect, vi, afterEach } from 'vitest';
import { countGuestInputTokens } from '../api/services/guestTokenCount';
afterEach(() => vi.unstubAllEnvs());
it('uses Developer REST generateContentRequest, including the same policy and input, without unsupported SDK config', async () => {
  vi.stubEnv('LUQI_PILOT_GEMINI_API_KEY', 'fixture-private-key');
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ totalTokens: 420 })));
  expect(await countGuestInputTokens('Sawubona! Please explain gravity.', 'You are Luqi.', fetcher)).toEqual({ totalTokens: 420 });
  const [url, config] = fetcher.mock.calls[0];
  expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:countTokens');
  expect(url).not.toContain('fixture-private-key'); expect(config.headers['x-goog-api-key']).toBe('fixture-private-key');
  expect(JSON.parse(config.body)).toEqual({ generateContentRequest: {
    model: 'models/gemini-3.8-flash', contents: [{ role: 'user', parts: [{ text: 'Sawubona! Please explain gravity.' }] }],
    systemInstruction: { parts: [{ text: 'You are Luqi.' }] },
  } });
  expect(config.redirect).toBe('error'); expect(config.signal).toBeInstanceOf(AbortSignal);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each([undefined, null, 0, -1, 4097, 1.5, '500'])('rejects missing, oversized or invalid counts: %s', async totalTokens => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ totalTokens })));
  await expect(countGuestInputTokens('hello', 'policy', fetcher)).rejects.toMatchObject({ code: 'GUEST_TRIAL_UNAVAILABLE' });
});
it.each([401, 403, 429, 500])('does not retry a provider HTTP %s or disclose its response', async status => {
  const fetcher = vi.fn().mockResolvedValue(new Response('private-fixture-error', { status }));
  await expect(countGuestInputTokens('hello', 'policy', fetcher)).rejects.toThrow('GUEST_TRIAL_UNAVAILABLE');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects an oversized response and transport errors without generation', async () => {
  await expect(countGuestInputTokens('hello', 'policy', vi.fn().mockResolvedValue(new Response('x'.repeat(4097)))))
    .rejects.toThrow('GUEST_TRIAL_UNAVAILABLE');
  await expect(countGuestInputTokens('hello', 'policy', vi.fn().mockRejectedValue(new Error('private-fixture-error'))))
    .rejects.toThrow('GUEST_TRIAL_UNAVAILABLE');
});
