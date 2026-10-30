// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const beat=vi.hoisted(()=>vi.fn());
vi.mock('../src/lib/p2p-client',()=>({p2pClient:()=>({presence:beat})}));
import { useContactPresence } from '../src/components/useContactPresence';
function Harness({token='one'}:{token?:string}){const value=useContactPresence(token);return <button onClick={()=>value.setSharing(!value.sharing)}>{value.sharing?'Hide':'Share'}</button>}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));beat.mockReset().mockResolvedValue({accepted:true,ttlSeconds:75});vi.spyOn(document,'visibilityState','get').mockReturnValue('visible')});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()});
it('sends no presence until chosen, pauses while hidden and stops on sign-out/account change',async()=>{
 const view=render(<Harness/>);expect(beat).not.toHaveBeenCalled();
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Share'}))});
 expect(beat.mock.calls[0][2]).toBe(true);
 await act(async()=>{vi.advanceTimersByTime(30_000)});expect(beat).toHaveBeenCalledTimes(2);
 vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');
 await act(async()=>{vi.advanceTimersByTime(60_000)});expect(beat).toHaveBeenCalledTimes(2);
 view.rerender(<Harness token="two"/>);
 expect(beat.mock.calls.at(-1)?.[2]).toBe(false);
 expect(screen.getByRole('button',{name:'Share'})).toBeTruthy();
});
it('uses a higher sequence for Hide than an earlier heartbeat',async()=>{
 render(<Harness/>);await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Share'}))});
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Hide'}))});
 expect(beat.mock.calls[1][0]).toBe(beat.mock.calls[0][0]);
 expect(beat.mock.calls[1][1]).toBeGreaterThan(beat.mock.calls[0][1]);
 expect(beat.mock.calls[1][2]).toBe(false);
});
