import {useState} from 'react';
import {Link} from 'react-router';
import {PROVINCES,type ProvinceCode} from '../lib/opportunity-sources';
import {CURATED_TENDER_NOTICES,TENDER_OFFICIAL_SOURCES,TENDER_REVIEWED_ON,
 filterTenders,tenderReviewFresh,tenderStatus,type TenderNotice,type TenderMethod} from '../lib/tender-sources';
import {EMPTY_TENDER_DRAFT,EMPTY_TENDER_APPROVALS,TENDER_HUMAN_GATES,TENDER_DOCUMENT_PROMPTS,TENDER_DRAFT_MAX,
 assessTenderDraft,buildTenderWorksheet,detectTenderDocumentMentions,tenderDraftFileName,
 type TenderDraft,type TenderHumanGate,type TenderHumanApprovals} from '../lib/tender-workflow';

const inputStyle='mt-2 block w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-white';
const fieldStyle='block min-w-0 text-sm text-slate-100';
function saveTextFile(name:string,value:string){
 const blob=new Blob([value],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const anchor=document.createElement('a');
 anchor.href=url;anchor.download=name;document.body.appendChild(anchor);
 anchor.click();anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function ReviewItem({label,checked,onChange}:{label:string;checked:boolean;onChange:(checked:boolean)=>void}){
 return <label className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm">
  <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="mt-1"/>
  <span>{label}</span>
 </label>;
}
export default function TenderDeskPage(){
 const [province,setProvince]=useState<ProvinceCode|null>(null);
 const [query,setQuery]=useState('');
 const [showHistory,setShowHistory]=useState(false);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [draft,setDraft]=useState<TenderDraft>(EMPTY_TENDER_DRAFT);
 const [approvals,setApprovals]=useState<TenderHumanApprovals>(EMPTY_TENDER_APPROVALS);
 const [preview,setPreview]=useState(false);
 const [downloaded,setDownloaded]=useState('');
 const now=new Date();
 const notices=filterTenders({province,query,includeHistory:showHistory,now});
 const chosen=CURATED_TENDER_NOTICES.find(n=>n.id===selectedId)||null;
 const readiness=chosen?assessTenderDraft(chosen,draft,approvals,now):null;
 const notes=detectTenderDocumentMentions(draft.termsExcerpt);
 function pick(notice:TenderNotice){
  setSelectedId(notice.id);
  setDraft({...EMPTY_TENDER_DRAFT,tenderReference:notice.reference||''});
  setApprovals({...EMPTY_TENDER_APPROVALS});
  setPreview(false);setDownloaded('');
  // Explicitly reset customer-entered business details when switching tenders.
 }
 function edit<K extends keyof TenderDraft>(key:K,value:TenderDraft[K]){
  setDraft(prev=>({...prev,[key]:value}));setApprovals(prev=>({...prev,authorisedRelease:false}));setDownloaded('');
 }
 function gate(key:TenderHumanGate,checked:boolean){
  setApprovals(prev=>({...prev,[key]:checked,...(key==='authorisedRelease'?{}:{authorisedRelease:false})}));
  setDownloaded('');
 }
 function download(approved:boolean){
  if(!chosen)return;
  if(approved&&readiness?.status!=='ready-for-manual-submission')return;
  const content=buildTenderWorksheet(chosen,draft,approvals,new Date());
  saveTextFile(tenderDraftFileName(chosen),content);
  setDownloaded(approved?'Reviewed preparation pack exported. Nothing was sent to any tender portal.':
    'Draft worksheet saved on this device. It is not approved or submitted.');
 }
 return <main className="mx-auto max-w-6xl space-y-6 px-3 py-7 text-slate-100 sm:px-6 sm:py-10" aria-labelledby="tender-desk-heading">
  <header className="space-y-3">
   <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Luqi tender desk · South Africa first · Free local preparation</p>
   <h1 id="tender-desk-heading" className="text-3xl font-bold sm:text-4xl">Find tenders. Prepare with Luqi. You stay in control.</h1>
   <p className="max-w-4xl text-slate-200">Discover official public procurement notices and prepare a bidder-controlled draft worksheet for the real tender documents. Luqi automates preparation steps on your device; your review, declarations, pricing, authorisation and final submission cannot be bypassed.</p>
   <p className="text-sm text-amber-200">No government affiliation or automatic tender submission. This first release does not read/complete a proprietary PDF, log into CSD/eTenders, forge a signature or upload a bid. Never enter passwords, OTPs, bank details, identity numbers or tax PINs into Luqi.</p>
   <div className="flex flex-wrap gap-4 text-sm">
    <Link to="/opportunities" className="text-cyan-200 underline">Jobs and bursaries</Link>
    <Link to="/business-desk" className="text-cyan-200 underline">Business quotation tools</Link>
    <Link to="/chat" className="text-cyan-200 underline">Ask Luqi for general business advice</Link>
   </div>
  </header>
  <section aria-label="Official tender discovery sources" className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4">
   <h2 className="text-xl font-semibold">Find tenders through official publishers</h2>
   <p className="text-sm text-slate-300">National Treasury eTenders supports current tender search by province, buyer, category and eSubmission availability. Its dynamic listing changes: the curated notices below are dated examples, not a live inventory or guarantee of availability.</p>
   <div className="grid gap-3 sm:grid-cols-2">
    {TENDER_OFFICIAL_SOURCES.map(source=><article key={source.id} className="space-y-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
     <h3 className="font-semibold">{source.name}</h3>
     <p className="text-xs text-slate-300">{source.description}</p>
     <a href={source.url} target="_blank" rel="noopener noreferrer" className="break-words text-sm text-cyan-200 underline">Open official source</a>
    </article>)}
   </div>
  </section>
  <section aria-label="Dated tender opportunities" className="space-y-4 rounded-xl border border-slate-600 bg-slate-900 p-4">
   <div>
    <h2 className="text-xl font-semibold">Reviewed individual tender notices</h2>
    <p className="text-sm text-slate-300">Reviewed {TENDER_REVIEWED_ON}. Confirm the original bid specification, compulsory briefing, any addendum, bid box and exact closing time before spending money or preparing an offer.</p>
   </div>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className={fieldStyle}>Province
     <select aria-label="Tender province" value={province||'all'} onChange={e=>setProvince(e.target.value==='all'?null:e.target.value as ProvinceCode)} className={inputStyle}>
      <option value="all">All South Africa</option>
      {PROVINCES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
     </select>
    </label>
    <label className={fieldStyle}>Search tender description or reference
     <input aria-label="Search tender notices" type="search" value={query} maxLength={100} onChange={e=>setQuery(e.target.value)} className={inputStyle} placeholder="Water, consulting, SASL, bond arranger…"/>
    </label>
   </div>
   <ReviewItem label="Show expired tenders and those with a past compulsory briefing for transparency" checked={showHistory} onChange={setShowHistory}/>
   <p role="status" aria-label="Matched tender count" className="font-medium">{notices.length} source-listed tender{notices.length===1?'':'s'} matching your filters</p>
   <div className="grid gap-3 lg:grid-cols-2">
    {notices.map(n=>{
     const status=tenderStatus(n,now),fresh=tenderReviewFresh(n,now);
     return <article key={n.id} className="min-w-0 space-y-3 rounded-lg border border-slate-700 bg-slate-950 p-4">
      <p className="text-xs font-semibold uppercase text-cyan-300">{n.issuer} · {n.province||'National'} · {n.category}</p>
      <h3 className="text-lg font-semibold">{n.title}</h3>
      <p className="text-sm"><strong>Tender / RFQ:</strong> {n.reference||'Not supplied on issuer index — check original document'}</p>
      <p className="text-sm"><strong>Closing:</strong> {n.deadlineDate}, {n.deadlineTimeSast} South African time</p>
      <p className="text-xs text-slate-300">{n.details}</p>
      {n.specialCondition&&<p className="text-sm text-amber-200">{n.specialCondition}</p>}
      {status==='past-deadline'?<p className="font-semibold text-red-200">Published closing time passed. Historical only.</p>
       :status==='mandatory-briefing-review'?<p className="font-semibold text-red-200">Past compulsory briefing. Verify attendance and eligibility with the issuer before bidding.</p>
       :<p className="text-sm text-amber-200">Source-listed; issuer confirmation required before calling this an active bid.</p>}
      {!fresh&&<p className="text-xs text-amber-200">Reviewed details are over 48 hours old. Recheck the original publisher.</p>}
      <a href={n.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-block break-words text-sm font-semibold text-cyan-200 underline">Read original tender and download issuer documents</a>
      <div><button type="button" onClick={()=>pick(n)} aria-pressed={selectedId===n.id}
       className="rounded-lg border border-cyan-400 px-3 py-2 text-sm font-semibold text-cyan-100">
       Prepare bidder worksheet for this tender</button></div>
     </article>
    })}
   </div>
   {!notices.length&&<p className="text-sm text-slate-300">No reviewed notice matches. This does not mean there are no tenders: use the live National Treasury source above.</p>}
  </section>
  <section aria-label="Luqi assisted tender preparation" className="space-y-4 rounded-xl border border-cyan-700 bg-slate-900 p-4">
   <h2 className="text-xl font-semibold">Luqi bid-preparation assistant</h2>
   <p className="text-sm text-slate-300">Preparation automation: source reference, field-by-field draft, requirements hints, checklist, missing-item checks and locally downloadable worksheet. The applicant must perform meaningful approvals—not a token “10%” click. No remote submission connection exists in this release.</p>
   {!chosen?<p className="rounded-lg border border-slate-600 p-3 text-sm">Choose an official tender above to begin an assisted preparation worksheet. Your work stays in this browser tab and is not saved to Luqi servers.</p>:<>
    <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm">
     <p className="font-semibold">{chosen.title}</p>
     <p>{chosen.issuer} · {chosen.reference||'Reference to confirm'} · {chosen.deadlineDate} {chosen.deadlineTimeSast} SAST</p>
     <p className="text-xs text-amber-200">Luqi does not guarantee an open tender, bidder eligibility or acceptance of this worksheet as an official form.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className={fieldStyle}>Supplier trading name (do not enter registration IDs)
      <input aria-label="Bidder trading name" maxLength={160} value={draft.supplierName} onChange={e=>edit('supplierName',e.target.value)} className={inputStyle}/>
     </label>
     <label className={fieldStyle}>Reference copied from original tender document
      <input aria-label="Official tender reference" maxLength={100} value={draft.tenderReference} onChange={e=>edit('tenderReference',e.target.value)} className={inputStyle}/>
     </label>
    </div>
    {([
     ['scopeResponse','Your truthful response to the tender scope'],
     ['deliveryApproach','How you propose to deliver the work'],
     ['pastExperience','Actual related experience you can substantiate'],
     ['pricingSummary','Pricing assumptions, exclusions and tax basis for review'],
     ['keyDocuments','Supporting documents and items still required'],
     ['termsExcerpt','Optional public extract of original specifications (no private details)'],
    ] as const).map(([key,label])=><label className={fieldStyle} key={key}>{label}
     <textarea aria-label={label} rows={key==='termsExcerpt'?4:3} maxLength={key==='termsExcerpt'?TENDER_DRAFT_MAX:2000}
      value={draft[key]} onChange={e=>edit(key,e.target.value)}
      className={inputStyle} placeholder={key==='termsExcerpt'?'Paste only a public excerpt from the actual tender. Never paste confidential supplier details.':'Enter accurate information only. The original issuer forms remain authoritative.'}/>
    </label>)}
    {notes.length>0&&<p role="status" className="text-xs text-cyan-200">Possible specification mentions: {notes.join(', ')}. Confirm each requirement in the original PDF; this simple local check cannot establish completeness.</p>}
    <div className="grid gap-3 sm:grid-cols-2">
     <label className={fieldStyle}>Total offered amount in ZAR (applicant enters; not estimated by Luqi)
      <input aria-label="Bid price in rand" inputMode="decimal" maxLength={18} value={draft.offeredTotalZar}
       onChange={e=>edit('offeredTotalZar',e.target.value)} className={inputStyle} placeholder="e.g. 125000.00"/>
     </label>
     <label className={fieldStyle}>Exact submission method from original notice
      <select aria-label="Confirmed tender submission method" value={draft.submissionMethod}
       onChange={e=>edit('submissionMethod',e.target.value as TenderMethod)} className={inputStyle}>
       <option value="confirm-original">Not yet confirmed</option>
       <option value="portal">Official electronic portal</option>
       <option value="physical">Physical sealed bid / tender box</option>
       <option value="email">Issuer-prescribed email</option>
      </select>
     </label>
    </div>
    <section aria-label="Required tender documents checklist" className="space-y-2">
     <h3 className="text-lg font-semibold">Official forms and evidence to check</h3>
     <p className="text-xs text-slate-300">This is a preparation checklist only, not automatically completed official SBD/MBD forms.</p>
     {TENDER_DOCUMENT_PROMPTS.map(item=><div key={item.label} className="rounded-lg border border-slate-700 p-3">
      <p className="text-sm font-semibold">{item.label}</p>
      <p className="text-xs text-slate-300">{item.note}</p>
     </div>)}
    </section>
    <section aria-label="Mandatory human tender approvals" className="space-y-3">
     <h3 className="text-lg font-semibold">Human accountability — cannot be bypassed</h3>
     <p className="text-sm text-slate-300">Luqi helps prepare, but the real applicant or authorised representative personally verifies these facts and the final bid. Approval here is not a legal electronic signature.</p>
     {TENDER_HUMAN_GATES.map(g=><ReviewItem key={g.key} label={g.label} checked={approvals[g.key]} onChange={v=>gate(g.key,v)}/>)}
    </section>
    <div className="space-y-3 rounded-lg border border-slate-600 bg-slate-950 p-3">
     <h3 className="font-semibold">Readiness for manual submission</h3>
     <p role="status" aria-label="Tender preparation readiness" className="font-semibold">{readiness?.status==='ready-for-manual-submission'?'Human-reviewed preparation pack ready to export':readiness?.status==='check-briefing'?'Past compulsory briefing: eligibility confirmation required':readiness?.status==='withdrawn-or-expired'?'Published deadline has passed':'Preparation incomplete or human review outstanding'}</p>
     {readiness&&readiness.missing.length>0&&<ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
      {readiness.missing.map(x=><li key={x}>{x}</li>)}
     </ul>}
     <div className="flex flex-wrap gap-3">
      <button type="button" onClick={()=>setPreview(v=>!v)}
       className="rounded-lg border border-slate-400 px-4 py-2 text-sm font-medium">
       {preview?'Hide local draft preview':'Preview bid preparation worksheet'}</button>
      <button type="button" onClick={()=>download(false)}
       className="rounded-lg border border-cyan-500 px-4 py-2 text-sm font-medium">
       Download draft worksheet (.txt)</button>
      <button type="button" disabled={readiness?.status!=='ready-for-manual-submission'} onClick={()=>download(true)}
       className="rounded-lg border border-cyan-400 bg-cyan-950 px-4 py-2 text-sm font-medium disabled:opacity-50">
       Export human-approved preparation pack</button>
     </div>
     {downloaded&&<p role="status" className="text-sm text-cyan-200">{downloaded}</p>}
     {preview&&<pre role="region" aria-label="Local tender worksheet preview" className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded border border-slate-700 p-3 text-xs text-slate-200">
      {buildTenderWorksheet(chosen,draft,approvals,now)}
     </pre>}
     <p className="text-xs text-slate-300">An exported local worksheet is not the actual SBD/MBD document. The real applicant completes the issuer-provided forms and uses its approved portal, email or physical bid box. Luqi does not transmit your bid or sign any declarations.</p>
    </div>
    <div><a href={chosen.officialUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline">
      Open original authority's tender instructions for final manual submission</a></div>
   </>}
  </section>
  <footer className="text-sm text-slate-300">Source listings reviewed {TENDER_REVIEWED_ON}. Luqi does not store or send the data entered in this page. No tender application has been sent.</footer>
 </main>;
}
