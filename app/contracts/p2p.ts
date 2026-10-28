import { z } from 'zod';
export const P2P_PRESETS = [
  { code: 'KHORO-STUDY-12', name: 'Matric Study Circle', category: 'study' },
  { code: 'KHULA-COOP-01', name: 'Entrepreneurs & Stokvel Circle', category: 'cooperative' },
  { code: 'AFCFTA-TRADE-54', name: 'Cross-Border Trade Link', category: 'trade' },
] as const;
export const p2pId = z.string().uuid();
export const p2pCategory = z.enum(['study', 'cooperative', 'trade', 'custom']);
export const p2pReason = z.enum(['SCAM_SOLICITATION', 'HARASSMENT', 'FAKE_AGENT', 'UNLAWFUL_CONTENT']);
export const p2pSealed = z.object({ iv: z.string().regex(/^[A-Za-z0-9_-]{16}$/),
  ciphertext: z.string().regex(/^[A-Za-z0-9_-]+$/).min(22).max(14000) }).strict();
export const p2pMessage = p2pSealed.extend({ messageId: p2pId, circleId: p2pId,
  senderId: z.number().int().positive().safe(), recipientId: z.number().int().positive().safe(),
  timestamp: z.string().datetime() }).strict();
export type P2PMessagePacket = z.infer<typeof p2pMessage>;
export const p2pCircle = z.object({ id: p2pId, name: z.string().min(1).max(100), category: p2pCategory,
  ownerId: z.number().int().positive().safe(), peerId: z.number().int().positive().safe().nullable(),
  requestedBy: z.number().int().positive().safe().nullable(), active: z.boolean(), studentLock: z.boolean() });
export type P2PCircle = z.infer<typeof p2pCircle>;
export const p2pStatus = z.object({ enabled: z.boolean(), userId: z.number().int().positive().safe(),
  blockedPeers: z.array(z.number().int().positive().safe()).max(100),
  eligibility: z.enum(['verified_adult', 'verified_student', 'verification_needed']), circles: z.array(p2pCircle).max(24) });
export type P2PStatus = z.infer<typeof p2pStatus>;
/** A current mutual contact only. No online/offline/last-seen information is
 * collected or disclosed by this contract. Account-active is not presence. */
export const p2pApprovedContact = z.object({
  circleId: p2pId, userId: z.number().int().positive().safe(),
  name: z.string().min(1).max(120), accountActive: z.literal(true),
  presence: z.literal('not_shared'),
}).strict();
export const p2pApprovedContacts = z.object({
  contacts: z.array(p2pApprovedContact).max(24),
}).strict();
export type P2PApprovedContact = z.infer<typeof p2pApprovedContact>;
export const p2pReportInput = z.object({ messageId: p2pId, reason: p2pReason,
  evidence: z.string().min(1).max(2000), consent: z.literal(true) }).strict();
export const p2pReportReceipt = z.object({ reportId: p2pId, previousSeal: z.string().regex(/^[a-f0-9]{64}$/),
  sha256AuditSeal: z.string().regex(/^[a-f0-9]{64}$/), timestamp: z.string().datetime(), blocked: z.literal(true) });
