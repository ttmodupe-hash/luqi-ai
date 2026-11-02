// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLocalMetrics, getAnalyticsConsent, measureApi, readLocalMetrics, recordMetric,
  setAnalyticsConsent, startUiTelemetry, stopUiTelemetry,
} from './uiTelemetry';

const storage = new Map<string, string>();
class FakeObserver {
  static supportedEntryTypes = ['layout-shift', 'largest-contentful-paint'];
  static instances: FakeObserver[] = [];
  readonly callback: PerformanceObserverCallback;
  type = '';
  closed = false;
  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
    FakeObserver.instances.push(this);
  }
  observe(options: PerformanceObserverInit) { this.type = options.type || options.entryTypes?.[0] || ''; }
  disconnect() { this.closed = true; }
  takeRecords(): PerformanceEntryList { return []; }
  emit(entries: Array<Record<string, unknown>>) {
    if (!this.closed) this.callback(
      { getEntries: () => entries as unknown as PerformanceEntryList } as PerformanceObserverEntryList,
      this as unknown as PerformanceObserver,
    );
  }
}
beforeEach(() => {
  stopUiTelemetry();
  clearLocalMetrics();
  storage.clear();
  FakeObserver.instances.length = 0;
  document.body.innerHTML = '';
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  });
  vi.stubGlobal('PerformanceObserver', FakeObserver);
});
afterEach(() => {
  stopUiTelemetry();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('consent-gated local diagnostics', () => {
  it('is disabled by default: no observers, events, or recording', () => {
    startUiTelemetry();
    recordMetric('tender_prepare');
    expect(getAnalyticsConsent()).toBe(false);
    expect(FakeObserver.instances).toHaveLength(0);
    expect(readLocalMetrics()).toEqual([]);
  });
  it('accepts only registry-defined actions and never captures element text', () => {
    startUiTelemetry();
    expect(setAnalyticsConsent(true)).toBe(true);
    const button = document.createElement('button');
    button.textContent = 'Private bid value and supplier email';
    button.setAttribute('data-telemetry-action', 'tender_prepare');
    document.body.append(button);
    button.click();
    button.setAttribute('data-telemetry-action', 'private_bid_1234');
    button.click();
    recordMetric('tender_prepare', 1);
    expect(readLocalMetrics()).toEqual([
      { name: 'tender_prepare', kind: 'action', unit: 'count', outcome: 'ok',
        count: 2, total: 2, max: 1 },
    ]);
    expect(JSON.stringify(readLocalMetrics())).not.toContain('Private bid');
  });
  it('revocation removes collectors, clears local data and stops subsequent collection', () => {
    startUiTelemetry();
    setAnalyticsConsent(true);
    recordMetric('route_change');
    expect(readLocalMetrics()).toHaveLength(1);
    expect(setAnalyticsConsent(false)).toBe(false);
    expect(FakeObserver.instances.every(observer => observer.closed)).toBe(true);
    window.dispatchEvent(new Event('hashchange'));
    expect(readLocalMetrics()).toEqual([]);
  });
  it('tracks API outcomes without retaining exceptions or unapproved metric names', async () => {
    setAnalyticsConsent(true);
    await expect(measureApi('readiness_request', async () => 'ok')).resolves.toBe('ok');
    await expect(measureApi('readiness_request', async () => { throw new Error('secret identifier'); }))
      .rejects.toThrow('secret identifier');
    const metrics = readLocalMetrics();
    expect(metrics.map(m => m.outcome).sort()).toEqual(['failed', 'ok']);
    expect(metrics.every(m => m.unit === 'ms')).toBe(true);
    expect(JSON.stringify(metrics)).not.toContain('secret');
  });
  it('computes CLS by its largest session window, without multiplying the score', () => {
    setAnalyticsConsent(true);
    const shifts = FakeObserver.instances.find(observer => observer.type === 'layout-shift');
    expect(shifts).toBeDefined();
    shifts!.emit([
      { entryType: 'layout-shift', startTime: 100, value: 0.08, hadRecentInput: false },
      { entryType: 'layout-shift', startTime: 500, value: 0.06, hadRecentInput: false },
      { entryType: 'layout-shift', startTime: 1800, value: 0.1, hadRecentInput: false },
      { entryType: 'layout-shift', startTime: 1900, value: 0.4, hadRecentInput: true },
    ]);
    window.dispatchEvent(new Event('pagehide'));
    expect(readLocalMetrics()).toContainEqual({
      name: 'cls', kind: 'web-vital', unit: 'score', outcome: 'ok',
      count: 1, total: 0.14, max: 0.14,
    });
  });
  it('safely refuses tracking if storage is inaccessible', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('unavailable'); },
      setItem: () => { throw new Error('unavailable'); },
      removeItem: () => { throw new Error('unavailable'); },
    });
    startUiTelemetry();
    expect(setAnalyticsConsent(true)).toBe(false);
    expect(readLocalMetrics()).toEqual([]);
    expect(FakeObserver.instances).toHaveLength(0);
  });
});
