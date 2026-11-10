import { useEffect, useRef, useState } from "react";
import type { Stop } from "./drive-navigation";

export const languages = {
  english: { label: "English", lang: "en-ZA" },
  sepitori: { label: "Sepitori", lang: "und-ZA" },
  setswana: { label: "Setswana", lang: "tn-ZA" },
  isizulu: { label: "isiZulu", lang: "zu-ZA" },
};
export type LanguageKey = keyof typeof languages;
const englishLocales = [
  "en-ZA",
  "en-BW",
  "en-NA",
  "en-ZW",
  "en-KE",
  "en-NG",
  "en-GH",
  "en-TZ",
  "en-ZM",
  "en-UG",
  "en-MW",
];
const allowedLocales: Record<LanguageKey, string[]> = {
  english: englishLocales,
  setswana: ["tn-ZA", "tn-BW", "tn"],
  isizulu: ["zu-ZA", "zu"],
  sepitori: [],
};
function normalise(tag: string) {
  try {
    return Intl.getCanonicalLocales(tag.replaceAll("_", "-"))[0] || "";
  } catch {
    return "";
  }
}
export function africanVoices(
  voices: SpeechSynthesisVoice[],
  language: LanguageKey,
) {
  const accepted = allowedLocales[language];
  return voices
    .filter((v) => accepted.includes(normalise(v.lang)))
    .sort(
      (a, b) =>
        accepted.indexOf(normalise(a.lang)) -
          accepted.indexOf(normalise(b.lang)) || a.name.localeCompare(b.name),
    );
}
export const packs = [
  { id: "cape", label: "Cape Town English · Luqi voice" },
  { id: "joburg", label: "Johannesburg English · Luqi voice" },
];
const prefKey = (lang: LanguageKey) => "luqi.drive.voice.v1." + lang;
function preference(lang: LanguageKey) {
  try {
    return localStorage.getItem(prefKey(lang)) || "";
  } catch {
    return "";
  }
}
export function useDriveVoice(lang: LanguageKey) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [status, setStatus] = useState("");
  const [saved, setSaved] = useState(() => preference(lang));
  const player = useRef<HTMLAudioElement | null>(null),
    generation = useRef(0);
  const matches = africanVoices(voices, lang);
  const options = [
    ...(lang === "english" ? packs : []),
    ...matches.map((v) => ({
      id: "device:" + v.voiceURI,
      label: v.name + " · " + normalise(v.lang),
    })),
  ];
  const chosen = options.some((o) => o.id === saved)
    ? saved
    : options[0]?.id || "";
  const device = matches.find((v) => "device:" + v.voiceURI === chosen);
  function cancel() {
    ++generation.current;
    if (player.current) {
      player.current.onended = null;
      player.current.onerror = null;
      player.current.pause();
    }
    const synth = window.speechSynthesis;
    if (synth?.speaking || synth?.pending) synth.cancel();
  }
  function stop() {
    cancel();
    setStatus("");
  }
  useEffect(() => {
    const synth = window.speechSynthesis;
    const update = () => setVoices(synth?.getVoices() || []);
    update();
    synth?.addEventListener?.("voiceschanged", update);
    return () => {
      synth?.removeEventListener?.("voiceschanged", update);
      cancel();
    };
  }, []);
  useEffect(() => {
    stop();
    setSaved(preference(lang));
  }, [lang]);
  function choose(id: string) {
    stop();
    setSaved(id);
    try {
      localStorage.setItem(prefKey(lang), id);
    } catch {}
  }
  function speak(guide: Stop, onComplete?: () => void) {
    cancel();
    const token = generation.current;
    const report = (s: string) => {
      if (token === generation.current) setStatus(s);
    };
    // Settle each attempt once. Late events from a replaced player or voice are stale.
    function finish(message: string, completed = false) {
      if (token !== generation.current) return;
      ++generation.current;
      setStatus(message);
      if (completed) onComplete?.();
    }
    if (!chosen) {
      report("No matching voice is available for this language.");
      return;
    }
    if (chosen === "cape" || chosen === "joburg") {
      const audio = new Audio();
      player.current = audio;
      audio.src = "/drive-voices/v1/" + chosen + "/" + guide.id + ".mp3";
      audio.onended = () => finish("", true);
      audio.onerror = () =>
        finish("The voice clip could not load. Tap Listen to try again.");
      setStatus("Loading narration…");
      void audio
        .play()
        .then(() =>
          report("Playing · " + options.find((o) => o.id === chosen)?.label),
        )
        .catch(() =>
          finish("Tap Listen to start audio, or check your connection."),
        );
      return;
    }
    if (
      !device ||
      !window.speechSynthesis ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      report("This voice is unavailable.");
      return;
    }
    const u = new SpeechSynthesisUtterance(guide.descriptions[lang]);
    u.voice = device;
    u.lang = device.lang;
    u.rate = 0.95;
    u.onend = () => finish("", true);
    u.onerror = () =>
      finish(
        "Device voice unavailable. Select another voice or read the briefing.",
      );
    try {
      window.speechSynthesis.speak(u);
      report("Reading · " + device.name);
    } catch {
      finish(
        "Device voice unavailable. Select another voice or read the briefing.",
      );
    }
  }
  return { available: !!chosen, options, chosen, choose, speak, stop, status };
}
export function DriveVoiceControls({
  lang,
  changeLang,
  listen,
  voice,
}: {
  lang: LanguageKey;
  changeLang: (k: LanguageKey) => void;
  listen: () => void;
  voice: ReturnType<typeof useDriveVoice>;
}) {
  return (
    <div className="driveVoicePanel">
      <label>
        Briefing language
        <select
          value={lang}
          onChange={(e) => {
            voice.stop();
            changeLang(e.target.value as LanguageKey);
          }}
        >
          {Object.entries(languages).map(([key, v]) => (
            <option key={key} value={key}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      {voice.available && (
        <label>
          Narrator
          <select
            aria-label="Narrator"
            value={voice.chosen}
            onChange={(e) => voice.choose(e.target.value)}
          >
            {voice.options.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {voice.available ? (
        <>
          <button type="button" className="drivePrimary" onClick={listen}>
            Listen to this guide
          </button>
          <button className="driveSecondary" type="button" onClick={voice.stop}>
            Stop audio
          </button>
        </>
      ) : (
        <p>
          {lang === "sepitori"
            ? "Sepitori is available in writing."
            : "Your device has no matching voice for this language."}{" "}
          <button
            className="driveAudioAlt"
            onClick={() => changeLang("english")}
          >
            Choose South African English audio
          </button>
        </p>
      )}
      <small role="status">{voice.status}</small>
    </div>
  );
}
