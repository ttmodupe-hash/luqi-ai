import { normalizedCrop, type CropRegion } from './visual-tutor';

export type ScanMode = 'EXAM_3D' | 'CONTRACT_SHIELD' | 'SERIAL_AUDIT';
export type NormalizedBox = readonly [number, number, number, number]; // ymin, xmin, ymax, xmax (0–1000)
export const SPATIAL_SAMPLE = { width: 64, height: 44 } as const;

/** This is a user-defined box, not an automatically segmented object. */
export function cropToBox(region: CropRegion): NormalizedBox {
  const r = normalizedCrop(region);
  return [Math.round(r.y * 10), Math.round(r.x * 10),
    Math.round((r.y + r.height) * 10), Math.round((r.x + r.width) * 10)];
}
export function boxToCrop(box: NormalizedBox): CropRegion {
  if (box.length !== 4 || box.some(value => !Number.isFinite(value) || value < 0 || value > 1000) ||
      box[0] >= box[2] || box[1] >= box[3]) throw new Error('Invalid region coordinates');
  return normalizedCrop({ x: box[1] / 10, y: box[0] / 10,
    width: (box[3] - box[1]) / 10, height: (box[2] - box[0]) / 10 });
}

/** Nominal fixed APR, monthly payments, no fees or variable rates.
 * A balloon is payable separately after the final regular instalment. */
export function calculateIllustrativeLoan(principal: number, annualRatePercent: number,
  months: number, balloon = 0) {
  if (![principal, annualRatePercent, months, balloon].every(Number.isFinite) ||
      principal <= 0 || principal > 100_000_000 || annualRatePercent < 0 || annualRatePercent > 100 ||
      !Number.isSafeInteger(months) || months < 1 || months > 480 ||
      balloon < 0 || balloon > principal) throw new Error('Enter valid loan terms');
  const rate = annualRatePercent / 1200;
  const discountedBalloon = balloon / (1 + rate) ** months;
  const payment = rate === 0 ? (principal - balloon) / months :
    (principal - discountedBalloon) * rate / (1 - (1 + rate) ** -months);
  const total = payment * months + balloon;
  if (![payment, total].every(Number.isFinite) || payment < 0) throw new Error('Invalid calculation');
  return { monthlyPayment: payment, balloon, totalRepayment: total,
    totalInterest: Math.max(0, total - principal) };
}

/** Real, deterministic edge saliency (not semantic object segmentation).
 * Input is a downsampled RGBA canvas. Tiles are candidates only; no labels or confidence are invented. */
export function detectDetailBoxes(pixels: Uint8ClampedArray, width: number, height: number): NormalizedBox[] {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 16 || height < 16 ||
      width * height > 65_536 || pixels.length !== width * height * 4) throw new Error('Invalid image sample');
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const at = i * 4;
    gray[i] = pixels[at] * .299 + pixels[at + 1] * .587 + pixels[at + 2] * .114;
  }
  const scores = Array.from({ length: 64 }, () => 0);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const dx = Math.abs(gray[i + 1] - gray[i - 1]);
    const dy = Math.abs(gray[i + width] - gray[i - width]);
    const tile = Math.min(7, Math.floor(y * 8 / height)) * 8 +
      Math.min(7, Math.floor(x * 8 / width));
    scores[tile] += dx + dy;
  }
  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  if (mean < 4) return [];
  const ordered = scores.map((score, index) => ({ score, index }))
    .filter(item => item.score > mean * 1.35)
    .sort((a, b) => b.score - a.score);
  const chosen: Array<{ row: number; col: number }> = [];
  for (const item of ordered) {
    const row = Math.floor(item.index / 8), col = item.index % 8;
    if (chosen.some(previous => Math.abs(previous.row - row) <= 1 && Math.abs(previous.col - col) <= 1)) continue;
    chosen.push({ row, col });
    if (chosen.length === 4) break;
  }
  return chosen.map(({ row, col }) => [
    Math.round(Math.max(0, row - .5) * 125),
    Math.round(Math.max(0, col - .5) * 125),
    Math.round(Math.min(8, row + 1.5) * 125),
    Math.round(Math.min(8, col + 1.5) * 125),
  ] as const);
}

function boundedJpeg(canvas: HTMLCanvasElement): string {
  for (const quality of [.82, .66, .48, .35]) {
    const value = canvas.toDataURL('image/jpeg', quality);
    if (value.startsWith('data:image/jpeg;base64,') && value.length < 460_000) return value;
  }
  throw new Error('Choose a smaller photo or selection for a private preview.');
}

/** Optional contrast enhancement after the existing validated 1024px/metadata-free pass.
 * It is not super-resolution, OCR, sharpening or a measured bandwidth guarantee. */
export async function enhanceSpatialPhoto(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image/jpeg;base64,') || dataUrl.length > 466_700) {
    throw new Error('Invalid local photo');
  }
  const image = new Image(); image.src = dataUrl; await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.filter = 'contrast(1.18) brightness(1.04)';
  ctx.drawImage(image, 0, 0);
  return boundedJpeg(canvas);
}

/** Only this redacted crop may leave the device after a separate Send action.
 * The original full photo is never attached to the provider request. */
export function cropWithMasks(image: HTMLImageElement, region: CropRegion,
  masks: CropRegion[]): string {
  if (!image.naturalWidth || !image.naturalHeight || masks.length > 12) throw new Error('Invalid photo');
  const crop = normalizedCrop(region);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * crop.width / 100));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * crop.height / 100));
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, image.naturalWidth * crop.x / 100, image.naturalHeight * crop.y / 100,
    image.naturalWidth * crop.width / 100, image.naturalHeight * crop.height / 100,
    0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  for (const raw of masks) {
    const mask = normalizedCrop(raw);
    const left = Math.max(crop.x, mask.x), top = Math.max(crop.y, mask.y);
    const right = Math.min(crop.x + crop.width, mask.x + mask.width);
    const bottom = Math.min(crop.y + crop.height, mask.y + mask.height);
    if (right <= left || bottom <= top) continue;
    ctx.fillRect((left - crop.x) / crop.width * canvas.width,
      (top - crop.y) / crop.height * canvas.height,
      (right - left) / crop.width * canvas.width,
      (bottom - top) / crop.height * canvas.height);
  }
  return boundedJpeg(canvas);
}

/** Only redact display of IMEI-like sequences; image redaction must happen before upload. */
export function redactImeiLikeText(value: string): string {
  return value.replace(/\b\d(?:[\s-]?\d){13,15}\b/g, '[identifier withheld]');
}
