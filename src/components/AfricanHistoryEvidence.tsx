import {useEffect,useState} from 'react';
import {HISTORY_LESSONS,AFRICAN_HISTORY_REVIEWED_ON,AFRICAN_HISTORY_REVIEW_DUE,
 historyIsCurrent,historyClaims,sourcesForClaims,type AfricanHistoryTopic,
 type HistoryClaim} from '../lib/african-history-evidence';
const label=(status:HistoryClaim['status'])=>
 status==='catalogued-object'?'Catalogued object':
 status==='attributed-tradition'?'Attributed religious tradition':'Scholarly reconstruction';
/** Fixed public reading aid within Luqi, without provider calls or user profiling. */
export default function AfricanHistoryEvidence(){
 const [topic,setTopic]=useState<AfricanHistoryTopic>('aksum');
 const [depth,setDepth]=useState(false);
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{
  const refresh=()=>setNow(new Date());
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',visible);
  return ()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};
 },[]);
 const lesson=HISTORY_LESSONS.find(x=>x.id===topic)!;
 const current=historyIsCurrent(now);
 const claims=historyClaims(lesson,now);
 const sources=sourcesForClaims(lesson.claims);
 const select=(id:AfricanHistoryTopic)=>{setTopic(id);setDepth(false);setNow(new Date());};
 return <section aria-label="African history and Islamic scholarship" className="min-w-0 space-y-4 rounded-xl border border-cyan-700 bg-slate-900 p-4 sm:p-5">
  <header className="space-y-2">
   <p className="text-xs font-semibold uppercase text-cyan-300">Luqi · African history & evidence</p>
   <h2 className="text-2xl font-bold">Africa, Islam and intellectual networks</h2>
   <p className="text-sm text-slate-200">Read a short answer, explore context and follow each claim to specific evidence. We distinguish manuscripts, religious traditions and scholarly interpretations, not rank religions or peoples. This is curated reading, not live AI research.</p>
   <p className="text-xs text-slate-300">Substantive source check: {AFRICAN_HISTORY_REVIEWED_ON} · Next review due: {AFRICAN_HISTORY_REVIEW_DUE} · English only, pending independent editorial approval</p>
  </header>
  <div role="group" aria-label="African history questions" className="grid gap-2 sm:grid-cols-2">
   {HISTORY_LESSONS.map(x=><button type="button" key={x.id} aria-pressed={topic===x.id}
    onClick={()=>select(x.id)} className={'min-w-0 rounded-lg border p-3 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 '+(x.id===topic?'border-cyan-300 bg-cyan-900':'border-slate-500 bg-slate-950')}>{x.question}</button>)}
  </div>
  <article aria-label="Selected African history lesson" className="space-y-3 rounded-lg border border-slate-600 bg-slate-950 p-4">
   <h3 className="text-xl font-semibold">{lesson.question}</h3>
   {!current?<p role="alert" className="text-sm text-amber-200">This source review has expired or your device date is invalid. Interpretive teaching is withheld until substantive re-review. Check the source records below directly.</p>:<>
    <p className="text-sm leading-relaxed">{lesson.short}</p>
    <button type="button" aria-expanded={depth} onClick={()=>setDepth(v=>!v)}
      className="rounded-lg border border-cyan-400 p-2 text-sm font-semibold text-cyan-100">{depth?'Hide deeper context':'Explore deeper context'}</button>
    {depth&&<p className="text-sm leading-relaxed text-slate-200">{lesson.deeper}</p>}
    <h4 className="font-semibold">Evidence by claim</h4>
    <ul className="space-y-3">{claims.map(claim=><li key={claim.id} className="space-y-1 rounded-lg border border-slate-700 p-3 text-sm">
     <p className="font-semibold text-cyan-200">{label(claim.status)}</p>
     <p>{claim.statement}</p><p className="text-slate-300">Uncertainty: {claim.uncertainty}</p>
     <div className="flex flex-wrap gap-3">{sourcesForClaims([claim]).map(s=><a key={s.id} href={s.url}
       target="_blank" rel="noopener noreferrer" className="break-words text-cyan-200 underline">Evidence: {s.publisher}</a>)}</div>
    </li>)}</ul>
   </>}
  </article>
  <section aria-label="Original evidence for selected lesson" className="space-y-2">
   <h3 className="text-lg font-semibold">Original objects and specialist scholarship</h3>
   <ul className="space-y-2">{sources.map(s=><li key={s.id} className="space-y-1 rounded-lg border border-slate-700 p-3 text-sm">
    <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-words font-semibold text-cyan-200 underline">{s.title}</a>
    <p className="text-slate-200">{s.publisher} · {s.region}</p>
    <p className="text-slate-300">Specific passage: {s.passage}</p>
    <p className="text-xs text-slate-300">Substantively checked {s.lastSubstantiveCheck} · Review due {s.nextReviewDue}. Link availability alone is not a fact-check.</p>
   </li>)}</ul>
  </section>
  <div className="space-y-2"><h3 className="font-semibold">Continue with a related question</h3>
   <div className="flex flex-wrap gap-2">{lesson.next.map(id=><button type="button" key={id} onClick={()=>select(id)}
    className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-left text-sm text-cyan-100">{HISTORY_LESSONS.find(x=>x.id===id)!.question}</button>)}</div>
  </div>
 </section>;
}
