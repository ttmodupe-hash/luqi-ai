import { useEffect, useState } from "react";
import { Rss, ExternalLink } from "lucide-react";

/**
 * LiveUpdates — real municipal/utility headlines from the server when
 * SERPER_API_KEY is configured; an honest note when it is not.
 * The page's own schedules and calculators never depend on it.
 */
export default function LiveUpdates({ topic }: { topic: "water" | "load-shedding" }) {
  const [headlines, setHeadlines] = useState<{ title: string; link: string; source?: string; date?: string }[]>([]);
  const [live, setLive] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch(`/api/v25/insights/utility-feed?topic=${encodeURIComponent(topic)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setHeadlines(d.headlines || []);
        setLive(!!d.live);
        if (d.note) setNote(d.note);
      })
      .catch(() => setNote("Live feed unreachable — page tools work fully offline."));
  }, [topic]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Rss className="h-4 w-4 text-cyan-400" />
        <p className="text-sm font-semibold text-white">Live Updates</p>
        <span className={`text-[10px] px-2 py-0.5 rounded border ${live ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-neutral-800 text-neutral-500 border-neutral-700"}`}>
          {live ? "LIVE" : "OFFLINE MODE"}
        </span>
      </div>
      {headlines.length > 0 ? (
        <ul className="space-y-2">
          {headlines.map((h, i) => (
            <li key={i}>
              <a href={h.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-neutral-300 hover:text-cyan-400 transition-colors">
                <ExternalLink className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-neutral-500" />
                <span>{h.title} <span className="text-neutral-600 text-xs">{h.source ? `— ${h.source}` : ""}{h.date ? ` · ${h.date}` : ""}</span></span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-neutral-500">{note || "No live headlines right now."}</p>
      )}
    </div>
  );
}
