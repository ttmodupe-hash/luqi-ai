import { useState } from 'react';
import { useOptionalCustomerSession } from '../providers/customer-session';
import { customerSessionBoundary } from '../lib/customer-session-boundary';
import { stageGuide } from '../lib/interaction-handoff';
import {
  CREDIT_EXAMPLE, creditHabitExercise, creditAiStarter,
  type CreditAiTopic, type CreditHabitInputs,
} from '../lib/credit-ai-coach';

const controls: ReadonlyArray<{
  key: keyof CreditHabitInputs; label: string; min: number; max: number; step: number; unit?: string;
}> = [
  { key: 'onTimePercent', label: 'On-time payment example', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'arrearsCount', label: 'Late-payment events', min: 0, max: 12, step: 1 },
  { key: 'utilizationPercent', label: 'Revolving utilisation example', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'adverseRecords', label: 'Negative records example', min: 0, max: 8, step: 1 },
  { key: 'historyYears', label: 'Years of credit history example', min: 0, max: 30, step: 1 },
  { key: 'enquiries90d', label: 'Recent application enquiries example', min: 0, max: 12, step: 1 },
];
const topics: ReadonlyArray<{ value: CreditAiTopic; label: string }> = [
  { value: 'understand-report', label: 'Understand a credit report' },
  { value: 'dispute-record', label: 'Challenge an incorrect bureau record' },
  { value: 'prescription-questions', label: 'Understand possible debt prescription' },
];

export default function CreditAiCoach() {
  const [example, setExample] = useState<CreditHabitInputs>({ ...CREDIT_EXAMPLE });
  const [topic, setTopic] = useState<CreditAiTopic>('understand-report');
  const session = useOptionalCustomerSession()?.session ?? null;
  const owner = customerSessionBoundary(session);
  const result = creditHabitExercise(example);
  const starter = creditAiStarter(topic);

  function openAi() {
    if (!owner) {
      window.location.hash = '#/try'; // Fixed existing guest route; no reload or provider action.
      return;
    }
    // The existing same-account memory-only Chat handoff pre-fills a general question.
    // It does NOT invoke a provider. The customer must separately approve and press Send.
    if (stageGuide(owner, '/consumer-rights', starter, null, true)) window.location.hash = '#/chat';
  }

  return <section className="space-y-4 rounded-xl border border-cyan-700 bg-slate-900 p-4" aria-labelledby="credit-ai-title">
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Luqi · Free educational tool</p>
      <h2 id="credit-ai-title" className="text-xl font-bold">Credit health & AI rights coach</h2>
      <p className="text-sm text-slate-200">
        Explore hypothetical credit habits and ask Luqi AI about South African bureau rights.
        Nothing here checks your real credit file or calculates a TransUnion, Experian or XDS score.
      </p>
      <p className="text-xs text-slate-300">
        Only use illustrative settings. Do not enter identity numbers, account numbers, addresses, passwords,
        identifiable credit reports or another person's financial data. Settings stay in this page's memory.
      </p>
    </div>

    <div className="space-y-3" role="group" aria-label="Illustrative credit-habits sliders">
      {controls.map(control => <label key={control.key} className="block space-y-1 text-sm">
        <span className="flex flex-wrap justify-between gap-2">
          <span>{control.label}</span>
          <strong>{example[control.key]}{control.unit ?? ''}</strong>
        </span>
        <input
          type="range" className="w-full accent-cyan-400" min={control.min} max={control.max}
          step={control.step} value={example[control.key]}
          onChange={event => setExample(previous => ({
            ...previous, [control.key]: Number(event.target.value),
          }))}
        />
      </label>)}
    </div>
    <div className="rounded-lg border border-slate-600 bg-slate-950 p-3">
      <p className="text-sm font-semibold">Luqi illustrative credit-habits index</p>
      <p className="text-2xl font-bold" data-testid="credit-habits-index">{result ? result.index : '—'}<span className="text-sm font-normal"> / 100</span></p>
      {result && <meter className="w-full" min={0} max={100} value={result.index} aria-label="Illustrative credit habits index" />}
      <p className="text-xs text-slate-300">
        This unvalidated educational exercise is NOT a credit score, creditworthiness assessment,
        loan-approval probability or prediction of any bureau's model.
      </p>
    </div>

    <div className="space-y-2">
      <h3 className="font-semibold">Check an actual bureau report or dispute inaccurate information</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li><a className="text-cyan-200 underline" href="https://www.transunion.co.za/product/annual-free-credit-report" target="_blank" rel="noopener noreferrer">TransUnion: free annual report</a></li>
        <li><a className="text-cyan-200 underline" href="https://www.experian.co.za/consumer/my-free-credit-check-and-your-free-credit-report" target="_blank" rel="noopener noreferrer">Experian: consumer report and free disputes</a></li>
        <li><a className="text-cyan-200 underline" href="https://www.cba.co.za/enquiries" target="_blank" rel="noopener noreferrer">Credit Bureau Association: other bureaus including XDS</a></li>
        <li><a className="text-cyan-200 underline" href="https://ncr.org.za/documents/pages/Brochures/ENGLISH.pdf" target="_blank" rel="noopener noreferrer">National Credit Regulator: NCA rights brochure</a></li>
      </ul>
      <p className="text-xs text-slate-300">
        NCA section 72 and Regulation 20 provide a dispute process, generally with a 20-business-day
        investigation requirement. Section 126B does not make every debt prescribed after three years.
        Actual legal timelines depend on the agreement and events. Sources reviewed 3 November 2026;
        verify current requirements with the regulator or a qualified adviser.
      </p>
    </div>

    <div className="space-y-3 rounded-lg border border-slate-600 bg-slate-950 p-3">
      <h3 className="font-semibold">Ask Luqi AI — only when you choose</h3>
      <label htmlFor="credit-ai-topic" className="block text-sm">What do you want help understanding?</label>
      <select id="credit-ai-topic" className="w-full rounded-md border border-slate-500 bg-slate-950 p-3 text-sm"
        value={topic} onChange={event => setTopic(event.target.value as CreditAiTopic)}>
        {topics.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <p className="text-xs text-slate-300">Prepared general question, with no slider values or personal information:</p>
      <p className="rounded-md border border-slate-700 p-3 text-sm" data-testid="credit-ai-preview">{starter}</p>
      <button type="button" className="rounded-lg border border-cyan-400 px-4 py-3 text-sm font-semibold text-cyan-100"
        onClick={openAi}>{owner ? 'Prepare question in Luqi AI Chat' : 'Try Luqi AI as a guest'}</button>
      <p className="text-xs text-slate-300">
        {owner ? 'Chat requires your existing AI-processing acknowledgement and a separate Send action. No model call happens here.' :
          'Guest Chat is a separate optional trial. You can copy the general question above into it; nothing is sent automatically.'}
        {' '}Never rely on AI alone to confirm prescription, approve credit or submit a dispute.
      </p>
    </div>
    <p className="text-xs text-slate-400">
      <a href="#/consumer-rights" className="text-cyan-200 underline">Consumer rights guide</a>
      {' · '}No automatic bureau access, financial uploads, AI submissions or paid inference from this page.
    </p>
  </section>;
}
