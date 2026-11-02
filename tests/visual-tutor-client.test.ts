import { afterEach, expect, it, vi } from 'vitest';
import { askVisualTutor, normalizedCrop, photoDimensions } from '../src/lib/visual-tutor';
import { VISUAL_JPEG } from './fixtures/visual-image';
afterEach(() => vi.restoreAllMocks());
const image = 'data:image/jpeg;base64,' + VISUAL_JPEG;
it('sends only the explicitly approved crop to a fixed same-origin endpoint', async () => {
  const request = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
    expect(path).toBe('/api/v1/visual-tutor');
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit', redirect: 'error' });
    expect(JSON.parse(init!.body as string)).toEqual({ question: 'Describe', consent: true, language: 'Tswana',
      image: { mimeType: 'image/jpeg', data: VISUAL_JPEG } });
    return Response.json({ status: 'success', response: 'Synthetic reply', provider: 'gemini', provider_model: 'fixture' });
  });
  await askVisualTutor('fixture-token', ' Describe ', image, 'Tswana', true, new AbortController().signal, request);
  expect(request).toHaveBeenCalledTimes(1);
});
it('never sends unapproved images and does not retry uncertain transport', async () => {
  const request = vi.fn(async () => { throw new Error('ambiguous transport'); });
  await expect(askVisualTutor('token', 'Describe', image, 'English', false, new AbortController().signal, request)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(request).not.toHaveBeenCalled();
  await expect(askVisualTutor('token', 'Describe', image, 'English', true, new AbortController().signal, request)).rejects.toMatchObject({ code: 'RESPONSE_UNCONFIRMED' });
  expect(request).toHaveBeenCalledTimes(1);
});
it('bounds rectangular selections and rejects oversized image dimensions before browser decode', () => {
  expect(normalizedCrop({ x: 90, y: -2, width: 50, height: 50 })).toEqual({ x: 90, y: 0, width: 10, height: 50 });
  expect(() => normalizedCrop({ x: NaN, y: 0, width: 1, height: 1 })).toThrow();
  expect(photoDimensions(Buffer.from(VISUAL_JPEG, 'base64'))).toEqual({ width: 64, height: 48 });
  const png = new Uint8Array(24); png.set([137,80,78,71,13,10,26,10], 0); png.set([73,72,68,82], 12);
  new DataView(png.buffer).setUint32(16, 9000); new DataView(png.buffer).setUint32(20, 9000);
  expect(() => photoDimensions(png)).toThrow();
});
