import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { evaluatePhysics, initialPhysicsValues, PHYSICS_TOPICS, type PhysicsId, type PhysicsResult } from '../features/physics/models';

const fmt = (value: number | null) =>
  value === null || !Number.isFinite(value) ? 'No finite value' :
    new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 2 }).format(value);

function Diagram({ id, result, inputs }: {
  id: PhysicsId; result: PhysicsResult; inputs: Record<string, number>;
}) {
  const v = result.values;
  const line = '#64748b', cyan = '#67e8f9', gold = '#fbbf24';
  const base = <><rect x="0" y="0" width="640" height="270" rx="18" fill="#101e2c" />
    <text x="22" y="26" fontSize="13" fill="#cbd5e1">Illustrative model · not to scale</text></>;
  let picture;
  if (id === 'projectile') {
    const points = Array.from({ length: 61 }, (_, i) => {
      const t = v.duration * i / 60;
      const x = v.vx * t, y = Math.max(0, v.h + v.vy * t - inputs.gravity * t * t / 2);
      return (32 + 575 * x / Math.max(0.001, v.range)).toFixed(1) + ',' +
        (235 - y * 165 / Math.max(0.001, v.peak)).toFixed(1);
    }).join(' ');
    picture = <>
      <line x1="25" y1="235" x2="614" y2="235" stroke={line} strokeWidth="3" />
      <polyline points={points} stroke={cyan} strokeWidth="4" fill="none" />
      <circle cx={32 + 575 * v.x / Math.max(0.001, v.range)}
        cy={235 - v.y * 165 / Math.max(0.001, v.peak)} r="9" fill={gold} />
      <text x="28" y="258" fill="#cbd5e1" fontSize="13">Launch</text>
      <text x="545" y="258" fill="#cbd5e1" fontSize="13">Landing</text>
    </>;
  } else if (id === 'incline') {
    const rise = Math.min(160, 200 * Math.tan(v.theta));
    picture = <>
      <polygon points={'150,231 440,231 440,' + (231 - rise)} fill="#284454" stroke={cyan} strokeWidth="3" />
      <rect x="351" y={210 - rise * 0.72} width="46" height="36" rx="6" fill={gold}
        transform={'rotate(' + (-inputs.angle) + ' 374 ' + (228 - rise * 0.72) + ')'} />
      <text x="40" y="90" fontSize="17" fill={cyan}>{result.state}</text>
      <text x="40" y="120" fontSize="14" fill="#cbd5e1">Gravity downhill: {fmt(v.downslope)} N</text>
      <text x="40" y="145" fontSize="14" fill="#cbd5e1">Opposing friction: {fmt(inputs.friction * v.normal)} N max</text>
      <text x="200" y="251" fontSize="13" fill="#cbd5e1">Slope {fmt(inputs.angle)}°</text>
    </>;
  } else if (id === 'circuit') {
    const parallel = v.parallel === 1;
    picture = <>
      <path d="M110 210 V80 H515 V210 H110" stroke={cyan} strokeWidth="4" fill="none" />
      <line x1="96" y1="120" x2="124" y2="120" stroke={gold} strokeWidth="5" />
      <line x1="102" y1="142" x2="118" y2="142" stroke={gold} strokeWidth="4" />
      <rect x="252" y="64" width="74" height="32" rx="4" fill="#d97706" />
      <text x="264" y="85" fill="#fff" fontSize="15">R1</text>
      {parallel ? <>
        <path d="M215 80 V160 H393 V80" stroke={cyan} strokeWidth="3" fill="none" />
        <rect x="258" y="145" width="72" height="30" fill="#d97706" />
        <text x="272" y="166" fill="#fff" fontSize="14">R2</text>
      </> : <>
        <rect x="415" y="194" width="68" height="32" rx="4" fill="#d97706" />
        <text x="431" y="215" fill="#fff" fontSize="15">R2</text>
      </>}
      <text x="135" y="132" fill="#fff" fontSize="14">{fmt(inputs.voltage)} V</text>
      <text x="210" y="252" fill={gold} fontSize="15">Current: {fmt(v.current)} A</text>
    </>;
  } else if (id === 'wave') {
    const pts = Array.from({ length: 141 }, (_, i) => {
      const x = i * 600 / 140;
      const y = 145 - 60 * v.amplitude * Math.sin(2 * Math.PI * (12 * i / 140) / v.wavelength - v.phase);
      return (20 + x).toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    picture = <>
      <line x1="20" x2="620" y1="145" y2="145" stroke={line} strokeDasharray="6 6" />
      <polyline points={pts} fill="none" stroke={cyan} strokeWidth="3.5" />
      <text x="24" y="252" fill="#cbd5e1" fontSize="14">Distance across display: 12 m</text>
      <text x="445" y="252" fill={gold} fontSize="14">Phase: {fmt(inputs.phase)}°</text>
    </>;
  } else if (id === 'lens') {
    const centre = 320, scale = 3, axis = 145;
    const objectX = centre - scale * v.objectDistance;
    const imageX = centre + scale * v.imageDistance;
    const imageHeight = -v.magnification * v.objectHeight * 7;
    picture = <>
      <line x1="20" y1={axis} x2="620" y2={axis} stroke={line} strokeWidth="2" />
      <path d="M320 60 Q302 145 320 225 Q338 145 320 60" fill="#1e88ad" stroke={cyan} strokeWidth="2" />
      <circle cx={centre - scale * v.f} cy={axis} r="4" fill={gold} />
      <circle cx={centre + scale * v.f} cy={axis} r="4" fill={gold} />
      <text x={centre - scale * v.f - 6} y="165" fill={gold} fontSize="14">F</text>
      <text x={centre + scale * v.f - 6} y="165" fill={gold} fontSize="14">F</text>
      <line x1={objectX} y1={axis} x2={objectX} y2={axis - v.objectHeight * 7} stroke={gold} strokeWidth="5" />
      <circle cx={objectX} cy={axis - v.objectHeight * 7} r="6" fill={gold} />
      {Number.isFinite(imageX) && imageX > 18 && imageX < 622 &&
       Number.isFinite(imageHeight) && Math.abs(imageHeight) < 125 && <>
        <line x1={imageX} y1={axis} x2={imageX} y2={axis + imageHeight} stroke={cyan} strokeWidth="4" />
        <circle cx={imageX} cy={axis + imageHeight} r="5" fill={cyan} />
      </>}
      <text x="35" y="252" fill="#cbd5e1" fontSize="14">{result.state}</text>
    </>;
  } else if (id === 'energy') {
    const total = Math.max(0.01, v.total);
    const peH = 156 * v.potential / total, keH = 156 * v.kinetic / total;
    picture = <>
      <line x1="100" y1="228" x2="540" y2="228" stroke={line} strokeWidth="2" />
      <rect x="145" y={228 - peH} width="115" height={peH} fill={cyan} rx="4" />
      <rect x="345" y={228 - keH} width="115" height={keH} fill={gold} rx="4" />
      <text x="160" y="251" fill="#fff" fontSize="15">Potential</text>
      <text x="367" y="251" fill="#fff" fontSize="15">Kinetic</text>
      <text x="145" y="58" fill={cyan} fontSize="16">{fmt(v.potential)} J</text>
      <text x="345" y="58" fill={gold} fontSize="16">{fmt(v.kinetic)} J</text>
    </>;
  } else if (id === 'collision') {
    picture = <>
      <line x1="28" y1="217" x2="612" y2="217" stroke={line} strokeWidth="3" />
      <circle cx="155" cy="175" r={19 + v.m1 * 2} fill={cyan} />
      <circle cx="420" cy="175" r={19 + v.m2 * 2} fill={gold} />
      <text x="135" y="120" fill="#fff" fontSize="15">Cart 1</text>
      <text x="397" y="120" fill="#fff" fontSize="15">Cart 2</text>
      <text x="74" y="54" fill={cyan} fontSize="17">After: {fmt(v.v1)} m/s</text>
      <text x="340" y="54" fill={gold} fontSize="17">After: {fmt(v.v2)} m/s</text>
      <text x="85" y="254" fill="#cbd5e1" fontSize="13">Before: {fmt(v.u1)} m/s</text>
      <text x="370" y="254" fill="#cbd5e1" fontSize="13">Before: {fmt(v.u2)} m/s</text>
    </>;
  } else {
    const temp = Math.min(100, v.final);
    picture = <>
      <rect x="120" y="50" width="68" height="165" rx="28" stroke={line} strokeWidth="6" fill="#172b37" />
      <rect x="131" y={205 - temp * 1.25} width="46" height={temp * 1.25} rx="16" fill="#fb923c" />
      <circle cx="154" cy="218" r="21" fill="#fb923c" />
      <text x="260" y="95" fontSize="22" fill="#fff">{fmt(v.final)} °C</text>
      <text x="260" y="135" fontSize="16" fill={cyan}>Heat: {fmt(v.q / 1000)} kJ</text>
      <text x="260" y="172" fontSize="15" fill="#cbd5e1">Ideal heating, no heat loss</text>
    </>;
  }
  return <svg role="img" aria-label="Interactive physics model diagram" viewBox="0 0 640 270"
    className="block w-full h-auto rounded-xl border border-slate-700" preserveAspectRatio="xMidYMid meet">
    {base}{picture}
  </svg>;
}

type Observation = {
  number: number; settings: Record<string, number>;
  readings: { label: string; value: number | null; unit: string }[];
};

function ExperimentStation({ id }: { id: PhysicsId }) {
  const topic = PHYSICS_TOPICS.find(item => item.id === id)!;
  const [inputs, setInputs] = useState<Record<string, number>>(() => initialPhysicsValues(id));
  const [observations, setObservations] = useState<Observation[]>([]);
  const [showTheory, setShowTheory] = useState(true);
  const result = useMemo(() => evaluatePhysics(id, inputs), [id, inputs]);

  function exportCsv() {
    if (!observations.length) return;
    const headings = ['Observation', ...topic.controls.map(control => control.label + ' (' + control.unit + ')'),
      ...result.metrics.map(metric => metric.label + ' (' + metric.unit + ')')];
    const rows = observations.map(item => [
      item.number, ...topic.controls.map(control => item.settings[control.key]),
      ...item.readings.map(reading => reading.value === null ? 'Not finite' : reading.value),
    ]);
    const csv = [headings, ...rows].map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'luqi-physics-' + id + '-observations.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section aria-label={topic.title + ' interactive experiment'} className="space-y-5">
    <div className="rounded-2xl border border-sky-500/30 bg-slate-900 p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">{topic.subject} · {topic.level}</p>
      <h2 className="mt-2 text-2xl font-bold text-white">{topic.title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-300">{topic.summary}</p>
      <p className="mt-3 rounded-lg bg-slate-950 px-3 py-2 text-sm text-amber-200">Model: {topic.formula}</p>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <div className="space-y-4 min-w-0">
        <Diagram id={id} result={result} inputs={inputs} />
        <div aria-live="polite" aria-atomic="true" className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Calculated state · {result.state}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            {result.metrics.map(reading => <div key={reading.label} className="min-w-0 rounded-lg bg-slate-800 p-3">
              <dt className="text-xs text-slate-300">{reading.label}</dt>
              <dd className="mt-1 text-base font-bold text-white break-words">
                {fmt(reading.value)} <span className="text-xs font-normal text-slate-300">{reading.unit}</span>
              </dd>
            </div>)}
          </dl>
          <p className="mt-3 text-sm text-slate-300">{result.insight}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5 space-y-4">
        <h3 className="text-lg font-bold text-white">Change the experiment</h3>
        {topic.controls.map(control => <label className="block space-y-2" key={control.key}>
          <span className="flex justify-between gap-2 text-sm text-slate-200">
            <span>{control.label}</span><strong className="text-amber-300">
              {control.options?.find(option => option.value === inputs[control.key])?.label ??
                (fmt(inputs[control.key]) + ' ' + control.unit)}
            </strong>
          </span>
          {control.options ? (
            <select aria-label={control.label} value={inputs[control.key]}
              onChange={event => setInputs(previous => ({ ...previous, [control.key]: Number(event.target.value) }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white">
              {control.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input aria-label={control.label} type="range" className="w-full accent-amber-400"
              min={control.min} max={control.max} step={control.step} value={inputs[control.key]}
              onChange={event => setInputs(previous => ({ ...previous, [control.key]: Number(event.target.value) }))} />
          )}
        </label>)}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => setInputs(initialPhysicsValues(id))}
            className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700">
            Reset variables
          </button>
          <button type="button" onClick={() => setObservations(previous =>
            [...previous, { number: (previous.at(-1)?.number ?? 0) + 1, settings: { ...inputs },
              readings: result.metrics.map(metric => ({ ...metric })) }].slice(-20))}
            className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300">
            Record observation
          </button>
        </div>
      </div>
    </div>
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <h3 className="text-lg font-bold text-white">Try an investigation</h3>
      <p className="mt-2 text-sm text-slate-200">{topic.challenge}</p>
      <button type="button" aria-expanded={showTheory} onClick={() => setShowTheory(visible => !visible)}
        className="mt-3 text-sm font-semibold text-amber-300 underline underline-offset-4">
        {showTheory ? 'Hide' : 'Show'} explanation and assumptions
      </button>
      {showTheory && <div className="mt-3 space-y-2 text-sm text-slate-300">
        <p>{result.insight}</p><p><strong>Model assumptions:</strong> {topic.assumptions}</p>
        <p>These are educational calculations, not real-world equipment or safety instructions.</p>
      </div>}
    </section>
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-lg font-bold text-white">Your measurements</h3>
          <p className="text-xs text-slate-400">Saved in this open page only. Nothing is uploaded.</p></div>
        <button type="button" disabled={observations.length === 0} onClick={exportCsv}
          className="rounded-lg border border-sky-400 px-3 py-2 text-sm font-semibold text-sky-200 disabled:opacity-40">
          Export observations CSV
        </button>
      </div>
      {observations.length ? <div className="mt-4 overflow-x-auto">
        <table aria-label="Recorded physics observations" className="min-w-full text-sm text-left">
          <thead><tr className="border-b border-slate-600 text-slate-300">
            <th scope="col" className="p-2">Trial</th>
            <th scope="col" className="p-2">Changed variables</th>
            <th scope="col" className="p-2">Results</th>
          </tr></thead>
          <tbody>{observations.map(obs => <tr key={obs.number} className="border-b border-slate-800">
            <td className="p-2">{obs.number}</td>
            <td className="p-2">{topic.controls.map(control =>
              control.label + ': ' + fmt(obs.settings[control.key]) + ' ' + control.unit).join(' · ')}</td>
            <td className="p-2">{obs.readings.map(reading =>
              reading.label + ': ' + fmt(reading.value) + ' ' + reading.unit).join(' · ')}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="mt-4 text-sm text-slate-400">Change a variable, predict a result, then select Record observation.</p>}
    </section>
  </section>;
}

export default function PhysicsLabHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('experiment');
  const selected = PHYSICS_TOPICS.find(topic => topic.id === requested)?.id ?? 'projectile';
  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-7">
      <header className="space-y-3">
        <Link to="/stem-suite" className="inline-block text-sm font-semibold text-sky-300 hover:underline">← All STEM subjects</Link>
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Luqi Learning · Physics Discovery</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Explore more than one physics experiment</h1>
        <p className="max-w-3xl text-slate-300">Eight practical, interactive physics investigations plus the advanced pendulum rig. Adjust variables, inspect diagrams, compare outcomes and export your own measurements. Free local calculations; no AI credits required.</p>
        <p className="text-xs text-slate-400">Educational models for school science topics. They do not replace laboratory safety, teacher guidance or curriculum assessment.</p>
      </header>
      <nav aria-label="Physics experiment catalogue" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PHYSICS_TOPICS.map(topic => <button type="button" key={topic.id}
          aria-pressed={selected === topic.id} onClick={() => setSearchParams({ experiment: topic.id })}
          className={'rounded-xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ' +
            (selected === topic.id ? 'border-amber-400 bg-amber-500/15 text-white' : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400')}>
          <span className="block text-xs text-sky-300">{topic.subject} · {topic.level}</span>
          <span className="mt-1 block text-base font-bold">{topic.title}</span>
          <span className="mt-1 block text-xs text-slate-400">{topic.summary}</span>
        </button>)}
        <Link to="/pendulum-lab" className="rounded-xl border border-sky-500/50 bg-sky-500/10 p-4 text-left hover:border-sky-300">
          <span className="block text-xs text-amber-300">Advanced simulator · Grade 10–University</span>
          <span className="mt-1 block text-base font-bold">Pendulum, resonance and chaos</span>
          <span className="mt-1 block text-xs text-slate-300">Open the existing full pendulum rig with graphs, physics controls and CSV observations.</span>
        </Link>
      </nav>
      <ExperimentStation key={selected} id={selected} />
    </main>
  </div>;
}
