// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,cleanup,act} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
const mock=vi.hoisted(()=>({token:undefined as string|undefined,load:vi.fn()}));
vi.mock('../src/providers/customer-session',()=>({useOptionalCustomerSession:()=>({session:mock.token?{token:mock.token}:null})}));
vi.mock('../src/lib/business-preview',async original=>({...await original<typeof import('../src/lib/business-preview')>(),loadBusinessPreview:mock.load}));
import Page from '../src/pages/BusinessConnectPreviewPage';
beforeEach(()=>{mock.token=undefined;mock.load.mockReset();});afterEach(cleanup);
it('uses the existing Luqi login and does not fetch any preview for a guest',()=>{render(<MemoryRouter><Page/></MemoryRouter>);expect(screen.getByRole('link',{name:'Use my Luqi login'})).toBeTruthy();expect(screen.queryByTitle('Private Luqi Business Connect interactive preview')).toBeNull();expect(mock.load).not.toHaveBeenCalled();});
it('removes a private frame on logout and ignores a late former-account response',async()=>{
 mock.token='synthetic-owner';let resolve:(value:unknown)=>void=()=>{};mock.load.mockImplementation(()=>new Promise(r=>{resolve=r}));const view=render(<MemoryRouter><Page/></MemoryRouter>);
 mock.token=undefined;view.rerender(<MemoryRouter><Page/></MemoryRouter>);
 await act(async()=>resolve({html:'<p>former private preview</p>',scope:'a'.repeat(64),version:'luqi-business-connect-private-v2-app1'}));
 expect(screen.queryByTitle('Private Luqi Business Connect interactive preview')).toBeNull();
});
it('isolates scripts from the Luqi origin and never passes account tokens to the frame',async()=>{
 mock.token='synthetic-sensitive-token';mock.load.mockResolvedValue({html:'<script nonce="__LUQI_PREVIEW_NONCE__">const initial=__LUQI_PREVIEW_BRIDGE_STATE__;</script>',scope:'b'.repeat(64),version:'luqi-business-connect-private-v2-app1'});
 render(<MemoryRouter><Page/></MemoryRouter>);const frame=await screen.findByTitle('Private Luqi Business Connect interactive preview');expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin');expect(frame.getAttribute('srcdoc')).not.toContain(mock.token);expect(frame.getAttribute('allow')).toContain("geolocation 'none'");
});
