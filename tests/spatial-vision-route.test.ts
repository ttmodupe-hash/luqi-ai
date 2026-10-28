import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../api/services/spatialVision', async original => ({
  ...await original<typeof import('../api/services/spatialVision')>(), runSpatialVision: vi.fn(),
}));
vi.mock('../api/services/pilotAuth', async original => ({
  ...await original<typeof import('../api/services/pilotAuth')>(), authenticatePilotUser: vi.fn(),
}));
vi.mock('../api/services/aiPilotBudget', async original => ({
  ...await original<typeof import('../api/services/aiPilotBudget')>(),
  assertPilotEnabled: vi.fn(), checkPilotGatewayReadiness: vi.fn(),
}));
import { spatialVision } from '../api/spatial-vision';
import { runSpatialVision } from '../api/services/spatialVision';
import { authenticatePilotUser, PilotAuthError } from '../api/services/pilotAuth';
import { assertPilotEnabled, PilotBlocked, checkPilotGatewayReadiness } from '../api/services/aiPilotBudget';
import { VISUAL_JPEG } from './fixtures/visual-image';

const analysis = {
  summary: 'A synthetic equation is visible.',
  guidance: 'Check each algebra step.',
  entities: [{ label: 'Equation', category: 'EXAM_CONCEPT',
    box_2d: [100, 200, 500, 750], insight: 'Approximate region only.' }],
  limitations: 'The exact pixels were not independently verified.',
};
const body = { question: 'Explain the equation', language: 'English', mode: 'EXAM_3D',
  provider: 'gemini', consent: true, image: { mimeType: 'image/jpeg', data: VISUAL_JPEG } };
const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer fixture-token' };
const send = (value: unknown) => spatialVision.request('/', { method: 'POST', headers, body: JSON.stringify(value) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authenticatePilotUser).mockResolvedValue(42);
  vi.mocked(runSpatialVision).mockResolvedValue({ analysis: analysis as never,
    provider: 'gemini', model: 'synthetic-model' });
});

it('returns only strict model-estimated analysis for authenticated budgeted requests', async () => {
  const response = await send(body);
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({ status: 'success', analysis,
    provider: 'gemini', provider_model: 'synthetic-model' });
  expect(runSpatialVision).toHaveBeenCalledExactlyOnceWith('Explain the equation',
    VISUAL_JPEG, 42, 'EXAM_3D', 'English', 'gemini');
});

it('authenticates and checks approved billing before parsing a private image', async () => {
  vi.mocked(authenticatePilotUser).mockRejectedValue(new PilotAuthError('AUTH_REQUIRED'));
  const request = new Request('http://localhost/', { method: 'POST', body: 'not-json'.repeat(80000) });
  expect((await spatialVision.fetch(request)).status).toBe(401);
  expect(request.bodyUsed).toBe(false);
  vi.mocked(assertPilotEnabled).mockImplementation(() => { throw new PilotBlocked('BILLING_NOT_APPROVED'); });
  const second = new Request('http://localhost/', { method: 'POST', body: 'untrusted' });
  expect((await spatialVision.fetch(second)).status).toBe(503);
  expect(second.bodyUsed).toBe(false);
  expect(runSpatialVision).not.toHaveBeenCalled();
});

it('requires explicit image consent, reviewed serial crop, and a known provider', async () => {
  for (const value of [
    { ...body, consent: false }, { ...body, consent: null },
    { ...body, mode: 'SERIAL_AUDIT' }, { ...body, provider: 'auto' },
    { ...body, userId: 999 }, { ...body, image: { ...body.image, url: 'https://example.invalid' } },
    { ...body, image: { mimeType: 'image/png', data: VISUAL_JPEG } },
    { ...body, image: { mimeType: 'image/jpeg', data: Buffer.from('not jpeg').toString('base64') } },
  ]) {
    expect((await send(value)).status).toBe(400);
  }
  expect(runSpatialVision).not.toHaveBeenCalled();
  const serial = await send({ ...body, mode: 'SERIAL_AUDIT', serialCropConfirmed: true });
  expect(serial.status).toBe(200);
  expect(runSpatialVision).toHaveBeenCalledTimes(1);
});

it('bounds input and never leaks a provider error or image content', async () => {
  expect((await spatialVision.request('/', { method: 'POST', headers, body: 'a'.repeat(600000) })).status).toBe(413);
  vi.mocked(runSpatialVision).mockRejectedValue(new Error('PRIVATE_IMAGE_AND_PROVIDER_KEY'));
  const failed = await send(body);
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toMatch(/PRIVATE_IMAGE|PROVIDER_KEY/);
});

it('reports provider configuration only, with no paid inference', async () => {
  vi.mocked(checkPilotGatewayReadiness).mockResolvedValue('configured_not_verified');
  const result = await spatialVision.request('/availability');
  expect(result.status).toBe(200);
  expect((await result.json()).note).toMatch(/Configuration only/);
  expect(authenticatePilotUser).not.toHaveBeenCalled();
  expect(runSpatialVision).not.toHaveBeenCalled();
});
