// @vitest-environment jsdom
import React, {lazy} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {checkPublicRelease,currentPublicBoot,servedPublicBoot} from '../src/lib/public-release-update';
import PublicReleaseUpdateNotice from '../src/components/PublicReleaseUpdateNotice';
import RouteLoadBoundary from '../src/components/RouteLoadBoundary';

const origin='https://app.luqi-ai.com';
const html=(src:string)=>'<!doctype html><html><head><script crossorigin type="module" src="'+src+'"></script></head><body></body></html>';
const script=(src:string)=>{
 const s=document.createElement('script');s.type='module';s.src=src;document.head.appendChild(s);return s;
};
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();document.querySelectorAll('script[src*="index-fixture"]').forEach(x=>x.remove());});

it('identifies only same-origin hashed public app boot scripts, not an API or hostile script',()=>{
 const fixture=script('/assets/index-fixture-old123.js');
 expect(currentPublicBoot(document,origin)).toBe('/assets/index-fixture-old123.js');
 expect(servedPublicBoot(html('/assets/index-fixture-new123.js'),origin)).toBe('/assets/index-fixture-new123.js');
 expect(servedPublicBoot(html('https://malicious.invalid/assets/index-fixture-new123.js'),origin)).toBeNull();
 expect(servedPublicBoot(html('/assets/index-fixture-new123.js?token=hidden'),origin)).toBeNull();
 expect(servedPublicBoot(html('/api/v1/secret'),origin)).toBeNull();
 expect(servedPublicBoot(html('/src/main.tsx'),origin)).toBeNull();
 expect(servedPublicBoot(html('/assets/index-'+ 'A'.repeat(40_000)+'.js'),origin)).toBeNull();
 fixture.remove();
});
it('checks only current public index without credentials and detects an updated bundle without reload',async()=>{
 const fixture=script('/assets/index-fixture-old123.js');
 const get=vi.fn(async()=>new Response(html('/assets/index-fixture-new123.js'),{status:200,headers:{'Content-Type':'text/html'}}));
 const r=await checkPublicRelease(document,origin,get as unknown as typeof fetch);
 expect(r).toBe('update-available');
 expect(get).toHaveBeenCalledTimes(1);
 const [url,init]=get.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toBe(origin+'/index.html');
 expect(init.method).toBe('GET');expect(init.credentials).toBe('omit');
 expect(init.cache).toBe('no-store');expect(init.redirect).toBe('error');
 fixture.remove();
});
it('keeps current release silent and treats network errors, 404 and malformed HTML as unknown',async()=>{
 const fixture=script('/assets/index-fixture-old123.js');
 for(const [response,expected] of [
  [new Response(html('/assets/index-fixture-old123.js'),{headers:{'Content-Type':'text/html'}}),'current'],
  [new Response('Not Found',{status:404,headers:{'Content-Type':'text/plain'}}),'unverified'],
  [new Response('<script type="module" src="/src/main.tsx"></script>',{headers:{'Content-Type':'text/html'}}),'unverified'],
 ] as const){
  const get=vi.fn(async()=>response);
  expect(await checkPublicRelease(document,origin,get as unknown as typeof fetch)).toBe(expected);
 }
 const fails=vi.fn(async()=>{throw Error('PRIVATE-CUSTOMER-DIAGNOSTIC')});
 expect(await checkPublicRelease(document,origin,fails as unknown as typeof fetch)).toBe('unverified');
 fixture.remove();
});
it('shows a user-controlled update notice on refocus, never a silent logout, AI call or refresh',async()=>{
 const fixture=script('/assets/index-fixture-old123.js');
 const get=vi.fn(async()=>new Response(html('/assets/index-fixture-new123.js'),{headers:{'Content-Type':'text/html'}}));
 vi.stubGlobal('fetch',get);
 render(<PublicReleaseUpdateNotice/>);
 fireEvent.focus(window);
 const banner=await screen.findByRole('status',{name:'Luqi app update available'});
 expect(banner.textContent).toContain('Save or copy unsent messages');
 expect(screen.getByRole('button',{name:'Refresh Luqi'})).toBeTruthy();
 expect(get).toHaveBeenCalledTimes(1);
 expect(screen.queryByText('PRIVATE-CUSTOMER-DIAGNOSTIC')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Not now'}));
 await waitFor(()=>expect(screen.queryByRole('status',{name:'Luqi app update available'})).toBeNull());
 fixture.remove();
});
it('keeps import failure diagnostics private and never retries automatically',async()=>{
 vi.spyOn(console,'error').mockImplementation(()=>{});
 const load=vi.fn(async()=>{throw new TypeError('Failed to fetch dynamically imported module: '+origin+'/assets/PRIVATE-TOKEN.js')});
 const Page=lazy(load);const onReload=vi.fn();
 render(<MemoryRouter><RouteLoadBoundary onReload={onReload}><Page/></RouteLoadBoundary></MemoryRouter>);
 const alert=await screen.findByRole('alert');
 expect(alert.textContent).toContain('This tab may be using files from an earlier Luqi release');
 expect(alert.textContent).not.toContain('PRIVATE-TOKEN');
 expect(onReload).not.toHaveBeenCalled();
 expect(load).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Reload page'}));
 expect(onReload).toHaveBeenCalledTimes(1);
});
