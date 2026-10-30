/** Developer API token count including the real system instruction.
 * @google/genai's countTokens config.systemInstruction is Vertex-only and throws
 * locally. REST generateContentRequest is supported by the Developer API:
 * https://ai.google.dev/api/tokens#request-body
 */
import { PILOT_MODELS } from './pilotModels';
import { GuestTrialError } from './guestTrialBudget';
export async function countGuestInputTokens(input: string, systemInstruction: string, fetcher: typeof fetch = fetch): Promise<{ totalTokens: number }> {
  try {
    const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${PILOT_MODELS.gemini}:countTokens`, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.LUQI_PILOT_GEMINI_API_KEY! },
      body: JSON.stringify({ generateContentRequest: {
        model: 'models/' + PILOT_MODELS.gemini,
        contents: [{ role: 'user', parts: [{ text: input }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
      } }),
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel(); throw new Error('Unavailable token count');
    }
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > 4096) throw new Error('Oversized token count');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || !Number.isSafeInteger(data.totalTokens) || data.totalTokens < 1 || data.totalTokens > 4096)
      throw new Error('Invalid token count');
    return { totalTokens: data.totalTokens };
  } catch { throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE'); }
}
