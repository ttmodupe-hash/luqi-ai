import {useState} from 'react';
import {Link} from 'react-router';
import {filterMunicipalities,MUNICIPAL_DIRECTORY_URL,PROVINCE_NAMES} from '../lib/municipal-economy';
import {TOWNSHIP_GOALS,TOWNSHIP_OFFICIAL_SOURCES,TOWNSHIP_REVIEWED_ON,TOWNSHIP_SECTORS,
 buildTownshipActionPlan,isTownshipReviewFresh,townshipActionPlanText,
 type TownshipGoal,type TownshipSector} from '../lib/township-economy';
import type{ProvinceCode}from '../lib/opportunity-sources';

const inputClass='mt-2 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-white';
export default function TownshipEconomyPage(){
 const[sector,setSector]=useState<TownshipSector>('spaza');
 const[goal,setGoal]=useState<TownshipGoal>('funding');
 const[province,setProvince]=useState<ProvinceCode|'all'>('all');
 const[municipality,setMunicipality]=useState('');
 const[notice,setNotice]=useState('');
 const known=filterMunicipalities(province==='all'?null:province,'',270);
 const shown=province==='all'?known.filter(x=>x.type==='metropolitan'):known;
 const plan=buildTownshipActionPlan(sector,goal,municipality);
 function savePlan(){
  const text=townshipActionPlanText(sector,goal,municipality);
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='luqi-township-enterprise-plan.txt';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setNotice('Action plan saved on this device. This is not a funding application, permit or submission.');
 }
 return <main className="mx-auto max-w-6xl min-w-0 space-y-6 px-3 py-7 text-slate-100 sm:px-6 sm:py-10" aria-labelledby="township-economy-heading">
  <header className="space-y-3">
   <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Luqi · Township and rural economy · South Africa · Free</p>
   <h1 id="township-economy-heading" className="text-3xl font-bold sm:text-4xl">Build your business. Find the right official support.</h1>
   <p className="max-w-4xl text-slate-200">Practical steps for spaza shops, market traders, township manufacturers, salons, artisans and rural businesses. Choose what you do and what you need: Luqi creates an on-device checklist and points you to the original municipality and enterprise-support sources.</p>
   <p className="rounded-lg border border-amber-600 bg-slate-900 p-3 text-sm text-amber-100">No promise of funding, approved trading licence or government partnership. This is not a registered lender or financial advisor. Never enter company passwords, tax PINs, ID numbers, bank details or proprietary business accounts into Luqi. Check official programme windows and repayable loan terms before applying.</p>
  </header>
  <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4" aria-label="Township business planner">
   <h2 className="text-xl font-semibold">Prepare your next business step</h2>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="block text-sm font-medium">Your business activity
     <select aria-label="Township business sector" value={sector} onChange={e=>{setSector(e.target.value as TownshipSector);setNotice('');}} className={inputClass}>
      {TOWNSHIP_SECTORS.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
     </select>
    </label>
    <label className="block text-sm font-medium">What you want to do
     <select aria-label="Township support goal" value={goal} onChange={e=>{setGoal(e.target.value as TownshipGoal);setNotice('');}} className={inputClass}>
      {TOWNSHIP_GOALS.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}
     </select>
    </label>
    <label className="block text-sm font-medium">Province, if you know it
     <select aria-label="Business province" value={province} onChange={e=>{setProvince(e.target.value as ProvinceCode|'all');setMunicipality('');setNotice('');}} className={inputClass}>
      <option value="all">Select a municipality from metros or choose a province</option>
      {Object.entries(PROVINCE_NAMES).map(([code,name])=><option key={code} value={code}>{name}</option>)}
     </select>
    </label>
    <label className="block text-sm font-medium">Municipality (optional)
     <select aria-label="Business municipality" value={municipality} onChange={e=>{setMunicipality(e.target.value);setNotice('');}} className={inputClass}>
      <option value="">Not yet selected — I will verify</option>
      {shown.map(m=><option key={m.province+m.name} value={m.name}>{m.name} · {PROVINCE_NAMES[m.province]}</option>)}
     </select>
    </label>
   </div>
   <p className="text-xs text-slate-300">The region is user-selected, not inferred from GPS or a household profile. Municipal boundaries and business permissions must be confirmed with the responsible council.</p>
   <div className="space-y-3 rounded-lg border border-cyan-700 bg-slate-950 p-4">
    <h3 className="text-lg font-semibold">Your practical action plan</h3>
    <p className="text-sm text-slate-300">{TOWNSHIP_SECTORS.find(x=>x.id===sector)?.extra}</p>
    <ol className="list-inside list-decimal space-y-3 text-sm text-slate-200">
     {plan.map(step=><li key={step}>{step}</li>)}
    </ol>
    <button type="button" onClick={savePlan}
     className="rounded-lg border border-cyan-400 bg-cyan-950 px-4 py-3 text-sm font-semibold">Download my private action plan</button>
    {notice&&<p role="status" className="text-xs text-cyan-200">{notice}</p>}
    <p className="text-xs text-slate-400">Exported as plain text, generated locally. Luqi does not transmit the plan or automatically apply.</p>
   </div>
  </section>
  <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4" aria-label="Township official programmes">
   <h2 className="text-xl font-semibold">Official programmes and tools</h2>
   <p className="text-sm text-slate-200">An issuer describing a funding scheme is not evidence that a new intake is open. Do not treat an announced maximum as a grant, a personal offer or an award. Verify each programme’s current application form, legal conditions and closing dates.</p>
   <p className="text-xs text-slate-300">Original sources manually reviewed {TOWNSHIP_REVIEWED_ON}. {isTownshipReviewFresh(new Date())?'':'The programme review window has passed — do not rely on the summary without checking the original source.'}</p>
   <div className="grid gap-3 md:grid-cols-2">{TOWNSHIP_OFFICIAL_SOURCES.map(source=>
    <article key={source.id} className="min-w-0 space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-4">
     <p className="text-xs font-semibold text-cyan-300">{source.issuer}</p>
     <h3 className="font-semibold">{source.title}</h3>
     <p className="text-sm text-slate-200">{source.summary}</p>
     <p className="text-xs text-amber-200">{source.status==='confirm-current-window'?'Check the original issuer for a currently open individual opportunity.':'Standing government guidance: confirm current requirements.'}</p>
     <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-block break-words text-sm text-cyan-200 underline">Open original official source</a>
    </article>)}</div>
  </section>
  <section className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4">
   <h2 className="text-lg font-semibold">Local permits are different from national business registration</h2>
   <p className="text-sm text-slate-200">A spaza shop registration receipt does not automatically mean the municipality has issued a trading permit. Food businesses may also need health compliance and planning permission. Some schemes require CIPC registration while other informal-business support schemes use different thresholds or transitional rules.</p>
   <p className="text-sm text-slate-300">For example, the City of Tshwane publishes a trade-licence process, while Cape Town separately describes business licences and informal-trading permits. Always follow the by-laws for the chosen municipality.</p>
   <a href={MUNICIPAL_DIRECTORY_URL} target="_blank" rel="noopener noreferrer" className="inline-block break-words text-sm text-cyan-200 underline">Check the official municipality directory</a>
   <div className="flex flex-wrap gap-4 text-sm">
    <Link to="/municipalities" className="text-cyan-200 underline">Municipal services and permits</Link>
    <Link to="/tenders" className="text-cyan-200 underline">Find public tenders</Link>
    <Link to="/business-desk" className="text-cyan-200 underline">Prepare a business quote</Link>
    <Link to="/opportunities" className="text-cyan-200 underline">Youth and funding opportunities</Link>
   </div>
  </section>
 </main>;
}
