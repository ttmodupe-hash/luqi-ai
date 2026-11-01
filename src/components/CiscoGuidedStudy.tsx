import { useState } from 'react';
import { Link } from 'react-router';
import { CCNA_GUIDED_LESSONS, CCNA_GUIDE_REVIEWED, guidedLessonById, CISCO_CCNA_EXAM, CISCO_CCNA_REFRESH } from '../lib/ccna-guided-study';

/** Six locally checked lessons that link Cisco source topics to real Luqi labs.
 * No badges representing official exam results and no automatic AI requests.
 */
export default function CiscoGuidedStudy() {
  const [activeId, setActiveId] = useState(CCNA_GUIDED_LESSONS[0].id);
  const [answers, setAnswers] = useState<Record<string,number>>({});
  const lesson = guidedLessonById(activeId) ?? CCNA_GUIDED_LESSONS[0];
  const selected = answers[lesson.id];
  const completed = CCNA_GUIDED_LESSONS.filter(l => answers[l.id] === l.answerIndex).length;
  return <section className="rounded-2xl border border-emerald-700 bg-slate-900 p-4 sm:p-6 space-y-4" aria-label="Luqi guided Cisco practice">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Your Luqi learning journey</p>
        <h2 className="mt-1 text-xl font-bold text-white">Six Cisco-aligned skills. Six things you can actually practise.</h2>
        <p className="mt-2 text-sm text-slate-300">Work through a concept, check your reasoning, and open a hands-on Luqi lab. You can retry as many times as you want.</p>
      </div>
      <div className="rounded-lg border border-emerald-600 px-3 py-2 text-sm text-emerald-200" role="status" aria-live="polite">{completed} of {CCNA_GUIDED_LESSONS.length} self-checks correct</div>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a networking lesson">
      {CCNA_GUIDED_LESSONS.map((item,i) => <button
        key={item.id} type="button" aria-pressed={activeId === item.id}
        onClick={() => setActiveId(item.id)}
        className={'min-h-11 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-emerald-300 '+(activeId===item.id?'border-emerald-300 bg-emerald-900 text-white':'border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800')}
      ><span className="mr-2 text-emerald-300">{String(i+1).padStart(2,'0')}</span>{item.domain.replace(/^\d+\.0 /,'')}{answers[item.id] === item.answerIndex?' ✓':''}</button>)}
    </div>
    <article className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3">
        <p className="text-xs font-semibold text-emerald-300">{lesson.topic}</p>
        <h3 className="text-lg font-bold text-white">{lesson.title}</h3>
        <p className="text-sm text-slate-200">{lesson.goal}</p>
        <div className="border-l-2 border-emerald-400 pl-3">
          <h4 className="text-sm font-semibold text-emerald-200">Worked example</h4>
          <p className="mt-1 text-sm text-slate-300">{lesson.workedExample}</p>
        </div>
        <div className="border-t border-slate-700 pt-3">
          <h4 className="text-sm font-semibold text-emerald-200">Try it in Luqi</h4>
          <p className="mt-1 text-sm text-slate-300">{lesson.exercise}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={lesson.labPath} className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">{lesson.labLabel}</Link>
          <a href={lesson.sourceUrl} rel="noopener noreferrer" target="_blank" className="inline-flex min-h-11 items-center rounded-lg border border-slate-500 px-4 py-2 text-sm text-emerald-200">Cisco topic reference</a>
        </div>
      </div>
      <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Check your thinking · Luqi original exercise</p>
        <h3 className="text-base font-semibold text-white">{lesson.question}</h3>
        <div className="grid gap-2" role="group" aria-label="Choose your answer">
          {lesson.options.map((choice,i)=><button key={i} type="button" aria-pressed={selected===i} onClick={() => setAnswers(old=>({...old,[lesson.id]:i}))}
            className={'min-h-11 rounded-lg border px-3 py-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-emerald-300 '+(selected===i?'border-emerald-400 bg-emerald-900 text-white':'border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800')}>
              <span className="mr-2 font-semibold">{String.fromCharCode(65+i)}.</span>{choice}
            </button>)}
        </div>
        {selected!==undefined && <div role="status" aria-live="polite" className={'rounded-lg border p-3 text-sm '+(selected===lesson.answerIndex?'border-emerald-600 bg-emerald-950 text-emerald-100':'border-amber-700 bg-slate-900 text-amber-100')}>
          <strong>{selected===lesson.answerIndex?'Correct — you can explain this.':'Review the reasoning and try another answer.'}</strong>
          <p className="mt-1 leading-relaxed">{lesson.explanation}</p>
        </div>}
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={() => setAnswers(old => {const next={...old};delete next[lesson.id];return next;})}
            className="min-h-10 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200">Retry this check</button>
          <button type="button" onClick={() => {const i=CCNA_GUIDED_LESSONS.findIndex(l=>l.id===activeId);setActiveId(CCNA_GUIDED_LESSONS[(i+1)%CCNA_GUIDED_LESSONS.length].id);}}
            className="min-h-10 rounded-lg border border-emerald-600 px-3 py-2 text-sm text-emerald-200">Next skill</button>
        </div>
      </div>
    </article>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
      <span>Mapped to Cisco's current 200-301 v1.1 topics · reviewed {CCNA_GUIDE_REVIEWED}</span>
      <a href={CISCO_CCNA_EXAM} target="_blank" rel="noopener noreferrer" className="text-emerald-200 underline underline-offset-4">Cisco exam requirements</a>
      <a href={CISCO_CCNA_REFRESH} target="_blank" rel="noopener noreferrer" className="text-emerald-200 underline underline-offset-4">Cisco 2027 refresh schedule</a>
    </div>
  </section>;
}
