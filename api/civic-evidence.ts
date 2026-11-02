/** Mounted only INSIDE aiPilot, after its auth, enablement and body-size middleware. */
import { Hono } from 'hono';
import { z } from 'zod';
import { CIVIC_EDITION, civicReviewCurrent } from '../src/lib/civic-evidence';
import { prepareCivicEvidence, parseCivicSelection, CivicEvidenceError } from './services/civicEvidence';
import { runBudgetedPilotChat } from './services/aiPilotGateway';
const input = z.object({
  claimId: z.string().min(1).max(60), question: z.string().trim().min(1).max(1000),
  previousPassageIds: z.array(z.string().min(1).max(60)).max(3).optional(),
}).strict();
export const civicEvidence = new Hono<{ Variables: { pilotUserId: number } }>();
civicEvidence.post('/', async c => {
  // Defence in depth: mounting this child elsewhere cannot bypass authentication.
  const userId = c.get('pilotUserId');
  if (!Number.isSafeInteger(userId) || userId <= 0) return c.json({ code: 'AUTH_REQUIRED' }, 401);
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header('content-type') ?? '')) return c.json({ code: 'INVALID_INPUT' }, 415);
  const parsed = input.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  try {
    const prepared = prepareCivicEvidence(parsed.data);
    // Same durable per-user/provider quota, credentials, model selection and paid-output guards as ordinary Luqi Chat.
    const result = await runBudgetedPilotChat(prepared.prompt, userId, 'English');
    // Expiry may cross while a model is running. Do not label that record current.
    if (!civicReviewCurrent(prepared.claim)) throw new CivicEvidenceError('CIVIC_SOURCES_STALE');
    const selection = parseCivicSelection(result.response, prepared.claim);
    return c.json({ format: 'luqi.civic-explanation.v1', edition: CIVIC_EDITION, claimId: prepared.claim.id,
      reviewedOn: prepared.claim.reviewedOn, ...selection, provider: result.provider, provider_model: result.model });
  } catch (error) {
    if (!(error instanceof CivicEvidenceError)) throw error; // Parent preserves existing budget/auth/provider error handling.
    return c.json({ code: error.code, message: 'Use the dated source card. No automatic AI retry was made; an attempted reply may count toward your allowance.' },
      error.code === 'CIVIC_REPLY_UNVERIFIED' ? 502 : error.code === 'CIVIC_SOURCES_STALE' ? 409 : 400);
  }
});
