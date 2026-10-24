import type { StudioFormat, StudioScene } from './content-studio';

/** Local-only storyboard files. No upload, account, provider or persistent storage. */
export const MAX_STUDIO_DRAFT_BYTES = 32 * 1024;
export const STUDIO_DRAFT_READ_TIMEOUT_MS = 8_000;
export type StudioDraft = {
  scenes: StudioScene[]; aspect: StudioFormat; length: number; gravity: number;
  yaw: number; legacyCamera: boolean;
};
const invalid = () => new Error('This is not a supported LUQI storyboard. Your current draft is unchanged.');
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const bounded = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && !!value.trim() && value.length <= max;

export function parseStudioDraft(source: string): StudioDraft {
  if (typeof source !== 'string' || !source.length || source.length > MAX_STUDIO_DRAFT_BYTES ||
      new TextEncoder().encode(source).byteLength > MAX_STUDIO_DRAFT_BYTES) throw invalid();
  let value: unknown;
  try { value = JSON.parse(source); } catch { throw invalid(); }
  if (!record(value)) throw invalid();
  const legacy = value.format === 'luqi.storyboard.v1';
  const keys = ['format', 'durationSeconds', 'aspect', 'audio', 'rendering', 'publishing', 'simulation', 'scenes'];
  if (!legacy) keys.push('cameraYawDegrees');
  if ((!legacy && value.format !== 'luqi.storyboard.v2') || !exactKeys(value, keys) ||
      value.durationSeconds !== 90 || value.audio !== 'none' ||
      value.rendering !== 'local_original_motion_graphics' || value.publishing !== 'not_connected' ||
      !['landscape', 'portrait', 'square'].includes(value.aspect as string)) throw invalid();
  const simulation = value.simulation;
  if (!record(simulation) || !exactKeys(simulation, ['model', 'lengthMetres', 'gravityMetresPerSecondSquared']) ||
      simulation.model !== 'small_angle_pendulum' || !bounded(simulation.lengthMetres, .5, 4) ||
      !bounded(simulation.gravityMetresPerSecondSquared, 1, 20) ||
      (!legacy && !bounded(value.cameraYawDegrees, -80, 80))) throw invalid();
  if (!Array.isArray(value.scenes) || value.scenes.length !== 6) throw invalid();
  const scenes: StudioScene[] = value.scenes.map((scene: unknown, index: number) => {
    if (!record(scene) || !exactKeys(scene, ['title', 'caption', 'question', 'startSeconds', 'durationSeconds']) ||
        !text(scene.title, 64) || !text(scene.caption, 240) || !text(scene.question, 140) ||
        scene.startSeconds !== index * 15 || scene.durationSeconds !== 15) throw invalid();
    // Copy only reviewed primitive fields. Never merge untrusted objects into state.
    return { title: scene.title, caption: scene.caption, question: scene.question };
  });
  return { scenes, aspect: value.aspect as StudioFormat, length: simulation.lengthMetres,
    gravity: simulation.gravityMetresPerSecondSquared, yaw: legacy ? 28 : value.cameraYawDegrees as number,
    legacyCamera: legacy };
}

/** v2 preserves the camera too; v1 files are still accepted with an explicit default. */
export function serializeStudioDraft(scenes: readonly StudioScene[], aspect: StudioFormat,
  length: number, gravity: number, yaw: number): string {
  const source = JSON.stringify({ format: 'luqi.storyboard.v2', durationSeconds: 90, aspect,
    audio: 'none', rendering: 'local_original_motion_graphics', publishing: 'not_connected',
    simulation: { model: 'small_angle_pendulum', lengthMetres: length, gravityMetresPerSecondSquared: gravity },
    cameraYawDegrees: yaw,
    scenes: scenes.map((scene, index) => ({ title: scene.title, caption: scene.caption, question: scene.question,
      startSeconds: index * 15, durationSeconds: 15 })) }, null, 2);
  parseStudioDraft(source);
  return source;
}

/** Read only a user-selected, bounded local file. Reject stale/partial/malformed reads. */
export function readStudioDraft(file: Blob, signal?: AbortSignal): Promise<StudioDraft> {
  return new Promise((resolve, reject) => {
    const interrupted = () => new DOMException('Opening storyboard cancelled', 'AbortError');
    if (signal?.aborted) { reject(interrupted()); return; }
    if (!Number.isSafeInteger(file?.size) || file.size <= 0 || file.size > MAX_STUDIO_DRAFT_BYTES) {
      reject(new Error('Choose a LUQI storyboard file no larger than 32 KiB. Your current draft is unchanged.')); return;
    }
    if (typeof FileReader === 'undefined') { reject(new Error('Opening local files is unavailable in this browser.')); return; }
    const reader = new FileReader();
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (error?: Error, result?: StudioDraft) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      reader.onload = null; reader.onerror = null; reader.onabort = null;
      if (reader.readyState === 1) { try { reader.abort(); } catch { /* No raw reader diagnostics. */ } }
      if (error) reject(error); else resolve(result!);
    };
    const abort = () => finish(interrupted());
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => finish(new Error('Opening the storyboard timed out. Your current draft is unchanged.')),
      STUDIO_DRAFT_READ_TIMEOUT_MS);
    reader.onerror = () => finish(new Error('The storyboard could not be read. Your current draft is unchanged.'));
    reader.onabort = abort;
    reader.onload = () => {
      if (settled) return;
      try {
        const bytes = reader.result;
        if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== file.size || bytes.byteLength > MAX_STUDIO_DRAFT_BYTES) throw invalid();
        finish(undefined, parseStudioDraft(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
      } catch { finish(invalid()); }
    };
    try { reader.readAsArrayBuffer(file); } catch { finish(new Error('The storyboard could not be read. Your current draft is unchanged.')); }
  });
}
