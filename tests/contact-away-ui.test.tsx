// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
const mocks=vi.hoisted(()=>({presence:vi.fn(),status:vi.fn(),contacts:vi.fn()}));
vi.mock('../src/lib/p2p-client',()=>({p2pClient:()=>mocks}));
import { useContactPresence } from '../src/components/useContactPresence';
import Panel from '../src/components/ApprovedContactsPanel';
const flush=async()=>{await act(async()=>{await Promise.resolve();await Promise.resolve();});};
beforeEach(()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-02T06:00:00Z'));
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
 Object.defineProperty(navigator,'onLine',{configurable:true,value:true});
 mocks.presence.mockReset().mockResolvedValue({accepted:true,ttlSeconds:75});
 mocks.status.mockReset().mockResolvedValue({enabled:true,eligibility:'verified_adult'});
 mocks.contacts.mockReset().mockResolvedValue({contacts:[]});
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});
test('Away never enables sharing without explicit consent',async()=>{
 const {result}=renderHook(()=>useContactPresence('synthetic'));
 act(()=>result.current.setAway(true));await flush();
 expect(result.current.sharing).toBe(false);expect(result.current.away).toBe(false);expect(mocks.presence).not.toHaveBeenCalled();
});
test('Online, Away and Hide use one ordered lease without revoking between mode changes',async()=>{
 const {result}=renderHook(()=>useContactPresence('synthetic'));
 act(()=>result.current.setSharing(true));await flush();
 const id=mocks.presence.mock.calls[0][0];
 expect(mocks.presence).toHaveBeenLastCalledWith(id,1,true);
 act(()=>result.current.setAway(true));await flush();expect(mocks.presence).toHaveBeenLastCalledWith(id,2,true,true);
 expect(result.current.message).toContain('Sharing Away');
 act(()=>result.current.setAway(false));await flush();expect(mocks.presence).toHaveBeenLastCalledWith(id,3,true);
 act(()=>result.current.setSharing(false));await flush();expect(mocks.presence).toHaveBeenLastCalledWith(id,4,false);
 expect(result.current.away).toBe(false);
});
test('choice made during pending heartbeat is delivered afterwards',async()=>{
 let resolve!:(value:unknown)=>void;mocks.presence.mockImplementationOnce(()=>new Promise(done=>{resolve=done}));
 const {result}=renderHook(()=>useContactPresence('synthetic'));
 act(()=>result.current.setSharing(true));await flush();
 act(()=>result.current.setAway(true));await flush();expect(mocks.presence).toHaveBeenCalledTimes(1);
 await act(async()=>resolve({accepted:true,ttlSeconds:75}));await flush();
 expect(mocks.presence).toHaveBeenCalledTimes(2);expect(mocks.presence.mock.calls[1].slice(2)).toEqual([true,true]);
});
test('hidden page makes no Away heartbeat until foregrounded',async()=>{
 const {result}=renderHook(()=>useContactPresence('synthetic'));
 act(()=>result.current.setSharing(true));await flush();
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
 act(()=>result.current.setAway(true));await flush();
 await act(async()=>vi.advanceTimersByTime(90000));expect(mocks.presence).toHaveBeenCalledTimes(1);
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
 fireEvent(document,new Event('visibilitychange'));await flush();
 expect(mocks.presence.mock.calls.at(-1)?.slice(2)).toEqual([true,true]);
});
test('failed Away update is not labelled as confirmed',async()=>{
 const {result}=renderHook(()=>useContactPresence('synthetic'));
 act(()=>result.current.setSharing(true));await flush();mocks.presence.mockRejectedValueOnce(Error('synthetic transport'));
 act(()=>result.current.setAway(true));await flush();expect(result.current.message).toContain('could not be confirmed');
});
test('account switch withdraws the previous lease and needs new consent',async()=>{
 const {result,rerender}=renderHook(({token})=>useContactPresence(token),{initialProps:{token:'first'}});
 act(()=>result.current.setSharing(true));await flush();act(()=>result.current.setAway(true));await flush();
 rerender({token:'second'});await flush();expect(result.current.sharing).toBe(false);expect(result.current.away).toBe(false);
 expect(mocks.presence.mock.calls.at(-1)?.[2]).toBe(false);
});
test('eligible opted-in user gets an explicit reversible Away control',async()=>{
 const setAway=vi.fn();const presence={sharing:true,away:false,message:'',setSharing:vi.fn(),setAway};
 const session={token:'synthetic',user:{email:'fixture@example.invalid'}};
 const view=render(<MemoryRouter><Panel session={session} close={()=>{}} presence={presence}/></MemoryRouter>);await flush();
 fireEvent.click(screen.getByRole('button',{name:'Show me as away'}));expect(setAway).toHaveBeenCalledWith(true);
 view.rerender(<MemoryRouter><Panel session={session} close={()=>{}} presence={{...presence,away:true}}/></MemoryRouter>);await flush();
 expect(screen.getByRole('button',{name:'Show me as online'}).getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'Show me as online'}));expect(setAway).toHaveBeenLastCalledWith(false);
});
test('disabled messaging does not offer a pretend Away control',async()=>{
 mocks.status.mockResolvedValue({enabled:false});
 render(<MemoryRouter><Panel session={{token:'synthetic',user:{email:'fixture@example.invalid'}}} close={()=>{}}
 presence={{sharing:true,away:false,message:'',setSharing:vi.fn(),setAway:vi.fn()}}/></MemoryRouter>);await flush();
 expect(screen.queryByRole('button',{name:'Show me as away'})).toBeNull();expect(mocks.contacts).not.toHaveBeenCalled();
});
