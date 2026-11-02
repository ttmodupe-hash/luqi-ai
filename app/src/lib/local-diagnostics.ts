/** Opt-in, on-device diagnostics. No identifiers, prompts, URLs, persistence or uploads. */
export type DiagnosticRoute = 'home' | 'guide' | 'guest' | 'chat' | 'join' | 'telemetry' | 'other';
export type JourneyStep = 'home_goal' | 'guide_ready' | 'guest_send' | 'guest_reply' |
  'guest_unconfirmed' | 'signed_send' | 'signed_reply' | 'signed_unconfirmed';
export type RequestKind = 'guest_availability' | 'guest_reply' | 'pilot_availability' | 'pilot_reply';
type ApiAggregate = Readonly<{ calls: number; failed: number; slow: number; totalMs: number }>;
export type LocalDiagnostics = Readonly<{
  enabled: boolean;
  controls: number;
  routes: Readonly<Record<DiagnosticRoute, number>>;
  journey: Readonly<Record<JourneyStep, number>>;
  api: Readonly<Record<RequestKind, ApiAggregate>>;
  vitals: Readonly<{ lcpMs: number | null; clsMilli: number; longTasks: number }>;
  conserveMotion: boolean;
  truncated: boolean;
}>;
const ROUTES: readonly DiagnosticRoute[] = ['home','guide','guest','chat','join','telemetry','other'];
const JOURNEY: readonly JourneyStep[] = [
  'home_goal','guide_ready','guest_send','guest_reply','guest_unconfirmed',
  'signed_send','signed_reply','signed_unconfirmed',
];
const REQUESTS: readonly RequestKind[] = ['guest_availability','guest_reply','pilot_availability','pilot_reply'];
const MAX_EVENTS = 2500;
const ZERO_API: ApiAggregate = { calls:0, failed:0, slow:0, totalMs:0 };
const fresh = (enabled: boolean): LocalDiagnostics => ({
  enabled, controls:0,
  routes: Object.fromEntries(ROUTES.map(key => [key,0])) as Record<DiagnosticRoute, number>,
  journey: Object.fromEntries(JOURNEY.map(key => [key,0])) as Record<JourneyStep, number>,
  api: Object.fromEntries(REQUESTS.map(key => [key,{...ZERO_API}])) as Record<RequestKind, ApiAggregate>,
  vitals: { lcpMs:null, clsMilli:0, longTasks:0 },
  conserveMotion:false, truncated:false,
});
let current: LocalDiagnostics = fresh(false);
let samples = 0;
const listeners = new Set<() => void>();
const observers: PerformanceObserver[] = [];
export const getLocalDiagnostics = (): LocalDiagnostics => current;
export const subscribeLocalDiagnostics = (listen: () => void): (() => void) => {
  listeners.add(listen);
  return () => { listeners.delete(listen); };
};
const announce = (next: LocalDiagnostics) => {
  current = next;
  for (const listener of listeners) listener();
};
const publish = (next: LocalDiagnostics) => {
  if (!current.enabled) return;
  if (samples >= MAX_EVENTS) {
    if (!current.truncated) announce({ ...current, truncated:true });
    return;
  }
  samples++;
  const conserveMotion = next.vitals.clsMilli >= 100 || next.vitals.longTasks >= 3 ||
    (next.vitals.lcpMs !== null && next.vitals.lcpMs > 4000) ||
    Object.values(next.api).some(x => x.slow >= 3);
  announce({ ...next, conserveMotion });
};
function observeVitals() {
  if (typeof PerformanceObserver === 'undefined') return;
  for (const type of ['largest-contentful-paint','layout-shift','longtask']) {
    try {
      const observer = new PerformanceObserver(list => {
        for (const item of list.getEntries()) {
          if (type === 'largest-contentful-paint') recordLocalVital('lcp', item.startTime);
          if (type === 'layout-shift') {
            const shift = item as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
            if (shift.hadRecentInput !== true) recordLocalVital('cls', shift.value ?? NaN);
          }
          if (type === 'longtask') recordLocalVital('longtask', item.duration);
        }
      });
      observer.observe({ type, buffered:true });
      observers.push(observer);
    } catch { /* Unsupported entry type: other metrics remain useful. */ }
  }
}
export function setLocalDiagnosticsEnabled(enabled: boolean): void {
  if (current.enabled === enabled) return;
  for (const observer of observers.splice(0)) observer.disconnect();
  samples = 0;
  announce(fresh(enabled));
  if (enabled) observeVitals();
}
export function clearLocalDiagnostics(): void {
  samples = 0;
  announce(fresh(current.enabled));
}
/** Keys are static categories, never user-supplied paths, labels or query strings. */
export function recordLocalRoute(path: string): void {
  if (!current.enabled) return;
  const route: DiagnosticRoute =
    path === '/' ? 'home' : path === '/ask' ? 'guide' : path === '/try' ? 'guest' :
    path === '/chat' || path === '/ai-trial' ? 'chat' :
    path === '/join' || path === '/login' ? 'join' : path === '/telemetry' || path === '/super-core' ? 'telemetry' : 'other';
  publish({ ...current, routes:{ ...current.routes, [route]:current.routes[route]+1 } });
}
/** Counts an activation only; never reads its target text, href, form or value. */
export function recordLocalActivation(): void {
  if (current.enabled) publish({ ...current, controls:current.controls+1 });
}
export function recordLocalJourney(step: JourneyStep): void {
  if (!current.enabled || !JOURNEY.includes(step)) return;
  publish({ ...current, journey:{ ...current.journey, [step]:current.journey[step]+1 } });
}
const finiteDuration = (ms: number) => Number.isFinite(ms) && ms >= 0
  ? Math.min(60_000, Math.round(ms)) : 0;
/** Only a fixed status class and duration are stored. A failed POST is NEVER retried here. */
export function recordLocalRequest(kind: RequestKind, status: number | 'network', elapsedMs: number): void {
  if (!current.enabled || !REQUESTS.includes(kind)) return;
  const old = current.api[kind];
  const ms = finiteDuration(elapsedMs);
  const failed = status === 'network' || !Number.isInteger(status) || status < 200 || status >= 400;
  publish({ ...current, api:{
    ...current.api, [kind]:{
      calls:old.calls+1, failed:old.failed+Number(failed),
      slow:old.slow+Number(ms >= (kind.includes('availability') ? 1500 : 5000)),
      totalMs:Math.min(60_000*MAX_EVENTS,old.totalMs+ms),
    },
  } });
}
export function recordLocalVital(kind:'lcp'|'cls'|'longtask', value:number): void {
  if (!current.enabled || !Number.isFinite(value) || value < 0) return;
  const v = current.vitals;
  if (kind === 'lcp') publish({ ...current, vitals:{...v,lcpMs:finiteDuration(value)} });
  else if (kind === 'cls') publish({ ...current, vitals:{...v,clsMilli:Math.min(5000,v.clsMilli+Math.round(value*1000))} });
  else if (value >= 50) publish({ ...current, vitals:{...v,longTasks:v.longTasks+1} });
}
const clock = () => typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now() : Date.now();
/** Non-invasive wrapper for explicitly known LUQI endpoints; no body/header inspection or upload. */
export async function fetchWithLocalDiagnostics(kind:RequestKind, request:typeof fetch,
  path:string, init:RequestInit):Promise<Response> {
  if (!current.enabled) return request(path,init);
  const started = clock();
  try {
    const response = await request(path,init);
    recordLocalRequest(kind,response.status,clock()-started);
    return response;
  } catch(error) {
    recordLocalRequest(kind,'network',clock()-started);
    throw error;
  }
}
/** Conserves data and animation work on slow clients. No automatic network prefetch. */
export function mayWarmOptionalRoute(): boolean {
  if (!current.enabled || current.conserveMotion || typeof navigator === 'undefined' ||
      navigator.onLine === false) return false;
  const device = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
  return device.connection?.saveData !== true && device.connection?.effectiveType !== 'slow-2g' &&
    device.connection?.effectiveType !== '2g' &&
    (device.deviceMemory === undefined || device.deviceMemory >= 2);
}
