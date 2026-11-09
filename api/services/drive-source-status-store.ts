/** Read-only projection of operator-owned source metadata. No network, crawls, writes or learner data. */
import { open, lstat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { cleanDriveState } from './drive-source-radar';
import { isoTime } from '../../src/features/drive/drive-intelligence';
import { emptySourceStatus, parseSourceStatus, type SourceStatusSnapshot } from '../../src/features/drive/drive-source-status';

export function projectDriveSourceStatus(input: unknown, now = new Date()): SourceStatusSnapshot {
  const state = cleanDriveState(input), at = isoTime(now.toISOString());
  for (const attempted of Object.values(state.lastAttempt)) if (isoTime(attempted) > at) throw new Error('Future observation.');
  const result = emptySourceStatus(Object.keys(state.lastAttempt).length ? 'available' : 'empty', now);
  result.checks = result.checks.map(c => {
    const attempted = state.lastAttempt[c.id] || null, good = state.lastGood[c.id];
    return {id:c.id,lastAttemptAt:attempted,lastSuccessAt:good?.checkedAt || null,
      attemptState:!attempted ? 'not-checked' : good?.checkedAt === attempted ? 'observed' : 'unavailable',
      contentState:good?.state as 'baseline' | 'unchanged' | 'changed-review-required' || 'not-checked'};
  });
  // Project only registered IDs, times and enum states. No file paths, digests, raw pages or errors leave the service.
  return parseSourceStatus(result, now);
}

const MAX_STATE_BYTES = 32768;
export async function readSavedDriveSourceStatus(
  settings: {enabled?: string; stateDir?: string} = {
    enabled: process.env.LUQI_DRIVE_STATUS_PUBLIC_ENABLED,
    stateDir: process.env.LUQI_DRIVE_RADAR_STATE_DIR,
  }, now = new Date(),
): Promise<SourceStatusSnapshot> {
  if (settings.enabled !== 'true') return emptySourceStatus('disabled', now);
  let file: Awaited<ReturnType<typeof open>> | undefined;
  try {
    const dir = settings.stateDir;
    if (!dir || dir.length > 4096 || !isAbsolute(dir) || typeof constants.O_NOFOLLOW !== 'number' || typeof constants.O_NONBLOCK !== 'number') throw new Error('Invalid storage configuration.');
    // The whole ancestry must be operator-controlled. Do not grant writers access to any parent.
    const directory = await lstat(dir);
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error('Invalid state directory.');
    file = await open(join(dir,'state.json'), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const before = await file.stat();
    if (!before.isFile() || before.size < 1 || before.size > MAX_STATE_BYTES) throw new Error('Invalid saved status.');
    const bytes = Buffer.alloc(MAX_STATE_BYTES + 1); let offset = 0;
    while (offset < bytes.length) {
      const read = await file.read(bytes, offset, bytes.length - offset, offset);
      if (!read.bytesRead) break;
      offset += read.bytesRead;
    }
    const after = await file.stat();
    if (offset < 1 || offset > MAX_STATE_BYTES || before.size !== after.size || before.mtimeMs !== after.mtimeMs || after.size !== offset) throw new Error('Saved status changed during read.');
    const text = new TextDecoder('utf-8', {fatal:true}).decode(bytes.subarray(0,offset));
    return projectDriveSourceStatus(JSON.parse(text), now);
  } catch (error) {
    const missing = !!error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
    return emptySourceStatus(missing ? 'empty' : 'unavailable', now);
  } finally { await file?.close().catch(() => {}); }
}
