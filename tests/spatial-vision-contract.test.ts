import { describe, expect, it } from 'vitest';
import { boxFromPoints } from '../src/lib/spatial-vision';
import { normalizedBox, parseSpatialAnalysis, possibleImei } from '../src/lib/spatial-vision-contract';

const analysis = {
  sceneType: 'Synthetic physics diagram', summary: 'A labelled line and two points.',
  regions: [{ label: 'Line', category: 'EXAM_CONCEPT', box_2d: [100, 200, 300, 400],
    insight: 'Check the visible labels.' }],
  limitations: ['Text may be unclear'], nextStep: 'Compare against the source image.',
};
describe('bounded spatial region contract', () => {
  it('accepts mode-specific, normalized, ordered model suggestions', () => {
    expect(parseSpatialAnalysis(analysis, 'EXAM_3D').regions[0].box_2d).toEqual([100, 200, 300, 400]);
    expect(parseSpatialAnalysis({ ...analysis, regions: [
      { ...analysis.regions[0], category: 'CONTRACT_TERM' }] }, 'CONTRACT_SHIELD').regions).toHaveLength(1);
  });
  it('rejects wrong modes, unbounded boxes, categories, extra keys and invalid geometry', () => {
    for (const bad of [
      { ...analysis, regions: [{ ...analysis.regions[0], box_2d: [900, 200, 300, 400] }] },
      { ...analysis, regions: [{ ...analysis.regions[0], box_2d: [-1, 200, 300, 400] }] },
      { ...analysis, regions: [{ ...analysis.regions[0], box_2d: [100, 200, 100, 400] }] },
      { ...analysis, regions: [{ ...analysis.regions[0], category: 'SERIAL_PRIMARY' }] },
      { ...analysis, providerKey: 'should-not-appear' },
      { ...analysis, regions: Array(5).fill(analysis.regions[0]) },
    ]) expect(() => parseSpatialAnalysis(bad, 'EXAM_3D')).toThrow();
    expect(() => parseSpatialAnalysis(analysis, 'CONTRACT_SHIELD')).toThrow();
    expect(() => parseSpatialAnalysis(analysis, 'SERIAL_AUDIT')).toThrow();
    expect(normalizedBox.safeParse([1, 2, 3, 4]).success).toBe(true);
  });
  it('normalizes local drag coordinates without treating them as AI masks', () => {
    expect(boxFromPoints(400, 300, 200, 100)).toEqual([100, 200, 300, 400]);
    expect(boxFromPoints(-30, 1200, 20, 800)).toEqual([800, 0, 1000, 20]);
    expect(() => boxFromPoints(10, 10, 10, 10)).toThrow();
  });
  it('warns about possible 15-digit IMEIs but does not certify a serial', () => {
    expect(possibleImei('123 456 789 012 345')).toBe(true);
    expect(possibleImei('SERIAL-A12')).toBe(false);
    expect(possibleImei('12345678901234')).toBe(false);
  });
});
