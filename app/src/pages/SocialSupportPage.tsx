import { useEffect,useState } from 'react';
import { Link } from 'react-router';
import { SOCIAL_SUPPORT_REVIEWED_ON, SOCIAL_SUPPORT_TOPICS, isSocialSupportReviewFresh,
 listSupportTopics, supportTopic, type SupportAgency } from '../lib/social-support-sources';

/** Free, on-device public information. No identity forms, government integration or provider call. */
export default function SocialSupportPage({defaultAgency='sassa'}:{defaultAgency?:SupportAgency}){
 const [agency,setAgency]=useState<SupportAgency>(defaultAgency);
 const [selected,setSelected]=useState(defaultAgency==='uif'?'uif-unemployed':'sassa-srd');
 useEffect(()=>{
   setAgency(defaultAgency);
   setSelected(defaultAgency==='uif'?'uif-unemployed':'sassa-srd');
 },[defaultAgency]);
 const current=supportTopic(selected);
 const active=current?.agency===agency?current:listSupportTopics(agency)[0];
 const fresh=isSocialSupportReviewFresh(new Date());
 function changeAgency(next:SupportAgency){
   setAgency(next);setSelected(next==='uif'?'uif-unemployed':'sassa-srd');
 }
 return <main className="mx-auto max-w-6xl min-w-0 space-y-6 px-3 py-7 text-slate-100 sm:px-6 sm:py-10" aria-labelledby="social-support-heading">
  <header className="space-y-3">
   <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Luqi public support · South Africa · Free</p>
   <h1 id="social-support-heading" className="text-3xl font-bold sm:text-4xl">SASSA grants and UIF claims support</h1>
   <p className="max-w-3xl text-slate-200">Understand the official steps, find the correct government portal and check how to ask for help. Choose a service; Luqi will not ask for an ID, password, OTP, bank information, medical record or claim number.</p>
   <p className="rounded-lg border border-amber-600 bg-slate-900 p-3 text-sm text-amber-100">This is independently prepared public information, not a government service or a decision about eligibility. Luqi cannot submit a SASSA application, claim UIF, check a private status or guarantee a payout. Complete sensitive steps ONLY on official government portals or through a government office.</p>
  </header>
  <section aria-label="Government assistance choice" className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
   <h2 className="text-xl font-semibold">Which service do you need?</h2>
   <div className="grid grid-cols-2 gap-3" role="group" aria-label="Support agency">
    <button type="button" aria-pressed={agency==='sassa'} onClick={()=>changeAgency('sassa')}
     className={'min-w-0 rounded-xl border px-3 py-4 text-center font-semibold '+(agency==='sassa'?'border-cyan-300 bg-cyan-950 text-white':'border-slate-500 bg-slate-950 text-slate-200')}>SASSA grants</button>
    <button type="button" aria-pressed={agency==='uif'} onClick={()=>changeAgency('uif')}
     className={'min-w-0 rounded-xl border px-3 py-4 text-center font-semibold '+(agency==='uif'?'border-cyan-300 bg-cyan-950 text-white':'border-slate-500 bg-slate-950 text-slate-200')}>UIF benefits</button>
   </div>
   <label className="block max-w-2xl text-sm font-medium">Select a question or benefit
    <select aria-label="Help topic" value={active?.id??''} onChange={e=>setSelected(e.target.value)}
     className="mt-2 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-white">
     {listSupportTopics(agency).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
    </select>
   </label>
   <p className="text-xs text-slate-300">Original guidance reviewed {SOCIAL_SUPPORT_REVIEWED_ON} · source check recommended after 7 days · no automatic personal-account lookup.</p>
   {!fresh&&<p role="note" className="rounded-lg border border-amber-500 p-3 text-sm text-amber-200">These summaries are past their review window. Please verify every requirement and submission channel on the original agency website before acting.</p>}
  </section>
  {active&&<section key={active.id} aria-label="Chosen official support guidance" className="space-y-5 rounded-xl border border-cyan-700 bg-slate-900 p-4 sm:p-6">
   <div className="space-y-2">
    <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">{active.agency==='sassa'?'South African Social Security Agency':'Unemployment Insurance Fund'}</p>
    <h2 className="text-2xl font-bold">{active.title}</h2>
    <p className="text-slate-200">{active.summary}</p>
   </div>
   <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
    <h3 className="mb-2 text-lg font-semibold">What the official eligibility rules say</h3>
    <p className="text-sm text-slate-200">{active.requirements}</p>
    <p className="mt-2 text-xs text-amber-200">This is not an eligibility assessment; conditions, rates and deadlines can change.</p>
   </div>
   <div>
    <h3 className="text-lg font-semibold">How to proceed safely</h3>
    <ol className="mt-3 list-inside list-decimal space-y-3 text-sm text-slate-200">
     {active.steps.map(step=><li key={step}>{step}</li>)}
    </ol>
   </div>
   {active.important&&<p role="note" className="rounded-lg border border-amber-700 bg-slate-950 p-3 text-sm text-amber-200">{active.important}</p>}
   <div className="space-y-2">
    <h3 className="text-lg font-semibold">Go to the original government source</h3>
    <ul className="space-y-2">{active.sources.map(source=><li key={source.url}>
     <a href={source.url} target="_blank" rel="noopener noreferrer"
      className="inline-block max-w-full break-words rounded text-cyan-200 underline underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">{source.label} (official website)</a>
    </li>)}</ul>
   </div>
  </section>}
  <section aria-label="Safety and help" className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4">
   <h2 className="text-lg font-semibold">Support and fraud protection</h2>
   <div className="grid gap-3 sm:grid-cols-2">
    <p className="text-sm text-slate-200"><strong>SASSA:</strong> 0800 60 10 11. Verify grant rules, decisions, pay dates and appeals through official SASSA channels.</p>
    <p className="text-sm text-slate-200"><strong>UIF:</strong> 0800 030 007. For claims and online-service problems, contact UIF directly or visit a Labour Centre.</p>
   </div>
   <p className="text-sm text-slate-300">Do not pay anyone who promises a grant or UIF approval. Do not share passwords, identity numbers, bank details or OTP codes with Luqi. Government support channels may use identity verification on their own official sites.</p>
   <p className="text-xs text-slate-300">Luqi’s owner receives a separate daily official-source review; this page does not automatically synchronize policy or private claim information.</p>
  </section>
  <nav aria-label="More Luqi services" className="flex flex-wrap gap-4 text-sm">
   <Link className="text-cyan-200 underline" to="/opportunities">Jobs and funding opportunities</Link>
   <Link className="text-cyan-200 underline" to="/chat">Return to Luqi Chat</Link>
   <Link className="text-cyan-200 underline" to="/contact">Luqi support</Link>
  </nav>
  <p className="sr-only">This guide lists {SOCIAL_SUPPORT_TOPICS.length} reviewed support categories and never submits claims.</p>
 </main>;
}
