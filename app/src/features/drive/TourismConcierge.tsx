import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Stop } from "./drive-navigation";
import {
  TOURISM_PERSONAS,
  canRequestTourismBrief,
  synthesizeLocalConcierge,
  tourismContentSha256,
  type ConciergeRole,
  type TourismBrief,
  type TravelPersona,
} from "./tourism-swarm";
import "./tourism-concierge.css";

export default function TourismConcierge({
  guide, gpsActive, speedKmh,
}: {
  guide: Stop;
  gpsActive: boolean;
  speedKmh: number | null;
}) {
  const [persona, setPersona] = useState<TravelPersona>("HERITAGE_ROOTS");
  const [role, setRole] = useState<ConciergeRole>("unselected");
  const [budget, setBudget] = useState("");
  const [brief, setBrief] = useState<TourismBrief | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const version = useRef(0);
  const allowed = canRequestTourismBrief(role, gpsActive, speedKmh);
  const moving = gpsActive && speedKmh !== null && speedKmh >= 5;

  useEffect(() => {
    version.current += 1;
    setBrief(null);
    setDigest(null);
    setMessage("");
  }, [guide.id, persona, budget, role, allowed]);

  function buildBriefing() {
    if (!allowed) return;
    if (!guide.story) {
      setMessage("No source-linked local concierge pack has been curated for this area yet.");
      return;
    }
    const ceiling = budget.trim() === "" ? null : Number(budget);
    let next: TourismBrief | null;
    try {
      next = synthesizeLocalConcierge(guide.story.id, persona, ceiling);
    } catch {
      setMessage("Enter a positive budget in rand (maximum R10 million; two decimals).");
      return;
    }
    if (!next) {
      setMessage("This area has no source-linked four-lens briefing.");
      return;
    }
    const token = ++version.current;
    setBrief(next);
    setDigest(null);
    setMessage("Offline editorial briefing created. This is not a live tourism service.");
    void tourismContentSha256(next).then((hash) => {
      if (version.current === token) setDigest(hash ?? "unavailable");
    });
  }

  return (
    <section className="card driveGuide driveConcierge" aria-labelledby="tourism-concierge-title">
      <div className="driveOverline">TOOL 020 · OFFLINE RESEARCH LENSES</div>
      <h2 id="tourism-concierge-title">Four-lens tourism concierge</h2>
      <p>
        Regional stories without paid inference or background location tracking.
        These editorial facts are in English; the main stop narratives above
        offer other languages.
      </p>
      <div className="tourismControls">
        <label>
          Travel style
          <select value={persona} onChange={(e) => setPersona(e.target.value as TravelPersona)}>
            {TOURISM_PERSONAS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          Total budget ceiling (ZAR)
          <input type="number" min="0.01" max="10000000" step="0.01"
            inputMode="decimal" value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Optional; prices not assumed" />
        </label>
      </div>
      <fieldset className="tourismRole">
        <legend>Who is using this screen?</legend>
        <label>
          <input type="radio" name="tourism-role" checked={role === "passenger"}
            onChange={() => setRole("passenger")} />
          I am a passenger
        </label>
        <label>
          <input type="radio" name="tourism-role" checked={role === "stopped"}
            onChange={() => setRole("stopped")} />
          I am safely stopped
        </label>
      </fieldset>
      {moving && role === "stopped" && (
        <p role="alert">Movement detected. The parked selection cannot unlock driver interaction.</p>
      )}
      {gpsActive && speedKmh === null && role === "stopped" && (
        <p role="status">Speed is unknown. Stop phone GPS first or let a passenger use the screen.</p>
      )}
      <button type="button" className="drivePrimary"
        disabled={!allowed || !guide.story} onClick={buildBriefing}>
        Create source-linked briefing
      </button>
      {!guide.story && <p>No local four-lens pack is available for this selected place yet.</p>}
      {message && <p role="status">{message}</p>}
      {brief && allowed && (
        <>
          <p className="tourismSummary">
            {brief.areaTitle} · {brief.vicinity} · {brief.distinctSourceCount} distinct linked sources.
            {brief.budgetCeilingZar === null
              ? " No budget target entered."
              : " Budget target R" + brief.budgetCeilingZar.toFixed(2) + " (not a quote)."}
            {" "}No verified venue fees or live booking data are available; total trip cost is unknown.
          </p>
          <div className="tourismAgentGrid">
            {brief.agents.map((agent, index) => (
              <article key={agent.id} className="tourismAgent">
                <div className="driveOverline">LENS {String(index + 1).padStart(2, "0")}</div>
                <h3>{agent.title}</h3>
                <ul>
                  {agent.findings.map((finding) => (
                    <li key={agent.id + finding.category}>
                      <strong>{finding.category}</strong>
                      <p>{finding.text}</p>
                      <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {finding.sourceLabel} — original source
                      </a>
                    </li>
                  ))}
                </ul>
                {agent.status === "NOT_AVAILABLE" && <p>Source-backed content unavailable.</p>}
                <p className="tourismLimitation">{agent.limitation}</p>
              </article>
            ))}
          </div>
          <p className="tourismChecksum">
            Editorial SHA-256 checksum: <code>{digest ?? "Calculating…"}</code>
            {" "}This checks bytes, not publisher identity or factual correctness. It is not a signature.
          </p>
        </>
      )}
      <p className="tourismLimit">
        No live weather, wildlife sightings, road hazards, emergency dispatch,
        venue certification, prices or bookings. Links require internet.
        Never operate the screen while driving.
      </p>
      <Link to="/businesses">Browse Luqi Business Connect public listings</Link>
      <p className="tourismLimit">Individual directory businesses still require independent checks.</p>
    </section>
  );
}
