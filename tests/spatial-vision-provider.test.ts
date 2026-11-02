import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { reserve } = vi.hoisted(() => ({ reserve: vi.fn() }));
vi.mock('../api/services/aiPilotBudget', async original => ({
  ...await original<typeof import('../api/services/aiPilotBudget')>(), reservePilotAttempt: reserve,
}));
import { runSpatialVision } from '../api/services/spatialVision';
import { PILOT_MODELS } from '../api/services/pilotModels';
import { VISUAL_JPEG } from './fixtures/visual-image';
import { PilotBlocked } from '../api/services/aiPilotBudget';

const analysis = { sceneType: 'Synthetic sample', summary: 'One visible line.',
  regions: [{ label: 'Line', category: 'EXAM_CONCEPT', box_2d: [100, 100, 300, 300],
    insight: 'Review this shape.' }],
  limitations: ['Text may be unclear'], nextStep: 'Check original image.' };
const json = JSON.stringify(analysis);
const geminiReply = (text = json, finishReason = 'STOP') =>
  Response.json({ candidates: [{ finishReason, content: { role: 'model', parts: [{ text }] } }] });
const openaiReply = (text = json) => Response.json({
  status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed',
    content: [{ type: 'output_text', text }] }],
});
beforeEach(() => {
  for (const [key, value] of Object.entries({
    LUQI_AI_PROVIDER_ENABLED: 'true', LUQI_AI_BILLING_APPROVED: 'true',
    LUQI_AI_MONTHLY_USD: '300', LUQI_GEMINI_MONTHLY_USD: '165',
    LUQI_OPENAI_MONTHLY_USD: '135',
    LUQI_PILOT_GEMINI_API_KEY: 'synthetic-key', LUQI_PILOT_OPENAI_API_KEY: 'synthetic-key',
  })) vi.stubEnv(key, value);
  reserve.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('one-reservation dual-engine visual grounding', () => {
  it('reserves before exactly one Gemini image request and validates coordinates', async () => {
    const request = vi.fn(async (url: string, init: RequestInit) => {
      expect(reserve).toHaveBeenCalledExactlyOnceWith('gemini', 42, undefined, 20);
      expect(url).toContain(PILOT_MODELS.gemini);
      const body = JSON.parse(init.body as string);
      expect(body.contents[0].parts[1]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: VISUAL_JPEG } });
      expect(body.generationConfig).toMatchObject({ responseMimeType: 'application/json', maxOutputTokens: 1024 });
      expect(body.systemInstruction.parts[0].text).toContain('approximate AI suggestions');
      expect(body).not.toHaveProperty('tools');
      return geminiReply();
    });
    vi.stubGlobal('fetch', request);
    const result = await runSpatialVision('EXAM_3D', VISUAL_JPEG, 42, 'Tswana', 'gemini');
    expect(result).toEqual({ analysis, provider: 'gemini', model: PILOT_MODELS.gemini });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('sends an explicit OpenAI image via server-side Responses API, with no browser keys', async () => {
    const request = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://api.openai.com/v1/responses');
      expect(reserve).toHaveBeenCalledExactlyOnceWith('openai', 42, undefined, 20);
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe(PILOT_MODELS.openai);
      expect(body.store).toBe(false);
      expect(body.input[0].content[1]).toEqual({
        type: 'input_image', image_url: 'data:image/jpeg;base64,' + VISUAL_JPEG, detail: 'low',
      });
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer synthetic-key');
      return openaiReply();
    });
    vi.stubGlobal('fetch', request);
    expect((await runSpatialVision('EXAM_3D', VISUAL_JPEG, 42, 'English', 'openai')).provider).toBe('openai');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('does not reserve or call providers when disabled, unconfigured or image is invalid', async () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    vi.stubEnv('LUQI_AI_PROVIDER_ENABLED', 'false');
    await expect(runSpatialVision('EXAM_3D', VISUAL_JPEG, 42, 'English', 'gemini'))
      .rejects.toMatchObject({ reason: 'AI_DISABLED' });
    vi.stubEnv('LUQI_AI_PROVIDER_ENABLED', 'true');
    vi.stubEnv('LUQI_PILOT_OPENAI_API_KEY', '');
    await expect(runSpatialVision('EXAM_3D', VISUAL_JPEG, 42, 'English', 'openai'))
      .rejects.toMatchObject({ code: 'AI_KEYS_NOT_CONFIGURED' });
    await expect(runSpatialVision('EXAM_3D', 'not-a-jpeg', 42, 'English', 'gemini')).rejects.toBeDefined();
    expect(reserve).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
  });
  it('does not fall back after a provider error, refusal or invalid JSON', async () => {
    for (const response of [geminiReply('{}'), geminiReply('not-json'),
      geminiReply(json, 'MAX_TOKENS'), Response.json({ error: 'provider-error' }, { status: 503 })]) {
      const request = vi.fn(async () => response.clone());
      vi.stubGlobal('fetch', request);
      await expect(runSpatialVision('EXAM_3D', VISUAL_JPEG, 42, 'English', 'gemini')).rejects.toBeDefined();
      expect(request).toHaveBeenCalledTimes(1);
    }
  });
  it('does not contact a provider when durable budget reservations fail', async () => {
    reserve.mockRejectedValue(new PilotBlocked('AI_PROVIDER_BUDGET_EXHAUSTED'));
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    await expect(runSpatialVision('EXAM_3D', VISUAL_JPEG, 42, 'English', 'gemini'))
      .rejects.toMatchObject({ reason: 'AI_PROVIDER_BUDGET_EXHAUSTED' });
    expect(request).not.toHaveBeenCalled();
  });
});
