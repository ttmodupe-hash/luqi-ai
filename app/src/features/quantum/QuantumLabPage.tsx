import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { bellState, groverIteration, loadBalanceModel,
  qaoaLayer, searchQaoaGrid, stateMetrics, surfaceCodeEstimate, twoQubitQasm, uniformState } from './quantum-engine';
import { allocateSmallBudget, shortestClosedTour } from './classical-baselines';
import { QISKIT_BELL_EXAMPLE, QUANTUM_LESSONS, QUANTUM_TRACK_ID } from './academy';
import { verifiedPqcResult } from './pqc-contract';
import type { PqcLabResult } from './pqc-lab';
import './quantum-lab.css';

const clean = (x: number, digits = 6) => (Math.abs(x) < 1e-12 ? 0 : x).toFixed(digits);
// Preserve small nonzero physical observables instead of rounding them to an exact-looking zero.
const displayPositive = (x: number, digits = 4) => x > 0 && x < 10 ** -digits ? x.toExponential(3) : x.toFixed(digits);
const amplitude = (re: number, im: number) => `${clean(re)} ${im < -1e-12 ? '−' : '+'} ${clean(Math.abs(im))}i`;
function randCents(value: string) {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) throw new Error('Use a positive rand amount with at most two decimals.');
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
const publicTour = '[[0,4,9,6],[4,0,3,8],[9,3,0,5],[6,8,5,0]]';

export default function QuantumLabPage() {
  const [preset, setPreset] = useState<'bell' | 'grover' | 'uniform'>('bell');
  const [phase, setPhase] = useState(0), [marked, setMarked] = useState(3), [iterations, setIterations] = useState(1);
  const [loads, setLoads] = useState('2, 3, 5, 7'), [gamma, setGamma] = useState(0.8), [beta, setBeta] = useState(0.4);
  const [scanNotice, setScanNotice] = useState('');
  const [distance, setDistance] = useState(7), [physical, setPhysical] = useState('0.001'), [threshold, setThreshold] = useState('0.01');
  const [tourInput, setTourInput] = useState(publicTour), [budget, setBudget] = useState('15000');
  const [projects, setProjects] = useState([{ id: 'Tools', cost: '10000', priority: '8' }, { id: 'Stock', cost: '8000', priority: '7' }, { id: 'Training', cost: '5000', priority: '5' }]);
  const [pqc, setPqc] = useState<PqcLabResult | null>(null), [pqcStatus, setPqcStatus] = useState('Not run');
  const [pqcBusy, setPqcBusy] = useState(false), [notice, setNotice] = useState('');
  const worker = useRef<Worker | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const download = useRef<{ url: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const stopWorker = () => { worker.current?.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const clearDownload = () => { if (download.current) { clearTimeout(download.current.timer); URL.revokeObjectURL(download.current.url); download.current = null; } };
  useEffect(() => () => { stopWorker(); clearDownload(); }, []);
  const state = useMemo(() => {
    if (preset === 'bell') return bellState(phase * Math.PI / 180);
    let value = uniformState(2);
    if (preset === 'grover') for (let i = 0; i < iterations; i++) value = groverIteration(value, marked);
    return value;
  }, [preset, phase, marked, iterations]);
  const metrics = stateMetrics(state), qasm = twoQubitQasm(preset, phase * Math.PI / 180, marked, iterations);
  const balance = useMemo(() => {
    try {
      const values = loads.split(',').map(x => Number(x.trim())), model = loadBalanceModel(values);
      const simulated = qaoaLayer(model.model, gamma, beta);
      // Compute physical feeder totals per enumerated state. Recovering a
      // squared imbalance by subtracting normalized Ising terms can cancel
      // a genuine small positive cost to zero in binary64.
      const feederTotals = (bits: number) => {
        let feederA = 0, feederB = 0;
        for (let i = 0; i < values.length; i++) {
          if (bits & (1 << i)) feederB += values[i];
          else feederA += values[i];
        }
        return { feederA, feederB };
      };
      // The normalized Ising spectrum can round distinct physical costs to
      // the same energy. Choose the *physical* minimum over all <=64 states.
      let chosen = 0, exactSquaredImbalance = Infinity;
      for (let bits = 0; bits < simulated.state.length; bits++) {
        const { feederA: a, feederB: b } = feederTotals(bits);
        const squared = (a - b) ** 2;
        if (squared < exactSquaredImbalance) { exactSquaredImbalance = squared; chosen = bits; }
      }
      const { feederA, feederB } = feederTotals(chosen);
      // At most 2^6=64 basis states, six loads each; the QAOA expectation
      // is a probability-weighted sum of nonnegative physical costs.
      const expectedSquaredImbalance = simulated.state.reduce((sum, z, bits) => {
        const { feederA: a, feederB: b } = feederTotals(bits);
        return sum + (z.re * z.re + z.im * z.im) * (a - b) ** 2;
      }, 0);
      return { ...model, ...simulated, statesEvaluated: simulated.state.length,
        feederA, feederB, exactSquaredImbalance, expectedSquaredImbalance };
    } catch { return null; }
  }, [loads, gamma, beta]);
  const surface = useMemo(() => { try { return surfaceCodeEstimate(distance, Number(physical), Number(threshold)); } catch { return null; } }, [distance, physical, threshold]);
  const tour = useMemo(() => { try { return shortestClosedTour(JSON.parse(tourInput)); } catch { return null; } }, [tourInput]);
  const allocation = useMemo(() => {
    try { return allocateSmallBudget(projects.map(p => ({ id: p.id, costCents: randCents(p.cost), priority: Number(p.priority) })), randCents(budget)); }
    catch { return null; }
  }, [projects, budget]);

  function save(text: string, name: string, type: string) {
    clearDownload();
    const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    download.current = { url, timer: setTimeout(clearDownload, 10_000) };
    setNotice('Download prepared locally. Keep the assumptions with the results.');
  }
  function runPqc() {
    if (worker.current) return;
    setPqc(null); setPqcStatus('Running public-message self-test…'); setPqcBusy(true);
    try {
      const current = new Worker(new URL('./pqc-lab.worker.ts', import.meta.url), { type: 'module' });
      worker.current = current;
      const fail = () => { if (worker.current !== current) return; stopWorker(); setPqcBusy(false); setPqcStatus('Self-test unavailable or unconfirmed. No protection claim is made.'); };
      current.onerror = fail;
      current.onmessage = event => {
        if (worker.current !== current) return;
        if (event.data?.ok !== true || !verifiedPqcResult(event.data.result)) { fail(); return; }
        setPqc(event.data.result); stopWorker(); setPqcBusy(false); setPqcStatus('Public-message checks passed');
      };
      timer.current = setTimeout(fail, 15_000);
      current.postMessage('RUN_PUBLIC_SELF_TEST');
    } catch { stopWorker(); setPqcBusy(false); setPqcStatus('A secure browser with module workers is required for this experiment.'); }
  }

  return <main className="luqi-info luqi-quantum">
    <p className="luqi-eyebrow">KHORO-QUANTUM-V18 · LOCAL LEARNING LAB</p>
    <h1>Quantum &amp; PQC Lab</h1>
    <p>Explore calculated statevectors, small optimization problems and post-quantum cryptography. Runs on your device, without a quantum-cloud job, account or paid AI call.</p>
    <nav className="quantum-nav" aria-label="Quantum lab sections">
      <a href="#quantum-circuits" onClick={e => { e.preventDefault(); document.getElementById('quantum-circuits')?.scrollIntoView(); }}>Circuits</a>
      <a href="#quantum-optimization" onClick={e => { e.preventDefault(); document.getElementById('quantum-optimization')?.scrollIntoView(); }}>Optimization</a>
      <a href="#quantum-surface" onClick={e => { e.preventDefault(); document.getElementById('quantum-surface')?.scrollIntoView(); }}>Error correction</a>
      <a href="#quantum-pqc" onClick={e => { e.preventDefault(); document.getElementById('quantum-pqc')?.scrollIntoView(); }}>PQC experiment</a>
      <a href="#quantum-academy" onClick={e => { e.preventDefault(); document.getElementById('quantum-academy')?.scrollIntoView(); }}>Track 7</a>
    </nav>
    <section id="quantum-circuits" aria-labelledby="quantum-circuit-title">
      <h2 id="quantum-circuit-title">1. Two-qubit complex statevector</h2>
      <p>Basis order |q1 q0⟩. These are ideal unitary calculations on a classical computer, before measurement; floating-point precision applies.</p>
      <label htmlFor="quantum-preset">Circuit preset</label>
      <select id="quantum-preset" value={preset} onChange={e => setPreset(e.target.value as typeof preset)}>
        <option value="bell">Bell pair: H then CX</option><option value="grover">Grover search: four items</option><option value="uniform">Independent Hadamards</option>
      </select>
      {preset === 'bell' && <label>Rz phase on q1: {phase} degrees<input aria-label="Bell phase" type="range" min={-180} max={180} value={phase} onChange={e => setPhase(Number(e.target.value))} /></label>}
      {preset === 'grover' && <div className="quantum-controls"><label htmlFor="grover-target">Marked basis state</label>
        <select id="grover-target" value={marked} onChange={e => setMarked(Number(e.target.value))}>{[0,1,2,3].map(i => <option key={i} value={i}>{i.toString(2).padStart(2, '0')}</option>)}</select>
        <label>Grover iterations<input aria-label="Grover iterations" type="number" min={0} max={3} value={iterations} onChange={e => setIterations(Math.max(0, Math.min(3, Math.trunc(Number(e.target.value)) || 0)))} /></label>
        <p>With one marked item and N=4, one ideal iteration gives probability 1. Further iterations can undo the amplification.</p></div>}
      <div className="quantum-table"><table><caption>Calculated amplitudes and basis probabilities</caption><thead><tr><th>Basis</th><th>Complex amplitude</th><th>Probability</th></tr></thead>
        <tbody>{state.map((z, i) => <tr key={i}><th scope="row">|{i.toString(2).padStart(2, '0')}⟩</th><td><code>{amplitude(z.re, z.im)}</code></td><td><meter aria-label={`Probability of ${i.toString(2).padStart(2, '0')}`} min={0} max={1} value={metrics.probabilities[i]} /> {clean(metrics.probabilities[i] * 100, 2)}%</td></tr>)}</tbody></table></div>
      <dl className="quantum-metrics"><div><dt>Total probability</dt><dd>{clean(metrics.norm)}</dd></div><div><dt>Concurrence</dt><dd>{clean(metrics.concurrence!)}</dd></div>
        <div><dt>Entanglement entropy</dt><dd>{clean(metrics.entanglementEntropy!)} bits</dd></div><div><dt>Basis measurement entropy</dt><dd>{clean(metrics.measurementEntropy)} bits</dd></div></dl>
      <p>Independent Hadamards have measurement entropy 2 bits but entanglement entropy 0. Correlation in a Bell pair cannot send a faster-than-light message.</p>
      <details><summary>Inspect matching OpenQASM 3.0</summary><pre>{qasm}</pre></details>
      <button className="luqi-secondary" onClick={() => save(qasm, 'luqi-two-qubit.qasm', 'text/plain;charset=utf-8')}>Download OpenQASM circuit</button>
    </section>

    <section id="quantum-optimization" aria-labelledby="quantum-optimization-title">
      <h2 id="quantum-optimization-title">2. QAOA and small exact planning baselines</h2>
      <p>The p=1 QAOA simulation applies cost phases and an X mixer. Its expected cost is compared with exhaustive enumeration. This does not establish quantum speedup, fuel savings or optimality on a large real-world problem.</p>
      <h3>Two-feeder load partition</h3>
      <label>Appliance loads in kW (2–6 comma-separated values)<input value={loads} maxLength={80} onChange={e => { setLoads(e.target.value); setScanNotice(''); }} /></label>
      <p>Indivisible simultaneous loads, two identical feeders, no losses or capacity constraints. Cost is squared imbalance divided by total load squared.</p>
      <div className="quantum-controls"><label>Gamma: {clean(gamma, 3)}<input aria-label="QAOA gamma" type="range" min={0} max={2 * Math.PI} step={0.01} value={gamma} onChange={e => setGamma(Number(e.target.value))} /></label>
        <label>Beta: {clean(beta, 3)}<input aria-label="QAOA beta" type="range" min={0} max={Math.PI} step={0.01} value={beta} onChange={e => setBeta(Number(e.target.value))} /></label></div>
      {balance ? <><dl className="quantum-metrics"><div><dt>Exact best feeder totals</dt><dd>{clean(balance.feederA, 2)} / {clean(balance.feederB, 2)} kW</dd></div>
        <div><dt>Exact minimum squared imbalance</dt><dd>{displayPositive(balance.exactSquaredImbalance, 4)} kW²</dd></div>
        <div><dt>QAOA expected squared imbalance</dt><dd>{displayPositive(balance.expectedSquaredImbalance, 4)} kW²</dd></div>
        <div><dt>Classical states evaluated</dt><dd>{balance.statesEvaluated}</dd></div></dl>
        <button className="luqi-secondary" onClick={() => { const result = searchQaoaGrid(balance.model); setGamma(result.gamma); setBeta(result.beta); setScanNotice(`Compared ${result.parameterPairs} parameter pairs. Best point on this grid; not a proof of the global parameter optimum.`); }}>Scan p=1 parameter grid</button></>
        : <p role="status">Enter 2–6 positive loads, each at most 100 kW.</p>}
      {scanNotice && <p role="status">{scanNotice}</p>}
      <details><summary>Inspect the Ising formulation</summary><p>For zi∈{'{−1,+1}'}, use Jij=2wiwj/W², hi=0 and constant Σwi²/W². This makes E(z)+constant=(Σwi zi/W)².</p></details>
      <h3>Multi-stop logistics: exact small reference</h3>
      <p>Enter a 2–7 stop travel-cost matrix. Stop 0 is the depot; the closed tour visits every other stop once. The example is illustrative, not verified South African road data.</p>
      <label>Travel-cost matrix (JSON)<textarea maxLength={2000} rows={3} value={tourInput} onChange={e => setTourInput(e.target.value)} /></label>
      {tour ? <p role="status" aria-label="Route baseline">Best supplied-cost tour: {tour.tour.join(' → ')}. Cost {tour.cost}; {tour.toursEvaluated} tours compared.</p> : <p role="status">Use a square matrix with a zero diagonal and finite nonnegative costs.</p>}
      <h3>SMME project allocation: exact small reference</h3>
      <p>Maximizes your supplied priority scores under the entered budget. Scores are preferences, not investment returns. No funds are moved.</p>
      <label>Project budget (ZAR)<input inputMode="decimal" value={budget} maxLength={11} onChange={e => setBudget(e.target.value)} /></label>
      <div className="quantum-projects">{projects.map((p, i) => <fieldset key={p.id}><legend>{p.id}</legend>
        <label>Cost (ZAR)<input inputMode="decimal" value={p.cost} maxLength={11} onChange={e => setProjects(old => old.map((x, j) => j === i ? { ...x, cost: e.target.value } : x))} /></label>
        <label>Priority score<input inputMode="decimal" value={p.priority} maxLength={8} onChange={e => setProjects(old => old.map((x, j) => j === i ? { ...x, priority: e.target.value } : x))} /></label></fieldset>)}</div>
      {allocation ? <p role="status" aria-label="Capital baseline">Selected: {allocation.selected.join(', ') || 'none'}. Cost R{(allocation.costCents / 100).toFixed(2)}; priority {allocation.priority}; {allocation.combinationsEvaluated} combinations compared.</p> : <p role="status">Check the budget, costs and nonnegative priority scores.</p>}
    </section>

    <section id="quantum-surface" aria-labelledby="quantum-surface-title"><h2 id="quantum-surface-title">3. Surface-code resource estimator</h2>
      <p>Illustrative rotated planar patch: d² data qubits plus d²−1 syndrome ancillas. Routing, control, magic-state factories and full hardware overhead are excluded.</p>
      <label htmlFor="surface-distance">Code distance</label><select id="surface-distance" value={distance} onChange={e => setDistance(Number(e.target.value))}>{[3,5,7,9,11,13].map(d => <option key={d}>{d}</option>)}</select>
      <div className="quantum-controls"><label>Physical error probability<input value={physical} maxLength={16} inputMode="decimal" onChange={e => setPhysical(e.target.value)} /></label>
        <label>Assumed threshold probability<input value={threshold} maxLength={16} inputMode="decimal" onChange={e => setThreshold(e.target.value)} /></label></div>
      {surface ? <><dl className="quantum-metrics"><div><dt>Patch qubits</dt><dd>{surface.patchQubits} ({surface.dataQubits} data + {surface.syndromeQubits} syndrome)</dd></div>
        <div><dt>Input ratio pth / pphys</dt><dd>{clean(surface.thresholdRatio, 3)}</dd></div>
        <div><dt>Illustrative logical-error estimate</dt><dd>{surface.logicalErrorEstimate === null ? 'Outside below-threshold model' : surface.logicalErrorEstimate.toExponential(3)}</dd></div></dl>
        {!surface.belowThreshold && <p role="status">At or above the assumed threshold, this scaling law must not predict fault tolerance.</p>}</> : <p role="status">Probabilities must be strictly between zero and one.</p>}
      <p>Approximation only: pL≈0.1(pphys/pth)^((d+1)/2), below the assumed threshold. Actual suppression depends on noise, syndrome cycles, layout and decoder. This page does not simulate a decoder or certify hardware.</p>
    </section>

    <section id="quantum-pqc" aria-labelledby="quantum-pqc-title"><h2 id="quantum-pqc-title">4. Real PQC primitives, isolated experiment</h2>
      <p>Run ML-KEM-1024 key agreement, HKDF-SHA384/AES-256-GCM encryption and ML-DSA-87 signing on the fixed public message “abc”. The checks include altered envelopes, signatures, ciphertext and a wrong KEM secret.</p>
      <p>This JavaScript experiment is not a FIPS-validated module or a completed classical/PQ hybrid migration. It does not seal Stokvel records, change archival chains or receive account keys. The library is self-audited, without an independent audit.</p>
      <button className="luqi-primary" disabled={pqcBusy} onClick={runPqc}>Run public-message PQC checks</button>
      {pqcBusy && <button className="luqi-secondary" onClick={() => { stopWorker(); setPqcBusy(false); setPqcStatus('Experiment cancelled. No protection claim is made.'); }}>Cancel experiment</button>}
      <p role="status" aria-label="PQC experiment status">{pqcStatus}</p>
      {pqc && <><ul><li>Shared secrets match and authenticated decryption succeeds.</li><li>ML-DSA signature verifies; altered signature and envelope are rejected.</li><li>Altered AES ciphertext and wrong KEM secret fail authentication.</li></ul>
        <p>ML-KEM public key / ciphertext: {pqc.kemPublicKeyBytes} / {pqc.kemCiphertextBytes} bytes. ML-DSA public key / signature: {pqc.signaturePublicKeyBytes} / {pqc.signatureBytes} bytes.</p>
        <p>Actual SHA-256 of “abc”, distinct from the signature:</p><code className="quantum-hash">{pqc.sha256}</code></>}
      <p><a href="https://csrc.nist.gov/pubs/fips/203/final" target="_blank" rel="noopener noreferrer">NIST FIPS 203: key encapsulation</a> · <a href="https://csrc.nist.gov/pubs/fips/204/final" target="_blank" rel="noopener noreferrer">NIST FIPS 204: signatures</a></p>
    </section>

    <section id="quantum-academy" aria-labelledby="quantum-academy-title"><p className="luqi-eyebrow">{QUANTUM_TRACK_ID}</p><h2 id="quantum-academy-title">5. Track 7: Quantum computing &amp; PQC</h2>
      <p>First principles with local intuition. Mzansi analogies are teaching aids, not formal translations or substitutes for the mathematics.</p>
      {QUANTUM_LESSONS.map(lesson => <details key={lesson.id}><summary>{lesson.title}</summary><h3>Physics and mathematics</h3><p>{lesson.firstPrinciples}</p><h3>Mzansi intuition</h3><p>{lesson.localAnalogy}</p><a href={lesson.source} target="_blank" rel="noopener noreferrer">Read the primary reference</a></details>)}
      <details><summary>Qiskit: reproduce the Bell state locally</summary><pre>{QISKIT_BELL_EXAMPLE}</pre><p>This is a code example to inspect or run in your own Qiskit installation. Luqi does not execute arbitrary Python or submit cloud jobs.</p></details>
    </section>
    <button className="luqi-secondary" onClick={() => save(JSON.stringify({ schema: 'KHORO-QUANTUM-V18-LAB-v1', implementation: 'classical-simulation',
      circuit: { preset, phaseDegrees: phase, marked, iterations, amplitudes: state, ...metrics, qasm },
      surface: { physical: Number(physical), threshold: Number(threshold), result: surface, model: 'illustrative-below-threshold-scaling' },
      optimization: { loads, gamma, beta,
        feederModel: 'two-identical-feeders-no-capacity-constraints',
        feederResult: balance ? { expectedSquaredImbalance: balance.expectedSquaredImbalance,
          exactSquaredImbalance: balance.exactSquaredImbalance,
          exactFeederTotals: [balance.feederA, balance.feederB] } : null,
        suppliedTravelMatrix: tourInput, exactTour: tour, projectBudgetZar: budget, projects, exactAllocation: allocation },
      pqcExperimentScope: 'Ephemeral self-test of public message abc only; not a signature over this notebook.',
      pqcExperiment: pqc, productionProtectionChanged: false }, null, 2), 'luqi-quantum-lab-v18.json', 'application/json')}>Download experiment notebook</button>
    {notice && <p role="status">{notice}</p>}
    <p>Inputs and results remain in this page unless you download a notebook. Downloaded files remain on your device. Leaving clears unsaved work.</p>
    <Link to="/study-desk">Study desk</Link> · <Link to="/chat">Back to Chat</Link>
  </main>;
}
