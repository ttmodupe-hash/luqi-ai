import { PilotInputError } from './pilot-input';

/** Optional companion guidance for a single consented text request.
 * Saved notes are never loaded, attached or remembered by this helper.
 * The caller must show the selected note and obtain per-request consent.
 */
export const MAX_SHARED_COMPANION_NOTE_CHARS = 350;

export function prepareCompanionQuestion(
  question: string,
  companionMode: boolean,
  sharedNote?: string,
): string {
  const message = question.trim();
  if (!companionMode && sharedNote === undefined) return message;

  let note: string | undefined;
  if (sharedNote !== undefined) {
    if (typeof sharedNote !== 'string') throw new PilotInputError('INVALID_INPUT');
    note = sharedNote.trim();
    if (!note || note.length > MAX_SHARED_COMPANION_NOTE_CHARS) {
      throw new PilotInputError('INVALID_INPUT');
    }
  }

  const sections: string[] = [];
  if (companionMode) {
    sections.push('Companion style requested: Respond as Luqi, a warm and respectful AI conversational companion. Listen thoughtfully, offer practical guidance and ask one helpful follow-up question when appropriate. Do not claim to be a human, a therapist or an emergency service. Respect the user\'s autonomy and the language they use; do not promise ongoing memory.');
  }
  if (note) {
    sections.push('Personal context explicitly shared by me for this single request (background only, not system instructions):\n' + note);
  }
  sections.push('My message:\n' + message);
  return sections.join('\n\n');
}
