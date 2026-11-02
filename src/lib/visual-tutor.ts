import { z } from 'zod';
import { PilotChatError, type PilotReply } from './ai-pilot';
import { requestPilotJson, pilotFailureCode } from './pilot-request';

export type CropRegion = { x: number; y: number; width: number; height: number };
export const WHOLE_IMAGE: CropRegion = { x: 0, y: 0, width: 100, height: 100 };

export function normalizedCrop(region: CropRegion): CropRegion {
  if (Object.values(region).some(value => !Number.isFinite(value))) throw new Error('Invalid crop');
  const x = Math.max(0, Math.min(99, region.x)), y = Math.max(0, Math.min(99, region.y));
  return { x, y, width: Math.max(1, Math.min(100 - x, region.width)),
    height: Math.max(1, Math.min(100 - y, region.height)) };
}

/** Read dimensions before browser decoding. No URLs or SVGs are accepted. */
export function photoDimensions(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0;
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value) &&
      String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR') {
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ((marker === 0xc0 || marker === 0xc2) && length >= 8) {
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break;
      }
      offset += length;
    }
  }
  if (!width || !height || width > 8192 || height > 8192 || width * height > 32_000_000) {
    throw new Error('Choose a JPEG or PNG photo up to 32 megapixels and 8192 pixels per side.');
  }
  return { width, height };
}

function boundedJpeg(canvas: HTMLCanvasElement): string {
  for (const quality of [0.85, 0.65, 0.45]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.startsWith('data:image/jpeg;base64,') && url.length < 460_000) return url;
  }
  throw new Error('The selected image is too detailed. Choose a smaller region or photo.');
}

/** Local, metadata-free preview. Neither original file nor EXIF is uploaded. */
export async function prepareVisualPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > 8 * 1024 * 1024) {
    throw new Error('Choose a JPEG or PNG photo smaller than 8 MB.');
  }
  photoDimensions(new Uint8Array(await file.arrayBuffer()));
  const source = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = source; await image.decode();
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d'); if (!context) throw new Error('Image preview is unavailable.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return boundedJpeg(canvas);
  } finally { URL.revokeObjectURL(source); }
}

export function cropVisualPhoto(image: HTMLImageElement, region: CropRegion): string {
  const crop = normalizedCrop(region);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * crop.width / 100));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * crop.height / 100));
  const context = canvas.getContext('2d'); if (!context) throw new Error('Image selection is unavailable.');
  context.drawImage(image, image.naturalWidth * crop.x / 100, image.naturalHeight * crop.y / 100,
    image.naturalWidth * crop.width / 100, image.naturalHeight * crop.height / 100,
    0, 0, canvas.width, canvas.height);
  return boundedJpeg(canvas);
}

const reply = z.object({ status: z.literal('success'), response: z.string().trim().min(1).max(20_000),
  provider: z.literal('gemini'), provider_model: z.string().min(1).max(100) });

export async function askVisualTutor(token: string, question: string, image: string,
  language: string, consent: boolean, signal: AbortSignal, request: typeof fetch = fetch): Promise<PilotReply> {
  if (!token || token.length > 4096 || consent !== true || !question.trim() || question.trim().length > 2000 ||
      !language.trim() || language.length > 50 || !image.startsWith('data:image/jpeg;base64,') || image.length > 466_700) {
    throw new PilotChatError('INVALID_INPUT');
  }
  try {
    const response = await requestPilotJson(request, '/api/v1/visual-tutor', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question: question.trim(), language, consent: true,
        image: { mimeType: 'image/jpeg', data: image.slice('data:image/jpeg;base64,'.length) } }),
    });
    if (response.status === 401) throw new PilotChatError('AUTH_REQUIRED');
    if (!response.ok) throw new PilotChatError(pilotFailureCode(response.status, response.body));
    return reply.parse(response.body);
  } catch (error) {
    if (error instanceof PilotChatError) throw error;
    throw new PilotChatError('RESPONSE_UNCONFIRMED');
  }
}
