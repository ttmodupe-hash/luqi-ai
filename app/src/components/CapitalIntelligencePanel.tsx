import {useState} from 'react';
import {ARTIFACT_LABELS, AFRICAN_COUNTRIES, CAPITAL_PROGRAMMES, FUNDING_SCOPE_LABELS, FUNDING_TYPE_LABELS,
  buildCapitalPreparationDraft, matchCapitalProgrammes,
  type Artifact,type CapitalProfile,type ProjectMaturity,type ProjectPurpose,type ProjectSector,
  type Registration, type MatchState, type FundingScope, type FundingType} from '../lib/capital-intelligence';

const stateNames:Record<MatchState,string>={
  POTENTIAL_FIT_TO_EXPLORE:'Potential programme to explore',
  CHECK_PUBLISHER_CRITERIA:'Check programme criteria',
  CURRENTLY_NOT_ALIGNED:'Not currently aligned',
};
const allArtifacts=Object.keys(ARTIFACT_LABELS) as Artifact[];
/** No browser telemetry, provider calls, persistence, background prefetch or user uploads. */
export default function CapitalIntelligencePanel(){
  const [country,setCountry]=useState<CapitalProfile['country']>('ZA');
  const [scopeFilter,setScopeFilter]=useState<FundingScope|'ALL'>('ALL');
  const [typeFilter,setTypeFilter]=useState<FundingType|'ALL'>('ALL');
  const [search,setSearch]=useState('');
  const offeredTypes=Array.from(new Set(CAPITAL_PROGRAMMES.map(p=>p.type)));
  const [maturity,setMaturity]=useState<ProjectMaturity>('MVP');
  const [sector,setSector]=useState<ProjectSector>('TECH');
  const [purpose,setPurpose]=useState<ProjectPurpose>('R_AND_D_SEED');
  const [registration,setRegistration]=useState<Registration>('UNKNOWN');
  const [age,setAge]=useState('');
  const [projectName,setProjectName]=useState('');
  const [summary,setSummary]=useState('');
  const [artifacts,setArtifacts]=useState<Artifact[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const reset=()=>setSelectedId(null);
  const profile:CapitalProfile={
    country,maturity,sector,purpose,registration,
    ...(age!==''?{age:Number(age)}:{}),
    availableArtifacts:artifacts,
  };
  const allMatches=matchCapitalProgrammes(profile);
  const term=search.trim().toLocaleLowerCase();
  const matches=allMatches.filter(m=>
    (scopeFilter==='ALL'||m.programme.scope===scopeFilter) &&
    (typeFilter==='ALL'||m.programme.type===typeFilter) &&
    (!term||[m.programme.name,m.programme.organisation,m.programme.scopeNote,
       ...m.programme.selectionNotes].join(' ').toLocaleLowerCase().includes(term))
  );
  const selected=matches.find(m=>m.programme.id===selectedId);
  const draft=selected?buildCapitalPreparationDraft(selected,profile,projectName,summary):'';
  return <section aria-labelledby="capital-title" className="min-w-0 w-full space-y-5 rounded-2xl border border-cyan-700 bg-slate-900 p-4 sm:p-7">
    <header className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">Funding discovery · pilot · free</p>
      <h2 id="capital-title" className="text-2xl font-bold sm:text-3xl">Luqi Capital Intelligence</h2>
      <p className="max-w-4xl text-sm leading-relaxed text-slate-200">
        One place to explore South African, pan-African and international funding routes.
        Filter by project location, region, programme type or topic, then prepare a local review draft.
        This is a publisher-reference directory, not an active-grant feed, eligibility decision,
        investor matchmaking service or application submission.
      </p>
      <p className="text-xs text-slate-300">Each card shows its own last substantive publisher review date.
        No current application windows or closing dates are certified by this catalogue.
        Your inputs stay on this page; nothing is uploaded.</p>
    </header>
    <form className="min-w-0 space-y-4" onSubmit={e=>e.preventDefault()} aria-label="Project funding profile">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid min-w-0 gap-1 text-sm">Project location
          <select aria-label="Project location" value={country} onChange={e=>{setCountry(e.target.value as CapitalProfile['country']);reset();}}
            className="min-h-11 min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-2 text-white">
            <option value="ZA">South Africa</option>
            {AFRICAN_COUNTRIES.filter(([code])=>code!=='ZA').map(([code,name])=>
              <option key={code} value={code}>{name}</option>)}
            <option value="OTHER">Outside Africa — check publisher rules</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">Project stage
          <select aria-label="Project stage" value={maturity} onChange={e=>{setMaturity(e.target.value as ProjectMaturity);reset();}}
            className="min-h-11 min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-2 text-white">
            <option value="IDEA">Early idea</option><option value="MVP">Working prototype / MVP</option><option value="PRODUCTION">Publicly operating</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">Project sector
          <select aria-label="Project sector" value={sector} onChange={e=>{setSector(e.target.value as ProjectSector);reset();}}
            className="min-h-11 min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-2 text-white">
            <option value="TECH">Technology / innovation</option><option value="INDUSTRY">Industrial / manufacturing</option><option value="OTHER">Other enterprise</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">What is the funding for?
          <select aria-label="Funding purpose" value={purpose} onChange={e=>{setPurpose(e.target.value as ProjectPurpose);reset();}}
            className="min-h-11 min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-2 text-white">
            <option value="R_AND_D_SEED">Research and prototype development</option>
            <option value="BUSINESS_GROWTH">Enterprise launch / growth</option>
            <option value="INDUSTRIAL_EXPANSION">Industrial expansion</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">Business registration
          <select aria-label="Business registration" value={registration} onChange={e=>{setRegistration(e.target.value as Registration);reset();}}
            className="min-h-11 min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-2 text-white">
            <option value="UNKNOWN">Not supplied</option><option value="REGISTERED">Registered</option>
            <option value="NOT_REGISTERED">Not registered</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">Founder age (optional, checked locally)
          <input aria-label="Founder age (optional, checked locally)" type="text" inputMode="numeric" autoComplete="off"
            maxLength={3} placeholder="Not supplied" value={age}
            onChange={e=>{const v=e.target.value;if(/^\d{0,3}$/.test(v) && (v==='' || Number(v)<=120)){setAge(v);reset();}}}
            className="min-h-11 min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-2 text-base text-white"/>
        </label>
      </div>
      <fieldset className="min-w-0 space-y-2 rounded-xl border border-slate-700 p-3">
        <legend className="max-w-full whitespace-normal break-words px-1 text-sm font-semibold">Documents you already have (self-reported, not verified)</legend>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">{allArtifacts.map(a=>
          <label key={a} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={artifacts.includes(a)} onChange={e=>{const checked=e.target.checked;setArtifacts(current=>checked?[...current,a]:current.filter(v=>v!==a));reset();}}
              className="h-5 w-5 accent-cyan-500" />{ARTIFACT_LABELS[a]}
          </label>)}</div>
      </fieldset>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1 text-sm">Project name (optional)
          <input aria-label="Project name" maxLength={80} autoComplete="off" value={projectName}
            onChange={e=>{setProjectName(e.target.value);reset();}}
            className="min-h-11 min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-base text-white" placeholder="e.g. My technology project"/>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">What does the project do? (optional)
          <textarea aria-label="Project summary" maxLength={400} rows={3} value={summary}
            onChange={e=>{setSummary(e.target.value);reset();}}
            className="min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-base text-white" placeholder="A short explanation in your own words"/>
        </label>
      </div>
    </form>

    <section className="min-w-0 space-y-3" aria-label="Explore funding sources">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid min-w-0 gap-1 text-sm">Funding geography
          <select aria-label="Funding geography" value={scopeFilter} onChange={e=>{setScopeFilter(e.target.value as FundingScope|'ALL');reset();}}
            className="min-h-11 min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-2 text-white">
            <option value="ALL">All regions together</option>
            {Object.entries(FUNDING_SCOPE_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">Funding type
          <select aria-label="Funding type" value={typeFilter} onChange={e=>{setTypeFilter(e.target.value as FundingType|'ALL');reset();}}
            className="min-h-11 min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-2 text-white">
            <option value="ALL">All funding types</option>
            {offeredTypes.map(type=><option key={type} value={type}>{FUNDING_TYPE_LABELS[type]}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">Search publisher programmes
          <input aria-label="Search funding programmes" value={search} maxLength={80} autoComplete="off"
            onChange={e=>{setSearch(e.target.value);reset();}}
            placeholder="e.g. farming, women, innovation"
            className="min-h-11 min-w-0 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-base text-white"/>
        </label>
      </div>
      <p className="text-xs text-slate-300">Geographic labels describe publisher reach, not confirmed eligibility.
        Each competition may limit countries, residency, instruments and deadlines. Results remain visible with restrictions explained.</p>
    </section>
    <div role="status" className="text-sm text-slate-300">{matches.length} of {CAPITAL_PROGRAMMES.length} reviewed programme references match your filters.
      Scores below measure suggested documents, never likelihood of a grant or approval.</div>
    <div className="grid min-w-0 gap-3 lg:grid-cols-3">
      {matches.map(m=><article key={m.programme.id} aria-label={m.programme.name}
          className="min-w-0 space-y-3 rounded-xl border border-slate-600 bg-slate-950 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{m.programme.organisation}</p>
        <p className="text-xs text-emerald-300">{FUNDING_SCOPE_LABELS[m.programme.scope]} · {FUNDING_TYPE_LABELS[m.programme.type]}</p>
        <p className="text-xs text-slate-300">{m.programme.scopeNote}</p>
        <h3 className="text-lg font-bold">{m.programme.name}</h3>
        <p className="text-sm font-semibold text-slate-200">{stateNames[m.state]}</p>
        <p className="text-xs text-slate-300">{m.programme.selectionNotes[0]}</p>
        <p className="text-xs text-slate-400">Publisher description last reviewed: {m.programme.reviewedOn}</p>
        <p className="text-xs text-slate-300">Suggested documents prepared: {m.preparationPercent}% (self-reported).</p>
        <p className="text-xs text-amber-200">Current application window unverified.
          {m.reviewExpired?' Publisher source recheck overdue.':''}</p>
        {m.checks.length>0&&<ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {m.checks.map(text=><li key={text}>{text}</li>)}</ul>}
        <p className="text-xs text-slate-300">Still to prepare: {m.missingArtifacts.length
          ?m.missingArtifacts.map(a=>ARTIFACT_LABELS[a]).join(', '):'No suggested items missing'}</p>
        <div className="flex flex-col items-start gap-3">
          <a href={m.programme.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="min-h-11 content-center break-words text-sm font-semibold text-cyan-200 underline">Official programme information</a>
          {m.programme.applicationGuideUrl!==m.programme.sourceUrl &&
            <a href={m.programme.applicationGuideUrl} target="_blank" rel="noopener noreferrer"
              className="min-h-11 content-center break-words text-sm text-cyan-200 underline">
              Publisher's application guidance
            </a>}
          <button type="button" onClick={()=>setSelectedId(m.programme.id)}
            className="min-h-11 w-full rounded-lg border border-cyan-400 bg-cyan-900 px-3 py-2 text-sm font-semibold text-white">
            Prepare review draft
          </button>
        </div>
      </article>)}
    </div>
    {!matches.length&&<p className="text-sm text-slate-300">No reviewed publisher matches those filters.
      That does not mean no funding exists. Widen the region or search terms and consult official calls.</p>}
    {selected&&<section className="min-w-0 space-y-3 rounded-xl border border-emerald-600 bg-slate-950 p-4"
        aria-label="Funding preparation draft">
      <h3 className="text-lg font-bold">Your preparation worksheet — {selected.programme.name}</h3>
      <p className="text-sm text-slate-300">Review and correct this draft yourself. No forms, applications or documents have been submitted.</p>
      <textarea aria-label="Funding preparation draft text" readOnly value={draft} rows={13}
        className="w-full min-w-0 resize-y rounded-lg border border-slate-500 bg-slate-900 p-3 font-mono text-xs text-slate-100"/>
      <a href={'data:text/plain;charset=utf-8,'+encodeURIComponent(draft)} download="luqi-funding-preparation.txt"
        className="inline-flex min-h-11 max-w-full items-center text-center rounded-lg bg-emerald-500 px-4 py-3 font-bold text-slate-950">
        Download preparation worksheet
      </a>
      <p className="text-xs text-slate-300">If your browser cannot download the text file, select and copy the worksheet above.
        For official submission use the publisher’s own current instructions.</p>
    </section>}
    <p className="text-xs text-slate-400">This catalogue includes grants, development finance and innovation challenges,
      not a promise of open awards. Venture capital, Web3 and crowdfunding sources need separate publisher review and legal checks.
      We do not collect IDs, financial statements or private source code here.</p>
  </section>;
}
