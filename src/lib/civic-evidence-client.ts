import { CIVIC_EDITION, getCivicClaim, civicReviewCurrent, civicQuestionProblem, validateCivicSelection,
  type CivicSelection } from './civic-evidence';
import { requestPilotJson, pilotFailureCode } from './pilot-request';
export class CivicChatError extends Error {
  constructor(public readonly code: string) { super('Civic explanation could not be confirmed'); }
}
export interface CivicReply extends CivicSelection { provider: 'gemini' | 'openai'; provider_model: string }
export function validateCivicReply(value: unknown, claimId: string): CivicReply {
  const claim = getCivicClaim(claimId);
  if (!claim || !value || typeof value !== 'object' || Array.isArray(value)) throw new CivicChatError('CIVIC_REPLY_UNVERIFIED');
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'claimId,edition,format,outOfScope,passageIds,provider,provider_model,reviewedOn' ||
    v.format !== 'luqi.civic-explanation.v1' || v.edition !== CIVIC_EDITION || v.claimId !== claim.id ||
    v.reviewedOn !== claim.reviewedOn || !['gemini','openai'].includes(String(v.provider)) ||
    typeof v.provider_model !== 'string' || !v.provider_model || v.provider_model.length > 100) throw new CivicChatError('CIVIC_REPLY_UNVERIFIED');
  const selection = validateCivicSelection({ passageIds: v.passageIds, outOfScope: v.outOfScope }, claim);
  if (!selection) throw new CivicChatError('CIVIC_REPLY_UNVERIFIED');
  return { ...selection, provider: v.provider as 'gemini' | 'openai', provider_model: v.provider_model };
}
/** One explicit client POST, no retry, no source overrides or automatically shared history. */
export async function askCivicEvidence(token: string, claimId: string, question: string, previousPassageIds: string[],
  signal: AbortSignal, request: typeof fetch = fetch): Promise<CivicReply> {
  const claim = getCivicClaim(claimId), problem = civicQuestionProblem(question);
  if (!token || token.length > 4096 || !claim || problem || previousPassageIds.length > 3 ||
    new Set(previousPassageIds).size !== previousPassageIds.length || previousPassageIds.some(id => !claim.passages.some(p => p.id === id)))
    throw new CivicChatError(problem === 'private_identifier' ? 'CIVIC_PRIVATE_IDENTIFIER' : 'INVALID_INPUT');
  if (!civicReviewCurrent(claim)) throw new CivicChatError('CIVIC_SOURCES_STALE');
  try {
    const response = await requestPilotJson(request, '/api/v1/luqi-core/civic-explain', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ claimId, question: question.trim(), ...(previousPassageIds.length ? { previousPassageIds } : {}) }),
    });
    if (response.status === 401) throw new CivicChatError('AUTH_REQUIRED');
    if (!response.ok) {
      const code = (response.body as {code?:unknown})?.code;
      const known = ['CIVIC_SOURCES_STALE','CIVIC_PRIVATE_IDENTIFIER','CIVIC_REPLY_UNVERIFIED','INVALID_INPUT'];
      throw new CivicChatError(typeof code === 'string' && known.includes(code) ? code : pilotFailureCode(response.status,response.body));
    }
    return validateCivicReply(response.body, claimId);
  } catch (error) {
    if (error instanceof CivicChatError) throw error;
    throw new CivicChatError('RESPONSE_UNCONFIRMED');
  }
}
