/** Public source-check metadata only. Never a traffic, weather or safety verdict. */
import { DRIVE_SOURCES, isoTime } from './drive-intelligence.js';
export type SourceCheck = {
  id: string;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  attemptState: 'not-checked' | 'observed' | 'unavailable';
  contentState: 'not-checked' | 'baseline' | 'unchanged' | 'changed-review-required';
};
export type SourceStatusSnapshot = {
  version: 1;
  scope: 'source-checks-not-road-conditions';
  state: 'disabled' | 'empty' | 'available' | 'unavailable';
  generatedAt: string;
  safeToTravel: null;
  checks: SourceCheck[];
};
export function emptySourceStatus(state: SourceStatusSnapshot['state'], now = new Date()): SourceStatusSnapshot {
  const generatedAt = now.toISOString(); isoTime(generatedAt);
  return { version: 1, scope: 'source-checks-not-road-conditions', state, generatedAt, safeToTravel: null,
    checks: DRIVE_SOURCES.map(s => ({id: s.id, lastAttemptAt: null, lastSuccessAt: null, attemptState: 'not-checked', contentState: 'not-checked'})) };
}
function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid source status.');
  return input as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: string[]): void {
  if (Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) throw new Error('Unexpected status fields.');
}
/** Reject unknown IDs, extra fields and impossible timestamps before displaying remote data. */
export function parseSourceStatus(input: unknown, now = new Date()): SourceStatusSnapshot {
  const x = record(input);
  exactKeys(x, ['version','scope','state','generatedAt','safeToTravel','checks']);
  if (x.version !== 1 || x.scope !== 'source-checks-not-road-conditions' || x.safeToTravel !== null ||
      typeof x.state !== 'string' || !['disabled','empty','available','unavailable'].includes(x.state) || typeof x.generatedAt !== 'string') throw new Error('Unsupported source status.');
  const generated = isoTime(x.generatedAt), current = now.getTime();
  if (!Number.isFinite(current) || generated > current + 5000 || current - generated > 120000) throw new Error('Expired source-status response.');
  if (!Array.isArray(x.checks) || x.checks.length !== DRIVE_SOURCES.length) throw new Error('Incomplete source status.');
  const seen = new Set<string>();
  const checks = x.checks.map(inputCheck => {
    const c = record(inputCheck);
    exactKeys(c, ['id','lastAttemptAt','lastSuccessAt','attemptState','contentState']);
    if (typeof c.id !== 'string' || !DRIVE_SOURCES.some(s => s.id === c.id) || seen.has(c.id)) throw new Error('Unknown or repeated source.');
    seen.add(c.id);
    for (const key of ['lastAttemptAt','lastSuccessAt'] as const) {
      if (c[key] !== null && (typeof c[key] !== 'string' || isoTime(c[key] as string) > generated)) throw new Error('Invalid observation time.');
    }
    const attempt = c.lastAttemptAt as string | null, success = c.lastSuccessAt as string | null;
    if (success && (!attempt || isoTime(success) > isoTime(attempt))) throw new Error('Inconsistent observations.');
    const expected = !attempt ? 'not-checked' : success === attempt ? 'observed' : 'unavailable';
    if (c.attemptState !== expected || typeof c.contentState !== 'string' || !['not-checked','baseline','unchanged','changed-review-required'].includes(c.contentState) ||
        (success === null) !== (c.contentState === 'not-checked')) throw new Error('Inconsistent source states.');
    return {id:c.id,lastAttemptAt:attempt,lastSuccessAt:success,attemptState:expected,contentState:c.contentState} as SourceCheck;
  });
  const hasAttempts = checks.some(c => c.lastAttemptAt !== null);
  if ((x.state === 'available') !== hasAttempts) throw new Error('Inconsistent snapshot availability.');
  return {version:1,scope:'source-checks-not-road-conditions',state:x.state as SourceStatusSnapshot['state'],generatedAt:x.generatedAt,safeToTravel:null,checks};
}
export function sourceFreshness(check: SourceCheck, now = new Date()): 'never-observed' | 'recent-observation' | 'observation-overdue' | 'invalid-time' {
  const source = DRIVE_SOURCES.find(s => s.id === check.id);
  if (!source) return 'invalid-time';
  if (!check.lastSuccessAt) return 'never-observed';
  try { const age = now.getTime() - isoTime(check.lastSuccessAt);
    if (!Number.isFinite(age) || age < -5000) return 'invalid-time';
    return age >= source.cadenceHours * 3600000 ? 'observation-overdue' : 'recent-observation';
  } catch { return 'invalid-time'; }
}
export const SOURCE_STATUS_PATH = '/api/trpc/driveSources.status';
/** A click reads saved same-origin metadata. It never asks the server to crawl publishers. */
export async function loadSourceStatus(signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<SourceStatusSnapshot> {
  if (signal.aborted) throw new Error('Source status cancelled.');
  const r = await fetcher(SOURCE_STATUS_PATH, {method:'GET',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal,headers:{Accept:'application/json'}});
  const max = 16384, length = r.headers.get('content-length');
  if (r.status !== 200 || r.redirected || !/^application\/json(?:;|$)/i.test(r.headers.get('content-type') || '') || !r.body ||
      (length !== null && (!/^\d+$/.test(length) || Number(length) > max))) throw new Error('Source status unavailable.');
  const reader = r.body.getReader(); const parts: Uint8Array[] = []; let count = 0;
  try {
    for (;;) { const p = await reader.read(); if (p.done) break; count += p.value.byteLength;
      if (count > max) throw new Error('Source status too large.'); parts.push(p.value); }
  } finally { try { await reader.cancel(); } catch { /* closed */ } reader.releaseLock(); }
  if (signal.aborted) throw new Error('Source status cancelled.');
  const bytes = new Uint8Array(count); let offset = 0;
  for (const p of parts) {bytes.set(p,offset);offset += p.byteLength;}
  const envelope = record(JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes)));
  exactKeys(envelope, ['result']); const result = record(envelope.result); exactKeys(result, ['data']);
  const data = record(result.data); exactKeys(data, ['json']);
  return parseSourceStatus(data.json);
}
