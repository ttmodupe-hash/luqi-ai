import { useState } from 'react';
import { Link } from 'react-router';
import PublisherSignals, { usePublisherSignals } from '../components/PublisherSignals';
import SouthAfricaProvinceMap from '../components/SouthAfricaProvinceMap';
import { matchGovernmentAdverts } from '../lib/government-job-notices';
import OpportunityVerificationPanel from '../components/OpportunityVerificationPanel';
import VerifiedGovernmentJobsPanel from '../components/VerifiedGovernmentJobsPanel';
import {
 CATEGORIES,COUNTRY_ANCHORS,PROVINCES,OPPORTUNITY_REVIEWED_ON,
 deadlineState,matchOpportunitySources,
 type OpportunityCountry,type OpportunityCategory,type OpportunityAudience,type ProvinceCode,
} from '../lib/opportunity-sources';
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
 const signals=usePublisherSignals();
 const {scan,scanMessage,checking,checkPublishers}=signals;
 const results=country==='ZA'?matchOpportunitySources(category,audience,query):[];
 const anchor=COUNTRY_ANCHORS.find(x=>x.id===country)!;
 const today=new Date();
 const provinceCounts=Object.fromEntries(PROVINCES.map(p=>[p.id,matchGovernmentAdverts({province:p.id,level:'all',query:'',includeHistory:false,now:today}).length])) as Record<ProvinceCode,number>;
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
       <select aria-label="Country view" value={country} onChange={e=>{setCountry(e.target.value as OpportunityCountry);setProvince(null);signals.setAuto(false);}}
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
     <SouthAfricaProvinceMap value={province} onSelect={setProvince} counts={provinceCounts} signals={<PublisherSignals signals={signals}/>}/>
     <div id="province-job-board" className="scroll-mt-28"><VerifiedGovernmentJobsPanel province={province}/></div>
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
       {scanMessage&&<p className="text-sm">See the publisher signals in the map above for the check status and timestamp.</p>}
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
