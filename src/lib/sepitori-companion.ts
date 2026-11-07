/**
 * Local, deterministic conversation controls for Luqi's experimental Sepitori option.
 * This does NOT identify a speaker or train a language model. A simple greeting
 * or explicit language command never calls a paid provider.
 * Inference from one slang word, region, account name or ethnicity is forbidden.
 */
export type LocalSepitoriSignal =
  | { kind: 'language'; code: 'en' | 'sepitori' }
  | { kind: 'greeting' };

export function readLocalSepitoriSignal(input: unknown): LocalSepitoriSignal | null {
  if (typeof input !== 'string' || input.length > 100 || /[\r\n]/.test(input)) return null;
  const text = input.normalize('NFKC').trim().toLocaleLowerCase('en-ZA')
    .replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');
  if (!text) return null;

  // An explicit refusal always takes precedence; never infer identity.
  if (/^(?:please )?(?:no|not) sepitori(?: please)?$/.test(text) ||
      /^(?:please )?(?:stop|don't|dont|do not) (?:speaking|speak|using|use) sepitori(?: please)?$/.test(text) ||
      /^(?:i )?(?:don't|dont|do not) want to (?:speak|talk|chat) in sepitori(?: please)?$/.test(text) ||
      /^(?:please )?(?:english|english only|use english|speak english|reply in english|talk in english)(?: please)?$/.test(text)) {
    return { kind: 'language', code: 'en' };
  }
  if (/^(?:please )?(?:sepitori|se pitori|pitori)(?: please)?$/.test(text) ||
      /^(?:please )?(?:speak|use|reply in|talk in|chat in) (?:sepitori|se pitori|pitori)(?: please)?$/.test(text)) {
    return { kind: 'language', code: 'sepitori' };
  }
  // Heita/Ola dah is not proof that someone wants Sepitori.
  if (/^(?:heita|eita|ola|ola dah|ola da)$/.test(text)) return { kind: 'greeting' };
  return null;
}

export function localSepitoriAcknowledgement(
  signal: LocalSepitoriSignal, activeCode: string,
): string {
  if (signal.kind === 'language') return signal.code === 'en'
    ? 'English selected. Luqi will not request Sepitori unless you choose it again.'
    : 'Sepitori selected for Luqi replies. This community-language style is experimental; switch to English at any time.';
  return activeCode === 'sepitori'
    ? 'Heita! Ola dah! Luqi is here. What shall we work on? This is an informal greeting preview, not a verified translation.'
    : 'Heita! Luqi is here. How can I help today? You can try Sepitori or keep English; the choice is yours.';
}
