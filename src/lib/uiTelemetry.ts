/**
 * Consent-gated, on-device diagnostics.
 * No network transport, identifiers, URLs, free text, request bodies or AI inference.
 * Only static registry keys can be recorded. No observers are active without consent.
 */
export type MetricKind = 'action' | 'navigation' | 'api' | 'web-vital';
type Unit = 'count' | 'ms' | 'score';
type Outcome = 'ok' | 'failed' | 'cancelled';

const catalog = {
  tender_prepare: { kind: 'action', unit: 'count' },
  tender_document_open: { kind: 'action', unit: 'count' },
  tender_sources_check: { kind: 'action', unit: 'count' },
  route_change: { kind: 'navigation', unit: 'count' },
  readiness_request: { kind: 'api', unit: 'ms' },
  tender_sources_request: { kind: 'api', unit: 'ms' },
  cls: { kind: 'web-vital', unit: 'score' },
  lcp: { kind: 'web-vital', unit: 'ms' },
} as const satisfies Record<string, { kind: MetricKind; unit: Unit }>;

export type MetricName = keyof typeof catalog;
export type ApiMetricName = 'readiness_request' | 'tender_sources_request';
export type Metric = {
  kind: MetricKind;
  name: MetricName;
  unit: Unit;
  outcome: Outcome;
  count: number;
  total: number;
  max: number;
};

const CONSENT_KEY = 'luqi_analytics_consent';
const MAX_METRICS = 48;
const buckets = new Map<string, Metric>();
let started = false;
// Always honour opt-out even when browser storage refuses a removal.
let forcedOff = false;
let teardown: (() => void) | null = null;

export function getAnalyticsConsent(): boolean {
  try { return !forcedOff && typeof window !== 'undefined' && window.localStorage.getItem(CONSENT_KEY) === 'yes'; }
  catch { return false; }
}

export function clearLocalMetrics(): void { buckets.clear(); }

export function readLocalMetrics(): Metric[] {
  if (!getAnalyticsConsent()) return [];
  return Array.from(buckets.values(), metric => ({ ...metric }));
}

/** Runtime guard intentionally checks untrusted HTML attribute values too. */
export function recordMetric(name: MetricName, value = 1, outcome: Outcome = 'ok'): void {
  if (!getAnalyticsConsent() || !Object.prototype.hasOwnProperty.call(catalog, name) ||
      !['ok', 'failed', 'cancelled'].includes(outcome) || !Number.isFinite(value)) return;
  const definition = catalog[name];
  const max = definition.unit === 'score' ? 10 : definition.unit === 'ms' ? 120000 : 1;
  const safe = Math.round(Math.max(0, Math.min(max, value)) * 10000) / 10000;
  const key = name + ':' + outcome;
  const existing = buckets.get(key);
  if (existing) {
    existing.count = Math.min(existing.count + 1, 1000000);
    existing.total = Math.min(existing.total + safe, 120000000);
    existing.max = Math.max(existing.max, safe);
  } else if (buckets.size < MAX_METRICS) {
    buckets.set(key, { name, kind: definition.kind, unit: definition.unit, outcome,
      count: 1, total: safe, max: safe });
  }
}

/** A permitted operation name, never a request URL, response or error string. */
export async function measureApi<T>(name: ApiMetricName, work: () => Promise<T>): Promise<T> {
  if (!getAnalyticsConsent()) return work();
  const start = performance.now();
  try {
    const result = await work();
    recordMetric(name, performance.now() - start, 'ok');
    return result;
  } catch (error) {
    const cancelled = error instanceof Error && error.name === 'AbortError';
    recordMetric(name, performance.now() - start, cancelled ? 'cancelled' : 'failed');
    throw error;
  }
}

type LayoutShiftEntry = PerformanceEntry & { value: number; hadRecentInput: boolean };

function observeVitals(): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {};
  const observers: PerformanceObserver[] = [];
  let clsMax = 0, windowValue = 0, windowStart = 0, lastShift = 0;
  let lcpMs = 0, clsSeen = false, finished = false, lcpFinished = false;
  let clsObserver: PerformanceObserver | null = null;
  let lcpObserver: PerformanceObserver | null = null;
  const processShifts = (items: PerformanceEntry[]) => {
    for (const item of items) {
      const entry = item as LayoutShiftEntry;
      if (entry.hadRecentInput || !Number.isFinite(entry.value)) continue;
      if (!clsSeen || entry.startTime - lastShift >= 1000 ||
          entry.startTime - windowStart >= 5000) {
        windowStart = entry.startTime;
        windowValue = 0;
      }
      clsSeen = true;
      windowValue += entry.value;
      lastShift = entry.startTime;
      clsMax = Math.max(clsMax, windowValue);
    }
  };
  const supported = PerformanceObserver.supportedEntryTypes || [];

  if (supported.includes('layout-shift')) {
    try {
      const observer = new PerformanceObserver(list => processShifts(list.getEntries()));
      // No buffered entries: never retrospectively inspect pre-consent activity.
      observer.observe({ type: 'layout-shift', buffered: false });
      clsObserver = observer;
      observers.push(observer);
    } catch { /* Older browser: vital unavailable, not zero. */ }
  }
  if (supported.includes('largest-contentful-paint') && document.readyState === 'loading') {
    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) lcpMs = Math.max(lcpMs, entry.startTime);
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: false });
      lcpObserver = observer;
      observers.push(observer);
    } catch { /* Unsupported: no invented LCP value. */ }
  }
  const finalizeLcp = () => {
    if (lcpFinished) return;
    lcpFinished = true;
    // Flush any performance entries buffered just before the first interaction.
    for (const entry of lcpObserver?.takeRecords() || []) lcpMs = Math.max(lcpMs, entry.startTime);
    lcpObserver?.disconnect();
    if (lcpMs > 0) recordMetric('lcp', lcpMs);
  };
  const finalize = () => {
    if (finished) return;
    finished = true;
    // Flush buffered shifts before recording the final CLS session score.
    if (clsObserver) processShifts(clsObserver.takeRecords());

    finalizeLcp();
    if (clsSeen) recordMetric('cls', clsMax);
    for (const observer of observers) observer.disconnect();
  };
  const onVisibility = () => { if (document.visibilityState === 'hidden') finalize(); };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', finalize);
  document.addEventListener('pointerdown', finalizeLcp, { once: true, passive: true });
  document.addEventListener('keydown', finalizeLcp, { once: true, passive: true });
  return () => {
    for (const observer of observers) observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', finalize);
    document.removeEventListener('pointerdown', finalizeLcp);
    document.removeEventListener('keydown', finalizeLcp);
  };
}

function attach(): () => void {
  const onClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const name = event.target.closest('[data-telemetry-action]')?.getAttribute('data-telemetry-action');
    if (name) recordMetric(name as MetricName);
  };
  const onRoute = () => recordMetric('route_change');
  document.addEventListener('click', onClick, { passive: true });
  window.addEventListener('hashchange', onRoute);
  const releaseVitals = observeVitals();
  return () => {
    document.removeEventListener('click', onClick);
    window.removeEventListener('hashchange', onRoute);
    releaseVitals();
  };
}

function synchronizeConsent(): void {
  if (!started) return;
  if (getAnalyticsConsent()) {
    if (!teardown) teardown = attach();
  } else {
    teardown?.();
    teardown = null;
    clearLocalMetrics();
  }
}
function onStorage(event: StorageEvent): void {
  if (event.key === CONSENT_KEY || event.key === null) synchronizeConsent();
}
export function startUiTelemetry(): void {
  if (started || typeof window === 'undefined' || typeof document === 'undefined') return;
  started = true;
  window.addEventListener('storage', onStorage);
  synchronizeConsent();
}
/** Return false if the browser refuses to store consent; never enable silently. */
export function setAnalyticsConsent(granted: boolean): boolean {
  if (!granted) {
    forcedOff = true;
    teardown?.();
    teardown = null;
    clearLocalMetrics();
  }
  try {
    if (granted) window.localStorage.setItem(CONSENT_KEY, 'yes');
    else window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // In inaccessible storage, consent cannot be granted and opt-out still wins.
    if (granted) { forcedOff = true; synchronizeConsent(); }
    return false;
  }
  if (granted) { forcedOff = false; startUiTelemetry(); }
  synchronizeConsent();
  return getAnalyticsConsent();
}
/** Explicitly detach observers; used by tests and recoverable route shells. */
export function stopUiTelemetry(): void {
  teardown?.();
  teardown = null;
  if (started && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  started = false;
}
