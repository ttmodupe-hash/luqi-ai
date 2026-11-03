import React, { useState, useRef, useEffect } from "react";
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
  stops,
  distanceKm,
  compass,
  demoFrame,
  demoSeconds,
  legSeconds,
  readFix,
  matchLandmark,
} from "./drive-navigation";
import { regionalMap as map } from "./drive-map";
import type { PhoneFix } from "./drive-navigation";
import "./drive.css";
import TripFuel from "./TripFuel";
const languages = {
  english: { label: "English", lang: "en-ZA", voiceLang: "en-ZA" },
  sepitori: { label: "Sepitori", lang: "und-ZA", voiceLang: null },
  setswana: { label: "Setswana", lang: "tn", voiceLang: "tn-ZA" },
  isizulu: { label: "isiZulu", lang: "zu", voiceLang: "zu-ZA" },
};
type LanguageKey = keyof typeof languages;
function useVoice() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [status, setStatus] = useState("");
  useEffect(() => {
    const s = window.speechSynthesis;
    if (!s) return;
    const update = () => setVoices(s.getVoices());
    update();
    s.addEventListener("voiceschanged", update);
    return () => {
      s.removeEventListener("voiceschanged", update);
      s.cancel();
    };
  }, []);
  function voiceFor(key: LanguageKey) {
    const target = languages[key].voiceLang;
    return (
      target &&
      voices.find(
        (v) => v.lang.split("-")[0].toLowerCase() === target.split("-")[0],
      )
    );
  }
  function speak(text: string, key: LanguageKey) {
    const voice = voiceFor(key);
    if (!voice) {
      setStatus("No matching device voice. The written briefing is available.");
      return;
    }
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.onend = () => setStatus("");
    u.onerror = () => setStatus("Playback stopped or unavailable.");
    setStatus("Reading aloud");
    s.speak(u);
  }
  function stop() {
    window.speechSynthesis?.cancel();
    setStatus("");
  }
  return {
    speak,
    stop,
    status,
    available: (key: LanguageKey) => Boolean(voiceFor(key)),
  };
}
function Language({
  lang,
  setLang,
}: {
  lang: LanguageKey;
  setLang: (lang: LanguageKey) => void;
}) {
  return (
    <label className="field">
      Briefing language
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as LanguageKey)}
      >
        {Object.entries(languages).map(([k, v]) => (
          <option value={k} key={k}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function VoiceButtons({
  voice,
  text,
  lang,
}: {
  voice: ReturnType<typeof useVoice>;
  text: string;
  lang: LanguageKey;
}) {
  return (
    <div className="actions">
      <button
        className="pill"
        disabled={!voice.available(lang)}
        onClick={() => voice.speak(text, lang)}
      >
        Read aloud
      </button>
      {voice.available(lang) ? (
        <button className="linkbtn" onClick={voice.stop}>
          Stop audio
        </button>
      ) : (
        <small>Written briefing available. No matching device voice.</small>
      )}
      <small role="status">{voice.status}</small>
    </div>
  );
}
const fmtKm = (n: number) =>
  n < 1
    ? Math.round(n * 1000) + " m"
    : (n < 10 ? n.toFixed(1) : Math.round(n)) + " km";
export default function LuqiDrivePage() {
  const [lang, setLang] = useState<LanguageKey>("english");
  const [mode, setMode] = useState("preview"),
    [selected, setSelected] = useState(0);
  const [elapsed, setElapsed] = useState(0),
    [playing, setPlaying] = useState(false);
  const [fix, setFix] = useState<PhoneFix | null>(null),
    [notice, setNotice] = useState("");
  const [following, setFollowing] = useState(false),
    [resetKey, setResetKey] = useState(0);
  const [auto, setAuto] = useState(false);
  const voice = useVoice(),
    watch = useRef<number | null>(null),
    generation = useRef(0),
    seen = useRef(new Map<string, number>());
  const { available, speak } = voice;
  const demo = demoFrame(elapsed),
    isGPS = mode === "gps",
    isDemo = mode === "demo";
  const targetIndex = isDemo ? demo.leg : selected;
  const target = stops[targetIndex],
    point = isGPS ? fix : isDemo ? demo : null;
  const match = isGPS ? matchLandmark(fix) : null;
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
  useEffect(() => {
    if (match === null || !auto || !available(lang)) return;
    const key = guide.id + "/" + lang;
    if (Date.now() - (seen.current.get(key) ?? 0) < 86400000) return;
    seen.current.set(key, Date.now());
    speak(guide.descriptions[lang], lang);
  }, [auto, match, guide, lang, available, speak]);

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
    resetMap(true);
  }
  function choose(i: number) {
    if (isGPS) {
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
    resetMap(true);
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
    resetMap(true);
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
          const near = matchLandmark(next);
          setNotice(
            next.accuracy > 5000
              ? "Approximate fix. Landmark matching needs a more precise signal."
              : near !== null
                ? "Near " + stops[near].name + ". The local briefing is ready."
                : "Outside the four landmark areas. Distance is measured in a straight line.",
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
      ? "Accelerated demo along a schematic line. Device location is off."
      : "Preview four landmarks or use your phone’s position. Location stays in this tab.");
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
      <div className="driveLayout">
        <div className="driveSurface">
          <div className="driveBanner">
            <div className="driveIcon">
              <Navigation size={29} />
            </div>
            <div className="driveTarget">
              <span>
                {isDemo && demo.arrived
                  ? "FINAL LANDMARK"
                  : isGPS
                    ? "SELECTED LANDMARK"
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
            point={point}
            target={target}
            mode={mode}
            following={following}
            setFollowing={setFollowing}
            resetKey={resetKey}
          />
          <div className="driveHUD">
            <div>
              <small>DIRECT DISTANCE</small>
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
              <small>{isGPS ? "DEVICE SPEED" : "GUIDE STOP"}</small>
              <strong>
                {isGPS
                  ? fix?.speed != null
                    ? fix.speed + " km/h"
                    : "—"
                  : String(targetIndex + 1).padStart(2, "0") + " / 04"}
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
          <p className="driveNote" role="status">
            {status}
            {isGPS && fix && " Accuracy ±" + fmtKm(fix.accuracy / 1000) + "."}
          </p>
        </div>
        <aside className="driveStops">
          <div className="driveOverline">
            <MapPin size={14} /> GAUTENG / NORTH WEST
          </div>
          <h2>Landmark trail</h2>
          <p>Choose a stop to explore its guide.</p>
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
            <i /> Landmark guide line
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
          The map shows regional landmarks in Gauteng and North West. Lines
          between numbered stops illustrate the heritage trail. Road lines are
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
          {guide.name}
        </h2>
        <p lang={languages[lang].lang}>{guide.descriptions[lang]}</p>
        <Language
          lang={lang}
          setLang={(k) => {
            voice.stop();
            setLang(k);
          }}
        />
        <VoiceButtons
          voice={voice}
          text={guide.descriptions[lang]}
          lang={lang}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
          />{" "}
          Read nearby landmarks aloud once per language per day in this session,
          when a matching device voice is available.
        </label>
        <a href={guide.source.url} target="_blank" rel="noreferrer">
          {guide.source.label} ↗
        </a>
      </div>
      <TripFuel />
    </section>
  );
}
