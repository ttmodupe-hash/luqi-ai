// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PublisherSignals, { parsePublisherSnapshot, usePublisherSignals } from '../src/components/PublisherSignals';
const request = vi.fn();
const snapshot = (time = '2026-10-30T10:00:00Z') => ({ status: 'sources_checked', scope: 'publisher-pages-only', checkedAt: time,
  sources: ['gov-jobs','nyda','nrf'].map(id => ({ id, status: 'reachable', checkedAt: time })) });
function Harness() { return <PublisherSignals signals={usePublisherSignals()} />; }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T10:00:00Z'));
  request.mockReset(); vi.stubGlobal('fetch', request);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const clickRefresh = async () => { await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh source signals' })); }); };
it('does not poll until requested and labels real source timestamps separately from notice review dates', async () => {
  request.mockResolvedValue({ ok: true, json: async () => snapshot() });
  render(<Harness />); expect(request).not.toHaveBeenCalled();
  expect(screen.getAllByText('Not checked')).toHaveLength(3);
  await clickRefresh();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe('/api/v1/opportunity-watch');
  expect(request.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error' });
  expect(screen.getAllByText('Page responded')).toHaveLength(3);
  expect(screen.getByText(/Notice collection reviewed/).textContent).toContain('2026-10-29');
  expect(screen.getByText(/Last publisher check/).textContent).toContain('12:00 SAST');
  await act(async () => { vi.advanceTimersByTime(17 * 60_000); });
  expect(screen.getAllByText('Earlier check')).toHaveLength(3);
  expect(request).toHaveBeenCalledTimes(1);
});
it('clears a previous successful state on a failed, malformed or offline refresh', async () => {
  request.mockResolvedValueOnce({ ok: true, json: async () => snapshot() }).mockResolvedValueOnce({ ok: true, json: async () => ({ ...snapshot(), sources: [] }) });
  render(<Harness />); await clickRefresh(); await clickRefresh();
  expect(screen.queryByText('Page responded')).toBeNull();
  expect(screen.getByText(/could not be confirmed/)).toBeTruthy();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  await clickRefresh();
  expect(request).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/device is offline/)).toBeTruthy();
});
it('bounds opt-in polling, skips hidden tabs and cleans up on exit', async () => {
  request.mockResolvedValue({ ok: true, json: async () => snapshot() });
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const { unmount } = render(<Harness />);
  await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: /Refresh every 5 minutes/ })); });
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { vi.advanceTimersByTime(5 * 60_000); });
  expect(request).toHaveBeenCalledTimes(2);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  await act(async () => { vi.advanceTimersByTime(10 * 60_000); });
  expect(request).toHaveBeenCalledTimes(2);
  unmount(); await act(async () => { vi.advanceTimersByTime(10 * 60_000); });
  expect(request).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
});
it('aborts requests on timeout and unmount without accepting a late success or overlapping requests', async () => {
  let resolve!: (value: unknown) => void;
  request.mockImplementation(() => new Promise(r => { resolve = r; }));
  const { unmount } = render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh source signals' }));
  await act(async () => { vi.advanceTimersByTime(10_000); });
  expect(request.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async () => { resolve({ ok: true, json: async () => snapshot() }); });
  expect(screen.queryByText('Page responded')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh source signals' }));
  const signal = request.mock.calls[1][1].signal;
  unmount(); expect(signal.aborted).toBe(true);
});
it('rejects duplicate, unknown, future-dated and malformed source evidence', () => {
  for (const value of [null, { ...snapshot(), checkedAt: 'tomorrow' }, snapshot('2099-01-01T00:00:00Z'),
    { ...snapshot(), sources: [snapshot().sources[0], snapshot().sources[0], snapshot().sources[2]] },
    { ...snapshot(), scope: 'live-vacancies' }, { ...snapshot(), sources: [null, null, null] }]) {
    expect(() => parsePublisherSnapshot(value)).toThrow();
  }
});
