import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { clearLocalDiagnostics, estimateLocalP95UpperBound, fetchWithLocalDiagnostics, getLocalDiagnostics,
  mayWarmOptionalRoute, recordLocalActivation, recordLocalJourney, recordLocalRequest,
  recordLocalRoute, recordLocalVital, setLocalDiagnosticsEnabled,
  subscribeLocalDiagnostics } from '../src/lib/local-diagnostics';

beforeEach(() => { setLocalDiagnosticsEnabled(false); clearLocalDiagnostics(); });
afterEach(() => { setLocalDiagnosticsEnabled(false); vi.unstubAllGlobals(); });

describe('no-upload, opt-in local UX diagnostics', () => {
  it('starts disabled and never records user interaction before opt-in', () => {
    recordLocalRoute('/chat?private=SECRETPROMPT');
    recordLocalJourney('home_goal');
    recordLocalActivation();
    recordLocalRequest('pilot_reply',200,25);
    expect(getLocalDiagnostics().enabled).toBe(false);
    expect(getLocalDiagnostics().controls).toBe(0);
    expect(getLocalDiagnostics().journey.home_goal).toBe(0);
    expect(getLocalDiagnostics().api.pilot_reply.calls).toBe(0);
  });
  it('stores bounded aggregate categories, never user text, URLs or identifiers', () => {
    setLocalDiagnosticsEnabled(true);
    recordLocalRoute('/chat');
    recordLocalRoute('/chat?secret=SECRETPROMPT');
    recordLocalJourney('home_goal');
    recordLocalJourney('guide_ready');
    recordLocalActivation();
    recordLocalActivation();
    const state=getLocalDiagnostics();
    expect(state.routes.chat).toBe(1);
    expect(state.routes.other).toBe(1);
    expect(state.journey.home_goal).toBe(1);
    expect(state.controls).toBe(2);
    expect(JSON.stringify(state)).not.toContain('SECRETPROMPT');
    expect(Object.keys(state.routes).sort()).toEqual(['chat','guest','guide','home','join','other','telemetry']);
  });
  it('has no outgoing analytics call and preserves exact GET options and responses', async () => {
    setLocalDiagnosticsEnabled(true);
    const response=Response.json({ enabled:true });
    const fetcher=vi.fn(async () => response) as unknown as typeof fetch;
    const controller=new AbortController();
    const init={ method:'GET', signal:controller.signal, credentials:'same-origin' as RequestCredentials };
    expect(await fetchWithLocalDiagnostics('guest_availability',fetcher,'/api/v1/guest-chat',init)).toBe(response);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('/api/v1/guest-chat',init);
    expect(getLocalDiagnostics().api.guest_availability.calls).toBe(1);
    expect(getLocalDiagnostics().api.guest_availability.failed).toBe(0);
  });
  it('counts HTTP errors and ambiguous network failures without retries or sensitive error data', async () => {
    setLocalDiagnosticsEnabled(true);
    const forbidden=Response.json({ message:'PRIVATE-TOKEN' },{status:429});
    const fetcher=vi.fn(async () => forbidden) as unknown as typeof fetch;
    expect(await fetchWithLocalDiagnostics('guest_reply',fetcher,'/api/v1/guest-chat',{method:'POST'})).toBe(forbidden);
    const error=new Error('PRIVATE-NETWORK-DETAIL');
    const rejected=vi.fn(async () => { throw error; }) as unknown as typeof fetch;
    await expect(fetchWithLocalDiagnostics('pilot_reply',rejected,'/api/v1/luqi-core',{method:'POST'})).rejects.toBe(error);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(rejected).toHaveBeenCalledTimes(1);
    expect(getLocalDiagnostics().api.guest_reply).toMatchObject({calls:1,failed:1});
    expect(getLocalDiagnostics().api.pilot_reply).toMatchObject({calls:1,failed:1});
    expect(JSON.stringify(getLocalDiagnostics())).not.toMatch(/PRIVATE-|guest cookie|Authorization/i);
  });
  it('captures five bounded duration bins without retaining individual request data', () => {
    setLocalDiagnosticsEnabled(true);
    for(const ms of [0,250,251,1000,1001,3000,3001,10000,10001,60001]) {
      recordLocalRequest('pilot_reply',200,ms);
    }
    const api=getLocalDiagnostics().api;
    expect(api.pilot_reply.latencyBuckets).toEqual([2,2,2,2,2]);
    expect(estimateLocalP95UpperBound(api)).toBe(60000);
    expect(api.pilot_reply.calls).toBe(10);
    expect(JSON.stringify(api)).not.toMatch(/token|prompt|url|history/i);
    clearLocalDiagnostics();
    expect(getLocalDiagnostics().api.pilot_reply.latencyBuckets).toEqual([0,0,0,0,0]);
    expect(estimateLocalP95UpperBound(getLocalDiagnostics().api)).toBeNull();
  });
  it('approximates local tail latency across fixed endpoint groups', () => {
    setLocalDiagnosticsEnabled(true);
    for(let i=0;i<19;i++) recordLocalRequest('guest_availability',200,200);
    recordLocalRequest('guest_reply',503,3200);
    expect(estimateLocalP95UpperBound(getLocalDiagnostics().api)).toBe(250);
    recordLocalRequest('guest_reply',200,9000);
    expect(estimateLocalP95UpperBound(getLocalDiagnostics().api)).toBe(10000);
  });
  it('switches to reduced motion after measured rendering strain, without automatic cache or provider calls', () => {
    setLocalDiagnosticsEnabled(true);
    vi.stubGlobal('navigator',{onLine:true,connection:{saveData:false,effectiveType:'4g'},deviceMemory:4});
    expect(mayWarmOptionalRoute()).toBe(true);
    recordLocalVital('longtask',60);
    recordLocalVital('longtask',75);
    expect(getLocalDiagnostics().conserveMotion).toBe(false);
    recordLocalVital('longtask',85);
    expect(getLocalDiagnostics().conserveMotion).toBe(true);
    expect(mayWarmOptionalRoute()).toBe(false);
    clearLocalDiagnostics();
    expect(getLocalDiagnostics().conserveMotion).toBe(false);
    expect(getLocalDiagnostics().controls).toBe(0);
  });
  it('honours connection data-saving and rejects invalid performance samples', () => {
    setLocalDiagnosticsEnabled(true);
    vi.stubGlobal('navigator',{onLine:true,connection:{saveData:true,effectiveType:'4g'},deviceMemory:4});
    expect(mayWarmOptionalRoute()).toBe(false);
    recordLocalVital('cls',NaN);
    recordLocalVital('lcp',-1);
    expect(getLocalDiagnostics().vitals).toMatchObject({lcpMs:null,clsMilli:0,longTasks:0});
    recordLocalVital('cls',0.12);
    expect(getLocalDiagnostics().conserveMotion).toBe(true);
  });
  it('clears all measurements and unsubscribes cleanly, including on disable', () => {
    const notify=vi.fn();
    const unsubscribe=subscribeLocalDiagnostics(notify);
    setLocalDiagnosticsEnabled(true);
    recordLocalJourney('guest_send');
    recordLocalRequest('guest_reply',503,50000);
    expect(getLocalDiagnostics().api.guest_reply.slow).toBe(1);
    setLocalDiagnosticsEnabled(false);
    expect(getLocalDiagnostics().enabled).toBe(false);
    expect(getLocalDiagnostics().journey.guest_send).toBe(0);
    expect(getLocalDiagnostics().api.guest_reply.calls).toBe(0);
    const callCount=notify.mock.calls.length;
    unsubscribe();
    setLocalDiagnosticsEnabled(true);
    expect(notify.mock.calls.length).toBe(callCount);
  });

  it('never imports buffered pre-consent paint samples or previous observer sessions', () => {
    const callbacks: PerformanceObserverCallback[]=[];
    vi.stubGlobal('performance',{now:()=>1000});
    vi.stubGlobal('PerformanceObserver', class {
      constructor(callback: PerformanceObserverCallback){ callbacks.push(callback); }
      observe() {}
      disconnect() {}
    });
    const deliver=(cb:PerformanceObserverCallback,startTime:number) =>
      cb({getEntries:()=>[{startTime}]} as unknown as PerformanceObserverEntryList,{} as PerformanceObserver);
    setLocalDiagnosticsEnabled(true);
    expect(callbacks).toHaveLength(3);
    deliver(callbacks[0],900);
    expect(getLocalDiagnostics().vitals.lcpMs).toBeNull();
    deliver(callbacks[0],1100);
    expect(getLocalDiagnostics().vitals.lcpMs).toBe(1100);
    clearLocalDiagnostics();
    expect(getLocalDiagnostics().vitals.lcpMs).toBeNull();
    deliver(callbacks[0],1200);
    expect(getLocalDiagnostics().vitals.lcpMs).toBeNull();
    deliver(callbacks[3],1200);
    expect(getLocalDiagnostics().vitals.lcpMs).toBe(1200);
  });
  it('discards delayed fetch results from old consent or clear sessions', async () => {
    let finish!: (response:Response)=>void;
    const request=vi.fn(()=>new Promise<Response>(resolve=>{ finish=resolve; })) as unknown as typeof fetch;
    setLocalDiagnosticsEnabled(true);
    const earlier=fetchWithLocalDiagnostics('guest_reply',request,'/api/v1/guest-chat',{method:'POST'});
    setLocalDiagnosticsEnabled(false);
    setLocalDiagnosticsEnabled(true);
    finish(new Response(null,{status:200}));
    await earlier;
    expect(getLocalDiagnostics().api.guest_reply.calls).toBe(0);
    const priorToClear=fetchWithLocalDiagnostics('guest_reply',request,'/api/v1/guest-chat',{method:'POST'});
    clearLocalDiagnostics();
    finish(new Response(null,{status:503}));
    await priorToClear;
    expect(getLocalDiagnostics().api.guest_reply.calls).toBe(0);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('caps per-tab events and never turns into an unbounded click history', () => {
    setLocalDiagnosticsEnabled(true);
    for(let i=0;i<2550;i++) recordLocalActivation();
    expect(getLocalDiagnostics().controls).toBe(2500);
    expect(getLocalDiagnostics().truncated).toBe(true);
  });
});
