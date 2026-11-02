import {useState} from 'react';
import {Link,useSearchParams} from 'react-router';
import {parseProvince} from '../lib/nearby-discovery';
import {MUNICIPAL_DIRECTORY_URL,MUNICIPALITIES,MUNICIPAL_REVIEWED_ON,MUNICIPAL_SERVICES,
 MUNICIPAL_SERVICE_URL,LOCAL_GOVERNMENT_URL,PROVINCE_NAMES,filterMunicipalities,
 isMunicipalReviewFresh,type Municipality,type MunicipalServiceKey} from '../lib/municipal-economy';
import type{ProvinceCode}from '../lib/opportunity-sources';

const style='mt-2 block w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-white';
export default function MunicipalServicesPage(){
 const[params]=useSearchParams();
 const[province,setProvince]=useState<ProvinceCode|'all'>(()=>parseProvince(params.get('province'))??'all');
 const[search,setSearch]=useState('');
 const[chosen,setChosen]=useState<Municipality|null>(null);
 const[showCount,setShowCount]=useState(15);
 const[topic,setTopic]=useState<MunicipalServiceKey>('trade-licence');
 const[downloadMessage,setDownloadMessage]=useState('');
 const matching=filterMunicipalities(province==='all'?null:province,search,270);
 const candidates=province==='all'&&!search.trim()?matching.filter(m=>m.type==='metropolitan'):matching;
 const shown=candidates.slice(0,showCount);
 const service=MUNICIPAL_SERVICES.find(s=>s.id===topic)!;
 const selectedOfficial=chosen?'Municipality: '+chosen.name+' ('+PROVINCE_NAMES[chosen.province]+')':'Municipality: choose the responsible council on the official directory';
 const draft=['Luqi municipal service checklist — '+MUNICIPAL_REVIEWED_ON,
  selectedOfficial,'Reason: '+service.title,'',
  ...service.steps.map((step,index)=>(index+1)+'. '+step),'',
  'Official national directory: '+MUNICIPAL_DIRECTORY_URL,
  'Not sent to a municipality. No account numbers or private documents included.'].join('\n');
 function saveChecklist(){
  // One-time browser download; no network, customer profile or personal documents.
  const blob=new Blob([draft],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='luqi-municipal-checklist.txt';
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setDownloadMessage('Checklist created on your device. This is not a submitted service request.');
 }
 return <main className="mx-auto max-w-6xl min-w-0 space-y-6 px-3 py-7 text-slate-100 sm:px-6 sm:py-10" aria-labelledby="municipal-heading">
  <header className="space-y-3">
   <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Luqi municipal services · South Africa · Free</p>
   <h1 id="municipal-heading" className="text-3xl font-bold sm:text-4xl">Find your municipality. Get practical support.</h1>
   <p className="max-w-3xl text-slate-200">Search the official national directory by municipality or province, then prepare clear next steps for water, billing, indigent support, street trading and public participation. No login or paid AI call.</p>
   <p className="rounded-lg border border-amber-600 bg-slate-900 p-3 text-sm text-amber-100">Luqi is not a council, official complaints line, outage tracker or municipal account service. Do not enter an ID number, municipal account, password, street address or banking details here. Verify the authority responsible for your particular address or business directly.</p>
  </header>
  <section aria-label="Find municipal authority" className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
   <h2 className="text-xl font-semibold">Find your local government</h2>
   <p className="text-sm text-slate-300">South Africa has eight metropolitan, 44 district and 205 local municipalities. The live government contact directory currently shows 255 names; this indexed pilot supplements it with Collins Chabane and JB Marks from other original government notices. Check the latest directory and municipality itself for boundaries and contact changes.</p>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm font-medium">Province
     <select aria-label="Municipality province" value={province} onChange={e=>{setProvince(e.target.value as ProvinceCode|'all');setChosen(null);setShowCount(15);}} className={style}>
      <option value="all">All nine provinces</option>
      {Object.entries(PROVINCE_NAMES).map(([code,name])=><option key={code} value={code}>{name}</option>)}
     </select>
    </label>
    <label className="text-sm font-medium">Find council by name
     <input aria-label="Search municipality names" value={search} maxLength={80}
      onChange={e=>{setSearch(e.target.value);setChosen(null);setShowCount(15);}}
      className={style} placeholder="Tshwane, Madibeng, Polokwane…" autoComplete="off"/>
    </label>
   </div>
   <p className="text-sm text-slate-300">Found {candidates.length} names matching this view. Without a province or search term, showing the eight metros first. A metropolitan, local and district municipality can have different responsibilities.</p>
   <div className="grid gap-2 sm:grid-cols-2" aria-label="Municipality search results">
    {shown.map(m=><button key={m.province+'-'+m.name} type="button"
     aria-pressed={chosen?.name===m.name&&chosen.province===m.province}
     onClick={()=>setChosen(m)}
     className={'min-w-0 rounded-lg border p-3 text-left text-sm '+(chosen?.name===m.name&&chosen.province===m.province?'border-cyan-300 bg-cyan-950':'border-slate-600 bg-slate-950')}>
     <strong>{m.name}</strong><span className="mt-1 block text-xs text-slate-300">{PROVINCE_NAMES[m.province]} · {m.type}</span>
    </button>)}
   </div>
   {!candidates.length&&<p role="status" className="text-sm text-amber-200">No directory name matches. This does not mean your municipality does not exist; check the live national contact directory.</p>}
   {candidates.length>showCount&&<button type="button" onClick={()=>setShowCount(n=>Math.min(270,n+30))}
    className="rounded-lg border border-cyan-400 px-4 py-3 text-sm">Show more municipalities</button>}
   {chosen&&<section className="space-y-2 rounded-lg border border-cyan-700 bg-slate-950 p-4" aria-label="Selected municipality">
     <h3 className="text-lg font-semibold">{chosen.name}</h3>
     <p className="text-sm text-slate-300">{PROVINCE_NAMES[chosen.province]} · {chosen.type} municipality. Selection is manual; Luqi has not checked your address against official boundaries.</p>
     <a className="inline-block text-cyan-200 underline" target="_blank" rel="noopener noreferrer" href={MUNICIPAL_DIRECTORY_URL}>Open government directory to verify municipal contact and website</a>
     {chosen.supplementaryEvidenceUrl&&<a className="inline-block text-cyan-200 underline" target="_blank" rel="noopener noreferrer" href={chosen.supplementaryEvidenceUrl}>Supplementary official government evidence for this municipality</a>}
   </section>}
   <p className="text-xs text-slate-300">Directory names reviewed {MUNICIPAL_REVIEWED_ON}. {isMunicipalReviewFresh(new Date())?'':'Review period passed: verify current names, boundaries and links directly.'}</p>
  </section>
  <section aria-label="Municipal service guidance" className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
   <h2 className="text-xl font-semibold">What do you need help with?</h2>
   <label className="block text-sm font-medium">Type of municipal request
    <select aria-label="Municipal service topic" value={topic} onChange={e=>{setTopic(e.target.value as MunicipalServiceKey);setDownloadMessage('');}} className={style}>
     {MUNICIPAL_SERVICES.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
    </select>
   </label>
   <h3 className="text-lg font-semibold">{service.title}</h3>
   <p className="text-sm text-slate-200">{service.why}</p>
   <ol className="list-inside list-decimal space-y-3 text-sm text-slate-200">{service.steps.map(step=><li key={step}>{step}</li>)}</ol>
   <div className="flex flex-wrap gap-4 text-sm">
    <a target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline" href={service.url}>Official authority or guidance</a>
    <a target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline" href={MUNICIPAL_DIRECTORY_URL}>Live municipality contacts</a>
   </div>
   <div className="space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-3">
    <h3 className="font-semibold">Prepare a request checklist (on your phone)</h3>
    <p className="text-xs text-slate-300">A neutral checklist, without private fields. You must report the problem through your council yourself.</p>
    <textarea aria-label="Prepared municipal checklist" className="w-full rounded-lg border border-slate-500 bg-slate-900 p-3 text-sm text-white"
     value={draft} readOnly rows={7}/>
    <button type="button" onClick={saveChecklist} className="rounded-lg border border-cyan-400 bg-cyan-950 px-4 py-3 text-sm font-semibold">Download my checklist</button>
    {downloadMessage&&<p role="status" className="text-xs text-cyan-100">{downloadMessage}</p>}
   </div>
  </section>
  <section className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4">
   <h2 className="text-lg font-semibold">Trusted original sources</h2>
   <div className="flex flex-wrap gap-4 text-sm">
    <a target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline" href={MUNICIPAL_DIRECTORY_URL}>Government municipality directory</a>
    <a target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline" href={MUNICIPAL_SERVICE_URL}>Municipal service information</a>
    <a target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline" href={LOCAL_GOVERNMENT_URL}>Local government responsibilities</a>
   </div>
   <p className="text-xs text-slate-300">The council determines current tariffs, indigent criteria, permits, deadlines and service status. A reachable source page is not proof that a municipal service is operating normally.</p>
  </section>
  <nav aria-label="Other Luqi help" className="flex flex-wrap gap-4 text-sm">
   <Link to="/township-economy" className="text-cyan-200 underline">Township and rural enterprise support</Link>
   <Link to="/tenders" className="text-cyan-200 underline">Tender Desk</Link>
   <Link to="/chat" className="text-cyan-200 underline">Luqi Chat</Link>
  </nav>
  <span className="sr-only">{MUNICIPALITIES.length} local government directory names stored for searching.</span>
 </main>;
}
