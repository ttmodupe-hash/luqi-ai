export const STUDIO_VIDEO_TYPES = [
  'video/mp4;codecs=avc1.42001E', 'video/mp4',
  'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm',
] as const;

/** Capability check only. Never opens a stream or starts an encoder. */
export function supportedRecordingType(
  hasCaptureStream: boolean,
  isTypeSupported?: (type: string) => boolean,
): string | null {
  if (!hasCaptureStream || typeof isTypeSupported !== 'function') return null;
  for (const type of STUDIO_VIDEO_TYPES) {
    try { if (isTypeSupported(type) === true) return type; }
    catch { /* A throwing codec probe does not establish support. */ }
  }
  return null;
}

export function browserRecordingType(): string | null {
  if (typeof HTMLCanvasElement === 'undefined' || typeof MediaRecorder === 'undefined') return null;
  return supportedRecordingType(typeof HTMLCanvasElement.prototype.captureStream === 'function',
    typeof MediaRecorder.isTypeSupported === 'function' ? type => MediaRecorder.isTypeSupported(type) : undefined);
}
