import { useState } from 'react';
import { Link } from 'react-router';
import OpportunityVerificationPanel from '../components/OpportunityVerificationPanel';
import VerifiedGovernmentJobsPanel from '../components/VerifiedGovernmentJobsPanel';
import {
 CATEGORIES,COUNTRY_ANCHORS,PROVINCES,OPPORTUNITY_REVIEWED_ON,
 deadlineState,matchOpportunitySources,
 type OpportunityCountry,type OpportunityCategory,type OpportunityAudience,type ProvinceCode,
} from '../lib/opportunity-sources';
type Check={id:string;status:'reachable'|'unavailable';checkedAt:string;publication?:string};
type Snapshot={status:'sources_checked';checkedAt:string;scope:'publisher-pages-only';sources:Check[]};
const audienceChoices:{id:OpportunityAudience|'all';label:string}[]=[
 {id:'all',label:'Show all audiences'},{id:'youth',label:'Young people'},
 {id:'graduate',label:'Graduates'},{id:'entrepreneur',label:'Entrepreneurs'},
 {id:'creative',label:'Artists and creators'},{id:'accessibility',label:'Accessibility and inclusion'},
 {id:'everyone',label:'Open-to-explore sources'},
];
export default function OpportunityCompassPage(){
 const [country,setCountry]=useState<OpportunityCountry>('ZA');
 const [province,setProvince]=useState<ProvinceCode|null>(null);
 const [category,setCategory]=useState<OpportunityCategory|'all'>('all');
 const [audience,setAudience]=useState<OpportunityAudience|'all'>('all');
 const [query,setQuery]=useState('');
 const [scan,setScan]=useState<Snapshot|null>(null);
 const [scanMessage,setScanMessage]=useState('');
 const [checking,setChecking]=useState(false);
 const results=country==='ZA'?matchOpportunitySources(category,audience,query):[];
 const chosenProvince=PROVINCES.find(x=>x.id===province);
 const anchor=COUNTRY_ANCHORS.find(x=>x.id===country)!;
 const today=new Date();
 async function checkPublishers(){
   if(checking)return;setChecking(true);setScanMessage('Checking official publisher pages; this does not verify individual vacancies.');
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10_000);
   try {
     const response=await fetch('/api/v1/opportunity-watch',{method:'GET',cache:'no-store',
       credentials:'omit',redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}});
     if(!response.ok)throw Error('Source monitor unavailable');
     const value:unknown=await response.json();
     if(!value||typeof value!=='object')throw Error('Invalid source monitor reply');
     const data=value as Snapshot;
     if(data.status!=='sources_checked'||data.scope!=='publisher-pages-only'||!Array.isArray(data.sources)||data.sources.length!==3
       ||data.sources.some(x=>!['reachable','unavailable'].includes(x.status)))throw Error('Invalid source monitor reply');
     setScan(data);setScanMessage('Publisher-page check completed. A reachable site does not mean an advertised position is open.');
   }catch{
     setScan(null);setScanMessage('Official source availability could not be confirmed. Open the original agency websites directly.');
   }finally{clearTimeout(timeout);setChecking(false);}
 }
 return <main className="mx-auto max-w-6xl min-w-0 space-y-6 px-3 py-7 text-slate-100 sm:px-6 sm:py-10" aria-labelledby="opportunities-heading">
   <header className="space-y-3">
     <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Luqi opportunities · South Africa first · Free</p>
     <h1 id="opportunities-heading" className="text-3xl font-bold sm:text-4xl">Opportunity Compass — information in your hands</h1>
     <p className="max-w-4xl text-slate-200">Discover official starting points for jobs, graduate programmes, internships, bursaries, business funding, creative sponsorship and public support. No account, private data or paid AI call is needed for this guide.</p>
     <p className="text-sm text-slate-300">Luqi does not employ candidates, guarantee eligibility, submit applications or charge recruitment fees. Verify the exact post, requirements and deadline with its publisher.</p>
   </header>
   <section className="space-y-3 rounded-xl border border-cyan-800 bg-slate-900 p-4" aria-label="Country scope">
     <h2 className="text-lg font-semibold">Country-by-country rollout</h2>
     <label className="block max-w-lg text-sm">Select your country or research view
       <select aria-label="Country view" value={country} onChange={e=>{setCountry(e.target.value as OpportunityCountry);setProvince(null);setScan(null);}}
         className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 px-3 py-3 text-white">
         {COUNTRY_ANCHORS.map(x=><option key={x.id} value={x.id}>{x.flag} {x.name}</option>)}
       </select>
     </label>
     <p className="text-sm text-slate-300">{anchor.status}. Only South Africa has reviewed job, scholarship and funding source listings in this release. Other country links are starting points, not validated opportunity feeds or proof of coverage in all 54 African countries.</p>
     {country!=='ZA'&&<p className="rounded-lg border border-slate-500 p-3 text-sm">
       Opportunities for {anchor.name} have not been sourced and reviewed yet. <a href={anchor.url} target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline">Open the existing official government starting point</a>. Do not rely on South African eligibility or dates for another country.
     </p>}
   </section>
   {country==='ZA'&&<>
     <section className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4" aria-label="Choose a South African province">
       <h2 className="text-xl font-semibold">Explore South Africa by province</h2>
       <p className="text-sm text-slate-300">Choose a province to filter the reviewed individual job notices below, as well as guide your official-source search. This schematic map shows provinces, not exact job-site coordinates or travel routes. Luqi does not read GPS.</p>
       <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-950" style={{aspectRatio:'1.5'}}>
         <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
           <path d="M 9 56 L 16 35 L 28 20 L 47 20 L 53 9 L 68 10 L 72 23 L 91 35 L 90 53 L 82 69 L 67 84 L 50 93 L 30 96 L 21 91 L 17 75 Z" fill="#123a39" stroke="#64b4aa" strokeWidth="1.2"/>
           <path d="M 26 45 L 46 43 L 63 53 L 83 44 M 42 22 L 50 55 L 39 83 M 15 67 L 57 74 L 70 86" fill="none" stroke="#547b70" strokeDasharray="2 2" strokeWidth=".5"/>
         </svg>
         {PROVINCES.map(p=><button key={p.id} type="button" aria-pressed={province===p.id}
           aria-label={'Select '+p.name} title={p.name}
           onClick={()=>setProvince(province===p.id?null:p.id)}
           className={'absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-100 sm:h-10 sm:w-10 sm:text-xs '+
             (province===p.id?'border-white bg-cyan-400 text-slate-950':'border-cyan-300 bg-slate-900 text-white')}
           style={{left:String(p.x)+'%',top:String(p.y)+'%'}}>{p.id}</button>)}
       </div>
       <p role="status" className="text-sm text-cyan-200">{chosenProvince?'Selected '+chosenProvince.name+'. Check provincial posts in the DPSA vacancy circular and search your area in SA Youth.':'No province selected. Showing national starting points for all nine provinces.'}</p>
       {province&&<button type="button" className="rounded border border-slate-500 px-3 py-2 text-sm" onClick={()=>setProvince(null)}>All South Africa</button>}
     </section>
     <VerifiedGovernmentJobsPanel province={province}/>
     <section className="space-y-4 rounded-xl border border-slate-600 bg-slate-900 p-4" aria-label="Find official opportunity sources">
       <h2 className="text-xl font-semibold">Find a trusted starting point</h2>
       <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
         <label className="text-sm">Opportunity category<select aria-label="Opportunity category" value={category}
           onChange={e=>setCategory(e.target.value as OpportunityCategory|'all')}
           className="mt-2 w-full rounded border border-slate-500 bg-slate-950 p-3 text-white">
           <option value="all">All categories</option>{CATEGORIES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
         </select></label>
         <label className="text-sm">Who is exploring?<select aria-label="Opportunity audience" value={audience}
           onChange={e=>setAudience(e.target.value as OpportunityAudience|'all')}
           className="mt-2 w-full rounded border border-slate-500 bg-slate-950 p-3 text-white">
           {audienceChoices.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
         </select></label>
         <label className="text-sm">Search official sources<input aria-label="Search opportunity sources" value={query}
           maxLength={100} onChange={e=>setQuery(e.target.value)} placeholder="E.g. graduate, bursary, creative…"
           className="mt-2 w-full rounded border border-slate-500 bg-slate-950 p-3 text-white"/></label>
       </div>
       <p className="text-xs text-slate-300">Audience filters mean a source may be relevant to explore; they do not determine citizenship, age, disability, income, qualification or actual funding eligibility.</p>
       <p role="status">{results.length} official source{results.length===1?'':'s'} matching your selected interests.</p>
       <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
         {results.map(item=><article key={item.id} className="min-w-0 space-y-2 rounded-xl border border-slate-700 bg-slate-950 p-4">
           <p className="text-xs font-semibold uppercase text-cyan-300">{CATEGORIES.find(c=>c.id===item.category)?.label} · {item.organisation}</p>
           <h3 className="text-lg font-semibold">{item.title}</h3><p className="text-sm text-slate-300">{item.summary}</p>
           {item.deadline&&<p className="text-sm font-medium">{deadlineState(item.deadline,today)==='deadline-passed'?'Published deadline has passed':'Dated call — check official deadline'}: {item.deadline}. Verify its official notice before applying.</p>}
           {item.notice&&<p className="text-xs text-amber-200">{item.notice}</p>}
           <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-block break-words text-sm font-semibold text-cyan-200 underline underline-offset-2">Read the official source</a>
           <OpportunityVerificationPanel source={item}/>
         </article>)}
       </div>
       {!results.length&&<p className="text-sm text-slate-300">No curated publisher source matches these filters. That does not mean opportunities do not exist. Try all categories or the national government directory.</p>}
     </section>
     <section className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4" aria-label="Official opportunity source monitor">
       <h2 className="text-xl font-semibold">Luqi Opportunity Watch · publisher check</h2>
       <p className="text-sm">A bounded read-only agent checks whether three trusted publisher pages respond and can identify a circular number if present. It does not scrape personal data, invent vacancies, certify closing dates, rank candidates or submit applications.</p>
       <button type="button" onClick={()=>{void checkPublishers()}} disabled={checking}
         className="rounded-lg border border-cyan-400 bg-cyan-900 px-4 py-3 font-semibold disabled:opacity-50">{checking?'Checking publishers…':'Check official source pages'}</button>
       {scanMessage&&<p role="status" className="text-sm">{scanMessage}</p>}
       {scan&&<div className="space-y-2 text-sm"><p>Last publisher check: {new Date(scan.checkedAt).toLocaleString('en-ZA')}</p>
         {scan.sources.map(s=><p key={s.id}>{s.status==='reachable'?'● Reachable publisher':'○ Publisher check unavailable'}: {s.id}{s.publication?' · '+s.publication:''}</p>)}
       </div>}
       <p className="text-xs text-slate-300">Reviewed source directory: {OPPORTUNITY_REVIEWED_ON}. Publisher reachability is not confirmation of an open job, bursary or sponsorship.</p>
     </section>
     <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-900 p-4">
       <h2 className="text-lg font-semibold">Prepare with Luqi, apply through the real provider</h2>
       <p className="text-sm">Public service jobs generally require the latest Z83 and CV and may have different post requirements. Keep your documents private. Verify offers through the official agency; never pay someone privately to secure a government vacancy.</p>
       <div className="flex flex-wrap gap-4 text-sm"><Link to="/chat" className="text-cyan-200 underline">Use Luqi Chat to prepare a CV or interview</Link><Link to="/p2p" className="text-cyan-200 underline">Community chat and private circles</Link><Link to="/consumer-rights" className="text-cyan-200 underline">Consumer rights</Link></div>
     </section>
   </>}
 </main>;
}
