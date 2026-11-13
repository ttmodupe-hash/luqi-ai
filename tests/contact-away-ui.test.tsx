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
test('account A consent and status cannot reappear after an A → B → A switch',async()=>{
 const {result,rerender}=renderHook(({token})=>useContactPresence(token),{initialProps:{token:'account-a'}});
 act(()=>result.current.setSharing(true));await flush();
 const firstLease=mocks.presence.mock.calls[0][0];
 expect(result.current.sharing).toBe(true);
 expect(result.current.message).toContain('Sharing recent activity');
 rerender({token:'account-b'});await flush();
 expect(result.current.sharing).toBe(false);
 expect(result.current.away).toBe(false);
 expect(result.current.message).toBe('');
 expect(mocks.presence.mock.calls.at(-1)?.slice(2)).toEqual([false]);
 rerender({token:'account-a'});await flush();
 expect(result.current.sharing).toBe(false);
 expect(result.current.away).toBe(false);
 expect(result.current.message).toBe('');
 const noConsentCalls=mocks.presence.mock.calls.length;
 await act(async()=>{vi.advanceTimersByTime(60_000);});await flush();
 expect(mocks.presence).toHaveBeenCalledTimes(noConsentCalls);
 act(()=>result.current.setSharing(true));await flush();
 expect(result.current.sharing).toBe(true);
 expect(mocks.presence.mock.calls.at(-1)?.[0]).not.toBe(firstLease);
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

test('Hide remains effective when it overtakes the first pending Online heartbeat',async()=>{
  // The server ignores Hide for an unknown lease; model that real contract.
  let completeBeat!:()=>void;let serverSequence=0;let shared=false;
  mocks.presence.mockImplementation((_id:string, sequence:number, active:boolean)=>{
    if(active)return new Promise(resolve=>{
      completeBeat=()=>{
        if(sequence>serverSequence){serverSequence=sequence;shared=true;}
        resolve({accepted:true,ttlSeconds:75});
      };
    });
    if(serverSequence && sequence>serverSequence){serverSequence=sequence;shared=false;}
    return Promise.resolve({accepted:true,ttlSeconds:75});
  });
  const {result}=renderHook(()=>useContactPresence('synthetic'));
  act(()=>result.current.setSharing(true));await flush();
  expect(mocks.presence.mock.calls.map(call=>call.slice(1,3))).toEqual([[1,true]]);
  act(()=>result.current.setSharing(false));await flush();
  expect(shared).toBe(false);
  expect(mocks.presence.mock.calls.map(call=>call.slice(1,3))).toEqual([[1,true],[2,false]]);
  await act(async()=>{completeBeat();await Promise.resolve();});await flush();
  // Once the delayed heartbeat has arrived, the same monotonic Hide is sent
  // again. Without the fix, sharing stays Online for the full 75-second lease.
  expect(shared).toBe(false);
  expect(mocks.presence.mock.calls.map(call=>call.slice(1,3))).toEqual([[1,true],[2,false],[2,false]]);
});

test('late Online success cannot overstate a pending Away change',async()=>{
 let settleOnline!:(value:unknown)=>void, settleAway!:(value:unknown)=>void;
 mocks.presence.mockImplementationOnce(()=>new Promise(done=>{settleOnline=done;}))
   .mockImplementationOnce(()=>new Promise(done=>{settleAway=done;}));
 const {result}=renderHook(()=>useContactPresence('synthetic'));
 act(()=>result.current.setSharing(true));await flush();
 act(()=>result.current.setAway(true));await flush();
 expect(result.current.message).toContain('Updating your shared status');
 await act(async()=>{settleOnline({accepted:true,ttlSeconds:75});});await flush();
 expect(mocks.presence).toHaveBeenCalledTimes(2);
 expect(result.current.message).toContain('Updating your shared status');
 expect(result.current.message).not.toContain('Sharing recent activity');
 await act(async()=>{settleAway({accepted:true,ttlSeconds:75});});await flush();
 expect(result.current.message).toContain('Sharing Away');
});
test('late Online failure cannot replace a pending Away confirmation',async()=>{
 let failOnline!:(reason:unknown)=>void, settleAway!:(value:unknown)=>void;
 mocks.presence.mockImplementationOnce(()=>new Promise((_,reject)=>{failOnline=reject;}))
   .mockImplementationOnce(()=>new Promise(done=>{settleAway=done;}));
 const {result}=renderHook(()=>useContactPresence('synthetic'));
 act(()=>result.current.setSharing(true));await flush();
 act(()=>result.current.setAway(true));await flush();
 await act(async()=>{failOnline(Error('delayed stale Online failure'));});await flush();
 expect(mocks.presence).toHaveBeenCalledTimes(2);
 expect(result.current.message).toContain('Updating your shared status');
 await act(async()=>{settleAway({accepted:true,ttlSeconds:75});});await flush();
 expect(result.current.message).toContain('Sharing Away');
});

test('sharing remains revocable when the contacts roster is unavailable',async()=>{
 mocks.status.mockRejectedValueOnce(Error('synthetic status outage'));
 const stop=vi.fn();
 render(<MemoryRouter><Panel session={{token:'synthetic',user:{email:'fixture@example.invalid'}}} close={()=>{}}
  presence={{sharing:true,away:true,message:'Sharing Away',setSharing:stop,setAway:vi.fn()}}/></MemoryRouter>);
 await flush();
 expect(screen.getByText(/Shared status is not confirmed/)).toBeTruthy();
 expect(screen.queryByText('Sharing Away')).toBeNull();
 const hide=screen.getByRole('checkbox',{name:'Stop sharing my online status from this tab'});
 expect((hide as HTMLInputElement).checked).toBe(true);
 fireEvent.click(hide);
 expect(stop).toHaveBeenCalledWith(false);
 expect(screen.queryByRole('button',{name:'Show me as online'})).toBeNull();
});
test('disabled contacts still offer Hide but never unverified new consent',async()=>{
 mocks.status.mockResolvedValueOnce({enabled:false});
 const stop=vi.fn(), session={token:'synthetic',user:{email:'fixture@example.invalid'}};
 const view=render(<MemoryRouter><Panel session={session} close={()=>{}}
  presence={{sharing:true,away:false,message:'',setSharing:stop,setAway:vi.fn()}}/></MemoryRouter>);
 await flush();
 fireEvent.click(screen.getByRole('checkbox',{name:'Stop sharing my online status from this tab'}));
 expect(stop).toHaveBeenCalledWith(false);
 view.rerender(<MemoryRouter><Panel session={session} close={()=>{}}
  presence={{sharing:false,away:false,message:'',setSharing:stop,setAway:vi.fn()}}/></MemoryRouter>);
 await flush();
 expect(screen.queryByRole('checkbox')).toBeNull();
 expect(screen.queryByRole('button',{name:'Show me as away'})).toBeNull();
});

test('account B never paints account A contact names before passive cleanup', async()=>{
 const a={token:'account-a',user:{email:'a@example.invalid'}};
 const b={token:'account-b',user:{email:'b@example.invalid'}};
 const privateName='Private contact approved only for A';
 mocks.contacts.mockResolvedValueOnce({contacts:[{circleId:'circle-a',name:privateName,presence:'online'}]})
   .mockResolvedValue({contacts:[]});
 const frames:string[]=[];
 function Probe({session}:{session:typeof a}){
   React.useLayoutEffect(()=>{
     frames.push(document.querySelector('.luqi-approved-contacts')?.textContent||'');
   },[session.token]);
   return <Panel session={session}/>;
 }
 const view=render(<MemoryRouter><Probe session={a}/></MemoryRouter>);
 await flush();
 expect(screen.getByText(privateName)).toBeTruthy();
 const before=frames.length;
 view.rerender(<MemoryRouter><Probe session={b}/></MemoryRouter>);
 expect(frames.length).toBeGreaterThan(before);
 for(const frame of frames.slice(before))expect(frame).not.toContain(privateName);
 await flush();
 expect(screen.queryByText(privateName)).toBeNull();
 expect(screen.queryByText('1 contact online')).toBeNull();
});
