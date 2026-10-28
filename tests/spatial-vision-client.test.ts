import { afterEach, expect, it, vi } from 'vitest';
import { askSpatialVision } from '../src/lib/spatial-vision';
import { VISUAL_JPEG } from './fixtures/visual-image';
afterEach(() => vi.restoreAllMocks());
const image = 'data:image/jpeg;base64,' + VISUAL_JPEG;
const analysis = { sceneType: 'Synthetic diagram', summary: 'One line.',
  regions: [{ label: 'Line', category: 'EXAM_CONCEPT', box_2d: [100, 200, 300, 400],
    insight: 'Visible in the diagram.' }],
  limitations: ['Small labels'], nextStep: 'Check the original.' };
it('sends exactly one explicitly approved image to the fixed same-origin endpoint', async () => {
  const request = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
    expect(path).toBe('/api/v1/spatial-vision');
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store' });
    expect(JSON.parse(init!.body as string)).toEqual({ mode: 'EXAM_3D', provider: 'gemini', language: 'Tswana',
      consent: true, image: { mimeType: 'image/jpeg', data: VISUAL_JPEG } });
    return Response.json({ status: 'success', provider: 'gemini', provider_model: 'fixture-model', analysis });
  });
  const result = await askSpatialVision('fixture-token', 'EXAM_3D', 'gemini', image,
    'Tswana', true, new AbortController().signal, request);
  expect(result.analysis.regions[0].box_2d).toEqual([100, 200, 300, 400]);
  expect(request).toHaveBeenCalledTimes(1);
});
it('blocks serial/IMEI uploads and unapproved requests before transport', async () => {
  const request = vi.fn();
  for (const [mode, consent] of [['SERIAL_AUDIT', true], ['EXAM_3D', false]] as const) {
    await expect(askSpatialVision('fixture-token', mode, 'gemini', image, 'English', consent,
      new AbortController().signal, request)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  }
  expect(request).not.toHaveBeenCalled();
});
it('does not retry on ambiguous transport, provider mismatch or invalid regions', async () => {
  const network = vi.fn(async () => { throw new Error('unknown transport'); });
  await expect(askSpatialVision('token', 'EXAM_3D', 'openai', image, 'English', true,
    new AbortController().signal, network)).rejects.toMatchObject({ code: 'RESPONSE_UNCONFIRMED' });
  expect(network).toHaveBeenCalledTimes(1);
  const wrong = vi.fn(async () => Response.json({ status: 'success', provider: 'openai',
    provider_model: 'fixture', analysis }));
  await expect(askSpatialVision('token', 'EXAM_3D', 'gemini', image, 'English', true,
    new AbortController().signal, wrong)).rejects.toMatchObject({ code: 'RESPONSE_UNCONFIRMED' });
  const invalid = vi.fn(async () => Response.json({ status: 'success', provider: 'gemini',
    provider_model: 'fixture', analysis: { ...analysis, regions: [{ ...analysis.regions[0],
      box_2d: [200, 300, 100, 400] }] } }));
  await expect(askSpatialVision('token', 'EXAM_3D', 'gemini', image, 'English', true,
    new AbortController().signal, invalid)).rejects.toMatchObject({ code: 'RESPONSE_UNCONFIRMED' });
});
