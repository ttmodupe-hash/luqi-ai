import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', async original => ({
  ...await original<typeof import('@google/genai')>(),
  GoogleGenAI: class { models = { generateContent }; },
}));
vi.mock('../api/services/aiPilotBudget', async original => ({
  ...await original<typeof import('../api/services/aiPilotBudget')>(),
  assertPilotEnabled: vi.fn(), reservePilotAttempt: vi.fn(),
}));
import { parseSpatialOutput, runSpatialVision } from '../api/services/spatialVision';
import { reservePilotAttempt } from '../api/services/aiPilotBudget';
import { PilotOutputError } from '../api/services/pilotOutput';
import { VISUAL_JPEG } from './fixtures/visual-image';

const analysis = {
  summary: 'A printed formula is visible.',
  guidance: 'Verify the algebra against the original image.',
  entities: [{ label: 'Formula', category: 'EXAM_CONCEPT', box_2d: [100, 200, 450, 800],
    insight: 'Approximate visual region.' }],
  limitations: 'Some text may be unreadable.',
};
const gemini = (text: string) => ({ candidates: [{ finishReason: 'STOP',
  content: { role: 'model', parts: [{ text }] } }] });
const openai = (text: string) => ({ status: 'completed',
  output: [{ type: 'message', role: 'assistant', status: 'completed',
    content: [{ type: 'output_text', text }] }] });

beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('LUQI_PILOT_GEMINI_API_KEY', 'fixture-gemini');
  vi.stubEnv('LUQI_PILOT_OPENAI_API_KEY', 'fixture-openai');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('strict spatial provider output', () => {
  it('accepts ordered normalized rectangles, not invented masks or confidence', () => {
    expect(parseSpatialOutput(JSON.stringify(analysis), 'EXAM_3D').entities[0].box_2d)
      .toEqual([100, 200, 450, 800]);
    for (const value of [
      { ...analysis, entities: [{ ...analysis.entities[0], box_2d: [800, 200, 100, 500] }] },
      { ...analysis, entities: [{ ...analysis.entities[0], box_2d: [100, -1, 450, 800] }] },
      { ...analysis, entities: [{ ...analysis.entities[0], confidence: 99 }] },
      { ...analysis, entities: [{ ...analysis.entities[0], label: '<script>'.repeat(60) }] },
    ]) expect(() => parseSpatialOutput(JSON.stringify(value), 'EXAM_3D')).toThrow(PilotOutputError);
  });
  it('rejects IMEI-like values and unsafe IMEI labels in serial mode', () => {
    expect(() => parseSpatialOutput(JSON.stringify({ ...analysis,
      summary: 'IMEI 123456789012345' }), 'SERIAL_AUDIT')).toThrow(PilotOutputError);
    expect(() => parseSpatialOutput(JSON.stringify({ ...analysis,
      entities: [{ ...analysis.entities[0], category: 'IMEI_REJECTED',
        label: 'IMEI 123', insight: 'Please save it' }] }), 'SERIAL_AUDIT')).toThrow(PilotOutputError);
    expect(parseSpatialOutput(JSON.stringify({ ...analysis,
      entities: [{ ...analysis.entities[0], category: 'IMEI_REJECTED',
        label: 'IMEI excluded', insight: 'Not a serial number; do not copy or store this identifier.' }] }), 'SERIAL_AUDIT').entities).toHaveLength(1);
  });
});

it('reserves Gemini once before a single image request and validates a completed reply', async () => {
  generateContent.mockResolvedValue(gemini(JSON.stringify(analysis)));
  const result = await runSpatialVision('Explain the formula', VISUAL_JPEG, 42, 'EXAM_3D', 'English', 'gemini');
  expect(result.provider).toBe('gemini');
  expect(reservePilotAttempt).toHaveBeenCalledExactlyOnceWith('gemini', 42);
  expect(generateContent).toHaveBeenCalledTimes(1);
  expect(generateContent.mock.calls[0][0].contents[0].parts[1].inlineData.mimeType).toBe('image/jpeg');
});

it('does not silently spend on OpenAI when Gemini output is invalid or incomplete', async () => {
  const transport = vi.fn(); vi.stubGlobal('fetch', transport);
  generateContent.mockResolvedValue(gemini('not json'));
  await expect(runSpatialVision('Explain', VISUAL_JPEG, 42, 'EXAM_3D', 'English', 'gemini'))
    .rejects.toBeInstanceOf(PilotOutputError);
  expect(transport).not.toHaveBeenCalled();
  expect(reservePilotAttempt).toHaveBeenCalledTimes(1);
});

it('allows only explicitly selected OpenAI through the same reservation ledger', async () => {
  const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify(openai(JSON.stringify(analysis))),
    { status: 200, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', transport);
  const result = await runSpatialVision('Explain', VISUAL_JPEG, 42, 'EXAM_3D', 'English', 'openai');
  expect(result.provider).toBe('openai');
  expect(reservePilotAttempt).toHaveBeenCalledExactlyOnceWith('openai', 42);
  expect(generateContent).not.toHaveBeenCalled();
  expect(transport).toHaveBeenCalledTimes(1);
  const request = JSON.parse(transport.mock.calls[0][1].body);
  expect(request.model).toBe('gpt-4o');
  expect(request.store).toBe(false);
  expect(request.input[0].content[1].image_url).toMatch(/^data:image\/jpeg;base64,/);
  expect(transport.mock.calls[0][1].redirect).toBe('error');
});

it('never reserves or calls a provider for invalid image or missing selected key', async () => {
  await expect(runSpatialVision('Explain', 'not-an-image', 42, 'EXAM_3D', 'English', 'gemini')).rejects.toThrow();
  expect(reservePilotAttempt).not.toHaveBeenCalled();
  vi.stubEnv('LUQI_PILOT_OPENAI_API_KEY', '');
  await expect(runSpatialVision('Explain', VISUAL_JPEG, 42, 'EXAM_3D', 'English', 'openai')).rejects.toThrow();
  expect(reservePilotAttempt).not.toHaveBeenCalled();
});
