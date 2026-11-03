import { useEffect, useState } from "react";
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
      "Written briefings for your saved places, in the order you added them. Source links need internet access.",
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
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setIds(savedIds() ?? []);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const saved = ids.map((id) => catalogue.get(id)!);
  const added = ids.includes(guide.id);
  function change(id: string, add: boolean) {
    const current = storageAvailable ? (savedIds() ?? ids) : ids;
    const next = add
      ? [...new Set([...current, id])]
      : current.filter((old) => old !== id);
    setIds(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
    setReceipt("");
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
      <div className="driveOverline">TRIP PLANNER</div>
      <h2 id="field-guide-title" tabIndex={-1}>
        My field guide
      </h2>
      <p>
        Choose a place on the map and save its story. Download your collection
        to read in four languages when coverage drops.
      </p>
      <div className="notebookAction">
        <strong>{place(guide)}</strong>
        <button
          type="button"
          className="drivePrimary"
          disabled={added}
          onClick={() => change(guide.id, true)}
        >
          {added ? "Saved to field guide" : "Save this place"}
        </button>
      </div>
      {saved.length > 0 && (
        <>
          <ol>
            {saved.map((s) => (
              <li key={s.id}>
                <span>{place(s)}</span>
                <button
                  type="button"
                  className="driveSecondary"
                  aria-label={"Remove " + place(s)}
                  onClick={() => change(s.id, false)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
          <button type="button" className="driveSecondary" onClick={download}>
            Download field guide (.txt)
          </button>
        </>
      )}
      <small role="status">
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
    </section>
  );
}
