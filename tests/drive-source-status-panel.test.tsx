// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import DriveSourceStatusEntry, { DriveSourceStatusPanel } from '../src/features/drive/DriveSourceStatusPanel';
import { emptySourceStatus, SOURCE_STATUS_PATH } from '../src/features/drive/drive-source-status';
let email='first@example.test';
vi.mock('../src/providers/customer-session',()=>({useOptionalCustomerSession:()=>({session:{user:{email}}})}));
const packet=(state:'disabled'|'empty'|'unavailable'='disabled')=>Response.json({result:{data:{json:emptySourceStatus(state)}}});
function open(){fireEvent.click(screen.getByText('Saved source-check status'));}
function read(){return act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Read saved source checks'}));});}
beforeEach(()=>{email='first@example.test';});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('does not fetch on mount or expand and displays disabled honestly after a deliberate read',async()=>{
 const fetcher=vi.fn(async()=>packet());vi.stubGlobal('fetch',fetcher);
 render(<DriveSourceStatusPanel corridor="n3"/>);expect(fetcher).not.toHaveBeenCalled();open();expect(fetcher).not.toHaveBeenCalled();
 await read();expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0]?.[0]).toBe(SOURCE_STATUS_PATH);
 expect(screen.getByRole('status',{name:'Saved source connection'}).textContent).toContain('not enabled');
});
it('shows an earlier success and recent failure separately, with overdue content',async()=>{
 const now=new Date(),old=new Date(now.getTime()-48*3600000).toISOString(),attempt=new Date(now.getTime()-3600000).toISOString();
 const data=emptySourceStatus('available',now);data.checks[0]={id:data.checks[0].id,lastAttemptAt:attempt,lastSuccessAt:old,attemptState:'unavailable',contentState:'changed-review-required'};
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({result:{data:{json:data}}})));
 render(<DriveSourceStatusPanel corridor="n3"/>);open();await read();
 expect(screen.getByText('Page bytes changed; content review required')).toBeTruthy();expect(screen.getByText('Observation overdue for review')).toBeTruthy();
 expect(screen.getByText(/An earlier successful timestamp is retained/)).toBeTruthy();expect(screen.getByText(/not verified travel conditions/)).toBeTruthy();
});
it('filters saved sources to the corridor without sending a corridor to the server',async()=>{
 const fetcher=vi.fn(async()=>packet('empty'));vi.stubGlobal('fetch',fetcher);
 render(<DriveSourceStatusPanel corridor="n1"/>);open();await read();
 expect(screen.queryByRole('heading',{name:'N3TC route updates'})).toBeNull();expect(screen.getByRole('heading',{name:'DMPR fuel-price notices'})).toBeTruthy();
 expect(fetcher.mock.calls[0]?.[0]).toBe(SOURCE_STATUS_PATH);
});
it('rejects malicious server content without reflecting private diagnostic text',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('PRIVATE-SECRET',{status:500})));
 render(<DriveSourceStatusPanel corridor="za"/>);open();await read();
 expect(screen.getByRole('status',{name:'Saved source connection'}).textContent).toContain('could not be loaded');expect(document.body.textContent).not.toContain('PRIVATE-SECRET');
});
it('times out locally, aborts and ignores a later response',async()=>{
 vi.useFakeTimers();let signal:AbortSignal|undefined,complete!:(r:Response)=>void;
 vi.stubGlobal('fetch',vi.fn((_url,options)=>{signal=options.signal;return new Promise<Response>(resolve=>{complete=resolve;});}));
 render(<DriveSourceStatusPanel corridor="za"/>);open();await read();
 act(()=>vi.advanceTimersByTime(5100));expect(signal?.aborted).toBe(true);expect(screen.getByRole('status',{name:'Saved source connection'}).textContent).toContain('timed out');
 await act(async()=>{complete(packet());});expect(screen.getByRole('status',{name:'Saved source connection'}).textContent).toContain('timed out');
});
it('closing or leaving the panel cancels an in-flight read',async()=>{
 let signal:AbortSignal|undefined;vi.stubGlobal('fetch',vi.fn((_url,options)=>{signal=options.signal;return new Promise(()=>{});}));
 const view=render(<DriveSourceStatusPanel corridor="za"/>);open();await read();view.unmount();expect(signal?.aborted).toBe(true);
});
it('account changes recreate the workspace without carrying status or starting another request',async()=>{
 const fetcher=vi.fn(async()=>packet('empty'));vi.stubGlobal('fetch',fetcher);
 const view=render(<MemoryRouter initialEntries={['/drive?trail=n3']}><DriveSourceStatusEntry/></MemoryRouter>);open();await read();
 expect(screen.getByRole('status',{name:'Saved source connection'}).textContent).toContain('No saved');
 email='second@example.test';view.rerender(<MemoryRouter initialEntries={['/drive?trail=n3']}><DriveSourceStatusEntry/></MemoryRouter>);
 expect(screen.getByText('Saved source-check status').closest('details')?.open).toBe(false);expect(fetcher).toHaveBeenCalledTimes(1);
});
