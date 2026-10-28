import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { reserve } = vi.hoisted(() => ({ reserve: vi.fn() }));
vi.mock('../api/services/aiPilotBudget', async original => ({
  ...await original<typeof import('../api/services/aiPilotBudget')>(), reservePilotAttempt: reserve,
}));
import { runVisualTutor, validateVisualImage } from '../api/services/visualTutor';
import { PilotBlocked } from '../api/services/aiPilotBudget';
import { PILOT_MODELS } from '../api/services/pilotModels';
import { VISUAL_JPEG } from './fixtures/visual-image';

beforeEach(() => {
  for (const [key, value] of Object.entries({ LUQI_AI_PROVIDER_ENABLED: 'true', LUQI_AI_BILLING_APPROVED: 'true',
    LUQI_AI_MONTHLY_USD: '100', LUQI_GEMINI_MONTHLY_USD: '60', LUQI_OPENAI_MONTHLY_USD: '40',
    LUQI_PILOT_GEMINI_API_KEY: 'fixture-key' })) vi.stubEnv(key, value);
  reserve.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('sends only the chosen crop and language after one durable reservation with the real SDK', async () => {
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    expect(reserve.mock.calls).toEqual([['gemini', 42]]);
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${PILOT_MODELS.gemini}:generateContent`);
    const body = JSON.parse(init.body as string);
    expect(body.contents).toHaveLength(1);
    expect(body.contents[0].parts).toHaveLength(2);
    expect(body.contents[0].parts[0].text).toContain('Language preference: Tswana');
    expect(body.contents[0].parts[1]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: VISUAL_JPEG } });
    expect(body.generationConfig).toMatchObject({ maxOutputTokens: 512, mediaResolution: 'MEDIA_RESOLUTION_LOW' });
    expect(new Headers(init.headers).get('x-server-timeout')).toBe('20');
    expect(body).not.toHaveProperty('tools');
    expect(body.systemInstruction.parts[0].text).toContain('untrusted content');
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: 'Synthetic explanation' }] } }] });
  });
  vi.stubGlobal('fetch', fetcher);
  expect((await runVisualTutor('Explain the selected component', VISUAL_JPEG, 42, 'Tswana')).response).toBe('Synthetic explanation');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('never starts provider transport when disabled, unconfigured, or out of allowance', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  vi.stubEnv('LUQI_AI_BILLING_APPROVED', 'false');
  await expect(runVisualTutor('Describe', VISUAL_JPEG, 42)).rejects.toMatchObject({ reason: 'BILLING_NOT_APPROVED' });
  expect(reserve).not.toHaveBeenCalled();
  vi.stubEnv('LUQI_AI_BILLING_APPROVED', 'true'); vi.stubEnv('LUQI_PILOT_GEMINI_API_KEY', '');
  await expect(runVisualTutor('Describe', VISUAL_JPEG, 42)).rejects.toMatchObject({ code: 'AI_KEYS_NOT_CONFIGURED' });
  expect(reserve).not.toHaveBeenCalled();
  vi.stubEnv('LUQI_PILOT_GEMINI_API_KEY', 'fixture-key');
  reserve.mockRejectedValue(new PilotBlocked('AI_PROVIDER_BUDGET_EXHAUSTED'));
  await expect(runVisualTutor('Describe', VISUAL_JPEG, 42)).rejects.toMatchObject({ reason: 'AI_PROVIDER_BUDGET_EXHAUSTED' });
  expect(fetcher).not.toHaveBeenCalled();
});

it.each(['failure', 'refusal', 'incomplete'] as const)('does not retry or fall back after %s', async kind => {
  const fetcher = vi.fn(async () => kind === 'failure'
    ? Response.json({ error: { code: 503, message: 'private-provider-error' } }, { status: 503 })
    : Response.json({ candidates: [{ finishReason: kind === 'refusal' ? 'SAFETY' : 'MAX_TOKENS', content: { role: 'model', parts: [{ text: 'Do not publish' }] } }] }));
  vi.stubGlobal('fetch', fetcher);
  await expect(runVisualTutor('Describe', VISUAL_JPEG, 42)).rejects.toBeDefined();
  expect(fetcher).toHaveBeenCalledTimes(1); expect(reserve).toHaveBeenCalledTimes(1);
});

it('rejects disguised, oversized, truncated, noncanonical and large-dimension images before spending', async () => {
  const oversized = Buffer.from(VISUAL_JPEG, 'base64');
  const marker = oversized.indexOf(Buffer.from([0xff, 0xc0]));
  oversized.writeUInt16BE(2048, marker + 7);
  for (const data of ['https://example.invalid/private.jpg', 'data:image/jpeg;base64,' + VISUAL_JPEG,
    Buffer.from('<svg/>').toString('base64'), 'A'.repeat(500_000), VISUAL_JPEG.slice(0, -4),
    VISUAL_JPEG + '\n', oversized.toString('base64')]) {
    expect(() => validateVisualImage(data)).toThrow();
    await expect(runVisualTutor('Describe', data, 42)).rejects.toBeDefined();
  }
  expect(reserve).not.toHaveBeenCalled();
});
