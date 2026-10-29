import {useState} from 'react';
import {PROVINCES,type ProvinceCode} from '../lib/opportunity-sources';
import {VERIFIED_GOVERNMENT_ADVERTS,assessGovernmentJobStatus,isJobNoticeReviewFresh,
 matchGovernmentAdverts,type GovernmentJobNotice,type JobLevelFilter} from '../lib/government-job-notices';
import type {IndividualNoticeCheck,IndividualNoticeSnapshot} from '../../api/services/opportunityNoticeWatcher';

const allowedStates=new Set(['reference-and-deadline-found','content-unconfirmed','publisher-unavailable','withdrawn']);
function validatedSnapshot(data:unknown):IndividualNoticeSnapshot{
 if(!data||typeof data!=='object')throw Error('INVALID_NOTICE_CHECK');
 const d=data as IndividualNoticeSnapshot;
 if(d.scope!=='fixed_official_individual_adverts_only'||!Number.isFinite(Date.parse(d.checkedAt))||
   !Array.isArray(d.checks)||d.checks.length!==VERIFIED_GOVERNMENT_ADVERTS.length)throw Error('INVALID_NOTICE_CHECK');
 const ids=new Set<string>();
 for(const c of d.checks){
   const known=VERIFIED_GOVERNMENT_ADVERTS.find(v=>v.id===c?.id);
   if(!known||ids.has(c.id)||c.reference!==known.reference||
     !allowedStates.has(c.state)||c.note!=='text_evidence_only_not_live_availability')throw Error('INVALID_NOTICE_CHECK');
   ids.add(c.id);
 }
 return d;
}
export default function VerifiedGovernmentJobsPanel({province}:{province:ProvinceCode|null}){
 const [level,setLevel]=useState<JobLevelFilter>('all');
 const [keyword,setKeyword]=useState('');
 const [includeHistory,setIncludeHistory]=useState(false);
 const [snapshot,setSnapshot]=useState<IndividualNoticeSnapshot|null>(null);
 const [working,setWorking]=useState(false),[notice,setNotice]=useState('');
 const now=new Date();
 const jobs=matchGovernmentAdverts({province,level,query:keyword,includeHistory,now});
 const provinceName=PROVINCES.find(x=>x.id===province)?.name||'all South African provinces';
 async function recheck(){
   if(working)return;setWorking(true);setNotice('Checking fixed official job pages. A matching advert is not proof that recruitment remains open.');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
   try{
     const response=await fetch('/api/v1/opportunity-watch/notices',{method:'GET',credentials:'omit',
       redirect:'error',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
     if(!response.ok)throw Error('publisher-check failed');
     const data=validatedSnapshot(await response.json());
     setSnapshot(data);
     setNotice('Publisher text check complete. Read each original advert, confirm no withdrawal, and follow its instructions. Text matches alone do not guarantee an active vacancy.');
   }catch{
     setSnapshot(null);
     setNotice('Individual official page checks could not be confirmed. Use the original employer links; no opportunity has been certified active.');
   }finally{clearTimeout(timer);setWorking(false);}
 }
 return <section className="space-y-4 rounded-xl border border-cyan-700 bg-slate-900 p-4" aria-label="Individual government job matches">
  <div className="space-y-2">
   <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">Luqi verified-source job board · first pilot</p>
   <h2 className="text-2xl font-semibold">Real government adverts, with references</h2>
   <p className="text-sm text-slate-200">Individual notices copied only from original government publishers, reviewed 29 October 2026. This is a limited curated set, not every government vacancy. No official application is sent through Luqi and we do not determine anyone's eligibility.</p>
   <p className="text-xs text-amber-200">Important: a published advert may be closed or withdrawn without the original page disappearing. No listing here should be treated as a guaranteed open vacancy. Always recheck with the advertising department.</p>
  </div>
  <div className="grid gap-3 sm:grid-cols-3">
   <label className="text-sm">Published province
    <output className="mt-2 block rounded-lg border border-slate-500 bg-slate-950 p-3 text-white">{provinceName}</output>
   </label>
   <label className="text-sm">Advertised education requirement
    <select aria-label="Advertised education requirement" className="mt-2 block w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-white"
     value={level} onChange={e=>setLevel(e.target.value as JobLevelFilter)}>
     <option value="all">All listed levels</option><option value="grade12">Grade 12 listed</option><option value="tertiary">Tertiary qualification listed</option>
    </select>
   </label>
   <label className="text-sm">Search a post or reference
    <input aria-label="Search government advert references" value={keyword} maxLength={100}
     onChange={e=>setKeyword(e.target.value)} placeholder="Clerk, ICT, Carletonville…"
     className="mt-2 block w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-white"/>
   </label>
  </div>
  <p className="text-xs text-slate-300">Location is from the advertised province/centre, not a GPS position. A Grade 12 filter matches the advert's stated minimum qualification, not your personal eligibility.</p>
  <label className="flex items-start gap-2 text-sm">
   <input type="checkbox" checked={includeHistory} onChange={e=>setIncludeHistory(e.target.checked)}/>
   Include withdrawn posts and passed deadlines for transparency
  </label>
  <div className="flex flex-wrap items-center gap-3">
   <button type="button" onClick={()=>{void recheck()}} disabled={working}
    className="rounded-lg border border-cyan-400 bg-cyan-950 px-4 py-3 font-medium disabled:opacity-50">
    {working?'Checking official adverts…':'Recheck published job notices'}
   </button>
   {snapshot&&<span className="text-xs text-slate-300">Publisher text checked: {new Date(snapshot.checkedAt).toLocaleString('en-ZA')}</span>}
  </div>
  {notice&&<p role="status" className="text-sm text-slate-200">{notice}</p>}
  <p role="status" aria-label="Listed job count" className="font-medium">
   {jobs.length} recorded advert{jobs.length===1?'':'s'} matching {provinceName}
  </p>
  <div className="grid gap-3 sm:grid-cols-2">
   {jobs.map(job=>{
    const status=assessGovernmentJobStatus(job,now);
    const check=snapshot?.checks.find(c=>c.id===job.id);
    const fresh=isJobNoticeReviewFresh(job,now);
    return <article key={job.id} className="min-w-0 space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-4">
     <p className="text-xs font-semibold uppercase text-cyan-300">{job.employer} · {job.province}</p>
     <h3 className="text-lg font-semibold">{job.title}</h3>
     <p className="text-sm">Reference: <strong>{job.reference}</strong> · {job.centre}</p>
     <p className="text-sm text-slate-200">Advertised pay: R{job.annualSalaryZar.toLocaleString('en-ZA')} annually (verify original)</p>
     <p className="text-sm text-slate-200"><strong>Requirements:</strong> {job.requirements}</p>
     <p className="text-xs text-slate-300">{job.experience}</p>
     <p className="text-sm"><strong>Published closing date:</strong> {job.closingDate}
      {job.walkInCutoffSast?' · in-person '+job.walkInCutoffSast+' SAST':''}
      {job.remoteCutoffSast?' · online '+job.remoteCutoffSast+' SAST':''}
      {!job.walkInCutoffSast&&!job.remoteCutoffSast?' · exact cutoff time unconfirmed':''}
     </p>
     {status==='withdrawn'?<p role="note" className="font-semibold text-red-300">Withdrawn by the employer — do not apply.</p>
      :status==='deadline-passed'?<p role="note" className="font-semibold text-amber-200">Published closing date passed. Not an active listing.</p>
      :<p role="note" className="text-amber-200">Published advert; current acceptance status must be confirmed with the employer.</p>}
     {!fresh&&<p role="note" className="text-amber-200">The source review is older than 48 hours; independently reconfirm before acting.</p>}
     <p className="text-xs text-slate-200"><strong>How to apply:</strong> {job.applicationInstructions}</p>
     {check&&<p className="text-xs text-slate-200">Publisher recheck: {check.state==='reference-and-deadline-found'?'Official page contains matching reference and deadline (NOT proof the position is open).':
      check.state==='withdrawn'?'Withdrawal recorded.':
      check.state==='content-unconfirmed'?'Advert details could not be confirmed from the page.':
      'Publisher page unavailable; status unknown.'}</p>}
     <div className="flex flex-wrap gap-3 text-sm">
      <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline">Original government advert</a>
      {job.withdrawnEvidenceUrl&&<a href={job.withdrawnEvidenceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-red-200 underline">Official withdrawal notice</a>}
     </div>
    </article>;
   })}
  </div>
  {!jobs.length&&<p className="rounded-lg border border-slate-600 p-3 text-sm">No currently listed source records match these filters. This is not evidence that your province has no jobs. Try another level, all provinces or the government vacancy directory below.</p>}
 </section>;
}
