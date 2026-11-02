import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('../api/services/visualTutor', async original => ({
  ...await original<typeof import('../api/services/visualTutor')>(), runVisualTutor: vi.fn(),
}));
vi.mock('../api/services/pilotAuth', async original => ({
  ...await original<typeof import('../api/services/pilotAuth')>(), authenticatePilotUser: vi.fn(),
}));
vi.mock('../api/services/aiPilotBudget', async original => ({
  ...await original<typeof import('../api/services/aiPilotBudget')>(), assertPilotEnabled: vi.fn(),
  checkPilotGatewayReadiness: vi.fn(),
}));
import { visualTutor } from '../api/visual-tutor';
import { runVisualTutor } from '../api/services/visualTutor';
import { authenticatePilotUser, PilotAuthError } from '../api/services/pilotAuth';
import { assertPilotEnabled, PilotBlocked, checkPilotGatewayReadiness } from '../api/services/aiPilotBudget';
import { VISUAL_JPEG } from './fixtures/visual-image';
const body = { question: 'Explain this', consent: true, language: 'Tswana', image: { mimeType: 'image/jpeg', data: VISUAL_JPEG } };
const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer fixture-token' };
const send = (data: unknown) => visualTutor.request('/', { method: 'POST', headers, body: JSON.stringify(data) });
beforeEach(() => {
  vi.resetAllMocks(); vi.mocked(authenticatePilotUser).mockResolvedValue(42);
  vi.mocked(runVisualTutor).mockResolvedValue({ response: 'Synthetic reply', provider: 'gemini', model: 'fixture-model' });
});
afterEach(() => vi.unstubAllEnvs());

it('uses authenticated identity and returns only a confirmed no-store explanation', async () => {
  const response = await send(body);
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ status: 'success', response: 'Synthetic reply', provider: 'gemini', provider_model: 'fixture-model' });
  expect(runVisualTutor).toHaveBeenCalledExactlyOnceWith('Explain this', VISUAL_JPEG, 42, 'Tswana');
});

it('authenticates before reading untrusted image bytes', async () => {
  vi.mocked(authenticatePilotUser).mockRejectedValue(new PilotAuthError('AUTH_REQUIRED'));
  const request = new Request('http://localhost/', { method: 'POST', body: 'not-json'.repeat(100_000) });
  const response = await visualTutor.fetch(request);
  expect(response.status).toBe(401); expect(request.bodyUsed).toBe(false);
  expect(runVisualTutor).not.toHaveBeenCalled();
});

it('keeps disabled billing ahead of authentication or body parsing', async () => {
  vi.mocked(assertPilotEnabled).mockImplementation(() => { throw new PilotBlocked('BILLING_NOT_APPROVED'); });
  const request = new Request('http://localhost/', { method: 'POST', body: 'not-json' });
  expect((await visualTutor.fetch(request)).status).toBe(503); expect(request.bodyUsed).toBe(false);
  expect(authenticatePilotUser).not.toHaveBeenCalled(); expect(runVisualTutor).not.toHaveBeenCalled();
});

it.each([false, 'true', 1, null, undefined])('requires literal image-processing agreement: %j', async consent => {
  expect((await send({ ...body, consent })).status).toBe(400);
  expect(runVisualTutor).not.toHaveBeenCalled();
});

it('refuses caller overrides, image URLs, malformed data and invalid questions without inference', async () => {
  for (const data of [{ ...body, userId: 99 }, { ...body, provider: 'openai' },
    { ...body, question: 'x'.repeat(2001) }, { ...body, question: ' ' },
    { ...body, image: { mimeType: 'image/svg+xml', data: VISUAL_JPEG } },
    { ...body, image: { ...body.image, url: 'https://example.invalid' } },
    { ...body, image: { ...body.image, data: Buffer.from('not an image').toString('base64') } }]) {
    expect((await send(data)).status).toBe(400);
  }
  expect(runVisualTutor).not.toHaveBeenCalled();
});

it('bounds streamed request bodies and sanitizes provider errors', async () => {
  const response = await visualTutor.request('/', { method: 'POST', headers, body: 'a'.repeat(600_000) });
  expect(response.status).toBe(413); expect(runVisualTutor).not.toHaveBeenCalled();
  vi.mocked(runVisualTutor).mockRejectedValue(new Error('private-image-data-and-key'));
  const failed = await send(body);
  expect(failed.status).toBe(503); expect(await failed.text()).not.toContain('private-');
  expect(runVisualTutor).toHaveBeenCalledTimes(1);
});

it('checks configuration without account data or provider inference', async () => {
  vi.stubEnv('LUQI_PILOT_GEMINI_API_KEY', 'fixture');
  vi.mocked(checkPilotGatewayReadiness).mockResolvedValue('configured_not_verified');
  const response = await visualTutor.request('/availability');
  expect((await response.json()).available).toBe(true);
  expect(authenticatePilotUser).not.toHaveBeenCalled(); expect(runVisualTutor).not.toHaveBeenCalled();
});
