/** Entirely local image operations. Luminance relief is NOT monocular depth. */
export function drawIllustrativeRelief(canvas: HTMLCanvasElement, image: HTMLImageElement,
  tilt: number, spin: number): void {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const sample = document.createElement('canvas'); sample.width = 48; sample.height = 32;
  const src = sample.getContext('2d', { willReadFrequently: true }); if (!src) return;
  src.drawImage(image, 0, 0, 48, 32);
  const pixels = src.getImageData(0, 0, 48, 32).data;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#081326'; ctx.fillRect(0, 0, w, h);
  const ax = tilt * Math.PI / 180, ay = spin * Math.PI / 180;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 48; x++) {
    const i = (y * 48 + x) * 4, r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const z = (lum - 0.5) * 65, px = (x - 23.5) * 8, py = (y - 15.5) * 8;
    const rx = px * Math.cos(ay) + z * Math.sin(ay);
    const rz = -px * Math.sin(ay) + z * Math.cos(ay);
    const ry = py * Math.cos(ax) - rz * Math.sin(ax);
    const depth = py * Math.sin(ax) + rz * Math.cos(ax);
    const scale = 480 / (560 + depth);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(w / 2 + rx * scale, h / 2 + ry * scale, Math.max(1.4, 2.8 * scale), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Optional contrast, never a promise to repair blur or recover lost pixels. */
export async function enhanceLocalPreview(source: string): Promise<string> {
  const img = new Image(); img.src = source; await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Local contrast enhancement unavailable');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.filter = 'contrast(1.18) brightness(1.04)';
  ctx.drawImage(img, 0, 0);
  for (const quality of [0.82, 0.65, 0.45]) {
    const data = canvas.toDataURL('image/jpeg', quality);
    if (data.startsWith('data:image/jpeg;base64,') && data.length < 460_000) return data;
  }
  throw new Error('Choose a smaller crop to stay within the image limit');
}
