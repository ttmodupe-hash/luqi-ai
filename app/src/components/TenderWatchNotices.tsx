import {useState} from 'react';
import {PROVINCES} from '../lib/opportunity-sources';
import {filterPendingTenderWatchNotices,pendingTenderWatchStatus,tenderWatchSastLabel,type TenderWatchStatus} from '../lib/tender-watch-notices';

const statusText:Record<TenderWatchStatus,string>={
 'documents-pending':'Documents pending · not bid-ready',
 'source-review-needed':'Source recheck required · not bid-ready',
 'briefing-passed':'Compulsory briefing has passed · historical for new bidders',
 closed:'Advertised closing time passed · historical only',
 unverified:'Verification unavailable · not bid-ready',
};
const control='mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 px-3 py-2 text-base text-white';

/** Bounded editorial handoff, not a live feed or submission integration. */
export function TenderWatchNotices({now}:{now:Date}){
 const [query,setQuery]=useState('');
 const [province,setProvince]=useState('all');
 const [includeHistory,setIncludeHistory]=useState(false);
 const notices=filterPendingTenderWatchNotices({now,query,province,includeHistory});
 return <section aria-labelledby="tender-watch-handoff-heading" className="min-w-0 space-y-4 rounded-2xl border border-cyan-800 bg-slate-900 p-4 sm:p-5">
  <div className="space-y-2">
   <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Luqi Tender Watch · reviewed handoff</p>
   <h2 id="tender-watch-handoff-heading" className="text-2xl font-semibold">Upcoming procurement · documents pending</h2>
   <p className="max-w-3xl text-sm text-slate-200">Two Dikgatlong advertisements from the 9 November 2026 watch. These are formal civil-works tenders, not small RFQs. Their complete bid books are not yet verified, so neither is presented as a confirmed open or bidder-ready opportunity.</p>
   <p className="text-sm text-amber-200">The latest release recheck could not retrieve the original downloads. The advertisement review is dated 9 November; access failure does not prove cancellation. Check the issuer before incurring costs.</p>
  </div>
  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
   <label className="min-w-0 text-sm">Province for watch notices
    <select className={control} value={province} onChange={e=>setProvince(e.target.value)}>
     <option value="all">All South Africa</option>
     {PROVINCES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
   </label>
   <label className="min-w-0 text-sm">Search watch reference, area or service
    <input type="search" className={control} value={query} onChange={e=>setQuery(e.target.value)} maxLength={100} placeholder="Barkly West, water, T10/2026/27…"/>
   </label>
  </div>
  <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-700 px-3 py-2 text-sm">
   <input type="checkbox" checked={includeHistory} onChange={e=>setIncludeHistory(e.target.checked)}/>
   <span>Include closed watch notices and past compulsory briefings</span>
  </label>
  <p role="status" aria-label="Matched watch notice count" className="text-sm text-slate-300">{notices.length} advertisement{notices.length===1?'':'s'} matching these filters · not verified open opportunities</p>
  <div className="grid min-w-0 gap-4 lg:grid-cols-2">
   {notices.map(n=>{
    const status=pendingTenderWatchStatus(n,now);
    return <article key={n.id} className="min-w-0 space-y-3 break-words rounded-xl border border-slate-700 bg-slate-950 p-4">
     <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{n.type} · {n.category}</p>
     <h3 className="text-lg font-semibold">{n.reference} — {n.title}</h3>
     <p className="text-sm text-slate-300">{n.issuer}<br/>{n.location}</p>
     <p className="rounded-lg border border-amber-700 bg-amber-950/30 p-3 text-sm font-semibold text-amber-200">{statusText[status]}</p>
     <p className="text-sm"><strong>Advertised closing:</strong> {tenderWatchSastLabel(n.closesAt)}</p>
     <p className="text-sm"><strong>Compulsory briefing:</strong> {tenderWatchSastLabel(n.briefingAt)}<br/>{n.briefingVenue}</p>
     <p className="text-sm"><strong>Documents advertised from:</strong> {n.documentsAvailableOn}. Availability and full conditions still require verification.</p>
     <p className="text-sm"><strong>Advertised contractor grade:</strong> CIDB 8CE or higher.</p>
     <p className="text-sm"><strong>Estimated contract value:</strong> not stated.</p>
     <details className="min-w-0 rounded-lg border border-slate-700 p-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-cyan-200">Scope, requirements and how to obtain documents</summary>
      <div className="mt-3 min-w-0 space-y-3 text-sm">
       <p>{n.scope}</p>
       <p><strong>Published:</strong> {n.publishedOn||'not stated'}. <strong>Advertisement reviewed:</strong> {n.advertisementReviewedOn}.</p>
       <p><strong>Advertised conditions:</strong> {n.advertisedConditions}</p>
       <p><strong>Advertised submission:</strong> {n.submission}</p>
       <p><strong>Document fee:</strong> {n.documentFee}</p>
       <p><strong>Next step:</strong> {n.nextStep}</p>
      </div>
     </details>
     <div className="flex flex-wrap gap-3 text-sm font-semibold">
      <a href={n.advertisementUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-cyan-700 px-3 py-2 text-cyan-200 underline">Original advertisement</a>
      <a href={n.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-3 py-2 text-cyan-200 underline">Issuer documents and updates</a>
     </div>
    </article>;
   })}
  </div>
  {!notices.length&&<p className="text-sm text-slate-300">No pending-document advertisement matches these filters. This is not evidence of no procurement opportunities; the official source directory remains below.</p>}
  <p className="text-xs text-slate-300">This is a bounded, manually reviewed watch handoff, not every tender or continuous publishing. Date changes cannot verify documents, extend deadlines, establish eligibility or create an award. No bid submission, fee payment, applicant details or AI request occurs here.</p>
 </section>;
}
