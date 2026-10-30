import {useEffect,useRef,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router';
import {useOptionalCustomerSession} from '../providers/customer-session';
import {businessClient} from '../lib/business-connect-client';
import {businessId,BUSINESS_CATEGORIES,type PublicBusiness} from '../../contracts/business-connect';
import {parseProvince} from '../lib/nearby-discovery';
import {PROVINCES} from '../lib/opportunity-sources';
import BusinessPublicCard from '../components/BusinessPublicCard';
const field='mt-1 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-white';
const button='min-h-11 rounded-lg border border-cyan-500 px-4 py-2 text-cyan-100 disabled:opacity-50';
export default function BusinessDirectoryPage(){const{id}=useParams();const[params]=useSearchParams();const token=useOptionalCustomerSession()?.session?.token;return <Directory key={(id??'list')+(token??'guest')+params.get('province')} id={id} token={token} initialProvince={parseProvince(params.get('province'))??''}/>;}
function Directory({id,token,initialProvince}:{id?:string;token?:string;initialProvince:string}){
 const [province,setProvince]=useState(initialProvince),[category,setCategory]=useState(''),[q,setQ]=useState('');
 const [results,setResults]=useState<PublicBusiness[]>([]),[next,setNext]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('Loading published business profiles…');
 const [applied,setApplied]=useState<Record<string,string>>({...(initialProvince?{province:initialProvince}:{})});
 const [reason,setReason]=useState('misleading'),[note,setNote]=useState(''),[reporting,setReporting]=useState(false),[reportMessage,setReportMessage]=useState('');
 const epoch=useRef(0),pending=useRef(false),reportPending=useRef(false);
 const client=businessClient(token);
 async function load(filter:Record<string,string>,more=false){
  if(pending.current)return;pending.current=true;setBusy(true);const version=++epoch.current;
  try{if(id){if(!businessId.safeParse(id).success)throw Error('That business profile link is invalid.');const r=await client.public(id);if(version===epoch.current){setResults([r.business]);setMessage('Published owner-provided information. Confirm current details directly.');}}
   else{const r=await client.list({...filter,...(more&&next?{after:next}:{})});if(version===epoch.current){setResults(old=>more?[...old,...r.businesses]:r.businesses);setNext(r.next);setApplied(filter);setMessage(r.businesses.length?'Published profiles loaded. Results reflect your last search; use Search businesses to apply changed filters.':'No published profile matches this search yet. This does not mean the area has no businesses.');}}
  }catch(e){if(version===epoch.current){setResults([]);setNext(null);setMessage(e instanceof Error?e.message:'Public business profiles are unavailable.');}}
  finally{pending.current=false;if(version===epoch.current)setBusy(false);}
 }
 useEffect(()=>{void load(applied);return()=>{epoch.current++;};},[id]);
 const search=()=>void load({...(province?{province}:{}),...(category?{category}:{}),...(q.trim()?{q:q.trim()}:{})});
 const submitReport=async()=>{if(!id||!token||reportPending.current)return;reportPending.current=true;setReporting(true);const version=epoch.current;try{await client.report(id,reason,note);if(version===epoch.current){setNote('');setReportMessage('Report received for review. This does not guarantee immediate removal.');}}catch(e){if(version===epoch.current)setReportMessage(e instanceof Error?e.message:'Report could not be confirmed.');}finally{reportPending.current=false;if(version===epoch.current)setReporting(false);}};
 return <main className="mx-auto max-w-6xl min-w-0 space-y-6 px-3 py-7 text-slate-100 sm:px-6" aria-labelledby="directory-heading">
  <header className="space-y-3"><p className="text-sm font-semibold uppercase text-cyan-300">Luqi Business Connect · Public profiles</p><h1 id="directory-heading" className="text-3xl font-bold">{id?'Meet a local business':'Find the people behind local services'}</h1><p>Discover published business services and service areas. Publication is reviewed; business contacts, addresses, hours and prices are owner-provided and must be confirmed directly.</p><p className="text-sm text-slate-300">No account is needed to browse. A Luqi listing is not CIPC registration, licensing, a quality guarantee or independent location verification.</p><nav className="flex flex-wrap gap-4"><Link className="text-cyan-200 underline" to="/business-connect">Create or manage my business</Link><Link className="text-cyan-200 underline" to="/near-me">Near me</Link>{id&&<Link className="text-cyan-200 underline" to="/businesses">Browse all businesses</Link>}</nav></header>
  {!id&&<form onSubmit={e=>{e.preventDefault();search();}} className="grid gap-4 rounded-xl border border-slate-600 bg-slate-900 p-4 sm:grid-cols-3"><label>Province<select className={field} value={province} onChange={e=>setProvince(e.target.value)}><option value="">All nine provinces</option>{PROVINCES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Business category<select className={field} value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{BUSINESS_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label><label>Service, business or locality<input className={field} value={q} onChange={e=>setQ(e.target.value)} maxLength={80} autoComplete="off" placeholder="Plumbing, salon, Mabopane…"/></label><button className={button} disabled={busy}>Search businesses</button></form>}
  <p role="status" aria-live="polite" className="rounded-lg bg-slate-950 p-3 text-sm text-cyan-100">{message}</p>
  <div className={id?'space-y-4':'grid gap-4 lg:grid-cols-2'}>{results.map(b=><BusinessPublicCard key={b.id} business={b} detail={!!id}/>)}</div>
  {!id&&next&&<button className={button} disabled={busy} onClick={()=>void load(applied,true)}>Show more published businesses</button>}
  <button className={button} disabled={busy} onClick={()=>void load(applied)}>Refresh published information</button>
  {id&&results.length>0&&<section aria-label="Report a business profile" className="space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-4"><h2 className="text-xl font-semibold">Something needs checking?</h2><p className="text-sm text-slate-300">Report impersonation, private information, closure or misleading details. Up to five report submissions per UTC day help limit spam. Do not send ID documents, passwords, account numbers or other people's private contact details.</p>{token?<><label className="block">Reason<select className={field} value={reason} onChange={e=>setReason(e.target.value)}>{['impersonation','private_information','closed_moved','misleading','abuse','other'].map(r=><option key={r} value={r}>{r.replaceAll('_',' ')}</option>)}</select></label><label className="block">Short report (optional)<textarea className={field} value={note} maxLength={300} rows={3} onChange={e=>setNote(e.target.value)}/></label><button className={button} disabled={reporting} onClick={()=>void submitReport()}>Send profile report</button><p aria-live="polite">{reportMessage}</p></>:<Link className="inline-block py-2 text-cyan-200 underline" to="/login">Sign in to report this profile</Link>}</section>}
 </main>;
}
