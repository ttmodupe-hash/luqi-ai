import { useState } from "react";
import { pendulumSmallAnglePeriod, michaelisMentenRate, monoproticEquivalenceVolume, centralDifference, cylinderVolume } from "@/lib/labs/referenceModels";

const models = {
  "pendulum-physics": { title: "Small-angle pendulum", labels: ["Length (m)", "Gravity (m/s²)"], defaults: [1, 9.80665], calculate: (v: number[]) => pendulumSmallAnglePeriod(v[0], v[1]), unit: "s" },
  "biology-enzyme": { title: "Enzyme kinetics", labels: ["Substrate", "Vmax", "Km"], defaults: [2, 10, 2], calculate: (v: number[]) => michaelisMentenRate(v[0], v[1], v[2]), unit: "rate" },
  "chemistry-titration": { title: "Titration equivalence", labels: ["Acid mol/L", "Acid volume L", "Base mol/L"], defaults: [0.1, 0.025, 0.1], calculate: (v: number[]) => monoproticEquivalenceVolume(v[0], v[1], v[2]), unit: "L" },
  "algebra-calculus": { title: "Derivative of x²", labels: ["x"], defaults: [3], calculate: (v: number[]) => centralDifference(x => x * x, v[0]), unit: "slope" },
  "geometry-3d": { title: "Cylinder volume", labels: ["Radius (m)", "Height (m)"], defaults: [2, 3], calculate: (v: number[]) => cylinderVolume(v[0], v[1]), unit: "m³" },
};

export default function ExperimentNotebook({ labId }: { labId: string }) {
  const model = models[labId as keyof typeof models];
  const [valuesByLab, setValuesByLab] = useState<Record<string, number[]>>({});
  const [prediction, setPrediction] = useState("");
  const [reflection, setReflection] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");
  if (!model) return null;
  const values = valuesByLab[labId] ?? model.defaults;
  const calculate = () => {
    try {
      const answer = model.calculate(values);
      if (!Number.isFinite(answer)) throw new RangeError("Invalid result");
      setResult(answer); setError("");
    } catch (e) { setResult(null); setError(e instanceof Error ? e.message : "Invalid inputs"); }
  };
  return <section aria-label="Experiment notebook" className="mt-4 rounded-xl border border-sky-500/30 bg-slate-900 p-4">
    <h4 className="text-sm font-bold text-sky-300">Experiment notebook: {model.title}</h4>
    <p className="text-xs text-slate-400 mt-1">Explore a reference calculation alongside the existing simulation. This is not a measurement from the simulation.</p>
    <div className="grid sm:grid-cols-3 gap-2 mt-3">{model.labels.map((label, index) => <label key={label} className="text-xs text-slate-200">{label}
      <input type="number" step="any" value={Number.isNaN(values[index]) ? "" : values[index]} onChange={e => { const next = [...values]; next[index] = e.target.value === "" ? NaN : Number(e.target.value); setValuesByLab(prev => ({ ...prev, [labId]: next })); setResult(null); }} className="block mt-1 w-full bg-slate-950 border border-slate-600 rounded p-2 text-white" />
    </label>)}</div>
    <label className="block mt-3 text-xs text-slate-200">Prediction<textarea value={prediction} onChange={e => setPrediction(e.target.value)} rows={2} className="block mt-1 w-full bg-slate-950 border border-slate-600 rounded p-2 text-white" /></label>
    <button type="button" onClick={calculate} className="mt-3 bg-sky-600 text-white rounded px-3 py-2 text-xs font-bold">Calculate reference</button>
    {error && <p role="alert" className="text-xs text-rose-300 mt-2">{error}</p>}
    {result !== null && <p aria-live="polite" className="mt-2 text-sm text-emerald-300">Reference result: {Number(result.toPrecision(8))} {model.unit}</p>}
    <label className="block mt-3 text-xs text-slate-200">What did you learn?<textarea value={reflection} onChange={e => setReflection(e.target.value)} rows={2} className="block mt-1 w-full bg-slate-950 border border-slate-600 rounded p-2 text-white" /></label>
  </section>;
}
