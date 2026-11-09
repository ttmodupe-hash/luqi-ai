// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import LaunchControlPage from '../src/features/launch/LaunchControlPage';
import { CustomerSessionProvider, useCustomerSession } from '../src/providers/customer-session';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const revision='a'.repeat(40);
it('starts without network traffic, checks the actual revision, keeps approval explicit and confirms only the matching release',async()=>{
 const request=vi.fn(async(path:string,_options?:RequestInit)=>new Response(JSON.stringify(path==='/v1/release'?{format:'luqi.release.v1',commit:revision}:{status:'healthy'}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}));
 vi.stubGlobal('fetch',request);render(<MemoryRouter><LaunchControlPage/></MemoryRouter>);expect(request).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Run live checks',exact:true}));
 await waitFor(()=>expect(request).toHaveBeenCalledTimes(2));await waitFor(()=>expect(screen.queryByText(/Checking registered operations/)).toBeNull());
 fireEvent.click(screen.getByRole('button',{name:'Use observed revision as review target'}));
 fireEvent.click(screen.getByRole('button',{name:'Inspect Record owner review',exact:true}));
 expect((screen.getByRole('button',{name:'Record owner review',exact:true}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox',{name:/I reviewed this step/}));fireEvent.click(screen.getByRole('button',{name:'Record owner review',exact:true}));
 expect(request).toHaveBeenCalledTimes(2);
 fireEvent.click(screen.getByRole('button',{name:'Verify reviewed revision',exact:true}));await waitFor(()=>expect(screen.getByText('Observed live',{exact:true})).toBeTruthy());
 expect(request).toHaveBeenCalledTimes(3);for(const call of request.mock.calls)expect((call[1] as RequestInit).method).toBe('GET');
 fireEvent.click(screen.getByRole('button',{name:'Verify reviewed revision',exact:true}));await waitFor(()=>expect(request).toHaveBeenCalledTimes(4));
 await waitFor(()=>expect(screen.queryByText(/Checking registered operations/)).toBeNull());
 fireEvent.change(screen.getByLabelText('Reviewed commit (40 characters)'),{target:{value:'b'.repeat(40)}});expect(screen.getByText('Not confirmed',{exact:true})).toBeTruthy();
 expect((screen.getByRole('button',{name:'Verify reviewed revision',exact:true}) as HTMLButtonElement).disabled).toBe(true);
});
it('clears inputs and pending evidence when customer identity changes, ignoring late prior-account replies',async()=>{
 localStorage.clear();sessionStorage.clear();
 function SwitchIdentity(){const {acceptSession}=useCustomerSession();return <button onClick={()=>acceptSession({token:'synthetic-new-identity',user:{email:'fixture@example.test'}})}>Switch fixture identity</button>;}
 let resolveRelease!:(value:Response)=>void;const deferred=new Promise<Response>(resolve=>{resolveRelease=resolve;});
 const request=vi.fn(async(path:string,_options?:RequestInit)=>path==='/v1/release'?deferred:new Response(JSON.stringify({status:'healthy'}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}));
 vi.stubGlobal('fetch',request);render(<MemoryRouter><CustomerSessionProvider><SwitchIdentity/><LaunchControlPage/></CustomerSessionProvider></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Project name'),{target:{value:'Previous account project'}});
 fireEvent.click(screen.getByRole('button',{name:'Email preflight',exact:true}));fireEvent.change(screen.getByLabelText('Domain'),{target:{value:'previous.example.org'}});
 fireEvent.click(screen.getByRole('button',{name:'Run live checks',exact:true}));await waitFor(()=>expect(request).toHaveBeenCalledTimes(2));
 fireEvent.click(screen.getByRole('button',{name:'Switch fixture identity',exact:true}));
 expect((request.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);expect((screen.getByLabelText('Project name') as HTMLInputElement).value).toBe('Luqi web release');
 resolveRelease(new Response(JSON.stringify({format:'luqi.release.v1',commit:revision}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Use observed revision as review target'})).toBeNull());
 fireEvent.click(screen.getByRole('button',{name:'Email preflight',exact:true}));expect((screen.getByLabelText('Domain') as HTMLInputElement).value).toBe('');
 fireEvent.click(screen.getByRole('button',{name:'Evidence & resume',exact:true}));expect(screen.getByText(/No activity yet/)).toBeTruthy();
 expect(request).toHaveBeenCalledTimes(2);
});
it('adds a real dependent owner checkpoint and keeps email checks local',async()=>{
 const request=vi.fn();vi.stubGlobal('fetch',request);render(<MemoryRouter><LaunchControlPage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Checkpoint title'),{target:{value:'Review rollback evidence'}});fireEvent.change(screen.getByLabelText('Depends on'),{target:{value:'health'}});
 fireEvent.click(screen.getByRole('button',{name:'Add checkpoint',exact:true}));expect(screen.getByRole('button',{name:'Inspect Review rollback evidence',exact:true})).toBeTruthy();
 const inspector=screen.getByRole('complementary',{name:'Launch step details'});expect((within(inspector).getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Email preflight',exact:true}));fireEvent.change(screen.getByLabelText('Domain'),{target:{value:'example.org'}});
 fireEvent.change(screen.getByLabelText('Existing SPF TXT values for this domain'),{target:{value:'v=spf1 -all\nv=spf1 ~all'}});fireEvent.change(screen.getByLabelText('Provider include domain'),{target:{value:'_spf.example.org'}});
 fireEvent.click(screen.getByRole('button',{name:'Run email preflight',exact:true}));await waitFor(()=>expect(screen.getByText(/Multiple SPF records/)).toBeTruthy());expect(request).not.toHaveBeenCalled();
});
it('ships identical source trees for the complete workbench',()=>{
 for(const name of ['launch-engine.ts','email-preflight.ts','LaunchControlPage.tsx','launch-control.css'])expect(readFileSync('src/features/launch/'+name,'utf8')).toBe(readFileSync('app/src/features/launch/'+name,'utf8'));
 for(const name of ['components/workspace-catalog.ts','pages/ServiceStatusPage.tsx'])expect(readFileSync('src/'+name,'utf8')).toBe(readFileSync('app/src/'+name,'utf8'));
 // Entrypoints have existing platform-specific routes; preserve them while mounting this feature in both.
 for(const prefix of ['src/','app/src/']){const app=readFileSync(prefix+'App.tsx','utf8');expect(app).toContain('const LaunchControlPage = lazy(');for(const route of ['/launch-control','/tool-024'])expect(app).toContain('path="'+route+'" element={<LaunchControlPage />}');}
});
