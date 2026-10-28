// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
const mocks=vi.hoisted(()=>({status:vi.fn(),contacts:vi.fn()}));
vi.mock('../src/lib/p2p-client',()=>({p2pClient:()=>mocks}));
import Panel from '../src/components/ApprovedContactsPanel';
import { p2pApprovedContacts } from '../contracts/p2p';
const session={token:'synthetic',user:{email:'fixture@example.invalid'}};
beforeEach(()=>{mocks.status.mockReset().mockResolvedValue({enabled:true});mocks.contacts.mockReset().mockResolvedValue({contacts:[]})});
afterEach(cleanup);
const draw=(value:typeof session|null=session)=>render(<MemoryRouter><Panel key={value?.token??'guest'} session={value} close={()=>{}}/></MemoryRouter>);
it('never retrieves account or contact information for a guest',()=>{
 draw(null);expect(screen.getByRole('link',{name:'Sign in to Luqi'})).toBeTruthy();
 expect(mocks.status).not.toHaveBeenCalled();expect(mocks.contacts).not.toHaveBeenCalled();
});
it('uses the existing login, filters approved names locally and treats names as plain text',async()=>{
 mocks.contacts.mockResolvedValue({contacts:[{circleId:crypto.randomUUID(),userId:8,name:'<img src=x onerror=alert(1)>',accountActive:true,presence:'not_shared'},
  {circleId:crypto.randomUUID(),userId:9,name:'Naledi',accountActive:true,presence:'not_shared'}]});
 const view=draw();await screen.findByRole('link',{name:'Naledi'});
 expect(screen.queryByRole('link',{name:'Sign in to Luqi'})).toBeNull();
 expect(view.container.querySelector('img')).toBeNull();
 fireEvent.change(screen.getByLabelText('Find an approved contact'),{target:{value:'naledi'}});
 expect(screen.getByRole('link',{name:'Naledi'})).toBeTruthy();
 expect(screen.queryByRole('link',{name:/<img/})).toBeNull();
 expect(mocks.contacts).toHaveBeenCalledOnce();
});
it('discards an earlier account response after the view changes',async()=>{
 let resolve!:(value:unknown)=>void;
 mocks.contacts.mockImplementation(()=>new Promise(done=>{resolve=done}));
 const view=draw();await screen.findByText('Checking your approved contacts…');
 await vi.waitFor(()=>expect(mocks.contacts).toHaveBeenCalledOnce());
 view.rerender(<MemoryRouter><Panel key="guest" session={null} close={()=>{}}/></MemoryRouter>);
 resolve({contacts:[{name:'Former account private contact'}]});
 await Promise.resolve();
 expect(screen.queryByText('Former account private contact')).toBeNull();
});
it('does not load contacts while messaging is disabled or accept unreviewed presence fields',async()=>{
 mocks.status.mockResolvedValue({enabled:false});draw();
 await screen.findByText(/Peer messaging is not available/);expect(mocks.contacts).not.toHaveBeenCalled();
 expect(p2pApprovedContacts.safeParse({contacts:[{circleId:crypto.randomUUID(),userId:8,name:'Naledi',accountActive:true,presence:'not_shared',online:true}]}).success).toBe(false);
});

it('shows a red messaging service marker when the feature is disabled, not a peer presence claim',async()=>{
 mocks.status.mockResolvedValue({enabled:false});draw();
 const msg=await screen.findByRole('status',{name:'Messaging availability'});
 expect(msg.textContent).toContain('Peer messaging offline');
 expect(msg.textContent).toContain('members’ presence remains private');
 expect(msg.querySelector('span[aria-hidden]')?.getAttribute('style')).toMatch(/color:\s*rgb\(248,\s*113,\s*113\)|color:\s*#f87171/i);
});
