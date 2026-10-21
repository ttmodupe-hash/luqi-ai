import { useState } from "react";
import { recommendLearningPaths, type LearnerGoal } from "@/lib/academy/skillPathways";
const GOALS: {id:LearnerGoal;label:string}[]=[
{id:"first-job",label:"Find my first technology job"},
{id:"career-change",label:"Change careers"},
{id:"cloud",label:"Learn cloud services"},
{id:"ai",label:"Learn AI and automation"},
{id:"security",label:"Learn cybersecurity"},
{id:"it-service",label:"Learn IT service management"},
];
export default function AfricaSkillsNavigator(){
 const [goal,setGoal]=useState<LearnerGoal>("first-job");
 const paths=recommendLearningPaths(goal);
 return <section aria-label="Africa skills and learning pathway navigator" className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-5 space-y-4">
  <div><h2 className="text-xl font-bold text-white">Africa Skills & Opportunities Navigator</h2>
  <p className="text-sm text-slate-300">Choose your goal. LUQI suggests three learning pathways and explains why each is useful. These are learning recommendations, not verified local vacancies or hiring forecasts.</p></div>
  <label className="block text-sm text-slate-200">What would you like to achieve?
   <select value={goal} onChange={e=>setGoal(e.target.value as LearnerGoal)} className="block mt-1 w-full rounded bg-slate-950 border border-slate-700 p-3">{GOALS.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select>
  </label>
  <div className="grid gap-3 md:grid-cols-3">{paths.map((p,i)=><article key={p.id} className="rounded-xl bg-slate-950 border border-slate-700 p-4 space-y-2">
   <h3 className="font-semibold text-emerald-300">{i+1}. {p.title}</h3>
   <p className="text-xs text-slate-400">Start with: {p.prerequisite}</p>
   <h4 className="text-sm font-semibold text-white">Three reasons to study this</h4>
   <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-200">{p.reasons.map(reason=><li key={reason}>{reason}</li>)}</ol>
   <h4 className="text-sm font-semibold text-white">Practise</h4><ul className="list-disc pl-5 text-xs text-slate-200">{p.labs.map(l=><li key={l}>{l}</li>)}</ul>
   <p className="text-xs text-slate-400">Possible entry roles: {p.roles.join(", ")}</p>
   <p className="text-xs text-amber-300">Illustrative guidance — local demand not yet verified.</p>
  </article>)}</div>
 </section>;
}
