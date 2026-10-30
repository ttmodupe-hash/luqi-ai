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
 draw(null);expect(screen.getByRole('link',{name:'Sign in to see contacts'})).toBeTruthy();
 expect(mocks.status).not.toHaveBeenCalled();expect(mocks.contacts).not.toHaveBeenCalled();
});
it('uses the existing login, filters approved names locally and treats names as plain text',async()=>{
 mocks.contacts.mockResolvedValue({contacts:[{circleId:crypto.randomUUID(),userId:8,name:'<img src=x onerror=alert(1)>',accountActive:true,presence:'not_shared'},
  {circleId:crypto.randomUUID(),userId:9,name:'Naledi',accountActive:true,presence:'not_shared'}]});
 const view=draw();await screen.findByRole('link',{name:'Naledi'});
 expect(screen.queryByRole('link',{name:'Sign in to see contacts'})).toBeNull();
 expect(view.container.querySelector('img')).toBeNull();
 fireEvent.change(screen.getByLabelText('Find a contact'),{target:{value:'naledi'}});
 expect(screen.getByRole('link',{name:'Naledi'})).toBeTruthy();
 expect(screen.queryByRole('link',{name:/<img/})).toBeNull();
 expect(mocks.contacts).toHaveBeenCalledOnce();
});
it('discards an earlier account response after the view changes',async()=>{
 let resolve!:(value:unknown)=>void;
 mocks.contacts.mockImplementation(()=>new Promise(done=>{resolve=done}));
 const view=draw();await screen.findByText('Checking contacts…');
 await vi.waitFor(()=>expect(mocks.contacts).toHaveBeenCalledOnce());
 view.rerender(<MemoryRouter><Panel key="guest" session={null} close={()=>{}}/></MemoryRouter>);
 resolve({contacts:[{name:'Former account private contact'}]});
 await Promise.resolve();
 expect(screen.queryByText('Former account private contact')).toBeNull();
});
it('does not load contacts while messaging is disabled or accept unreviewed presence fields',async()=>{
 mocks.status.mockResolvedValue({enabled:false});draw();
 await screen.findByText(/Contacts messaging is not enabled/);expect(mocks.contacts).not.toHaveBeenCalled();
 expect(p2pApprovedContacts.safeParse({contacts:[{circleId:crypto.randomUUID(),userId:8,name:'Naledi',accountActive:true,presence:'not_shared',online:true}]}).success).toBe(false);
});

it('does not represent service health as contact presence',async()=>{
 mocks.status.mockResolvedValue({enabled:false});draw();
 await screen.findByText(/Contacts messaging is not enabled/);
 expect(screen.getByText('Online status not confirmed').textContent).toContain('Online status not confirmed');
 expect(screen.queryByText('Online',{exact:true})).toBeNull();
});

it('renders separately verified online, offline and hidden contacts',async()=>{
 mocks.contacts.mockResolvedValue({contacts:['online','offline','not_shared'].map((presence,index)=>({circleId:crypto.randomUUID(),userId:index+8,name:'Person '+index,accountActive:true,presence}))});
 draw();await screen.findByRole('link',{name:'Person 0'});
 expect(screen.getByText('Online',{exact:true})).toBeTruthy();
 expect(screen.getByText('Offline or away')).toBeTruthy();
 expect(screen.getByText('Status not shared')).toBeTruthy();
 expect(screen.getByText('1 contact online').textContent).toContain('1 contact online');
});
