import {useState,type FormEvent} from 'react';
import {Link} from 'react-router';
import type {OpportunitySource} from '../lib/opportunity-sources';
import {MAX_SOURCE_QUESTION,VERIFICATION_GUIDE_RECHECK_AFTER,answerOpportunityQuestion,
  guideForOpportunity,isVerificationGuideCurrent,type SourceAnswer} from '../lib/opportunity-verification';

/** Human-readable, local verification aid: no personal details, provider use or applications. */
export default function OpportunityVerificationPanel({source}:{source:OpportunitySource}){
  const guide=guideForOpportunity(source);
  const [question,setQuestion]=useState('');
  const [answer,setAnswer]=useState<SourceAnswer|null>(null);
  const current=isVerificationGuideCurrent();
  function explain(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setAnswer(answerOpportunityQuestion(source.id,question));
  }
  return <details className="min-w-0 rounded-lg border border-cyan-800 bg-slate-900 px-3 py-3"
    aria-label={'Luqi source verification for '+source.title}>
    <summary className="cursor-pointer font-semibold text-cyan-200">How to verify and apply with Luqi</summary>
    <div className="mt-3 space-y-4 text-sm">
      <p className="text-slate-200">The official page below is a source or dated notice, not a verified individual vacancy or eligibility decision. This guide does not submit an application or check your identity.</p>
      <section className="space-y-2" aria-label="Verify the original opportunity">
        <h4 className="font-semibold">1. Verify the original opportunity</h4>
        <ol className="list-inside list-decimal space-y-2 text-slate-200">
          {guide.verify.map(step=><li key={step}>{step}</li>)}
        </ol>
      </section>
      {!current&&<p role="alert" className="text-amber-200">The source-specific instructions require review after {VERIFICATION_GUIDE_RECHECK_AFTER}. Check the original publisher directly. Local tailored answers are paused.</p>}
      {current&&<>
        <section className="space-y-2" aria-label="Requirements and documents">
          <h4 className="font-semibold">2. Check eligibility and documents</h4>
          <p className="text-slate-200">{guide.eligibility}</p>
          <p className="text-slate-200">{guide.documents}</p>
        </section>
        <section className="space-y-2" aria-label="Official application steps">
          <h4 className="font-semibold">3. Apply through the real publisher</h4>
          <ol className="list-inside list-decimal space-y-2 text-slate-200">
            {guide.applicationSteps.map(step=><li key={step}>{step}</li>)}
          </ol>
        </section>
      </>}
      <section className="space-y-2" aria-label="Avoid job and funding scams">
        <h4 className="font-semibold">4. Protect yourself from scams</h4>
        <ul className="list-inside list-disc space-y-2 text-slate-200">
          {guide.redFlags.map(step=><li key={step}>{step}</li>)}
        </ul>
      </section>
      <section className="space-y-2" aria-label="Luqi answers from reviewed steps">
        <h4 className="font-semibold">Ask Luqi about this source</h4>
        <p className="text-xs text-slate-300">Ask about deadlines, eligibility, documents, scams or how to apply. This is source-grounded, rule-based guidance, not a live AI search, a personal assessment or a legal decision.</p>
        <form onSubmit={explain} className="space-y-2">
          <label className="block">Your question (no IDs or contact details)
            <input type="text" autoComplete="off" maxLength={MAX_SOURCE_QUESTION} value={question}
              onChange={e=>{setQuestion(e.target.value);setAnswer(null)}}
              placeholder="How do I apply? Can I trust this advert?"
              className="mt-1 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 px-3 py-2 text-white"/>
          </label>
          <button disabled={!current||question.trim().length===0} type="submit"
            className="rounded-lg border border-cyan-400 px-3 py-2 font-semibold text-cyan-100 disabled:opacity-50">
            Luqi, explain the verified steps
          </button>
        </form>
        {answer&&<div role="status" className="space-y-2 rounded-lg border border-slate-500 p-3">
          <p className="font-semibold">Luqi answer · reviewed {answer.reviewedOn}</p>
          <p className="text-slate-100">{answer.answer}</p>
          <p className="text-xs text-amber-200">Original notice check still required. Luqi has not verified that an individual opportunity is open.</p>
          <a href={answer.originalSource.url} target="_blank" rel="noopener noreferrer" className="break-words text-cyan-200 underline">Check the official source for this answer</a>
        </div>}
      </section>
      <section className="space-y-2" aria-label="Underlying government and funding guidance">
        <h4 className="font-semibold">Primary source links</h4>
        <a href={guide.officialUrl} target="_blank" rel="noopener noreferrer" className="block break-words text-cyan-200 underline">Original: {guide.title}</a>
        {guide.extraOfficialSources.map(entry=><a key={entry.url} href={entry.url} target="_blank" rel="noopener noreferrer" className="block break-words text-cyan-200 underline">{entry.name}</a>)}
        <p className="text-xs text-slate-300">Detailed guidance reviewed {guide.reviewedOn}. Always prefer the specific department or programme notice, whose conditions can change.</p>
      </section>
      <p className="text-xs text-slate-300">For nuanced questions beyond this verified source guide, <Link to="/chat" className="text-cyan-200 underline">use the existing Luqi Chat</Link> with its normal provider consent and allowance. Chat does not independently browse official live adverts.</p>
    </div>
  </details>;
}
