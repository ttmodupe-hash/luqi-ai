import { useState } from "react";
import { Link } from "react-router";
import { BookOpen, LibraryBig, Search, ShieldAlert, Clock3, ArrowLeft } from "lucide-react";
import { trpc } from "@/providers/trpc";

type Archive = "history" | "heritage" | "iks";
type Choice = { archive: Archive; id: string };

const TABS: { id: Archive | "all"; label: string; description: string }[] = [
  { id: "all", label: "All archives", description: "History, heritage and Indigenous Knowledge Systems" },
  { id: "history", label: "African history", description: "Civilizations, scholarship, resistance and liberation" },
  { id: "heritage", label: "Living heritage", description: "Manuscripts, scholarly traditions and deep history" },
  { id: "iks", label: "Indigenous knowledge", description: "Documented traditional plant knowledge with cautions" },
];

export default function AfricanKnowledgeArchivePage() {
  const [archive, setArchive] = useState<Archive | "all">("all");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Choice | null>(null);
  const [timeline, setTimeline] = useState(false);
  const overview = trpc.omegaKnowledge.overview.useQuery();
  const listing = trpc.omegaKnowledge.list.useQuery({
    archive: archive === "all" ? undefined : archive,
    query: query.trim() || undefined,
    limit: 12,
    offset,
    timeline,
  });
  const detail = trpc.omegaKnowledge.detail.useQuery(
    { archive: selected?.archive ?? "history", id: selected?.id ?? "not-selected" },
    { enabled: selected !== null },
  );

  const currentTab = TABS.find((tab) => tab.id === archive) ?? TABS[0];
  const chooseArchive = (next: Archive | "all") => {
    setArchive(next);
    setOffset(0);
    setSelected(null);
    setTimeline(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold">
            <LibraryBig className="h-5 w-5" />
            LUQI African Knowledge Library
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Africa's knowledge, with its sources and context
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">
            Explore a locally bundled educational archive of African history, heritage,
            and traditional knowledge. These are curated study references, not AI-generated
            answers or automatically verified historical facts.
          </p>
          <Link to="/vocational-skills"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/10">
            Explore vocational skills and career practice roadmaps →
          </Link>
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-xs leading-5 text-amber-100">
            Bibliographic references are preserved from the OMEGA Super AI repository,
            but they have not all been independently fact-checked for this LUQI release.
            Historiographical debates should remain debates.
          </div>
        </header>

        <section aria-label="Explore archives" className="mt-8">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button type="button" key={tab.id} onClick={() => chooseArchive(tab.id)}
                aria-pressed={archive === tab.id}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  archive === tab.id
                    ? "border-amber-500 bg-amber-500/15 text-amber-200"
                    : "border-slate-700 text-slate-300 hover:border-amber-600"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">{currentTab.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="relative block w-full max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <span className="sr-only">Search the African knowledge library</span>
              <input value={query} onChange={(event) => { setQuery(event.target.value); setOffset(0); setSelected(null); }}
                maxLength={160} placeholder="Search Kush, Ethiopian manuscripts, lengana…"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-3 text-sm focus:border-amber-500 focus:outline-none"/>
            </label>
            {archive === "history" && (
              <button type="button" onClick={() => { setTimeline(!timeline); setOffset(0); }}
                aria-pressed={timeline}
                className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2.5 text-sm text-slate-200">
                <Clock3 className="h-4 w-4" /> {timeline ? "A–Z" : "Timeline"}
              </button>
            )}
          </div>
        </section>

        {overview.data && (
          <p className="mt-5 text-xs text-slate-400">
            {overview.data.entryCount} curated entries from OMEGA Super AI.
            Original source material: <a className="underline hover:text-amber-200"
              href={overview.data.sourceRepository} target="_blank" rel="noopener noreferrer">
              {overview.data.sourceRepository}
            </a>.
          </p>
        )}

        {archive === "iks" && (
          <div role="note" className="mt-5 rounded-xl border border-orange-800/60 bg-orange-950/25 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-orange-200">
              <ShieldAlert className="h-4 w-4" /> Catalogue, not clinic
            </p>
            <p className="mt-2 text-xs leading-6 text-orange-100">
              Traditional uses are historical descriptions, not treatments, instructions,
              efficacy claims, diagnoses, prescriptions or doses. Consult a qualified
              healthcare professional or registered traditional health practitioner.
              Community ownership and attribution must be respected.
            </p>
          </div>
        )}

        {selected ? (
          <section aria-label="Archive entry details" className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/75 p-5 sm:p-7">
            <button type="button" onClick={() => setSelected(null)}
              className="mb-5 flex items-center gap-2 text-sm text-amber-300 hover:text-amber-100">
              <ArrowLeft className="h-4 w-4" /> Back to entries
            </button>
            {detail.isLoading && <p className="text-slate-300">Loading source detail…</p>}
            {detail.isError && <p role="alert" className="text-red-300">This source detail is unavailable.</p>}
            {detail.data && (
              <article className="space-y-5">
                <p className="text-xs uppercase tracking-wider text-amber-300">{detail.data.archive} · {detail.data.topic} · {detail.data.region}</p>
                <h2 className="text-2xl font-bold">{detail.data.title}</h2>
                {detail.data.period && <p className="text-sm text-slate-400">{detail.data.period}</p>}
                <p className="whitespace-pre-wrap leading-7 text-slate-200">{detail.data.summary}</p>
                {detail.data.description !== detail.data.summary && (
                  <p className="whitespace-pre-wrap leading-7 text-slate-200">{detail.data.description}</p>
                )}
                {detail.data.scholarlyNote && (
                  <aside className="rounded-xl border border-blue-800/60 p-4 text-sm text-blue-100">
                    <strong>Scholarly context:</strong> {detail.data.scholarlyNote}
                  </aside>
                )}
                {detail.data.researchNote && (
                  <aside className="rounded-xl border border-slate-700 p-4 text-sm text-slate-200">
                    <strong>Research status:</strong> {detail.data.researchNote}
                  </aside>
                )}
                {detail.data.keyPoints && (
                  <section><h3 className="mb-2 font-semibold">Key learning points</h3>
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
                      {detail.data.keyPoints.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                  </section>
                )}
                {detail.data.traditionalUse && (
                  <section><h3 className="mb-2 font-semibold">Recorded traditional uses (historical documentation)</h3>
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
                      {detail.data.traditionalUse.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </section>
                )}
                {detail.data.caution && (
                  <section className="rounded-xl border border-orange-700/60 p-4">
                    <h3 className="mb-2 font-semibold text-orange-200">Safety cautions</h3>
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-orange-100">
                      {detail.data.caution.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </section>
                )}
                <section className="border-t border-slate-700 pt-5">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <BookOpen className="h-5 w-5 text-amber-300" /> Source references
                  </h3>
                  <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-300">
                    {detail.data.references.map((source, i) => <li key={i}>{source}</li>)}
                  </ol>
                  <p className="mt-4 text-xs leading-5 text-slate-400">{detail.data.editorialNote}</p>
                  {detail.data.traditionalKnowledgeNote && (
                    <p className="mt-2 text-xs leading-5 text-orange-200">{detail.data.traditionalKnowledgeNote}</p>
                  )}
                </section>
              </article>
            )}
          </section>
        ) : (
          <section aria-label="Search results" className="mt-7">
            {listing.isLoading && <p className="text-sm text-slate-400">Loading locally curated entries…</p>}
            {listing.isError && <p role="alert" className="text-sm text-red-300">The archive could not be loaded.</p>}
            {listing.data && (
              <>
                <p className="mb-4 text-sm text-slate-400">
                  {listing.data.total} matching {listing.data.total === 1 ? "entry" : "entries"}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {listing.data.entries.map((item) => (
                    <button type="button" key={item.archive + ":" + item.id}
                      onClick={() => setSelected({ archive: item.archive, id: item.id })}
                      className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5 text-left transition-colors hover:border-amber-600 focus-visible:outline-amber-500">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                        {item.archive} · {item.topic}
                      </p>
                      <h2 className="text-lg font-semibold">{item.title}</h2>
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-300">{item.summary}</p>
                      <p className="mt-3 text-xs text-slate-400">{item.region} · {item.referenceCount} source references</p>
                    </button>
                  ))}
                </div>
                {listing.data.total === 0 && (
                  <p className="rounded-xl border border-slate-700 p-4 text-sm text-slate-300">
                    No curated match was found. The archive will not invent an answer.
                  </p>
                )}
                <div className="mt-6 flex gap-3">
                  <button type="button" disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - 12))}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-40">Previous</button>
                  <button type="button" disabled={offset + 12 >= listing.data.total}
                    onClick={() => setOffset(offset + 12)}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-40">Next</button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
