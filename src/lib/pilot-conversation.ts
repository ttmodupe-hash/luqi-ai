/** Explicit, in-memory context for the consented text pilot only.
 * Never read private notes, account profile, storage, URL params or cookies.
 */
import { MAX_PILOT_HISTORY_TURNS, MAX_PILOT_HISTORY_TEXT_CHARS } from './pilot-input';

export type PilotConversationTurn = { sender: 'user' | 'ai'; text: string };
const OMITTED = ' … [middle omitted] … ';

/** Preserve the opening context and the conclusion, with a visible omission.
 * These are literal excerpts, never generated summaries or inferred memories.
 */
function excerpt(text: string): string {
  if (text.length <= MAX_PILOT_HISTORY_TEXT_CHARS) return text;
  const available = MAX_PILOT_HISTORY_TEXT_CHARS - OMITTED.length;
  const head = text.slice(0, Math.ceil(available / 2)).replace(/[\uD800-\uDBFF]$/, '');
  const tail = text.slice(-Math.floor(available / 2)).replace(/^[\uDC00-\uDFFF]/, '');
  return head + OMITTED + tail;
}

/** The full local conversation is kept in component memory; only this preview can be sent. */
export function previewPilotHistory(turns: readonly PilotConversationTurn[]): PilotConversationTurn[] {
  return turns.slice(-MAX_PILOT_HISTORY_TURNS).map(({ sender, text }) => {
    return { sender, text: excerpt(text) };
  });
}
