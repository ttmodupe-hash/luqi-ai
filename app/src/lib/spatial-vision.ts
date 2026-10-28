/** Local image processing + one explicit, same-origin, metered vision request.
 * No browser provider SDKs, API keys, telemetry, storage or automatic retries.
 */
import { z } from 'zod';
import { PilotChatError } from './ai-pilot';
import { photoDimensions } from './visual-tutor';
import { pilotFailureCode, requestPilotJson } from './pilot-request';
import {
  normalizedBox, parseSpatialAnalysis, spatialProvider, spatialMode,
  type NormalizedBox, type SpatialAnalysis, type SpatialMode, type SpatialProvider,
} from './spatial-vision-contract';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = 466_700;
const JPEG_PREFIX = 'data:image/jpeg;base64,';

function encodeBounded(canvas: HTMLCanvasElement): string {
  for (const quality of [0.78, 0.60, 0.45, 0.32]) {
    const encoded = canvas.toDataURL('image/jpeg', quality);
    if (encoded.startsWith(JPEG_PREFIX) && encoded.length < MAX_DATA_URL_LENGTH) return encoded;
  }
  throw new Error('This photo is too detailed. Try a smaller photo or a tighter crop.');
}

async function decodeLocal(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

/** EXIF-free, <=1024px JPEG. Optional contrast is a real pixel operation,
 * not neural super-resolution, OCR or a guarantee of improved accuracy.
 */
export async function prepareSpatialPhoto(file: File, enhance = true): Promise<string> {
  if (!['image/jpeg', 'image/png'].includes(file.type) ||
      file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Choose a JPEG or PNG photo under 8 MB.');
  }
  photoDimensions(new Uint8Array(await file.arrayBuffer()));
  const source = URL.createObjectURL(file);
  try {
    const image = await decodeLocal(source);
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Local photo processing is unavailable.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (enhance) context.filter = 'contrast(1.18) brightness(1.04)';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.filter = 'none';
    return encodeBounded(canvas);
  } finally { URL.revokeObjectURL(source); }
}

/** Burn an opaque mask into the exported local JPEG. This does not claim to
 * detect every IMEI or to erase the original file stored on the user's phone.
 */
export async function redactSpatialPhoto(dataUrl: string, box: NormalizedBox): Promise<string> {
  if (!dataUrl.startsWith(JPEG_PREFIX) || dataUrl.length > MAX_DATA_URL_LENGTH) throw new Error('Invalid local preview');
  const [top, left, bottom, right] = normalizedBox.parse(box);
  const image = await decodeLocal(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Redaction is unavailable.');
  context.drawImage(image, 0, 0);
  context.fillStyle = '#000';
  context.fillRect(Math.floor(left * canvas.width / 1000), Math.floor(top * canvas.height / 1000),
    Math.ceil((right - left) * canvas.width / 1000), Math.ceil((bottom - top) * canvas.height / 1000));
  return encodeBounded(canvas);
}

export function boxFromPoints(x0: number, y0: number, x1: number, y1: number): NormalizedBox {
  const clamp = (v: number) => Math.max(0, Math.min(1000, Math.round(v)));
  const a = clamp(Math.min(y0, y1)), b = clamp(Math.min(x0, x1));
  const c = clamp(Math.max(y0, y1)), d = clamp(Math.max(x0, x1));
  return normalizedBox.parse([a, b, c, d]);
}

const responseSchema = z.object({
  status: z.literal('success'),
  analysis: z.unknown(),
  provider: spatialProvider,
  provider_model: z.string().trim().min(1).max(100),
}).strict();
export type SpatialVisionReply = {
  analysis: SpatialAnalysis; provider: SpatialProvider; provider_model: string;
};

export async function askSpatialVision(
  token: string, mode: SpatialMode, provider: SpatialProvider, dataUrl: string,
  language: string, consent: boolean, signal: AbortSignal,
  request: typeof fetch = fetch,
): Promise<SpatialVisionReply> {
  if (!token || token.length > 4096 || mode === 'SERIAL_AUDIT' ||
      !spatialMode.safeParse(mode).success || !spatialProvider.safeParse(provider).success ||
      !language.trim() || language.length > 50 || consent !== true ||
      !dataUrl.startsWith(JPEG_PREFIX) || dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new PilotChatError('INVALID_INPUT');
  }
  try {
    const result = await requestPilotJson(request, '/api/v1/spatial-vision', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, provider, language, consent: true,
        image: { mimeType: 'image/jpeg', data: dataUrl.slice(JPEG_PREFIX.length) } }),
    });
    if (result.status === 401) throw new PilotChatError('AUTH_REQUIRED');
    if (!result.ok) throw new PilotChatError(pilotFailureCode(result.status, result.body));
    const parsed = responseSchema.parse(result.body);
    if (parsed.provider !== provider) throw new Error('Unexpected provider');
    return { analysis: parseSpatialAnalysis(parsed.analysis, mode),
      provider: parsed.provider, provider_model: parsed.provider_model };
  } catch (error) {
    if (error instanceof PilotChatError) throw error;
    // A network failure, timeout or invalid output might still consume budget.
    // Never retry automatically or turn a partial response into success.
    throw new PilotChatError('RESPONSE_UNCONFIRMED');
  }
}
