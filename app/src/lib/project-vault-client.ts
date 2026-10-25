/** Opt-in same-origin account-owned project sync. Never persists credentials or retries writes. */
import { z } from 'zod';
import type { ProjectKind, SealedProject } from './project-vault-crypto';

const projectId = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const revision = z.number().int().min(1).max(1_000_000);
const kind = z.enum(['quote', 'sales']);
const sealedSchema = z.object({
  format: z.literal('luqi.vault.sealed.v1'),
  kdf: z.literal('PBKDF2-SHA256-310000'),
  salt: z.string().min(1).max(24),
  nonce: z.string().min(1).max(16),
  ciphertext: z.string().min(24).max(33_000),
}).strict();
const metadata = z.object({
  id: projectId, kind, revision,
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T/).max(40),
}).strict();
const status = z.union([
  z.object({ availability: z.literal('disabled'), syncing: z.literal(false),
    subscriptionActive: z.literal(false) }).strict(),
  z.object({ availability: z.literal('configured'), storage: z.literal('connected'),
    encryptedPayloadOnly: z.literal(true), ownerLimit: z.literal(20),
    subscriptionActive: z.literal(false) }).strict(),
]);
const index = z.object({ projects: z.array(metadata).max(20) }).strict();
const single = z.object({ project: metadata.extend({ sealed: sealedSchema }).strict() }).strict();
const saved = z.object({ saved: z.literal(true), id: projectId,
  revision, created: z.boolean() }).strict();
const removed = z.object({ removed: z.literal(true), id: projectId }).strict();
export type ProjectMetadata = z.infer<typeof metadata>;
export type VaultProject = z.infer<typeof single>['project'];
export type VaultStatus = z.infer<typeof status>;

export class ProjectVaultRequestError extends Error {
  constructor(readonly status: number) { super('PROJECT_VAULT_REQUEST_FAILED'); }
}

const PREFIX = '/api/v1/projects';
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_REQUEST_BYTES = 38_000;
const TIMEOUT_MS = 15_000;

/** All paths are fixed or derived from a strictly validated UUID; no arbitrary URLs. */
export function projectVaultClient(token: string, transport: typeof fetch = fetch) {
  async function call<T extends z.ZodTypeAny>(
    path: string, schema: T, method: 'GET' | 'PUT' | 'POST' = 'GET',
    data?: unknown, signal?: AbortSignal,
  ): Promise<z.infer<T>> {
    if (typeof token !== 'string' || !token || token.length > 4096 ||
        (method !== 'GET' && data === undefined) || signal?.aborted)
      throw new ProjectVaultRequestError(0);
    const payload = data === undefined ? undefined : JSON.stringify(data);
    if (payload && new TextEncoder().encode(payload).byteLength > MAX_REQUEST_BYTES)
      throw new ProjectVaultRequestError(0);
    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let rejectDeadline!: (error: Error) => void;
    const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
    const abort = () => {
      controller.abort();
      if (reader) void reader.cancel().catch(() => undefined);
      rejectDeadline(new ProjectVaultRequestError(0));
    };
    const timer = setTimeout(abort, TIMEOUT_MS);
    signal?.addEventListener('abort', abort, { once: true });
    const operation = async (): Promise<z.infer<T>> => {
      const response = await transport(path, {
        method, cache: 'no-store', credentials: 'omit', redirect: 'error',
        mode: 'same-origin', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json',
          ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(payload === undefined ? {} : { body: payload }),
      });
      const discard = () => { void response.body?.cancel().catch(() => undefined); };
      if (controller.signal.aborted || response.redirected) {
        discard(); throw new ProjectVaultRequestError(0);
      }
      if (!response.ok) { discard(); throw new ProjectVaultRequestError(response.status); }
      const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
      const size = response.headers.get('Content-Length');
      if (type !== 'application/json' || !response.body ||
          (size !== null && (!/^\d+$/.test(size) || Number(size) > MAX_RESPONSE_BYTES))) {
        discard(); throw new ProjectVaultRequestError(0);
      }
      reader = response.body.getReader();
      const parts: Uint8Array[] = []; let total = 0;
      try {
        for (;;) {
          if (controller.signal.aborted) throw new ProjectVaultRequestError(0);
          const chunk = await reader.read();
          if (controller.signal.aborted) throw new ProjectVaultRequestError(0);
          if (chunk.done) break;
          total += chunk.value.byteLength;
          if (total > MAX_RESPONSE_BYTES) throw new ProjectVaultRequestError(0);
          parts.push(chunk.value);
        }
        const bytes = new Uint8Array(total); let offset = 0;
        for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
        const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        return schema.parse(parsed);
      } finally {
        if (reader) {
          void reader.cancel().catch(() => undefined);
          reader.releaseLock();
          reader = null;
        }
      }
    };
    try { return await Promise.race([operation(), deadline]); }
    catch (error) {
      if (error instanceof ProjectVaultRequestError) throw error;
      // Never expose a raw response, URL, database error, private content or token.
      throw new ProjectVaultRequestError(0);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  function validId(id: string): string {
    const parsed = projectId.safeParse(id);
    if (!parsed.success) throw new ProjectVaultRequestError(0);
    return parsed.data;
  }
  return {
    status: (signal?: AbortSignal): Promise<VaultStatus> => call(PREFIX + '/status', status, 'GET', undefined, signal),
    list: (signal?: AbortSignal): Promise<ProjectMetadata[]> =>
      call(PREFIX, index, 'GET', undefined, signal).then(result => result.projects),
    get: async (id: string, signal?: AbortSignal): Promise<VaultProject> => {
      const key = validId(id);
      const response = await call(PREFIX + '/' + key, single, 'GET', undefined, signal);
      if (response.project.id !== key) throw new ProjectVaultRequestError(0);
      return response.project;
    },
    save: async (id: string, projectKind: ProjectKind, expectedRevision: number,
                 sealed: SealedProject, signal?: AbortSignal) => {
      const key = validId(id);
      if (!kind.safeParse(projectKind).success ||
          !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= 1_000_000 ||
          !sealedSchema.safeParse(sealed).success) throw new ProjectVaultRequestError(0);
      const response = await call(PREFIX + '/' + key, saved, 'PUT',
        { kind: projectKind, expectedRevision, sealed }, signal);
      if (response.id !== key || response.revision !== expectedRevision + 1 ||
          response.created !== (expectedRevision === 0)) throw new ProjectVaultRequestError(0);
      return response;
    },
    remove: async (id: string, expectedRevision: number, signal?: AbortSignal) => {
      const key = validId(id);
      if (!revision.safeParse(expectedRevision).success) throw new ProjectVaultRequestError(0);
      const response = await call(PREFIX + '/' + key + '/remove', removed, 'POST',
        { confirm: true, expectedRevision }, signal);
      if (response.id !== key) throw new ProjectVaultRequestError(0);
      return response;
    },
  };
}
