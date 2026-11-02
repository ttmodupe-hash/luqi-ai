/** Versioned sealed project envelope. The backend never sees a plaintext quote. */
import { z } from 'zod';

export const VAULT_FORMAT = 'luqi.vault.sealed.v1' as const;
export const VAULT_KDF = 'PBKDF2-SHA256-310000' as const;
export const VAULT_ITEMS_PER_OWNER = 20;
export const VAULT_MAX_PLAINTEXT_BYTES = 24_000;
export const vaultId = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
export const vaultKind = z.enum(['quote', 'sales']);
const canonicalB64 = (text: string): boolean => {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) return false;
  try { return Buffer.from(text, 'base64').toString('base64') === text; }
  catch { return false; }
};
export const vaultSealed = z.object({
  format: z.literal(VAULT_FORMAT),
  kdf: z.literal(VAULT_KDF),
  salt: z.string().length(24).refine(text => canonicalB64(text) && Buffer.from(text, 'base64').length === 16),
  nonce: z.string().length(16).refine(text => canonicalB64(text) && Buffer.from(text, 'base64').length === 12),
  ciphertext: z.string().min(24).max(33_000).refine(text => {
    if (!canonicalB64(text)) return false;
    const count = Buffer.from(text, 'base64').length;
    return count >= 16 && count <= VAULT_MAX_PLAINTEXT_BYTES + 16;
  }),
}).strict();
export type VaultSealed = z.infer<typeof vaultSealed>;
export const vaultWrite = z.object({
  kind: vaultKind,
  expectedRevision: z.number().int().min(0).max(1_000_000),
  sealed: vaultSealed,
}).strict();
export const vaultRemove = z.object({
  confirm: z.literal(true),
  expectedRevision: z.number().int().min(1).max(1_000_000),
}).strict();
export type VaultWrite = z.infer<typeof vaultWrite>;
export const vaultRevision = z.number().int().min(1).max(1_000_000);
