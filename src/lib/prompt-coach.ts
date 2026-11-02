/** Local optional draft guidance: no inference, network, or storage. */
import { MAX_PILOT_QUESTION_CHARS } from './pilot-input';
export const MAX_COACH_DETAIL_CHARS = 240;
export const COACH_GOALS = ['unsure','understand','plan','write','compare','brainstorm','decide'] as const;
export type CoachGoal = (typeof COACH_GOALS)[number];
export const COACH_STYLES = ['adapt','simple','steps','balanced','detailed'] as const;
export type CoachStyle = (typeof COACH_STYLES)[number];
export const COACH_LANGUAGES = ['same','English','isiZulu','Sesotho','Setswana','Afrikaans','Kiswahili'] as const;
export type CoachLanguage = (typeof COACH_LANGUAGES)[number];
export interface CoachRequest {
  draft: string; goal: CoachGoal; style: CoachStyle; language: CoachLanguage; detail: string;
}
const taskFor: Record<CoachGoal,string> = {
  unsure: 'Help me work out what I need and offer a useful first step.',
  understand: 'Explain this accurately, using an example where helpful.',
  plan: 'Suggest practical next steps I can consider; do not claim to have acted.',
  write: 'Help me draft text that I can review and edit before using it.',
  compare: 'Compare reasonable options fairly, including important trade-offs.',
  brainstorm: 'Explore a few approaches and when each might help.',
  decide: 'Help me think through uncertainty and trade-offs; let me decide.',
};
const styleFor: Record<CoachStyle,string> = {
  adapt: '', simple: 'Use plain language without unnecessary jargon.',
  steps: 'Use short practical steps.',
  balanced: 'Show balanced alternatives or pros and cons when useful.',
  detailed: 'Explain with useful detail, but never invent facts.',
};
export function buildCoachedQuestion(request: CoachRequest): string | null {
  if (!request || typeof request.draft !== 'string' || typeof request.detail !== 'string'
    || !COACH_GOALS.includes(request.goal) || !COACH_STYLES.includes(request.style)
    || !COACH_LANGUAGES.includes(request.language)
    || request.detail.length > MAX_COACH_DETAIL_CHARS) return null;
  const words = request.draft.trim(), detail = request.detail.trim();
  if (!words || words.length > MAX_PILOT_QUESTION_CHARS) return null;
  const parts = [
    words,
    'How to help: ' + taskFor[request.goal],
    styleFor[request.style],
    detail ? 'Additional detail I choose to include: ' + detail : '',
    request.language === 'same' ? 'Reply in the language I used if possible.'
      : 'If possible, reply in ' + request.language + '; flag uncertain wording or translations.',
    'If essential information is missing, ask one focused question rather than guessing. Be open to alternatives and say what is uncertain.',
  ].filter(Boolean);
  const candidate = parts.join('\n\n');
  // Preserve every user word; never shorten input to pass the paid gateway.
  return candidate.length <= MAX_PILOT_QUESTION_CHARS ? candidate : null;
}
export interface LocalSpellingHint {
  corrected: string; examples: { from: string; to: string }[];
}
const COMMON_TYPOS: Record<string,string> = {
  teh:'the', adn:'and', plese:'please', recieve:'receive', becuase:'because',
};
/** English-only typo hints: not grammar checking, translation or autocorrection. */
export function suggestLocalSpelling(draft: string): LocalSpellingHint | null {
  if (typeof draft !== 'string' || !draft || draft.length > MAX_PILOT_QUESTION_CHARS) return null;
  // Protect non-English text, URLs, email, quoted code and uppercase identifiers.
  if (/[^\x00-\x7F]/.test(draft) || /https?:\/\/|@|\x60|\b[A-Z0-9]{4,}\b/.test(draft)) return null;
  const examples: LocalSpellingHint['examples'] = [];
  const corrected = draft.replace(/(^|[^\p{L}\p{N}_])(teh|adn|plese|recieve|becuase)(?=$|[^\p{L}\p{N}_])/giu,
    (whole: string, separator: string, raw: string) => {
      if (raw === raw.toUpperCase()) return whole;
      const word = COMMON_TYPOS[raw.toLowerCase()];
      const replacement = raw[0] === raw[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word;
      if (examples.length < 3 && !examples.some(x => x.from.toLowerCase() === raw.toLowerCase()))
        examples.push({ from: raw, to: replacement });
      return separator + replacement;
    });
  return corrected === draft ? null : { corrected, examples };
}
