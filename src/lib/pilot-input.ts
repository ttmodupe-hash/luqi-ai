/** Pure input contract shared by the paid gateway and its browser client.
 * Limits count UTF-16 code units, like JavaScript length and the existing API.
 * No input is shortened or silently dropped to fit a paid request.
 */
export const MAX_PILOT_INPUT_CHARS = 6000;
export const MAX_PILOT_HISTORY_TURNS = 4;
export const MAX_PILOT_HISTORY_TEXT_CHARS = 350;
export const MAX_PILOT_LANGUAGE_CHARS = 50;

export class PilotInputError extends Error {
  readonly code: 'INVALID_INPUT' | 'AI_INPUT_TOO_LARGE';
  constructor(code: 'INVALID_INPUT' | 'AI_INPUT_TOO_LARGE') {
    super(code === 'AI_INPUT_TOO_LARGE'
      ? 'The complete question and context exceed the AI trial input limit.'
      : 'The AI trial input is invalid.');
    this.name = 'PilotInputError';
    this.code = code;
  }
}

function formatInput(prompt: string, language: string, past: string): string {
  return `Language preference: ${language}\nRecent conversation:\n${past}\nUser: ${prompt}`;
}

// The current browser submits one question, with default language and no history.
export const MAX_PILOT_QUESTION_CHARS = MAX_PILOT_INPUT_CHARS - formatInput('', 'auto', '').length;

export function buildPilotInput(prompt: unknown, language: unknown = 'auto', history: unknown = []): string {
  if (typeof prompt !== 'string' || !prompt.trim() ||
      typeof language !== 'string' || !language.trim() || language.length > MAX_PILOT_LANGUAGE_CHARS ||
      !Array.isArray(history) || history.length > MAX_PILOT_HISTORY_TURNS) {
    throw new PilotInputError('INVALID_INPUT');
  }
  if (prompt.length > MAX_PILOT_INPUT_CHARS) throw new PilotInputError('AI_INPUT_TOO_LARGE');
  const past = history.map((turn: unknown) => {
    if (!turn || typeof turn !== 'object' || Array.isArray(turn)) throw new PilotInputError('INVALID_INPUT');
    const item = turn as Record<string, unknown>;
    if (Object.keys(item).some(key => key !== 'sender' && key !== 'text') ||
        (item.sender !== 'user' && item.sender !== 'ai') || typeof item.text !== 'string' ||
        item.text.length > MAX_PILOT_HISTORY_TEXT_CHARS) throw new PilotInputError('INVALID_INPUT');
    return `${item.sender}: ${item.text}`;
  }).join('\n');
  const input = formatInput(prompt, language, past);
  if (input.length > MAX_PILOT_INPUT_CHARS) throw new PilotInputError('AI_INPUT_TOO_LARGE');
  return input;
}
