import React, { useEffect, useRef, useState } from "react";
import { createMotionSmoother, EARTH_SOURCES, gibsImageUrl, loadEarthEvents, validImageryDay, yesterdayUtc, type EarthEvent, type MotionEstimate } from "./drive-earth";
import type { PhoneFix } from "./drive-navigation";
import "./drive-earth.css";

const SOURCE_LABELS: Record<string, string> = { gibs: "NASA imagery", events: "NASA event feed", sentinel: "Copernicus Sentinel-2", sansa: "SANSA access", gnss: "Browser location standard" };
const EVENT_LABELS: Record<string, string> = { wildfires: "Fire", floods: "Flood", severeStorms: "Severe storm" };

type PublicPlace = { id: string; name: string; lat: number; lon: number };
type LoadState = "idle" | "loading" | "ready" | "unavailable";

export default function DriveEarthPanel({ target, fix }: { target: PublicPlace; fix: PhoneFix | null }) {
  const smoother = useRef(createMotionSmoother());
  const [motion, setMotion] = useState<MotionEstimate | null>(null);
  useEffect(() => { setMotion(smoother.current.next(fix)); }, [fix]);
  // Keying the remote view drops old imagery when the selected public place changes.
  // It must require a fresh user action; GPS updates never trigger a remote request.
  return <section className="driveEarth" aria-labelledby="drive-earth-title">
    <div className="driveEarthHeading">
      <div><span className="driveOverline">SIGNAL & EARTH OBSERVATION</span><h2 id="drive-earth-title">Know the signal. See the region.</h2></div>
      <span className="driveEarthBadge">No provider subscription added</span>
    </div>
    <div className="driveEarthSignal" aria-label="On-device motion estimates">
      <div><small>DEVICE POSITION ACCURACY</small><strong>{fix ? `±${Math.ceil(fix.accuracy)} m` : "No current fix"}</strong></div>
      <div><small>SMOOTHED SPEED · ESTIMATE</small><strong>{motion?.speed != null ? `≈${motion.speed} km/h` : "—"}</strong></div>
      <div><small>SMOOTHED COURSE · ESTIMATE</small><strong>{motion?.heading != null ? `≈${Math.round(motion.heading) % 360}°` : "—"}</strong></div>
    </div>
    <p className="driveEarthHint">High-accuracy location is requested by “Use phone GPS”. Motion smoothing runs only in this tab. It can lag changes and does not improve the phone’s reported position accuracy or provide lane guidance.</p>
    <EarthContext key={target.id} target={target} />
    <details className="driveEarthLimits"><summary>Satellite sources, precision and costs</summary>
      <p>The browser does not expose constellation/frequency selection or an RTCM correction input. TrigNet/RTK is not connected. Sub-metre accuracy requires a compatible, validated positioning chain; it is not unlocked by a Kalman filter.</p>
      <p>NASA MODIS imagery is regional context, not 10 m imagery or a live camera. Sentinel-2 offers some 10 m bands, but its imagery/NDVI processing is not connected here. SANSA access and licensing depend on the dataset; no SANSA connection is claimed.</p>
      <p>Event reports are incomplete and delayed. This is not a weather forecast, emergency warning, road-closure feed or groundwater/borehole detector. An empty feed is not an all-clear. No paid AI or new provider subscription is used; mobile data, existing hosting and provider limits still apply.</p>
      <div className="driveEarthSources">{Object.entries(EARTH_SOURCES).map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer">{SOURCE_LABELS[name]} ↗</a>)}</div>
    </details>
  </section>;
}

function EarthContext({ target }: { target: PublicPlace }) {
  const [day, setDay] = useState(() => yesterdayUtc());
  const [image, setImage] = useState<{ url: string; day: string } | null>(null);
  const [imageState, setImageState] = useState<LoadState>("idle");
  const [eventsState, setEventsState] = useState<LoadState>("idle");
  const [events, setEvents] = useState<EarthEvent[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const loading = imageState === "loading" || eventsState === "loading";
  useEffect(() => () => { generation.current += 1; controller.current?.abort(); }, []);
  useEffect(() => {
    if (imageState !== "loading") return;
    const timeout = window.setTimeout(() => setImageState("unavailable"), 15000);
    return () => window.clearTimeout(timeout);
  }, [image, imageState]);

  async function loadContext() {
    if (!validImageryDay(day) || loading) return;
    const token = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setImage({ url: gibsImageUrl(target, day), day });
    setImageState("loading"); setEventsState("loading"); setEvents([]); setCheckedAt(null);
    const timeout = window.setTimeout(() => abort.abort(), 10000);
    try {
      const data = await loadEarthEvents(abort.signal);
      if (generation.current !== token) return;
      setEvents(data); setCheckedAt(new Date().toISOString()); setEventsState("ready");
    } catch {
      if (generation.current === token) setEventsState("unavailable");
    } finally { window.clearTimeout(timeout); }
  }
  function clearContext() {
    generation.current += 1; controller.current?.abort();
    setImage(null); setImageState("idle"); setEventsState("idle"); setEvents([]); setCheckedAt(null);
  }
  return <>
    <div className="driveEarthControls">
      <div><h3>Satellite view · {target.name}</h3><p>Selected public landmark, not your phone location. Set up while parked, or ask a passenger.</p></div>
      <label>Imagery day (UTC)<input type="date" value={day} min="2000-02-24" max={new Date().toISOString().slice(0, 10)} onChange={e => { clearContext(); setDay(e.target.value); }} /></label>
      <button type="button" className="drivePrimary" disabled={loading || !validImageryDay(day)} onClick={() => { void loadContext(); }}>{loading ? "Loading NASA context…" : "Load NASA satellite context"}</button>
      {(image || eventsState !== "idle") && <button type="button" className="driveSecondary" onClick={clearContext}>Clear satellite context</button>}
    </div>
    <p className="driveEarthHint">Loading contacts NASA for this public place and a regional event feed. NASA receives your IP address; your exact GPS is not sent. Nothing loads automatically. Mobile data charges may apply.</p>
    <div className="driveEarthGrid">
      <figure className="driveEarthImage">
        {image && imageState !== "unavailable" ? <img key={image.url} src={image.url} width={640} height={640} alt={`NASA MODIS regional imagery around ${target.name}, requested day ${image.day}. Cloud and coverage gaps may hide the ground.`} referrerPolicy="no-referrer" crossOrigin="anonymous" decoding="async" onLoad={() => setImageState("ready")} onError={() => setImageState("unavailable")} /> : <div className="driveEarthPlaceholder">{imageState === "unavailable" ? "Imagery unavailable. Try another date or retry later." : "Your regional satellite view appears here after you load it."}</div>}
        <figcaption>NASA GIBS · MODIS Terra true colour · 250 m visualization{image ? ` · requested day ${image.day} UTC` : ""}. Clouds, missing coverage and processing delay are possible. Requested day is not a verified capture time for every pixel.</figcaption>
      </figure>
      <div className="driveEarthEvents" aria-live="polite">
        <span className="driveOverline">REGIONAL EVENT REPORTS</span><h3>Fires, floods & severe storms</h3>
        <p>NASA EONET · South Africa and nearby region · reported observations from the last seven days, independent of the imagery date. Up to ten records, not a complete hazard inventory.</p>
        {eventsState === "idle" && <p>Not loaded. Your trip planning and GPS do not need this feed.</p>}
        {eventsState === "loading" && <p>Requesting NASA event reports…</p>}
        {eventsState === "unavailable" && <p role="status">Event feed unavailable. Conditions are unknown; no safety conclusion can be drawn.</p>}
        {eventsState === "ready" && <>
          <small>Feed retrieved: {checkedAt?.replace("T", " ").slice(0, 19)} UTC</small>
          {!events.length && <p>No recent matching records returned. This does not mean there are no fires, floods or storms.</p>}
          <ul>{events.map(event => <li key={event.id}><strong>{event.title}</strong><span>{event.categories.map(c => (EVENT_LABELS[c] || c)).join(" / ")} · source marks {event.closed === null ? "status unknown" : event.closed ? "closed" : "open"}</span><small>Latest reported observation: {event.date.replace("T", " ").slice(0, 19)} UTC</small><a href={`https://eonet.gsfc.nasa.gov/api/v3/events/${encodeURIComponent(event.id)}`} target="_blank" rel="noreferrer">NASA event record ↗</a></li>)}</ul>
        </>}
      </div>
    </div>
  </>;
}
