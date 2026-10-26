/** Explicit, in-memory context for the consented text pilot only.
 * Never read private notes, account profile, storage, URL params or cookies.
 */
import { MAX_PILOT_HISTORY_TURNS, MAX_PILOT_HISTORY_TEXT_CHARS } from './pilot-input';

export type PilotConversationTurn = { sender: 'user' | 'ai'; text: string };

/** The full local conversation is kept in component memory; only this preview can be sent. */
export function previewPilotHistory(turns: readonly PilotConversationTurn[]): PilotConversationTurn[] {
  return turns.slice(-MAX_PILOT_HISTORY_TURNS).map(({ sender, text }) => {
    const value = text.length > MAX_PILOT_HISTORY_TEXT_CHARS
      ? text.slice(0, MAX_PILOT_HISTORY_TEXT_CHARS - 1).replace(/[\uD800-\uDBFF]$/, '') + '…'
      : text;
    return { sender, text: value };
  });
}
