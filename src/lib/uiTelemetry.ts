/**
 * Privacy-minimising frontend diagnostics. Deliberately no raw URLs, input values,
 * text, IPs, identifiers, or payloads. Consent is OFF by default.
 * Emits local aggregates only; an authenticated ingestion endpoint must be reviewed
 * separately before any transmission is enabled.
 */
export type MetricKind = 'action' | 'navigation' | 'api' | 'web-vital';
export type Metric = { kind: MetricKind; name: string; count: number; totalMs: number; maxMs: number };
const buckets = new Map<string, Metric>();
const names = /^[a-z][a-z0-9_-]{0,47}$/;
let started = false;
const bounded = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(120000, Math.round(value))) : 0;
const consented = () => { try { return localStorage.getItem('luqi_analytics_consent') === 'yes'; } catch { return false; } };
export function recordMetric(kind: MetricKind, name: string, durationMs = 0): void {
  if (!consented() || !names.test(name)) return;
  const key = kind + ':' + name;
  const previous = buckets.get(key);
  const sample = bounded(durationMs);
  if (previous) {
    previous.count = Math.min(1000000, previous.count + 1);
    previous.totalMs = Math.min(120000000, previous.totalMs + sample);
    previous.maxMs = Math.max(previous.maxMs, sample);
  } else if (buckets.size < 100) buckets.set(key, { kind, name, count: 1, totalMs: sample, maxMs: sample });
}
export function readLocalMetrics(): Metric[] { return Array.from(buckets.values()).map(x => ({ ...x })); }
export function clearLocalMetrics(): void { buckets.clear(); }
export function setAnalyticsConsent(granted: boolean): void {
  try { if (granted) localStorage.setItem('luqi_analytics_consent', 'yes');
    else localStorage.removeItem('luqi_analytics_consent'); } catch { /* private mode */ }
  if (!granted) clearLocalMetrics();
}
/** Wrap a known API call; never record endpoints or request/response data. */
export async function measureApi<T>(operation: string, work: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try { return await work(); }
  finally { recordMetric('api', operation, performance.now() - start); }
}
export function startUiTelemetry(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    // Only developer-labelled interactions; no scraping of labels or text.
    const action = target.closest('[data-telemetry-action]')?.getAttribute('data-telemetry-action');
    if (action) recordMetric('action', action);
  }, { passive: true });
  window.addEventListener('hashchange', () => recordMetric('navigation', 'route_change'));
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput)
            recordMetric('web-vital', 'layout_shift', entry.value * 1000);
          if (entry.entryType === 'largest-contentful-paint')
            recordMetric('web-vital', 'lcp', entry.startTime);
        }
      });
      const supported = PerformanceObserver.supportedEntryTypes || [];
      const types = ['layout-shift', 'largest-contentful-paint'].filter(type => supported.includes(type));
      if (types.length) observer.observe({ entryTypes: types });
    } catch { /* unsupported browser */ }
  }
}
