import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router";
import DriveMap from "./DriveMap";
import {
  LocateFixed,
  Navigation,
  MapPin,
  Play,
  Pause,
  SkipForward,
  Compass,
  ArrowUpRight,
} from "lucide-react";
import {
  trails,
  distanceKm,
  compass,
  demoFrame,
  legSeconds,
  readFix,
  matchLandmark,
} from "./drive-navigation";
import { regionalMap as map } from "./drive-map";
import type { PhoneFix, Trail } from "./drive-navigation";
import "./drive.css";
import TripFuel from "./TripFuel";
import {
  DriveVoiceControls,
  languages,
  useDriveVoice,
  type LanguageKey,
} from "./DriveVoice";
const fmtKm = (n: number) =>
  n < 1
    ? Math.round(n * 1000) + " m"
    : (n < 10 ? n.toFixed(1) : Math.round(n)) + " km";
export default function LuqiDrivePage() {
  const [params, setParams] = useSearchParams();
  const narration = useRef({
    seen: new Map<string, number>(),
    lastAttempt: -Infinity,
  }).current;
  const trail = trails.find((t) => t.id === params.get("trail")) ?? trails[0];
  const [lang, setLang] = useState<LanguageKey>("english");
  function switchTrail(id: string) {
    const next = new URLSearchParams(params);
    if (id === trails[0].id) next.delete("trail");
    else next.set("trail", id);
    setParams(next);
  }
  return (
    <DriveSession
      key={trail.id}
      {...{ trail, lang, setLang, switchTrail, narration }}
    />
  );
}
function DriveSession({
  narration,
  trail,
  lang,
  setLang,
  switchTrail,
}: {
  narration: { seen: Map<string, number>; lastAttempt: number };
  trail: Trail;
  lang: LanguageKey;
  setLang: (lang: LanguageKey) => void;
  switchTrail: (id: string) => void;
}) {
  const { stops } = trail;
  const national = trail.id === "za";
  const demoSeconds = stops.length * legSeconds;
  const [mode, setMode] = useState("preview"),
    [selected, setSelected] = useState(0);
  const [elapsed, setElapsed] = useState(0),
    [playing, setPlaying] = useState(false);
  const [fix, setFix] = useState<PhoneFix | null>(null),
    [notice, setNotice] = useState("");
  const [following, setFollowing] = useState(false),
    [resetKey, setResetKey] = useState(0);
  const [auto, setAuto] = useState(false);
  const voice = useDriveVoice(lang),
    watch = useRef<number | null>(null),
    generation = useRef(0);
  const { available, speak } = voice;
  const demo = demoFrame(elapsed, trail),
    isGPS = mode === "gps",
    isDemo = mode === "demo";
  const targetIndex = isDemo ? demo.leg : selected;
  const target = stops[targetIndex],
    point = isGPS ? fix : isDemo && !national ? demo : null;
  const match = isGPS ? matchLandmark(fix, trail) : null;
  const guide = stops[match ?? targetIndex];
  const range = point ? distanceKm(point, target) : null;
  const course = point?.heading ?? null;
  const tag = isGPS
    ? fix
      ? "DEVICE GPS"
      : "ACQUIRING GPS"
    : isDemo
      ? demo.arrived
        ? "DEMO COMPLETE"
        : playing
          ? "DEMO IN MOTION"
          : "DEMO PAUSED"
      : "ROUTE PREVIEW";

  function stopWatch() {
    generation.current += 1;
    if (watch.current !== null)
      navigator.geolocation?.clearWatch(watch.current);
    watch.current = null;
  }
  useEffect(() => () => stopWatch(), []);
  useEffect(() => {
    if (!isDemo || !playing) return;
    const clock = window.setInterval(() => {
      if (!document.hidden) setElapsed((t) => Math.min(demoSeconds, t + 0.25));
    }, 250);
    return () => clearInterval(clock);
  }, [isDemo, playing]);
  useEffect(() => {
    if (elapsed >= demoSeconds) setPlaying(false);
  }, [elapsed]);
  useEffect(() => {
    if (!isGPS || !fix) return;
    const timer = window.setTimeout(
      () => {
        setFix(null);
        setNotice("GPS signal is stale. Waiting for a fresh position.");
      },
      Math.max(0, fix.timestamp + 30000 - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [isGPS, fix]);
  const guideKey = guide.id + "/" + lang;
  function listen() {
    if (match === null) {
      speak(guide);
      return;
    }
    narration.lastAttempt = Date.now();
    speak(guide, () => narration.seen.set(guideKey, Date.now()));
  }
  useEffect(() => {
    if (match === null || !auto || document.hidden || !available) return;
    const now = Date.now();
    if (now - (narration.seen.get(guideKey) ?? -Infinity) < 86400000) return;
    if (now - narration.lastAttempt < 180000) return;
    listen();
  }, [auto, match, guideKey, available, listen, narration]);

  function resetMap(follow: boolean) {
    setFollowing(follow);
    setResetKey((k) => k + 1);
  }
  function preview(i: number) {
    stopWatch();
    voice.stop();
    setFix(null);
    setNotice("");
    setMode("preview");
    setPlaying(false);
    setSelected(i);
    resetMap(!national);
  }
  function choose(i: number) {
    if (isGPS && !national) {
      setSelected(i);
      return;
    }
    preview(i);
  }
  function startDemo() {
    stopWatch();
    voice.stop();
    setFix(null);
    setNotice("");
    setMode("demo");
    setElapsed((isDemo && demo.arrived ? 0 : selected) * legSeconds);
    setPlaying(true);
    resetMap(!national);
  }
  function startGps() {
    stopWatch();
    voice.stop();
    setFix(null);
    setPlaying(false);
    setSelected(targetIndex);
    if (!navigator.geolocation || !window.isSecureContext) {
      setMode("preview");
      setNotice(
        "Phone GPS is unavailable here. You can still run the drive demo.",
      );
      return;
    }
    setMode("gps");
    resetMap(!national);
    setNotice(
      "Allow location in your browser to show your position on the map.",
    );
    const token = generation.current;
    function fail(denied: boolean) {
      stopWatch();
      setMode("preview");
      setFix(null);
      resetMap(false);
      setNotice(
        denied
          ? "Location permission was declined. The drive demo is available."
          : "Device location could not start. Try again or use the demo.",
      );
    }
    try {
      watch.current = navigator.geolocation.watchPosition(
        (position) => {
          if (generation.current !== token) return;
          const next = readFix(position);
          if (!next) {
            setFix(null);
            setNotice("Waiting for a fresh, valid GPS position.");
            return;
          }
          setFix(next);
          const near = matchLandmark(next, trail);
          if (national && near !== null) setSelected(near);
          setNotice(
            next.accuracy > trail.maxAccuracy
              ? "Approximate fix. Landmark matching needs a more precise signal."
              : near !== null
                ? national
                  ? "Phone GPS places you in " +
                    stops[near].name +
                    ". The province guide is ready."
                  : "Near " +
                    stops[near].name +
                    ". The local briefing is ready."
                : national
                  ? "Your province could not be confirmed at this position. Choose one on the map."
                  : "Outside this trail’s story areas. Distance is measured in a straight line.",
          );
        },
        (error) => {
          if (generation.current !== token) return;
          if (error.code === 1) fail(true);
          else {
            setFix(null);
            setNotice(
              "No current GPS fix. Waiting for signal. You can stop GPS or try the demo.",
            );
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    } catch {
      fail(false);
    }
  }
  const status =
    notice ||
    (isDemo
      ? national
        ? "Province tour. Browse featured places without sharing your location."
        : "Accelerated demo along a schematic line. Device location is off."
      : "Preview the trail or use your phone’s position. Location stays in this tab.");
  return (
    <section className="driveDesk" aria-label="Luqi-Drive road companion">
      <header className="driveHeader">
        <div className="driveOverline">
          <Navigation size={15} /> KHORO OS / ROAD COMPANION
        </div>
        <h1>
          Luqi<span>-Drive</span>
        </h1>
        <p>Follow your position and discover the places around you.</p>
      </header>
      <nav className="driveTrails" aria-label="Driving corridors">
        {trails.map((t) => (
          <button
            key={t.id}
            aria-pressed={trail.id === t.id}
            onClick={() => switchTrail(t.id)}
          >
            {t.name}
          </button>
        ))}
      </nav>
      <DriveVoiceControls {...{ lang, listen, voice }} changeLang={setLang} />
      <div className="driveLayout">
        <div className="driveSurface">
          <div className="driveBanner">
            <div className="driveIcon">
              <Navigation size={29} />
            </div>
            <div className="driveTarget">
              <span>
                {isDemo && demo.arrived
                  ? national ? "FINAL PROVINCE" : "FINAL LANDMARK"
                  : isGPS
                    ? national
                      ? "PROVINCE GUIDE"
                      : "SELECTED LANDMARK"
                    : national
                      ? "EXPLORE A PROVINCE"
                      : "NEXT LANDMARK"}
              </span>
              <h2>{target.name}</h2>
              <small>{target.area}</small>
            </div>
            <div className="driveStatus">
              <i className={isGPS && fix ? "live" : isDemo ? "demo" : ""} />
              {tag}
            </div>
          </div>
          <DriveMap
            trail={trail}
            onSelectProvince={choose}
            point={point}
            target={target}
            mode={mode}
            following={following}
            setFollowing={setFollowing}
            resetKey={resetKey}
          />
          <div className="driveHUD">
            <div>
              <small>
                {national ? "DISTANCE TO FEATURED PLACE" : "DIRECT DISTANCE"}
              </small>
              <strong>{range === null ? "—" : fmtKm(range)}</strong>
            </div>
            <div>
              <small>{isGPS ? "DEVICE COURSE" : "DEMO COURSE"}</small>
              <strong>
                {compass(course)}{" "}
                {course !== null && <em>{Math.round(course) % 360}°</em>}
              </strong>
            </div>
            <div>
              <small>
                {isGPS ? "DEVICE SPEED" : national ? "PROVINCE" : "GUIDE STOP"}
              </small>
              <strong>
                {isGPS
                  ? fix?.speed != null
                    ? fix.speed + " km/h"
                    : "—"
                  : String(targetIndex + 1).padStart(2, "0") +
                    " / " +
                    String(stops.length).padStart(2, "0")}
              </strong>
            </div>
          </div>
          <div className="driveControlRow">
            <button
              className="drivePrimary"
              onClick={isGPS ? () => preview(targetIndex) : startGps}
            >
              <LocateFixed size={17} />
              {isGPS ? "Stop phone GPS" : "Use phone GPS"}
            </button>
            <button
              className="driveSecondary"
              onClick={
                isDemo && !demo.arrived
                  ? () => setPlaying((v) => !v)
                  : startDemo
              }
            >
              {isDemo && playing ? <Pause size={15} /> : <Play size={15} />}
              {isDemo
                ? demo.arrived
                  ? "Replay demo"
                  : playing
                    ? "Pause demo"
                    : "Resume demo"
                : national
                  ? "Start province tour"
                  : "Start drive demo"}
            </button>
            {isDemo && !demo.arrived && (
              <button
                className="driveSkip"
                aria-label="Skip to next demo stop"
                onClick={() =>
                  setElapsed((t) =>
                    Math.min(
                      demoSeconds,
                      (Math.floor(t / legSeconds) + 1) * legSeconds,
                    ),
                  )
                }
              >
                <SkipForward size={17} />
              </button>
            )}
          </div>
          {(guide.story || national) && (
            <div className="driveStoryStrip">
              <small>
                {match !== null
                  ? national
                    ? "PROVINCE STORY"
                    : "NEARBY STORY"
                  : "STORY PREVIEW"}{" "}
                · {guide.name}
              </small>
              <p lang={languages[lang].lang}>{guide.descriptions[lang]}</p>
            </div>
          )}
          <p className="driveNote" role="status">
            {status}
            {isGPS && fix && " Accuracy ±" + fmtKm(fix.accuracy / 1000) + "."}
          </p>
        </div>
        <aside className="driveStops">
          <div className="driveOverline">
            <MapPin size={14} /> {trail.region.toUpperCase()}
          </div>
          <h2>{national ? "All nine provinces" : "Landmark trail"}</h2>
          <p>
            {national
              ? "Choose a province to see its featured place and hear its guide."
              : "Choose a stop to explore its guide."}
          </p>
          <div className="driveStopList">
            {stops.map((s, i) => (
              <button
                key={s.id}
                aria-pressed={targetIndex === i}
                onClick={() => choose(i)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <b>{s.name}</b>
                  <small>{s.area}</small>
                </div>
              </button>
            ))}
          </div>
          <div className="driveLegend">
            {national ? (
              "Province boundaries · featured places"
            ) : (
              <>
                <i /> Landmark guide line
              </>
            )}
            <br />
            <small>
              Distances are straight-line estimates. For driving directions,
              choose a visitor destination below.
            </small>
          </div>
          {target.destination && (
            <a
              className="driveDirections"
              href={
                "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" +
                encodeURIComponent(target.destination)
              }
              target="_blank"
              rel="noreferrer"
            >
              Road directions in Maps <ArrowUpRight size={15} />
            </a>
          )}
          {!target.destination && (
            <small className="driveDirections">
              Magaliesberg marks a region. Choose your visitor entrance in your
              navigation app.
            </small>
          )}
        </aside>
      </div>
      <details className="driveCredits">
        <summary>About this map</summary>
        <p>
          The national view covers all nine provinces. GPS suggests a province
          away from uncertain boundaries. Featured places are reference points.
          Province boundaries: geoBoundaries, OCHA ROSEA and the South African
          Municipal Demarcation Board.{" "}
          <a
            href="https://www.geoboundaries.org/"
            target="_blank"
            rel="noreferrer"
          >
            Map source
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/3.0/igo/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 3.0 IGO
          </a>
          . The map highlights story areas on your selected trail. Lines between
          numbered stops illustrate the heritage trail. Road lines are
          approximate and are for regional orientation. Device fixes outside
          this area appear on a coordinate grid.
        </p>
        <p>{typeof map.attribution === "string" && map.attribution}</p>
        {(map.sources || [])
          .filter((s) => s.url && /^https?:\/\//.test(s.url))
          .map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
              {s.label || s.url} ↗{" "}
            </a>
          ))}
      </details>
      <div className="card driveGuide">
        <div className="driveOverline">
          <Compass size={14} /> LOCAL BRIEFING
        </div>
        <h2 id="desk-heritage" tabIndex={-1}>
          {national ? guide.area : guide.name}
        </h2>
        <p lang={languages[lang].lang}>{guide.descriptions[lang]}</p>
        {guide.story && (
          <div className="driveFieldNotes" key={guide.id}>
            <p className="driveStoryVicinity">{guide.story.vicinity}</p>
            <details>
              <summary>Explore six roadside stories in English</summary>
              <dl>
                {guide.story.topics.map((t) => (
                  <div key={t.category}>
                    <dt>{t.category}</dt>
                    <dd>
                      {t.fact}{" "}
                      <a
                        href={guide.story!.sources[t.source].url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {guide.story!.sources[t.source].label} ↗
                      </a>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => {
              setAuto(e.target.checked);
              if (!e.target.checked) voice.stop();
            }}
          />{" "}
          Read the matched guide aloud once per language per day in this session, when a narrator is available.
        </label>
        <a href={guide.source.url} target="_blank" rel="noreferrer">
          {guide.source.label} ↗
        </a>
      </div>
      <details className="driveCredits">
        <summary>About the African voices</summary>
        <p>
          The Cape Town and Johannesburg English guides are synthetic audio,
          produced with Piper using its two South African VCTK voice presets,
          p314 and p347. The scripts are Luqi’s. Corpus credit: Junichi
          Yamagishi, Christophe Veaux and Kirsten MacDonald, CSTR, University of
          Edinburgh.{" "}
          <a href="https://datashare.ed.ac.uk/handle/10283/3443">VCTK 0.92</a> ·{" "}
          <a href="https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/vctk/medium/MODEL_CARD">
            Piper model card
          </a>{" "}
          · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
          . Other narrators are listed with the language and region reported by
          your device. Device voice availability varies.
        </p>
      </details>
      <TripFuel />
    </section>
  );
}
