import { useState } from "react";
import { createToonProductionPlan, type ToonProductionPlan, type ToonPurpose } from "@/lib/luqitoons/productionPlan";
import { AFRICAN_VOICE_PROFILES, validateVoiceDirection, type AfricanVoiceProfileId, type ToonVoiceDirection } from "@/lib/luqitoons/voiceProfiles";

type Recognition = { lang: string; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; start: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

function extractDuration(text: string): number {
  const match = text.match(/\b(\d{1,3})\s*(minutes?|mins?|seconds?|secs?)\b/i);
  if (!match) return 120;
  const value = Number(match[1]) * (/^m/i.test(match[2]) ? 60 : 1);
  return Math.min(420, Math.max(1, value));
}

export default function ToonChatCreator() {
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("Learners");
  const [objective, setObjective] = useState("Explain the topic clearly with a practical example");
  const [purpose, setPurpose] = useState<ToonPurpose>("training");
  const [plan, setPlan] = useState<ToonProductionPlan | null>(null);
  const [error, setError] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceProfile, setVoiceProfile] = useState<AfricanVoiceProfileId>("en-ZA");
  const [tone, setTone] = useState<ToonVoiceDirection["tone"]>("warm");
  const [speakingRate, setSpeakingRate] = useState(1);
  const [previewText, setPreviewText] = useState("Welcome to LUQIToons. Let us learn together.");
  const makePlan = () => {
    try {
      const topic = message.trim();
      if (!topic) throw new Error("Describe the video you want to create.");
      const result = createToonProductionPlan({
        title: topic.slice(0, 120), purpose, targetAudience: audience,
        learningObjectives: purpose === "training" || purpose === "education" ? [objective] : [],
        durationSeconds: extractDuration(topic),
      });
      setPlan(result);
      setError("");
    } catch (err) { setPlan(null); setError(err instanceof Error ? err.message : "Could not plan video"); }
  };
  const dictate = () => {
    const browser = window as SpeechWindow;
    const SpeechRecognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceStatus("Voice dictation is unavailable in this browser. You can type instead."); return; }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-ZA";
      recognition.onresult = event => { setMessage(previous => [previous, event.results[0][0].transcript].filter(Boolean).join(" ")); setVoiceStatus("Dictation added. Review the text before planning."); };
      recognition.onerror = () => setVoiceStatus("Dictation failed. You can type instead.");
      recognition.start();
      setVoiceStatus("Listening…");
    } catch { setVoiceStatus("Microphone unavailable. You can type instead."); }
  };
  const voiceDirection: ToonVoiceDirection = { profileId: voiceProfile, tone, speakingRate, voiceMode: "synthetic" };
  const previewVoice = () => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") { setVoiceStatus("Speech preview is not supported in this browser."); return; }
    const profile = AFRICAN_VOICE_PROFILES.find(p => p.id === voiceProfile)!;
    const voices = window.speechSynthesis.getVoices();
    const selected = voices.find(v => v.lang.toLowerCase() === profile.locale.toLowerCase());
    if (!selected) { setVoiceStatus("No installed voice for " + profile.label + ". No substitute accent was played."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(previewText.slice(0, 350));
    utterance.voice = selected;
    utterance.lang = profile.locale;
    utterance.rate = speakingRate;
    window.speechSynthesis.speak(utterance);
    setVoiceStatus("Previewing installed " + profile.label + " voice. Actual quality depends on your device.");
  };
  const downloadPlan = () => {
    if (!plan) return;
    const blob = new Blob([JSON.stringify({ ...plan, voiceDirection }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "luqitoons-production-plan.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="rounded-2xl border border-orange-500/30 bg-slate-900 p-5 space-y-3" aria-label="Create LUQIToons video by chat or voice">
    <div><h2 className="text-lg font-bold text-white">Create by chatting or talking</h2><p className="text-xs text-slate-400">Tell LUQIToons what you want. Start with a free editable production plan; this does not render video or charge credits.</p></div>
    <label className="block text-sm text-slate-200">Describe your video
      <textarea className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" rows={3} maxLength={3000} value={message} onChange={e => { setMessage(e.target.value); setPlan(null); }} placeholder="Create a 5-minute 3D lesson about solar energy for Grade 8 learners in South Africa…" />
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={dictate} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-white">🎙 Speak instead</button>
      <button type="button" onClick={makePlan} className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white">Plan my video</button>
    </div>
    {voiceStatus && <p role="status" className="text-xs text-slate-300">{voiceStatus}</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-slate-200">Purpose
        <select value={purpose} onChange={e => { setPurpose(e.target.value as ToonPurpose); setPlan(null); }} className="block mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2">
          <option value="training">Training</option><option value="education">Education</option><option value="storytelling">Storytelling</option><option value="business">Business</option><option value="public-awareness">Public awareness</option>
        </select>
      </label>
      <label className="text-xs text-slate-200">Audience<input value={audience} maxLength={200} onChange={e => { setAudience(e.target.value); setPlan(null); }} className="block mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2" /></label>
    </div>
    {(purpose === "training" || purpose === "education") && <label className="block text-xs text-slate-200">Learning objective<input value={objective} maxLength={300} onChange={e => { setObjective(e.target.value); setPlan(null); }} className="block mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2" /></label>}
    <fieldset className="rounded-xl border border-slate-700 p-3 space-y-2">
      <legend className="px-2 text-sm font-semibold text-orange-300">African narration voice</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-200">Language and regional voice
          <select value={voiceProfile} onChange={e => { setVoiceProfile(e.target.value as AfricanVoiceProfileId); setPlan(null); }} className="block mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2">{AFRICAN_VOICE_PROFILES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
        </label>
        <label className="text-xs text-slate-200">Narration tone
          <select value={tone} onChange={e => setTone(e.target.value as ToonVoiceDirection["tone"])} className="block mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2">
            <option value="warm">Warm and welcoming</option><option value="confident">Confident instructor</option><option value="calm">Calm explanation</option><option value="energetic">Energetic storytelling</option>
          </select>
        </label>
      </div>
      <label className="block text-xs text-slate-200">Speaking speed: {speakingRate.toFixed(2)}×
        <input type="range" className="w-full" min="0.75" max="1.25" step="0.05" value={speakingRate} onChange={e => setSpeakingRate(Number(e.target.value))} />
      </label>
      <label className="block text-xs text-slate-200">Voice preview text
        <input value={previewText} maxLength={350} onChange={e => setPreviewText(e.target.value)} className="block mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2" />
      </label>
      <button type="button" disabled={!previewText.trim() || validateVoiceDirection(voiceDirection).length > 0} onClick={previewVoice} className="rounded border border-orange-500 px-3 py-2 text-xs text-orange-200 disabled:opacity-50">Listen to available local voice</button>
      <p className="text-xs text-slate-400">A language selection does not guarantee an installed voice or native pronunciation. Tone is saved as production direction; browser preview supports rate only. Voice imitation of a real person requires verified consent and is not enabled here.</p>
    </fieldset>
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    {plan && <div className="rounded-xl border border-sky-500/30 bg-slate-950 p-4 space-y-2">
      <h3 className="font-semibold text-sky-300">Your 3D production outline</h3>
      <p className="text-sm text-white">{plan.targetDurationSeconds} seconds · {plan.scenes.length} planned scenes · {plan.purpose}</p>
      <p className="text-xs text-slate-400">Scenes are placeholders, not generated scripts or animations. Duration is capped at seven minutes.</p>
      <div className="max-h-40 overflow-y-auto space-y-1">{plan.scenes.map(scene => <p key={scene.id} className="text-xs text-slate-300">Scene {scene.sequence}: {scene.startSeconds}–{scene.endSeconds}s · {scene.objective}</p>)}</div>
      <button type="button" onClick={downloadPlan} className="rounded border border-sky-500 px-3 py-2 text-xs text-sky-200">Download editable JSON plan</button>
    </div>}
  </section>;
}
