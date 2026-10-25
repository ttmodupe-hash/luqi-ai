/** Pre-activation client for the protected LUQI encrypted project vault.
 * No persisted credentials, provider calls, automatic writes or retries.
 */
import { z } from 'zod';
import type { ProjectKind, SealedProject } from './project-vault-crypto';

const UUID = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const VERSION = z.number().int().min(1).max(1_000_000);
const kind = z.enum(['quote', 'sales']);
const iso = z.string().max(40).refine(value => Number.isFinite(Date.parse(value)) && /Z$/.test(value));
const payload = z.object({
  format: z.literal('luqi.vault.sealed.v1'),
  kdf: z.literal('PBKDF2-SHA256-310000'),
  salt: z.string().length(24),
  nonce: z.string().length(16),
  ciphertext: z.string().min(24).max(33_000),
}).strict();
const metadata = z.object({ id: UUID, kind, revision: VERSION, updatedAt: iso }).strict();
const fullProject = metadata.extend({ sealed: payload }).strict();
const disabled = z.object({
  availability: z.literal('disabled'), syncing: z.literal(false), subscriptionActive: z.literal(false),
}).strict();
const configured = z.object({
  availability: z.literal('configured'), storage: z.literal('connected'),
  encryptedPayloadOnly: z.literal(true), ownerLimit: z.literal(20),
  subscriptionActive: z.literal(false),
}).strict();
const status = z.discriminatedUnion('availability', [disabled, configured]);
export type VaultStatus = z.infer<typeof status>;
export type VaultMetadata = z.infer<typeof metadata>;
export type VaultProject = z.infer<typeof fullProject>;
export class VaultRequestError extends Error {
  constructor(public readonly status: number) {
    super('Project vault request could not be confirmed');
  }
}

const MAX_RESPONSE_BYTES = 42_000;
async function boundedJson(response: Response): Promise<unknown> {
  if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
    throw new Error('PROJECT_REPLY_INVALID');
  const size = response.headers.get('content-length');
  if (size && /^\d+$/.test(size) && Number(size) > MAX_RESPONSE_BYTES)
    throw new Error('PROJECT_REPLY_TOO_LARGE');
  if (!response.body) throw new Error('PROJECT_REPLY_INVALID');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0, content = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new Error('PROJECT_REPLY_TOO_LARGE');
      content += decoder.decode(value, { stream: true });
    }
    content += decoder.decode();
    return JSON.parse(content);
  } catch {
    await reader.cancel().catch(() => undefined);
    throw new Error('PROJECT_REPLY_INVALID');
  } finally { reader.releaseLock(); }
}

/** A session-token client; caller must keep token only in React component memory. */
export function vaultClient(token: string, request: typeof fetch = fetch) {
  if (typeof token !== 'string' || token.length < 1 || token.length > 4096)
    throw new Error('INVALID_VAULT_SESSION');
  async function call<T>(path: string, method: 'GET'|'PUT'|'POST',
                         output: z.ZodType<T>, input?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await request('/api/v1/projects' + path, {
        method, cache: 'no-store', credentials: 'omit', redirect: 'error',
        signal: controller.signal,
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
          ...(input === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      });
      if (!response.ok) throw new VaultRequestError(response.status);
      const result = await boundedJson(response);
      return output.parse(result);
    } finally { clearTimeout(timer); }
  }
  return {
    status: () => call('/status','GET',status),
    list: () => call('/','GET',z.object({ projects: z.array(metadata).max(20) }).strict()),
    get: (id: string, expectedKind?: ProjectKind) => {
      const valid = UUID.parse(id);
      const schema = z.object({ project: fullProject.refine(item =>
        item.id === valid && (!expectedKind || item.kind === expectedKind)) }).strict();
      return call('/' + valid,'GET',schema);
    },
    create: (id: string, projectKind: ProjectKind, sealed: SealedProject) => {
      const valid = UUID.parse(id);
      const input = z.object({kind,expectedRevision:z.literal(0),sealed:payload}).strict()
        .parse({kind:projectKind,expectedRevision:0,sealed});
      const schema = z.object({ saved:z.literal(true), id:z.literal(valid), revision:z.literal(1),
        created:z.literal(true) }).strict();
      return call('/'+valid,'PUT',schema,input);
    },
    update: (id: string, projectKind: ProjectKind, sealed: SealedProject, expectedRevision: number) => {
      const valid = UUID.parse(id);
      const revision = VERSION.max(999_999).parse(expectedRevision);
      const input = z.object({kind,expectedRevision:VERSION,sealed:payload}).strict()
        .parse({kind:projectKind,expectedRevision:revision,sealed});
      const schema = z.object({saved:z.literal(true),id:z.literal(valid),
        revision:z.literal(revision+1),created:z.literal(false)}).strict();
      return call('/'+valid,'PUT',schema,input);
    },
    remove: (id: string, expectedRevision: number) => {
      const valid = UUID.parse(id), revision = VERSION.parse(expectedRevision);
      const input = {confirm:true as const,expectedRevision:revision};
      const schema = z.object({removed:z.literal(true),id:z.literal(valid)}).strict();
      return call('/'+valid+'/remove','POST',schema,input);
    },
  };
}
