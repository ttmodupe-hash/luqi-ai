import {useState} from "react";
import {findOpportunitySources,type OpportunityTheme} from "@/lib/academy/opportunitySources";
const THEMES: {value:OpportunityTheme;label:string}[]=[{value:"all",label:"All opportunities"},{value:"funding",label:"Funding"},{value:"entrepreneurship",label:"Entrepreneurship"},{value:"education",label:"Education"},{value:"employment",label:"Employment"},{value:"innovation",label:"Innovation"},{value:"mentorship",label:"Mentorship"}];
export default function AfricaOpportunityFinder(){
 const [theme,setTheme]=useState<OpportunityTheme>("all");
 const [term,setTerm]=useState("");
 const results=findOpportunitySources(theme,term);
 return <section aria-label="Africa opportunity finder" className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-5 space-y-4">
 <div><h2 className="text-xl font-bold text-white">Africa Opportunity Finder</h2><p className="text-sm text-slate-300">Find official programme publishers and investigate opportunities. This first version is a curated directory, not a live search of current applications. Always verify deadlines and eligibility on the provider website.</p></div>
 <div className="grid gap-3 md:grid-cols-2">
 <label className="text-sm text-slate-200">Search sources<input value={term} onChange={e=>setTerm(e.target.value)} placeholder="e.g. small business, mentorship" className="mt-1 block w-full rounded border border-slate-600 bg-slate-950 p-2"/></label>
 <label className="text-sm text-slate-200">Category<select value={theme} onChange={e=>setTheme(e.target.value as OpportunityTheme)} className="mt-1 block w-full rounded border border-slate-600 bg-slate-950 p-2">{THEMES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
 </div>
 <div className="grid gap-3 md:grid-cols-2">{results.map(s=><article key={s.id} className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-2"><h3 className="font-semibold text-emerald-300">{s.name}</h3><p className="text-xs text-slate-300">{s.audience}</p><p className="text-xs text-amber-300">Application status: not verified</p><p className="text-xs text-slate-400">{s.notes}</p><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-300 underline">Check official programme website ↗</a></article>)}</div>
 {results.length===0&&<p className="text-sm text-slate-300">No matching sources in this starter directory. This does not mean no programmes exist.</p>}
 </section>;
}
