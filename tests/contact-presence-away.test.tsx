// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ presence: vi.fn(), status: vi.fn(), contacts: vi.fn() }));
vi.mock('../src/lib/p2p-client', () => ({ p2pClient: () => mocks }));
import { useContactPresence } from '../src/components/useContactPresence';
import Panel from '../src/components/ApprovedContactsPanel';
function Harness({ token = 'synthetic-one' }: { token?: string }) {
  const presence = useContactPresence(token);
  return <MemoryRouter><Panel key={token} session={{token,user:{email:'fixture@example.invalid'}}} close={() => {}} presence={presence}/></MemoryRouter>;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-02T08:00:00Z'));
  mocks.presence.mockReset().mockResolvedValue({accepted:true,ttlSeconds:75});
  mocks.status.mockReset().mockResolvedValue({enabled:true,eligibility:'verified_adult'});
  mocks.contacts.mockReset().mockResolvedValue({contacts:[]});
  vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
  vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function mount() { let view!: ReturnType<typeof render>; await act(async () => {view=render(<Harness/>);}); return view; }
async function share() { await act(async () => {fireEvent.click(screen.getByRole('checkbox',{name:'Share my online status from this tab'}));}); }
async function choose(value:string) { await act(async () => {fireEvent.change(screen.getByRole('combobox',{name:'My shared availability'}),{target:{value}});}); }
it('does not publish availability before consent; selected away is sent after the rate window', async () => {
  await mount(); expect(mocks.presence).not.toHaveBeenCalled(); expect(screen.queryByRole('combobox')).toBeNull();
  await share(); expect(mocks.presence).toHaveBeenCalledTimes(1);
  await choose('away'); expect(mocks.presence).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('status').textContent).toContain('Updating');
  await act(async () => {vi.advanceTimersByTime(10000);});
  expect(mocks.presence.mock.calls.at(-1)?.slice(2)).toEqual([true,'away']);
  expect(screen.getByRole('status').textContent).toContain('Sharing Away');
});
it('returning online keeps the same lease with a newer sequence', async () => {
  await mount(); await share(); await choose('away'); await act(async () => {vi.advanceTimersByTime(10000);});
  await choose('online'); await act(async () => {vi.advanceTimersByTime(10000);});
  const calls=mocks.presence.mock.calls;
  expect(calls.at(-1)?.[0]).toBe(calls[0][0]); expect(calls.at(-1)?.[1]).toBeGreaterThan(calls[0][1]);
  expect(calls.at(-1)?.slice(2)).toEqual([true]);
});
it('Hide cancels a queued away update and uses a newer opt-out sequence', async () => {
  await mount(); await share(); await choose('away'); await share();
  const count=mocks.presence.mock.calls.length;
  expect(mocks.presence.mock.calls.at(-1)?.[2]).toBe(false);
  expect(mocks.presence.mock.calls.at(-1)?.[1]).toBeGreaterThan(mocks.presence.mock.calls[0][1]);
  await act(async () => {vi.advanceTimersByTime(60000);});
  expect(mocks.presence).toHaveBeenCalledTimes(count); expect(screen.queryByRole('combobox')).toBeNull();
});
it('hidden pages do not renew away; resuming uses the selected state', async () => {
  await mount(); await share(); vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');
  await choose('away'); await act(async () => {vi.advanceTimersByTime(30000);});
  expect(mocks.presence).toHaveBeenCalledTimes(1);
  vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
  await act(async () => {document.dispatchEvent(new Event('visibilitychange'));});
  expect(mocks.presence.mock.calls.at(-1)?.[3]).toBe('away');
});
it('switching accounts cancels deferred publication and requires fresh consent', async () => {
  const view=await mount(); await share(); await choose('away');
  await act(async () => {view.rerender(<Harness token="synthetic-two"/>);});
  const count=mocks.presence.mock.calls.length;
  expect(mocks.presence.mock.calls.at(-1)?.[2]).toBe(false);
  await act(async () => {vi.advanceTimersByTime(30000);});
  expect(mocks.presence).toHaveBeenCalledTimes(count); expect(screen.queryByRole('combobox')).toBeNull();
});
it('a rejected away update is not presented as successfully shared', async () => {
  await mount(); await share(); mocks.presence.mockRejectedValueOnce(Error('synthetic failure'));
  await choose('away'); await act(async () => {vi.advanceTimersByTime(10000);});
  expect(screen.getByRole('status').textContent).toContain('could not be confirmed');
  expect(screen.getByRole('status').textContent).not.toContain('Sharing Away');
});
