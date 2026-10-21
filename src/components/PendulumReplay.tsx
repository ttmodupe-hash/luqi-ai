import { useMemo, useState } from "react";
import { pendulumTrajectory } from "@/lib/labs/pendulumTrajectory";

/** A time-dependent reference animation; the original standalone physics lab remains intact. */
export default function PendulumReplay() {
  const [angleDegrees, setAngleDegrees] = useState(15);
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = useMemo(() => pendulumTrajectory({
    lengthM: 1, gravityMs2: 9.80665, massKg: 1,
    initialAngleRadians: angleDegrees * Math.PI / 180,
    durationSeconds: 10, stepSeconds: 0.02,
  }), [angleDegrees]);
  const frame = frames[Math.min(frameIndex, frames.length - 1)];
  const bobX = 150 + 95 * Math.sin(frame.angleRadians);
  const bobY = 25 + 95 * Math.cos(frame.angleRadians);
  const initialEnergy = frames[0].totalJoules;
  return <section className="mt-3 rounded-xl border border-indigo-500/40 bg-slate-950 p-4" aria-label="Time-dependent pendulum replay">
    <h4 className="text-sm font-bold text-indigo-300">4D learning · Pendulum through time</h4>
    <p className="text-xs text-slate-400 mt-1">Scrub through a deterministic RK4 reference simulation. The fourth dimension is time, not a claim of immersive 4D hardware.</p>
    <svg viewBox="0 0 300 145" role="img" aria-label={"Pendulum at " + frame.timeSeconds.toFixed(2) + " seconds"} className="w-full max-w-sm mx-auto">
      <line x1="150" y1="25" x2={bobX} y2={bobY} stroke="#94a3b8" strokeWidth="2" />
      <circle cx="150" cy="25" r="5" fill="#fbbf24" />
      <circle cx={bobX} cy={bobY} r="11" fill="#38bdf8" />
    </svg>
    <label className="block text-xs text-slate-200">Initial angle: {angleDegrees}°
      <input className="w-full" type="range" min="1" max="70" value={angleDegrees} onChange={e => { setAngleDegrees(Number(e.target.value)); setFrameIndex(0); }} />
    </label>
    <label className="block text-xs text-slate-200 mt-2">Replay time: {frame.timeSeconds.toFixed(2)} s
      <input className="w-full" type="range" min="0" max={frames.length - 1} value={frameIndex} onChange={e => setFrameIndex(Number(e.target.value))} />
    </label>
    <div className="flex gap-2 mt-2">
      <button type="button" className="text-xs border border-slate-600 rounded px-3 py-1 text-white" onClick={() => setFrameIndex(0)}>Reset</button>
      <button type="button" className="text-xs border border-slate-600 rounded px-3 py-1 text-white" onClick={() => setFrameIndex(i => Math.min(frames.length - 1, i + 5))}>Advance 0.1 s</button>
    </div>
    <p className="text-xs text-slate-300 mt-3">Kinetic: {frame.kineticJoules.toFixed(5)} J · Potential: {frame.potentialJoules.toFixed(5)} J · Energy difference: {(frame.totalJoules - initialEnergy).toExponential(2)} J</p>
    <p className="text-xs text-amber-300 mt-1">Ideal undamped pendulum, fixed-step numerical approximation. Energy conservation is approximate, not exact.</p>
  </section>;
}
