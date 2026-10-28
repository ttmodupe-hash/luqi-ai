import { describe, expect, it } from 'vitest';
import { boxToCrop, calculateIllustrativeLoan, cropToBox, detectDetailBoxes,
  redactImeiLikeText } from '../src/lib/spatial-vision';

describe('local spatial lab: deterministic math and bounded coordinates', () => {
  it('normalizes a user-selected box without claiming model segmentation', () => {
    expect(cropToBox({ x: 20, y: 10, width: 30, height: 40 })).toEqual([100, 200, 500, 500]);
    expect(boxToCrop([100, 200, 500, 500])).toEqual({ x: 20, y: 10, width: 30, height: 40 });
    expect(() => boxToCrop([200, 300, 100, 400])).toThrow();
    expect(() => boxToCrop([0, 0, 1001, 500])).toThrow();
  });
  it('calculates fixed-rate monthly payments and balloon separately, without legal conclusions', () => {
    expect(calculateIllustrativeLoan(12000, 0, 12)).toMatchObject({
      monthlyPayment: 1000, totalRepayment: 12000, totalInterest: 0,
    });
    const withBalloon = calculateIllustrativeLoan(12000, 0, 12, 2400);
    expect(withBalloon.monthlyPayment).toBeCloseTo(800, 8);
    expect(withBalloon.totalRepayment).toBeCloseTo(12000, 8);
    const interest = calculateIllustrativeLoan(12000, 12, 12);
    expect(interest.monthlyPayment).toBeGreaterThan(1000);
    expect(interest.totalInterest).toBeGreaterThan(0);
  });
  it.each([
    [0, 12, 12, 0], [1000, -1, 12, 0], [1000, 101, 12, 0],
    [1000, 10, 0, 0], [1000, 10, 12.5, 0], [1000, 10, 12, 1001],
    [Number.NaN, 10, 12, 0],
  ])('rejects invalid finance terms %j', (p, r, n, b) => {
    expect(() => calculateIllustrativeLoan(p, r, n, b)).toThrow();
  });
  it('returns no edge candidates for a uniform sample and rejects unbounded image data', () => {
    const pixels = new Uint8ClampedArray(64 * 44 * 4).fill(120);
    expect(detectDetailBoxes(pixels, 64, 44)).toEqual([]);
    expect(() => detectDetailBoxes(pixels, 9999, 9999)).toThrow();
  });
  it('finds image-detail candidates from real luminance gradients without semantic labels', () => {
    const w = 64, h = 44, pixels = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, value = x > 38 && y > 18 && (x + y) % 2 ? 255 : 0;
      pixels[i] = value; pixels[i + 1] = value; pixels[i + 2] = value; pixels[i + 3] = 255;
    }
    const boxes = detectDetailBoxes(pixels, w, h);
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.length).toBeLessThanOrEqual(4);
    for (const box of boxes) {
      expect(box[0]).toBeGreaterThanOrEqual(0);
      expect(box[1]).toBeGreaterThanOrEqual(0);
      expect(box[2]).toBeLessThanOrEqual(1000);
      expect(box[3]).toBeLessThanOrEqual(1000);
    }
  });
  it('hides IMEI-like digit sequences in displayed serial-mode replies', () => {
    expect(redactImeiLikeText('IMEI 490154203237518 is not a serial'))
      .toContain('[identifier withheld]');
    expect(redactImeiLikeText('Serial ABC1234')).toBe('Serial ABC1234');
  });
});
