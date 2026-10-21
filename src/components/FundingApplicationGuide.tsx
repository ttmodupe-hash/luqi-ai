import {useState} from "react";
import {buildFundingReadiness,fundingCompletion,type ApplicantType,type FundingSector,type FundingPurpose} from "@/lib/academy/fundingReadiness";
const applicantTypes:ApplicantType[]=["individual","stokvel","cooperative","startup","registered-business","community-organisation"];
const sectors:FundingSector[]=["mining","agriculture","manufacturing","technology","energy","construction","tourism","other"];
const purposes:FundingPurpose[]=["startup","equipment","working-capital","training","expansion","exploration"];
export default function FundingApplicationGuide(){
 const [type,setType]=useState<ApplicantType>("individual");
 const [sector,setSector]=useState<FundingSector>("agriculture");
 const [purpose,setPurpose]=useState<FundingPurpose>("startup");
 const [country,setCountry]=useState("South Africa");
 const [done,setDone]=useState<string[]>([]);
 const readiness=buildFundingReadiness({type,sector,country,purpose});
 const progress=fundingCompletion(readiness,new Set(done));
 const reset=()=>setDone([]);
 return <section aria-label="Funding application preparation" className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-5 space-y-4">
 <div><h2 className="text-xl font-bold text-white">Funding & Enterprise Navigator</h2><p className="text-sm text-slate-300">Prepare an evidence-based application checklist. This tool does not check live eligibility, submit an application, or guarantee funding.</p></div>
 <div className="grid gap-3 md:grid-cols-2">
 <label className="text-sm text-slate-200">Applicant type<select value={type} onChange={e=>{setType(e.target.value as ApplicantType);reset();}} className="mt-1 block w-full rounded bg-slate-950 border border-slate-600 p-2">{applicantTypes.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
 <label className="text-sm text-slate-200">Sector<select value={sector} onChange={e=>{setSector(e.target.value as FundingSector);reset();}} className="mt-1 block w-full rounded bg-slate-950 border border-slate-600 p-2">{sectors.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
 <label className="text-sm text-slate-200">Country<input value={country} onChange={e=>{setCountry(e.target.value);reset();}} className="mt-1 block w-full rounded bg-slate-950 border border-slate-600 p-2"/></label>
 <label className="text-sm text-slate-200">Funding purpose<select value={purpose} onChange={e=>{setPurpose(e.target.value as FundingPurpose);reset();}} className="mt-1 block w-full rounded bg-slate-950 border border-slate-600 p-2">{purposes.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
 </div>
 <p className="text-sm text-emerald-300" aria-live="polite">Preparation checklist: {progress.done} of {progress.total} marked complete (self-reported, not independently verified)</p>
 <ul className="space-y-2">{readiness.items.map(i=><li key={i.id} className="rounded border border-slate-700 bg-slate-950 p-3"><label className="flex items-start gap-3 text-sm text-slate-200"><input type="checkbox" checked={done.includes(i.id)} onChange={e=>setDone(old=>e.target.checked?[...old,i.id]:old.filter(id=>id!==i.id))} className="mt-1"/><span><strong>{i.label}</strong><span className="block text-xs text-slate-400">{i.rationale}</span></span></label></li>)}</ul>
 <div className="space-y-1">{readiness.warnings.map(w=><p key={w} className="text-xs text-amber-300">{w}</p>)}</div>
 <p className="text-xs text-slate-400">Checklist selections stay in this page only and are not uploaded or saved.</p>
 </section>;
}
