// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cropWithMasks } from '../src/lib/spatial-vision';

afterEach(() => vi.restoreAllMocks());

describe('redacted outbound JPEG crop', () => {
  it('fills intersecting private rectangles black before encoding the reviewed crop', () => {
    const drawImage = vi.fn(), fillRect = vi.fn();
    const context = { drawImage, fillRect, fillStyle: '' };
    const canvas = { width: 0, height: 0, getContext: () => context,
      toDataURL: () => 'data:image/jpeg;base64,' + 'A'.repeat(100) };
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((name: string) =>
      name === 'canvas' ? canvas as unknown as HTMLCanvasElement : create(name));
    const image = { naturalWidth: 1000, naturalHeight: 500 } as HTMLImageElement;
    const result = cropWithMasks(image, { x: 10, y: 20, width: 50, height: 50 },
      [{ x: 20, y: 30, width: 10, height: 10 }, { x: 80, y: 80, width: 5, height: 5 }]);
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
    expect(canvas.width).toBe(500); expect(canvas.height).toBe(250);
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(image, 100, 100, 500, 250, 0, 0, 500, 250);
    // First fill is the white canvas background. Second fill is the mask.
    expect(fillRect).toHaveBeenNthCalledWith(2, 100, 50, 100, 50);
    expect(fillRect).toHaveBeenCalledTimes(2);
  });
  it('rejects excessive mask count and unavailable image dimensions before encoding', () => {
    const image = { naturalWidth: 1000, naturalHeight: 500 } as HTMLImageElement;
    expect(() => cropWithMasks(image, { x: 0, y: 0, width: 100, height: 100 },
      Array.from({ length: 13 }, () => ({ x: 1, y: 1, width: 2, height: 2 })))).toThrow();
    expect(() => cropWithMasks({ naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement,
      { x: 0, y: 0, width: 100, height: 100 }, [])).toThrow();
  });
});
