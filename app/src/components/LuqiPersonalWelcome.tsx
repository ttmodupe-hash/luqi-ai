import { useState } from 'react';
import type { LanguageInfo } from '../lib/languages';

const greetings: Record<string, [string, string]> = {
  en: ['Hello', 'How can Luqi be of service today?'],
  af: ['Hallo', 'Hoe kan Luqi jou vandag help?'],
  tn: ['Dumela', 'Luqi e ka go thusa jang gompieno?'],
  nso: ['Dumela', 'Luqi e ka go thuša bjang lehono?'],
  zu: ['Sawubona', 'ULuqi angakusiza ngani namuhla?'],
  xh: ['Molo', 'ULuqi angakunceda ngantoni namhlanje?'],
  st: ['Dumela', 'Luqi e ka o thusa jwang kajeno?'],
  sw: ['Habari', 'Luqi inaweza kukusaidiaje leo?'],
  yo: ['Ẹ káàbọ̀', 'Báwo ni Luqi ṣe lè ràn ọ́ lọ́wọ́ lónìí?'],
  fr: ['Bonjour', "Comment Luqi peut-il vous aider aujourd’hui ?"],
  pt: ['Olá', 'Como pode Luqi ajudar hoje?'],
};

/** Names stay in the signed-in view, never provider inputs or public storage. */
export default function LuqiPersonalWelcome({ name, language, disabled = false }: {
  name?: string | null; language: LanguageInfo; disabled?: boolean;
}) {
  const [preferredName, setPreferredName] = useState('');
  const displayName = (name?.trim() || preferredName.trim()).slice(0, 120);
  const copy = greetings[language.code];
  const [hello, question] = copy ?? greetings.en;
  return <section aria-label="Your Luqi welcome" lang={copy ? language.code : 'en'}>
    <h2>{hello}{displayName ? `, ${displayName}` : ''}.</h2>
    <p>{question}</p>
    <p>You can chat with Luqi in {language.nativeName}. Prefer to talk? Voice conversation is still in development; you can use your phone’s keyboard dictation to compose a message, review it, then send.</p>
    {!copy && <p>The welcome is shown in English while this language’s interface translation is being prepared.</p>}
    {!name?.trim() && <label>What should Luqi call you? (optional, for this visit)
      <input className="luqi-access-input" value={preferredName} maxLength={120} disabled={disabled}
        autoComplete="given-name" onChange={event => setPreferredName(event.target.value)} />
    </label>}
  </section>;
}
