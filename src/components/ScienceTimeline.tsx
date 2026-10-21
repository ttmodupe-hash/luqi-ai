import { useMemo, useState } from "react";
import { enzymeProgress, titrationProgress } from "@/lib/labs/timeDependentModels";

export default function ScienceTimeline({ subject }: { subject: "biology" | "chemistry" }) {
  const [index, setIndex] = useState(0);
  const [rateFactor, setRateFactor] = useState(1);
  const frames = useMemo(() => subject === "biology"
    ? enzymeProgress(10, 0.1 * rateFactor, 2, 60, 0.5)
    : titrationProgress(0.1, 0.025, 0.1, 0.0005 * rateFactor, 60, 0.5), [subject, rateFactor]);
  const frame = frames[Math.min(index, frames.length - 1)];
  const biology = subject === "biology";
  const display = biology
    ? { a: (frame as ReturnType<typeof enzymeProgress>[number]).substrate, b: (frame as ReturnType<typeof enzymeProgress>[number]).product, aLabel: "Substrate remaining", bLabel: "Product formed", units: "concentration units" }
    : { a: (frame as ReturnType<typeof titrationProgress>[number]).baseVolumeL * 1000, b: (frame as ReturnType<typeof titrationProgress>[number]).fractionToEquivalence, aLabel: "Base added", bLabel: "Equivalence fraction", units: "mL" };
  return <section className="mt-3 rounded-xl border border-indigo-500/40 bg-slate-950 p-4" aria-label={subject + " experiment timeline"}>
    <h4 className="text-sm font-bold text-indigo-300">Time-dependent {biology ? "enzyme" : "titration"} investigation</h4>
    <p className="text-xs text-slate-400 mt-1">Reference model only. Change the rate and scrub through simulated time; compare the results with the original laboratory.</p>
    <label className="block text-xs text-slate-200 mt-3">Rate multiplier: {rateFactor.toFixed(1)}×
      <input className="w-full" type="range" min="0.2" max="3" step="0.2" value={rateFactor} onChange={e => { setRateFactor(Number(e.target.value)); setIndex(0); }} />
    </label>
    <label className="block text-xs text-slate-200 mt-3">Elapsed time: {frame.timeSeconds.toFixed(1)} s
      <input className="w-full" type="range" min="0" max={frames.length - 1} value={index} onChange={e => setIndex(Number(e.target.value))} />
    </label>
    <div className="flex gap-2 mt-2">
      <button type="button" className="text-xs border border-slate-600 rounded px-3 py-1 text-white" onClick={() => setIndex(0)}>Reset</button>
      <button type="button" className="text-xs border border-slate-600 rounded px-3 py-1 text-white" onClick={() => setIndex(i => Math.min(i + 2, frames.length - 1))}>Advance 1 s</button>
    </div>
    <dl className="grid grid-cols-2 gap-3 mt-3 text-xs text-slate-200">
      <div><dt>{display.aLabel}</dt><dd className="text-lg font-bold text-sky-300">{display.a.toFixed(3)} {display.units}</dd></div>
      <div><dt>{display.bLabel}</dt><dd className="text-lg font-bold text-emerald-300">{display.b.toFixed(3)}</dd></div>
    </dl>
    <p className="text-xs text-amber-300 mt-2">{biology ? "Ideal single-substrate Michaelis–Menten kinetics, with no enzyme degradation or product inhibition." : "Ideal 1:1 strong acid/base stoichiometry. Equivalence fraction is not a pH measurement."}</p>
  </section>;
}
