import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  Compass,
  Download,
  Globe2,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { trails, type Stop } from "./drive-navigation";

const key = "luqi.drive.field-notebook.v1";
const catalogue = new Map(
  trails.flatMap((trail) =>
    trail.stops.map((stop) => [stop.id, stop] as const),
  ),
);
function savedIds(): string[] | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(stored))
      return [
        ...new Set(
          stored.filter(
            (id): id is string => typeof id === "string" && catalogue.has(id),
          ),
        ),
      ];
  } catch {
    return null;
  }
  return [];
}
const sections = [
  ["english", "English"],
  ["sepitori", "Sepitori"],
  ["setswana", "Setswana"],
  ["isizulu", "isiZulu"],
] as const;
const place = (s: Stop) => (s.province ? s.area : s.name);

export function formatFieldGuide(stops: Stop[]): string {
  const blocks = stops.map((s, i) =>
    [
      i + 1 + ". " + place(s),
      ...sections.map(([lang, name]) => name + "\n" + s.descriptions[lang]),
      ...(s.story?.topics.map(
        (t) =>
          t.category + "\n" + t.fact + "\n" + s.story!.sources[t.source].url,
      ) ?? []),
      s.source.label + "\n" + s.source.url,
    ].join("\n\n"),
  );
  return (
    [
      "LUQI · SOUTH AFRICA FIELD GUIDE",
      "Written briefings for your saved places, in your chosen order. Source links need internet access.",
      ...blocks,
    ].join("\n\n━━━━━━━━━━━━━━━━━━━━\n\n") + "\n"
  );
}

export default function FieldNotebook({ guide }: { guide: Stop }) {
  const [ids, setIds] = useState(() => savedIds() ?? []);
  const [storageAvailable, setStorageAvailable] = useState(
    () => savedIds() !== null,
  );
  const [receipt, setReceipt] = useState("");
  const [reading, setReading] = useState<string | null>(null);
  const [language, setLanguage] =
    useState<(typeof sections)[number][0]>("english");
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setIds(savedIds() ?? []);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const saved = ids.map((id) => catalogue.get(id)!);
  const added = ids.includes(guide.id);
  const readingStop = saved.find((s) => s.id === reading);
  function persist(next: string[]) {
    setIds(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
    setReceipt("");
  }
  function move(id: string, direction: -1 | 1) {
    const next = [...(storageAvailable ? (savedIds() ?? ids) : ids)];
    const index = next.indexOf(id);
    const to = index + direction;
    if (index < 0 || to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    persist(next);
  }
  function change(id: string, add: boolean) {
    const current = storageAvailable ? (savedIds() ?? ids) : ids;
    const next = add
      ? [...new Set([...current, id])]
      : current.filter((old) => old !== id);
    persist(next);
  }
  async function download() {
    const bytes = new TextEncoder().encode(formatFieldGuide(saved));
    const file = new Blob([bytes], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "luqi-south-africa-field-guide.txt";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    setReceipt("Download requested.");
    try {
      const sum = await crypto.subtle.digest("SHA-256", bytes);
      const hex = Array.from(new Uint8Array(sum), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
      setReceipt("Last download · SHA-256 " + hex);
    } catch {
      setReceipt(
        "Download requested. A file checksum is unavailable in this browser.",
      );
    }
  }
  return (
    <section
      className="card driveGuide fieldNotebook"
      aria-labelledby="field-guide-title"
    >
      <div className="planningCardTop">
        <span className="driveOverline">
          <Bookmark size={14} /> YOUR JOURNEY, COLLECTED
        </span>
        <span className="drivePill">{saved.length} saved</span>
      </div>
      <h2 id="field-guide-title" tabIndex={-1}>
        My field guide
      </h2>
      <p className="planningIntro">
        Places worth keeping. Stories that travel with you.
      </p>
      <div className="notebookSpotlight">
        <div className="notebookTerrain" aria-hidden="true">
          <span />
          <span />
          <span />
          <Compass size={54} strokeWidth={1} />
          <i>EXPLORE · SAVE · DISCOVER</i>
        </div>
        <div className="notebookSpotlightBody">
          <span className="driveOverline">
            <MapPin size={12} /> SELECTED ON YOUR MAP
          </span>
          <strong className="notebookSpotlightName">{place(guide)}</strong>
          <p>{guide.province ? guide.name : guide.area}</p>
          <button
            type="button"
            className="drivePrimary"
            disabled={added}
            onClick={() => change(guide.id, true)}
          >
            {added ? <Check size={16} /> : <Plus size={16} />}
            {added ? "Saved to field guide" : "Save this place"}
          </button>
        </div>
      </div>
      <div className="notebookCollectionTitle">
        <h3>Your collection</h3>
        <span>
          {saved.length
            ? "Arrange your reading order"
            : "Your next discovery starts here"}
        </span>
      </div>
      {saved.length > 0 ? (
        <ol className="notebookPlaces">
          {saved.map((s, index) => (
            <li key={s.id}>
              <span className="notebookPlaceName">{place(s)}</span>
              <span className="notebookPlaceIndex" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <small className="notebookPlaceRegion">
                {s.province ? s.name : s.area}
              </small>
              <div className="notebookPlaceActions">
                <button
                  type="button"
                  className="notebookRead"
                  aria-label={"Read " + place(s)}
                  aria-expanded={readingStop?.id === s.id}
                  onClick={() => setReading(reading === s.id ? null : s.id)}
                >
                  <BookOpen size={14} /> Read
                </button>
                <button
                  type="button"
                  className="notebookIconButton"
                  disabled={index === 0}
                  aria-label={"Move " + place(s) + " up"}
                  onClick={() => move(s.id, -1)}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  className="notebookIconButton"
                  disabled={index === saved.length - 1}
                  aria-label={"Move " + place(s) + " down"}
                  onClick={() => move(s.id, 1)}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  className="notebookIconButton"
                  aria-label={"Remove " + place(s)}
                  onClick={() => change(s.id, false)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="notebookEmpty">
          <BookOpen size={25} />
          <div>
            <strong>A whole country to discover.</strong>
            <p>Save a place above to build a guide you can take offline.</p>
          </div>
        </div>
      )}
      {readingStop && (
        <div
          className="notebookReader"
          role="region"
          aria-label={"Saved guide: " + place(readingStop)}
        >
          <label>
            <Globe2 size={14} /> Reading language
            <select
              aria-label="Reading language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
            >
              {sections.map(([code, title]) => (
                <option key={code} value={code}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <h3>{place(readingStop)}</h3>
          <p
            lang={
              {
                english: "en-ZA",
                sepitori: "nso",
                setswana: "tn",
                isizulu: "zu",
              }[language]
            }
          >
            {readingStop.descriptions[language]}
          </p>
          <a
            href={readingStop.source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {readingStop.source.label} <ArrowUpRight size={13} />
          </a>
        </div>
      )}
      <div className="notebookDownload">
        <div>
          <Download size={20} />
          <span>
            <strong>Your guide, beyond the signal</strong>
            <small>Four languages · text file · sources included</small>
          </span>
        </div>
        <button
          type="button"
          className="driveSecondary"
          disabled={!saved.length}
          onClick={download}
        >
          <Download size={15} /> Download field guide (.txt)
        </button>
      </div>
      <small className="notebookStorage" role="status">
        {saved.length} {saved.length === 1 ? "place" : "places"} saved ·{" "}
        {storageAvailable
          ? "On this browser"
          : "Storage unavailable. Download before leaving."}
      </small>
      {receipt && (
        <small className="fieldReceipt" role="status">
          {receipt}
        </small>
      )}
      <div className="planningFooter">
        <ShieldCheck size={13} /> Saved on this browser · no account or location
        needed
      </div>
    </section>
  );
}
