import {useState} from 'react';
import {Link} from 'react-router';
import {PASSPORT_NATIONALITIES,VISA_DESTINATIONS,VISA_SOURCES_REVIEWED_ON,VISA_RECHECK_AFTER,
 evaluateVisaEntry,isVisaReviewFresh,type VisaDestination,type VisaPurpose,type VisaArrival,
 type VisaQuery} from '../lib/visa-entry-sources';

const inputClass='mt-2 block w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-white';
const purposes:readonly {id:VisaPurpose;label:string}[]=[
 {id:'tourism',label:'Holiday or tourism'}, {id:'visit',label:'Visit family or friends'},
 {id:'business',label:'Business meeting or event'}, {id:'work',label:'Employment or paid work'},
 {id:'study',label:'Study or training'}, {id:'transit',label:'Transit'},
 {id:'other',label:'Another purpose — confirm with authority'}
];
const arrivals:readonly {id:VisaArrival;label:string}[]=[
 {id:'unsure',label:'Not decided'}, {id:'air',label:'Air'}, {id:'land',label:'Road or land border'}, {id:'sea',label:'Sea'}
];
const initial:VisaQuery={
 destination:'ZA',passportNationality:'',purpose:'tourism',
 arrival:'unsure',arrivalDate:'',stayDays:null
};
export default function VisaEntryGuidePage(){
 const [query,setQuery]=useState<VisaQuery>(initial);
 const [downloaded,setDownloaded]=useState('');
 const update=<K extends keyof VisaQuery>(field:K,value:VisaQuery[K])=>{
  setQuery(previous=>({...previous,[field]:value}));setDownloaded('');
 };
 const reviewed=isVisaReviewFresh(new Date());
 const guidance=evaluateVisaEntry(query,new Date());
 const destination=VISA_DESTINATIONS.find(x=>x.id===query.destination)!;
 const dateIssue=query.arrivalDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(query.arrivalDate)||
  !Number.isFinite(Date.parse(query.arrivalDate+'T00:00:00Z')));
 const plan=[
  'Luqi Visa & Entry — original-source travel preparation',
  'Government source review: '+VISA_SOURCES_REVIEWED_ON,
  'Destination: '+destination.country,
  'Passport nationality: '+(query.passportNationality||'not selected'),
  'Purpose: '+purposes.find(p=>p.id===query.purpose)?.label,
  'Arrival mode: '+arrivals.find(a=>a.id===query.arrival)?.label,
  'Planned arrival: '+(query.arrivalDate||'not specified'),
  'Intended stay: '+(query.stayDays||'not specified')+' days','',
  'This is a research checklist, not visa/ETA eligibility confirmation or an application.',
  guidance.explanation,'',
  ...guidance.steps.map((s,i)=>(i+1)+'. '+s),'',
  ...guidance.warnings.map(s=>'IMPORTANT: '+s),'',
  ...guidance.sources.map(s=>s.issuer+' — '+s.title+': '+s.url)
 ].join('\n');
 function downloadPlan(){
  const url=URL.createObjectURL(new Blob([plan],{type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='luqi-visa-entry-checklist.txt';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  setDownloaded('Personal travel checklist saved locally; no application was submitted.');
 }
 return <main className="mx-auto max-w-6xl min-w-0 space-y-6 px-3 py-7 text-slate-100 sm:px-6 sm:py-10" aria-labelledby="visa-entry-heading">
  <header className="space-y-3">
   <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Luqi Visa &amp; Entry · Africa first · Free</p>
   <h1 id="visa-entry-heading" className="text-3xl font-bold sm:text-4xl">Plan your journey. Verify entry requirements.</h1>
   <p className="max-w-4xl text-slate-200">Choose your passport nationality, destination and travel purpose. Luqi will show the appropriate original immigration authority and a practical preparation checklist. This first release covers five destinations, not all 54 African countries.</p>
   <p className="rounded-xl border border-amber-500 bg-slate-900 p-4 text-sm text-amber-100">
    Luqi is not an immigration office, authorised visa representative, legal adviser or travel authorisation service.
    It cannot decide visa-free eligibility, approve a visa, check your government application status, book a border appointment or guarantee entry.
    Never type your passport number, ID, card details, account password, case number or biometrics into Luqi.
   </p>
  </header>
  <section aria-label="Prepare your visa and entry enquiry" className="space-y-4 rounded-xl border border-slate-600 bg-slate-900 p-4">
   <h2 className="text-xl font-semibold">Tell Luqi about the trip — no passport details needed</h2>
   <div className="grid gap-4 sm:grid-cols-2">
    <label className="block text-sm font-semibold">Destination country
     <select className={inputClass} aria-label="Destination country" value={query.destination}
      onChange={e=>update('destination',e.target.value as VisaDestination)}>
      {VISA_DESTINATIONS.map(x=><option key={x.id} value={x.id}>{x.country}</option>)}
     </select>
    </label>
    <label className="block text-sm font-semibold">Passport nationality
     <select className={inputClass} aria-label="Passport nationality" value={query.passportNationality}
      onChange={e=>update('passportNationality',e.target.value)}>
      <option value="">Choose the country that issued your passport</option>
      {PASSPORT_NATIONALITIES.map(x=><option key={x} value={x}>{x}</option>)}
      <option value="other">Another nationality / not listed</option>
     </select>
    </label>
    <label className="block text-sm font-semibold">Purpose of visit
     <select className={inputClass} aria-label="Purpose of visit" value={query.purpose}
      onChange={e=>update('purpose',e.target.value as VisaPurpose)}>
      {purposes.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
     </select>
    </label>
    <label className="block text-sm font-semibold">How are you arriving?
     <select className={inputClass} aria-label="Arrival method" value={query.arrival}
      onChange={e=>update('arrival',e.target.value as VisaArrival)}>
      {arrivals.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
     </select>
    </label>
    <label className="block text-sm font-semibold">Planned arrival date (optional)
     <input className={inputClass} aria-label="Planned arrival date" type="date" value={query.arrivalDate}
      onChange={e=>update('arrivalDate',e.target.value)} />
    </label>
    <label className="block text-sm font-semibold">Intended stay in days (optional)
     <input className={inputClass} aria-label="Intended stay days" type="number" inputMode="numeric" min="1" max="365"
      value={query.stayDays??''}
      onChange={e=>{const raw=e.target.value;update('stayDays',raw?Number(raw):null)}} placeholder="e.g. 14" />
    </label>
   </div>
   <p className="text-xs text-slate-300">Your selections remain in this browser tab. Luqi makes no government account request or paid AI inference from this form. Do not enter other private information.</p>
   {dateIssue&&<p className="text-sm text-amber-200" role="status">Choose a valid arrival date or leave it blank.</p>}
  </section>
  <section aria-label="Source-reviewed visa guidance" className="space-y-4 rounded-xl border border-cyan-700 bg-slate-900 p-4 sm:p-6">
   <p className="text-sm font-semibold text-cyan-300">Original government guidance · reviewed {VISA_SOURCES_REVIEWED_ON}</p>
   <h2 className="text-2xl font-bold">{destination.country}: official visa and entry starting points</h2>
   {!reviewed&&<p role="alert" className="rounded-lg border border-amber-500 p-3 text-sm text-amber-100">
    This source review expired after {VISA_RECHECK_AFTER}. Recheck the official immigration website before relying on any category or nationality example.
   </p>}
   <p role="note" className="rounded-lg border border-slate-600 p-3 text-sm text-slate-100">{guidance.summary}</p>
   <p className="text-sm text-slate-200">{guidance.explanation}</p>
   <p className="text-xs text-slate-300">Interpretation: {guidance.label==='dated-official-example'?'dated published rule, not an individual eligibility decision':guidance.label==='review-expired'?'review expired — original source check required':'general official application process only; no individual eligibility decision'}.</p>
   <h3 className="text-lg font-semibold">Recommended steps</h3>
   <ol className="list-inside list-decimal space-y-3 text-sm text-slate-200">{guidance.steps.map(step=><li key={step}>{step}</li>)}</ol>
   <h3 className="text-lg font-semibold">Important checks</h3>
   <ul className="list-inside list-disc space-y-2 text-sm text-amber-100">{guidance.warnings.map(w=><li key={w}>{w}</li>)}</ul>
   <h3 className="text-lg font-semibold">Open original immigration sources</h3>
   <div className="grid gap-3 sm:grid-cols-2">{guidance.sources.map(s=>
    <article key={s.url} className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm">
     <strong className="block text-slate-100">{s.title}</strong>
     <p className="my-2 text-xs text-slate-300">{s.issuer} · reviewed {s.reviewedOn}</p>
     <a className="inline-block max-w-full break-words text-cyan-200 underline" href={s.url}
      target="_blank" rel="noopener noreferrer">View government website</a>
    </article>)}</div>
   <div className="space-y-3 rounded-lg border border-slate-600 bg-slate-950 p-4">
    <h3 className="font-semibold">Keep an offline preparation checklist</h3>
    <p className="text-xs text-slate-300">This file contains only the countries and trip choices you made and official reference links. It is not a visa form, submitted claim or travel document.</p>
    <button type="button" onClick={downloadPlan} className="rounded-lg border border-cyan-400 bg-cyan-950 px-4 py-3 text-sm font-semibold">Download checklist</button>
    {downloaded&&<p role="status" className="text-xs text-cyan-100">{downloaded}</p>}
   </div>
  </section>
  <nav aria-label="Related Luqi services" className="flex flex-wrap gap-4 text-sm">
   <Link to="/rights-guide" className="text-cyan-200 underline">Asylum and refugee guidance (separate)</Link>
   <Link to="/omega-tasks" className="text-cyan-200 underline">Budget a trip locally</Link>
   <Link to="/chat" className="text-cyan-200 underline">Return to Luqi Chat</Link>
  </nav>
 </main>;
}
