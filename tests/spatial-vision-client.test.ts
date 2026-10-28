import { expect, it, vi } from 'vitest';
import { askSpatialVision } from '../src/lib/spatial-vision';
import { PilotChatError } from '../src/lib/ai-pilot';
import { VISUAL_JPEG } from './fixtures/visual-image';

const dataUrl = 'data:image/jpeg;base64,' + VISUAL_JPEG;
const analysis = { summary: 'Visible equation', guidance: 'Check the terms', entities: [],
  limitations: 'Unverified OCR and location' };
const ok = () => new Response(JSON.stringify({ status: 'success', analysis,
  provider: 'gemini', provider_model: 'fixture-model' }),
  { status: 200, headers: { 'Content-Type': 'application/json' } });

it('sends only a chosen JPEG crop with an explicit bearer token and provider', async () => {
  const fetcher = vi.fn().mockResolvedValue(ok());
  const reply = await askSpatialVision('fixture-token', 'Explain', dataUrl, 'EXAM_3D',
    'English', 'gemini', false, new AbortController().signal, fetcher);
  expect(reply.analysis.summary).toBe('Visible equation');
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [path, options] = fetcher.mock.calls[0];
  expect(path).toBe('/api/v1/spatial-vision');
  expect(options.credentials).toBe('omit');
  expect(options.redirect).toBe('error');
  const sent = JSON.parse(options.body);
  expect(sent).toEqual({ question: 'Explain', mode: 'EXAM_3D', language: 'English',
    provider: 'gemini', consent: true, image: { mimeType: 'image/jpeg', data: VISUAL_JPEG } });
  expect(options.headers.Authorization).toBe('Bearer fixture-token');
});

it('refuses an unreviewed serial crop or image URL before any network request', async () => {
  const fetcher = vi.fn();
  for (const image of ['https://example.invalid/photo.jpg', '', 'data:image/png;base64,AAAA']) {
    await expect(askSpatialVision('fixture-token', 'Explain', image, 'EXAM_3D', 'English',
      'gemini', false, new AbortController().signal, fetcher)).rejects.toBeInstanceOf(PilotChatError);
  }
  await expect(askSpatialVision('fixture-token', 'Serial', dataUrl, 'SERIAL_AUDIT',
    'English', 'gemini', false, new AbortController().signal, fetcher)).rejects.toBeInstanceOf(PilotChatError);
  expect(fetcher).not.toHaveBeenCalled();
});

it('does not retry an incomplete or invalid response or accept fabricated boxes', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    status: 'success', analysis: { ...analysis, entities: [{ label: 'bad',
      category: 'EXAM_CONCEPT', box_2d: [900, 100, 200, 500], insight: 'invalid' }] },
    provider: 'gemini', provider_model: 'fixture-model',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await expect(askSpatialVision('fixture-token', 'Explain', dataUrl, 'EXAM_3D',
    'English', 'gemini', false, new AbortController().signal, fetcher)).rejects.toBeInstanceOf(PilotChatError);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
