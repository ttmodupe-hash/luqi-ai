import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../api/services/spatialVision', () => ({ runSpatialVision: vi.fn() }));
vi.mock('../api/services/pilotAuth', async original => ({
  ...await original<typeof import('../api/services/pilotAuth')>(), authenticatePilotUser: vi.fn(),
}));
vi.mock('../api/services/aiPilotBudget', async original => ({
  ...await original<typeof import('../api/services/aiPilotBudget')>(), assertPilotEnabled: vi.fn(),
}));
import { spatialVision } from '../api/spatial-vision';
import { runSpatialVision } from '../api/services/spatialVision';
import { authenticatePilotUser, PilotAuthError } from '../api/services/pilotAuth';
import { assertPilotEnabled, PilotBlocked } from '../api/services/aiPilotBudget';
import { VISUAL_JPEG } from './fixtures/visual-image';

const body = { mode: 'EXAM_3D', provider: 'gemini', language: 'Tswana', consent: true,
  image: { mimeType: 'image/jpeg', data: VISUAL_JPEG } };
const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-token' };
const send = (data: unknown) => spatialVision.request('/', { method: 'POST', headers, body: JSON.stringify(data) });
const output = { sceneType: 'Synthetic diagram', summary: 'Review the visible diagram.',
  regions: [{ label: 'Line', category: 'EXAM_CONCEPT', box_2d: [100, 100, 300, 400],
    insight: 'The line is visible.' }],
  limitations: ['Text may be unclear'], nextStep: 'Check the original diagram.' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authenticatePilotUser).mockResolvedValue(42);
  vi.mocked(runSpatialVision).mockResolvedValue({ analysis: output as never, provider: 'gemini', model: 'fixture-model' });
});
afterEach(() => vi.unstubAllEnvs());

describe('authenticated spatial vision route', () => {
  it('returns bounded model suggestions with account identity and no-store', async () => {
    const response = await send(body);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect((await response.json()).analysis).toEqual(output);
    expect(runSpatialVision).toHaveBeenCalledExactlyOnceWith('EXAM_3D', VISUAL_JPEG, 42, 'Tswana', 'gemini');
  });
  it('supports explicit OpenAI without selecting a fallback or arbitrary model', async () => {
    vi.mocked(runSpatialVision).mockResolvedValue({ analysis: output as never, provider: 'openai', model: 'fixture-model' });
    const response = await send({ ...body, provider: 'openai' });
    expect((await response.json()).provider).toBe('openai');
    expect(runSpatialVision).toHaveBeenCalledExactlyOnceWith('EXAM_3D', VISUAL_JPEG, 42, 'Tswana', 'openai');
  });
  it('blocks unauthenticated callers before parsing image bytes', async () => {
    vi.mocked(authenticatePilotUser).mockRejectedValue(new PilotAuthError('AUTH_REQUIRED'));
    const request = new Request('http://localhost/', { method: 'POST', body: 'bad'.repeat(30000) });
    const response = await spatialVision.fetch(request);
    expect(response.status).toBe(401); expect(request.bodyUsed).toBe(false);
    expect(runSpatialVision).not.toHaveBeenCalled();
  });
  it('blocks unapproved billing before authentication or body parsing', async () => {
    vi.mocked(assertPilotEnabled).mockImplementation(() => { throw new PilotBlocked('BILLING_NOT_APPROVED'); });
    const request = new Request('http://localhost/', { method: 'POST', body: 'not JSON' });
    const response = await spatialVision.fetch(request);
    expect(response.status).toBe(503); expect(request.bodyUsed).toBe(false);
    expect(authenticatePilotUser).not.toHaveBeenCalled();
  });
  it('never sends serial/IMEI mode to providers, even with explicit consent', async () => {
    const response = await send({ ...body, mode: 'SERIAL_AUDIT' });
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe('LOCAL_ONLY');
    expect(runSpatialVision).not.toHaveBeenCalled();
  });
  it('rejects malformed images, caller-supplied URLs, provider overrides and missing consent', async () => {
    for (const bad of [
      { ...body, consent: false }, { ...body, provider: 'auto' }, { ...body, model: 'gpt-4o' },
      { ...body, userId: 99 }, { ...body, language: 'x'.repeat(51) },
      { ...body, image: { ...body.image, url: 'https://example.invalid/secret' } },
      { ...body, image: { mimeType: 'image/png', data: VISUAL_JPEG } },
      { ...body, image: { mimeType: 'image/jpeg', data: Buffer.from('not a photo').toString('base64') } },
    ]) expect((await send(bad)).status).toBe(400);
    expect(runSpatialVision).not.toHaveBeenCalled();
  });
  it('bounds uploads and hides provider exceptions', async () => {
    const tooBig = await spatialVision.request('/', { method: 'POST', headers, body: 'a'.repeat(600000) });
    expect(tooBig.status).toBe(413);
    vi.mocked(runSpatialVision).mockRejectedValue(new Error('private-api-key-and-image'));
    const failed = await send(body);
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain('private-');
    expect(runSpatialVision).toHaveBeenCalledTimes(1);
  });
});
