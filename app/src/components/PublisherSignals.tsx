import { useCallback, useEffect, useRef, useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { JOB_NOTICES_REVIEWED_ON } from '../lib/government-job-notices';

const sources = [
  { id: 'gov-jobs', name: 'Government jobs', url: 'https://www.gov.za/government-jobs-week' },
  { id: 'nyda', name: 'NYDA', url: 'https://www.nyda.gov.za/Opportunities.html' },
  { id: 'nrf', name: 'NRF funding', url: 'https://www.nrf.ac.za/funding/nrf-call-for-proposals-for-funding-in-2026-and-2027/' },
] as const;
type Check = { id: string; status: 'reachable' | 'unavailable'; checkedAt: string; publication?: string };
export type PublisherSnapshot = { status: 'sources_checked'; scope: 'publisher-pages-only'; checkedAt: string; sources: Check[] };
export function parsePublisherSnapshot(value: unknown, now = Date.now()): PublisherSnapshot {
  if (!value || typeof value !== 'object') throw Error('Invalid source check');
  const data = value as PublisherSnapshot;
  const validTime = (time: unknown) => typeof time === 'string' && Number.isFinite(Date.parse(time))
    && Date.parse(time) > 0 && Date.parse(time) <= now + 60_000;
  if (data.status !== 'sources_checked' || data.scope !== 'publisher-pages-only' || !validTime(data.checkedAt)
    || !Array.isArray(data.sources) || data.sources.length !== sources.length
    || new Set(data.sources.map(item => item?.id)).size !== sources.length
    || data.sources.some(item => !item || !sources.some(source => source.id === item.id)
      || !['reachable', 'unavailable'].includes(item.status) || !validTime(item.checkedAt) || item.checkedAt !== data.checkedAt
      || (item.publication !== undefined && (typeof item.publication !== 'string' || item.publication.length > 160)))) throw Error('Invalid source check');
  return data;
}

export function usePublisherSignals() {
  const [scan, setScan] = useState<PublisherSnapshot | null>(null);
  const [scanMessage, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [auto, setAuto] = useState(false);
  const [now, setNow] = useState(Date.now);
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const checkPublishers = useCallback(async () => {
    if (pending.current || !mounted.current) return;
    if (!navigator.onLine) { setScan(null); setMessage('Your device is offline. The last source state is not confirmed.'); return; }
    const controller = new AbortController(); pending.current = controller;
    setChecking(true); setScan(null); setMessage('Checking official publisher pages; this does not verify individual vacancies.');
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch('/api/v1/opportunity-watch', { method: 'GET', cache: 'no-store', credentials: 'omit',
        redirect: 'error', signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw Error('Source check unavailable');
      const data = parsePublisherSnapshot(await response.json());
      if (controller.signal.aborted) throw Error('Source check timed out');
      if (mounted.current) { setScan(data); setNow(Date.now()); setMessage('Publisher-page check completed. A reachable site does not mean an advertised position is open.'); }
    } catch {
      if (mounted.current) { setScan(null); setMessage('Official source availability could not be confirmed. Open the original agency websites directly.'); }
    } finally {
      clearTimeout(timeout); pending.current = null;
      if (mounted.current) setChecking(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const offline = () => { pending.current?.abort(); setScan(null); setMessage('Your device is offline. The last source state is not confirmed.'); };
    window.addEventListener('offline', offline);
    return () => { mounted.current = false; pending.current?.abort(); window.removeEventListener('offline', offline); };
  }, []);
  useEffect(() => {
    // No automatic network activity until the visitor explicitly enables it.
    if (!auto) return;
    void checkPublishers();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) void checkPublishers();
    }, 5 * 60_000);
    return () => clearInterval(timer);
  }, [auto, checkPublishers]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  return { scan, scanMessage, checking, checkPublishers, auto, setAuto, now };
}
export type PublisherSignalsState = ReturnType<typeof usePublisherSignals>;
export default function PublisherSignals({ signals }: { signals: PublisherSignalsState }) {
  const { scan, scanMessage, checking, checkPublishers, auto, setAuto, now } = signals;
  const recent = scan && now - Date.parse(scan.checkedAt) <= 16 * 60_000;
  return <section className="luqi-publisher-signals" aria-label="Publisher signals" aria-busy={checking}>
    <div className="luqi-signal-heading"><div><p><Radio size={14} aria-hidden="true" /> CONNECTED TO THE SOURCES</p>
      <h3>Fresh checks. Clear dates.</h3></div><button type="button" disabled={checking} onClick={() => void checkPublishers()}>
      <RefreshCw size={14} className={checking ? 'is-checking' : ''} aria-hidden="true" />{checking ? 'Checking sources…' : 'Refresh source signals'}</button></div>
    <div className="luqi-signal-grid">{sources.map(source => {
      const result = scan?.sources.find(item => item.id === source.id);
      const state = checking ? 'Checking' : !result ? 'Not checked' : !recent ? 'Earlier check' : result.status === 'reachable' ? 'Page responded' : 'Check unavailable';
      return <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className={recent && result?.status === 'reachable' ? 'is-confirmed' : ''}>
        <span className="luqi-signal-dot" aria-hidden="true" /><strong>{source.name}</strong><span>{state}</span></a>;
    })}</div>
    <div className="luqi-signal-controls"><label><input type="checkbox" checked={auto} onChange={event => setAuto(event.target.checked)} /> Refresh every 5 minutes while open</label>
      <span>Notice collection reviewed <time dateTime={JOB_NOTICES_REVIEWED_ON}>{JOB_NOTICES_REVIEWED_ON}</time></span></div>
    {scan && <p>Last publisher check: <time dateTime={scan.checkedAt}>{new Date(scan.checkedAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' })} SAST</time>{!recent && ' · Earlier result; refresh to request the latest cached check.'}</p>}
    {scanMessage && <p role="status">{scanMessage}</p>}
    <p className="luqi-signal-note">Source checks are shared and cached for up to 15 minutes. These check publisher pages, not new vacancies. Reviewed notices update with verified Luqi releases. Map pulses mark reviewed-notice counts, not live people or job-site locations.</p>
  </section>;
}
