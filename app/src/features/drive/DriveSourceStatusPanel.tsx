import React, { useEffect, useRef, useState } from 'react';
import { useInRouterContext, useSearchParams } from 'react-router';
import { useOptionalCustomerSession } from '../../providers/customer-session';
import { corridorId, sourcesForCorridor, type Corridor } from './drive-intelligence';
import { loadSourceStatus, sourceFreshness, type SourceStatusSnapshot } from './drive-source-status';
import './drive-intelligence.css';

const messages = {
  disabled: 'Saved source status is not enabled on this deployment.',
  empty: 'No saved source observations are available yet.',
  unavailable: 'Saved source status is currently unavailable. No road condition can be inferred.',
  available: 'Saved source metadata loaded. These are page checks, not verified travel conditions.',
};
const labels = {
  'not-checked': 'Not yet observed', baseline: 'First saved page observation',
  unchanged: 'Page bytes unchanged since the preceding check',
  'changed-review-required': 'Page bytes changed; content review required',
};
const freshnessLabels = {
  'never-observed': 'No successful observation',
  'recent-observation': 'Observation within the configured review interval',
  'observation-overdue': 'Observation overdue for review',
  'invalid-time': 'Observation time could not be validated',
};
function timeLabel(value: string | null): string { return value ? new Date(value).toLocaleString() : 'Not recorded'; }

/** Optional manual read. No mount-time request, polling, GPS, model call or publisher fetch. */
export function DriveSourceStatusPanel({ corridor }: { corridor: Corridor }) {
  const [snapshot, setSnapshot] = useState<SourceStatusSnapshot | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancel() {
    generation.current += 1; request.current?.abort(); request.current = null;
    if (deadline.current !== null) clearTimeout(deadline.current); deadline.current = null;
  }
  useEffect(() => () => cancel(), []);
  // Age the displayed observation locally without making another request.
  useEffect(() => {
    if (!snapshot) return;
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [snapshot]);
  async function read() {
    cancel(); const token = generation.current, controller = new AbortController(); request.current = controller;
    setBusy(true); setSnapshot(null); setMessage('Reading saved source metadata...');
    deadline.current = setTimeout(() => {
      if (generation.current !== token) return;
      cancel(); setBusy(false); setMessage('Saved source status timed out. The local trip planner is still available.');
    }, 5000);
    try {
      const next = await loadSourceStatus(controller.signal);
      if (generation.current !== token || controller.signal.aborted) return;
      setSnapshot(next); setClock(Date.now()); setMessage(messages[next.state]);
    } catch {
      if (generation.current === token && !controller.signal.aborted) setMessage('Saved source status could not be loaded. No live road or weather information was obtained.');
    } finally {
      if (generation.current === token) { cancel(); setBusy(false); }
    }
  }
  return <details className="driveIntel" onToggle={e => {
    if (!e.currentTarget.open) { cancel(); setBusy(false); setSnapshot(null); setMessage(''); }
  }}>
    <summary>Saved source-check status</summary>
    <h2>See when sources were last checked</h2>
    <p>Use while safely parked or before travel. This optional read asks Luqi for saved public-source timestamps only. It sends no selected stops, coordinates, notes or account credentials.</p>
    <p>It does not refresh publisher pages, enable monitoring, check road safety or fetch current weather.</p>
    <button type="button" disabled={busy} onClick={() => void read()}>{busy ? 'Reading saved status...' : 'Read saved source checks'}</button>
    <p role="status" aria-label="Saved source connection">{message}</p>
    {snapshot && <>
      <p>Snapshot generated: {timeLabel(snapshot.generatedAt)} (device local time). Observation ages update locally; request a new snapshot to see newer saved checks.</p>
      {sourcesForCorridor(corridor).map(source => {
        const item = snapshot.checks.find(check => check.id === source.id)!;
        return <article key={source.id} aria-label={`${source.title} saved observation`}>
          <h3>{source.title}</h3>
          <p>{labels[item.contentState]}</p>
          <dl><dt>Last attempt</dt><dd>{timeLabel(item.lastAttemptAt)}</dd><dt>Last successful page read</dt><dd>{timeLabel(item.lastSuccessAt)}</dd></dl>
          {item.attemptState === 'unavailable' && <p>The most recent attempt did not produce an accepted observation. An earlier successful timestamp is retained, not relabelled as fresh.</p>}
          <p>{freshnessLabels[sourceFreshness(item, new Date(clock))]}</p>
          <p>{source.note}</p>
        </article>;
      })}
      <p>No successful check, unchanged page or recent timestamp is proof that a road is open, a warning is absent or travel is safe. Source text still needs review.</p>
    </>}
  </details>;
}
function ConnectedStatus() {
  const [params] = useSearchParams(); const customer = useOptionalCustomerSession(); const corridor = corridorId(params.get('trail'));
  return <DriveSourceStatusPanel key={(customer?.session?.user.email || 'anonymous') + ':' + corridor} corridor={corridor}/>;
}
export default function DriveSourceStatusEntry() { return useInRouterContext() ? <ConnectedStatus/> : null; }
