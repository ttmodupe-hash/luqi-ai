import { describe, expect, it, vi } from 'vitest';
import { drawRigCanvas, frameAt, presetMotion } from '../src/lib/motion-rig';

describe('Actual Luqi character frames for Canvas2D recorder', () => {
 it('renders different arm positions at different keyframes and refuses malformed recording inputs', () => {
  const rotations: number[] = [], labels: string[] = [], rects: number[] = [];
  const ctx = {
   save: vi.fn(), restore: vi.fn(), scale: vi.fn(), translate: vi.fn(),
   rotate: vi.fn((angle: number) => rotations.push(angle)),
   fillRect: vi.fn((...args: number[]) => rects.push(args[2])),
   beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
   arc: vi.fn(), fill: vi.fn(), fillText: vi.fn((text: string) => labels.push(text)),
   set fillStyle(_value: string) {}, set strokeStyle(_value: string) {},
   set lineWidth(_value: number) {}, set globalAlpha(_value: number) {},
   set font(_value: string) {},
  } as unknown as CanvasRenderingContext2D;
  const frames = presetMotion('wave');
  drawRigCanvas(ctx, 640, 360, 'scholar', 'Luqi original', frames, 0);
  const frame0 = [...rotations]; rotations.length = 0;
  drawRigCanvas(ctx, 640, 360, 'scholar', 'Luqi original', frames, 1);
  const frame1 = [...rotations];
  expect(frame0.length).toBeGreaterThan(4);
  expect(frame1).not.toEqual(frame0);
  expect(labels).toContain('Luqi original');
  expect(rects).toContain(640);
  expect(frameAt(frames, 1).rightArm).not.toBe(frameAt(frames, 0).rightArm);
  expect(() => drawRigCanvas(ctx, 0, 360, 'scholar', 'Luqi', frames, 0)).toThrow();
  expect(() => drawRigCanvas(ctx, 640, 360, 'scholar', 'Luqi', frames, NaN)).toThrow();
  expect(() => drawRigCanvas(ctx, 640, 360, 'scholar', '<test>', frames, 1)).not.toThrow();
 });
});
