import {useState} from "react";
import {Link} from "react-router";
import {ArrowUpRight, BookOpen, Check, ClipboardCopy, ExternalLink, Headphones, MapPin, Radio, Search, ShieldCheck} from "lucide-react";
import {
  filterPulseSources, PULSE_KINDS, PULSE_LANGUAGES, PULSE_RECHECK_BY,
  PULSE_REGIONS, PULSE_REVIEWED_ON, PULSE_SOURCES, PULSE_TOPICS,
  pulseQuestion, type PulseKind, type PulseRegion,
} from "../lib/local-pulse-sources";

const regionNames: Record<string, string> = {
  GP:"Gauteng", WC:"Western Cape", ZA:"National",
};

export default function LocalPulsePage() {
  const [region,setRegion] = useState<PulseRegion>("all");
  const [kind,setKind] = useState<PulseKind>("all");
  const [query,setQuery] = useState("");
  const [sourceId,setSourceId] = useState("ewn");
  const [topic,setTopic] = useState<(typeof PULSE_TOPICS)[number]>(PULSE_TOPICS[0]);
  const [language,setLanguage] = useState<(typeof PULSE_LANGUAGES)[number]>("English");
  const [copyStatus,setCopyStatus] = useState<"idle"|"copied"|"unavailable">("idle");
  const results = filterPulseSources(region,kind,query);
  const question = pulseQuestion(sourceId,topic,language,region);
  const needsReview = Date.now() > Date.parse(PULSE_RECHECK_BY + "T23:59:59+02:00");

  async function copyQuestion() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(question);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("unavailable");
    }
  }

  return (
    <main className="mx-auto max-w-6xl min-w-0 space-y-7 px-3 py-7 text-slate-100 sm:px-6 sm:py-10" aria-labelledby="local-pulse-heading">
      <header className="min-w-0 space-y-4 rounded-2xl border border-slate-600 bg-slate-900 p-5 sm:p-8">
        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-300"><Radio size={18} aria-hidden="true"/> Luqi Local Pulse · Free</p>
        <h1 id="local-pulse-heading" className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Hear the news. Understand the facts. Know what to do next.</h1>
        <p className="max-w-3xl text-slate-200">Find trusted talk radio, original South African newsrooms and language-station directories. Choose your area, open the publisher's material and use Luqi to prepare thoughtful follow-up questions.</p>
        <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
          <span className="rounded-full border border-slate-500 bg-slate-950 px-3 py-2">No account needed to browse</span>
          <span className="rounded-full border border-slate-500 bg-slate-950 px-3 py-2">Source links, not copied broadcasts</span>
          <span className="rounded-full border border-slate-500 bg-slate-950 px-3 py-2">Manual region selection · no GPS</span>
        </div>
        <p className="text-sm text-amber-200"><ShieldCheck size={16} className="mr-1 inline" aria-hidden="true"/> This is a reviewed publisher directory, not a live headline feed or emergency warning service. News and stream availability must be checked on each original site.</p>
        <p className="text-xs text-slate-400">Publisher destinations reviewed: {PULSE_REVIEWED_ON}. {needsReview ? "These directory links are due for rechecking; do not treat them as newly verified." : "Links may change; open each original publisher to verify current content."}</p>
      </header>

      <section className="min-w-0 space-y-4" aria-label="Browse official news and radio publishers">
        <div className="space-y-1">
          <p className="text-sm font-medium text-cyan-300">01 · Discover</p>
          <h2 className="text-2xl font-bold">Trusted voices, where you are</h2>
          <p className="text-sm text-slate-300">These are independent broadcasters and newsrooms, not Luqi-owned channels or paid endorsements.</p>
        </div>
        <div className="grid min-w-0 gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:grid-cols-3">
          <label className="block min-w-0 text-sm font-medium">Choose your region
            <select aria-label="Local Pulse region" value={region} onChange={event=>setRegion(event.target.value as PulseRegion)} className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-white">
              {PULSE_REGIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="block min-w-0 text-sm font-medium">Type of source
            <select aria-label="Local Pulse source type" value={kind} onChange={event=>setKind(event.target.value as PulseKind)} className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-white">
              {PULSE_KINDS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="block min-w-0 text-sm font-medium">Search publishers
            <span className="mt-2 flex items-center gap-2 rounded-lg border border-slate-500 bg-slate-950 px-3">
              <Search size={17} className="shrink-0 text-slate-300" aria-hidden="true"/>
              <input aria-label="Search Local Pulse publishers" type="search" autoComplete="off" maxLength={100} placeholder="Station, language or topic" value={query} onChange={event=>setQuery(event.target.value)} className="min-w-0 w-full bg-transparent py-3 text-white outline-none"/>
            </span>
          </label>
        </div>
        {region==="other"&&<p className="rounded-lg border border-amber-600/50 bg-slate-900 p-3 text-sm text-amber-100"><MapPin size={16} className="mr-1 inline" aria-hidden="true"/> Province-specific talk stations have not yet been individually reviewed for the other provinces. Showing national news and the SABC station directory rather than inventing local coverage.</p>}
        <p role="status" aria-live="polite" className="text-sm text-slate-300">{results.length} original publisher {results.length===1?"destination":"destinations"} available for this view.</p>
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          {results.map(source=><article key={source.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-200">
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-800 px-2 py-1">{source.kind==="news"?<BookOpen size={14} aria-hidden="true"/>:<Headphones size={14} aria-hidden="true"/>}{source.kind==="talk"?"Talk radio / podcasts":source.kind==="news"?"Newsroom":"Radio directory"}</span>
              <span className="rounded-full border border-slate-600 px-2 py-1">{regionNames[source.region]}</span>
            </div>
            <h3 className="text-xl font-semibold">{source.name}</h3>
            <p className="text-sm text-slate-300">{source.description}</p>
            <p className="text-xs text-slate-400">Publisher: {source.publisher} · Language(s): {source.languages}</p>
            <a className="mt-auto inline-flex w-fit max-w-full items-center gap-2 break-words rounded-lg border border-cyan-500 px-3 py-3 font-semibold text-cyan-100 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" href={source.url} target="_blank" rel="noopener noreferrer" aria-label={source.action+" (official site, opens new tab)"}>{source.action}<ExternalLink size={17} className="shrink-0" aria-hidden="true"/></a>
          </article>)}
        </div>
        {results.length===0&&<p className="rounded-lg border border-slate-600 bg-slate-900 p-5 text-sm">No reviewed source matches those filters. Choose another region or keyword; this does not mean local radio or news is unavailable.</p>}
      </section>

      <section className="min-w-0 space-y-4 rounded-2xl border border-slate-600 bg-slate-900 p-5 sm:p-7" aria-label="Prepare a source-based question">
        <div className="space-y-1">
          <p className="text-sm font-medium text-cyan-300">02 · Understand</p>
          <h2 className="text-2xl font-bold">Prepare a question for Luqi</h2>
          <p className="text-sm text-slate-300">Pick a topic and publisher. The example question is prepared on your phone without sending a request to any AI provider. Read the original story before asking Luqi to explain it.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block min-w-0 text-sm font-medium">Original publisher
            <select aria-label="Question publisher" value={sourceId} onChange={event=>{setSourceId(event.target.value);setCopyStatus("idle");}} className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-white">
              {PULSE_SOURCES.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="block min-w-0 text-sm font-medium">What matters to you?
            <select aria-label="Local Pulse topic" value={topic} onChange={event=>{setTopic(event.target.value as (typeof PULSE_TOPICS)[number]);setCopyStatus("idle");}} className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-white">
              {PULSE_TOPICS.map(item=><option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block min-w-0 text-sm font-medium">Preferred answer language
            <select aria-label="Local Pulse preferred language" value={language} onChange={event=>{setLanguage(event.target.value as (typeof PULSE_LANGUAGES)[number]);setCopyStatus("idle");}} className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-white">
              {PULSE_LANGUAGES.map(item=><option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">Your editable-by-copy question
          <textarea aria-label="Prepared Local Pulse question" className="mt-2 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-sm leading-relaxed text-slate-100" rows={6} readOnly value={question}/>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={()=>void copyQuestion()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-700 px-4 py-3 font-semibold text-white hover:bg-cyan-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{copyStatus==="copied"?<Check size={18} aria-hidden="true"/>:<ClipboardCopy size={18} aria-hidden="true"/>}Copy question</button>
          <Link to="/chat" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-500 px-4 py-3 font-semibold text-cyan-100">Open Luqi Chat <ArrowUpRight size={17} aria-hidden="true"/></Link>
        </div>
        <p role="status" aria-live="polite" className="text-xs text-slate-300">{copyStatus==="copied"?"Question copied. Paste it into Luqi Chat when ready.":copyStatus==="unavailable"?"Clipboard access unavailable. Select the text above and copy it manually.":"No question is sent automatically; Chat has separate sign-in, consent and usage limits."}</p>
        <p className="text-xs text-amber-100">Language selection is a request, not a guarantee of verified translation quality. Never send identity numbers, account credentials or sensitive private details in news queries.</p>
      </section>

      <section className="space-y-3" aria-labelledby="pulse-actions">
        <div className="space-y-1">
          <p className="text-sm font-medium text-cyan-300">03 · Act</p>
          <h2 id="pulse-actions" className="text-2xl font-bold">From news to useful steps</h2>
          <p className="text-sm text-slate-300">A radio discussion is not an official notice. Confirm critical details with the relevant institution before acting.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link to="/municipalities" className="min-w-0 space-y-2 rounded-xl border border-slate-700 bg-slate-900 p-5 hover:border-cyan-500"><h3 className="font-semibold">Municipal services</h3><p className="text-sm text-slate-300">Check water, rates, permits and service contacts against government listings.</p><span className="inline-flex items-center gap-1 text-cyan-200">Open guidance <ArrowUpRight size={16} aria-hidden="true"/></span></Link>
          <Link to="/opportunities" className="min-w-0 space-y-2 rounded-xl border border-slate-700 bg-slate-900 p-5 hover:border-cyan-500"><h3 className="font-semibold">Jobs & funding</h3><p className="text-sm text-slate-300">Verify original vacancy notices, deadlines and eligibility with the publisher.</p><span className="inline-flex items-center gap-1 text-cyan-200">Check sources <ArrowUpRight size={16} aria-hidden="true"/></span></Link>
          <Link to="/consumer-rights" className="min-w-0 space-y-2 rounded-xl border border-slate-700 bg-slate-900 p-5 hover:border-cyan-500"><h3 className="font-semibold">Consumer rights</h3><p className="text-sm text-slate-300">Use free, source-linked complaint guidance and practical next steps.</p><span className="inline-flex items-center gap-1 text-cyan-200">Explore help <ArrowUpRight size={16} aria-hidden="true"/></span></Link>
        </div>
      </section>
      <aside className="rounded-xl border border-slate-600 bg-slate-950 p-4 text-xs leading-relaxed text-slate-300" aria-label="Editorial and licensing information">
        Luqi is an independent information guide, not affiliated with, endorsed by, or rebroadcasting these publishers. Original reporting, audio, logos, comments and trademarks belong to their respective rights holders. No station streams, article bodies, recordings, private personalisations or automated story alerts are collected by this release. Source availability and published details can change; opinions from talk shows and callers should not be presented as verified facts.
      </aside>
    </main>
  );
}
