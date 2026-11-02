// @vitest-environment jsdom
import React from 'react';
import {render,screen,cleanup,waitFor,fireEvent} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import ConnectionStatusBadge from '../src/components/ConnectionStatusBadge';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('green only after a successful actual first-party health check',async()=>{
 const request=vi.fn(async()=>new Response('{}',{status:200,headers:{'content-type':'application/json'}}));
 vi.stubGlobal('fetch',request);
 render(<ConnectionStatusBadge/>);
 await screen.findByText('Luqi connection: Online');
 const span=screen.getByRole('status',{name:'Luqi connection status'}).querySelector('span[aria-hidden]');
 expect(span?.className).toMatch(/bg-emerald-400/);
 expect(request).toHaveBeenCalledWith('/v1/health',expect.objectContaining({method:'GET',credentials:'omit',redirect:'error'}));
});
it('red when health fails or offline, no claim about a particular peer',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:503})));
 render(<ConnectionStatusBadge/>);
 await screen.findByText('Luqi connection: Offline');
 expect(screen.getByRole('status',{name:'Luqi connection status'}).textContent).toMatch(/not peer presence/);
 expect(screen.getByRole('status',{name:'Luqi connection status'}).querySelector('span[aria-hidden]')?.className).toMatch(/bg-red-500/);
});
