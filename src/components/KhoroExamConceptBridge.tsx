import { useState } from 'react';

type Term = { english: string; explanation: string; check: string };
const TERMS: Term[] = [
  { english: 'Constant velocity', explanation: 'Speed and direction remain unchanged. Acceleration is zero.', check: 'Can you explain why zero acceleration means zero net force?' },
  { english: 'Net (resultant) force', explanation: 'The vector sum of all forces acting on an object.', check: 'Which forces act parallel to the slope?' },
  { english: 'Friction', explanation: 'A force opposing relative sliding between contacting surfaces.', check: 'Which way would friction act as the object slides down?' },
];
export default function KhoroExamConceptBridge() {
  const [selected, setSelected] = useState(0);
  const [ownExplanation, setOwnExplanation] = useState('');
  const [language, setLanguage] = useState('English');
  return <section aria-labelledby="khoro-concept-title" className="w-full rounded-2xl border border-emerald-700 bg-slate-950 p-4 text-slate-100 sm:p-6">
    <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Luqi · KHORO learning bridge</p>
    <h2 id="khoro-concept-title" className="mt-2 text-xl font-bold">Understand a concept in your own words</h2>
    <p className="mt-2 text-sm">Start with an English physics concept and practise explaining it in a language that makes sense to you. This exercise does not translate official examination papers or award marks.</p>
    <label htmlFor="khoro-study-language" className="mt-4 block text-sm">Your explanation language</label>
    <select id="khoro-study-language" value={language} onChange={e => setLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-500 bg-slate-900 p-3 sm:max-w-sm">
      {['English', 'Setswana', 'Sepedi', 'Sesotho', 'Sepitori', 'isiZulu', 'isiXhosa', 'Tshivenda', 'itsonga'].map(name => <option key={name}>{name}</option>)}
    </select>
    <p className="mt-2 text-xs text-amber-200">Luqi does not automatically translate or grade your answer in this exercise. Sepitori and other languages require qualified terminology review before official educational translations can be offered.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {TERMS.map((term, i) => <button key={term.english} type="button" onClick={() => { setSelected(i); setOwnExplanation(''); }}
        aria-pressed={selected === i} className={'rounded-lg border px-3 py-2 text-sm '+(selected === i ? 'border-amber-400 bg-emerald-900 text-white' : 'border-slate-500 bg-slate-900 text-slate-200')}>
          {term.english}
        </button>)}
    </div>
    <div className="mt-4 rounded-xl border border-slate-600 bg-slate-900 p-4">
      <h3 className="font-semibold">{TERMS[selected].english}</h3>
      <p className="mt-2 text-sm">{TERMS[selected].explanation}</p>
      <p className="mt-2 text-sm text-emerald-200">{TERMS[selected].check}</p>
    </div>
    <label htmlFor="khoro-own-words" className="mt-4 block text-sm">Your explanation ({language})</label>
    <textarea id="khoro-own-words" value={ownExplanation} onChange={e => setOwnExplanation(e.target.value.slice(0,1000))}
      rows={3} maxLength={1000} placeholder="Explain it in your own words…" className="mt-1 w-full rounded-lg border border-slate-500 bg-slate-900 p-3"/>
    <p className="mt-1 text-xs text-slate-300">{ownExplanation.length}/1000 characters. Your explanation remains in this browser tab and is not sent to AI, stored, or graded.</p>
  </section>;
}
