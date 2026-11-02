import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalMetrics, measureApi, readLocalMetrics, recordMetric, setAnalyticsConsent } from './uiTelemetry';

const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  });
  clearLocalMetrics();
});
describe('privacy-safe UI telemetry', () => {
  it('never records without opt-in', () => {
    recordMetric('action', 'open_tender');
    expect(readLocalMetrics()).toEqual([]);
  });
  it('only accepts bounded, predefined metric names', () => {
    setAnalyticsConsent(true);
    recordMetric('action', 'open_tender', 15);
    recordMetric('action', 'private person@email.test', 15);
    recordMetric('action', 'open_tender', 25);
    expect(readLocalMetrics()).toEqual([{ kind: 'action', name: 'open_tender', count: 2, totalMs: 40, maxMs: 25 }]);
    setAnalyticsConsent(false);
    expect(readLocalMetrics()).toEqual([]);
  });
  it('measures API failures without capturing their contents', async () => {
    setAnalyticsConsent(true);
    await expect(measureApi('tenders_list', async () => { throw new Error('secret'); })).rejects.toThrow('secret');
    expect(readLocalMetrics()[0].name).toBe('tenders_list');
    expect(JSON.stringify(readLocalMetrics())).not.toContain('secret');
  });
});
