// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router';
const identity=vi.hoisted(()=>({session:{token:'business-owner-one',user:{email:'owner@example.invalid'}} as {token:string;user:{email:string}}|null}));
vi.mock('../src/providers/customer-session',()=>({useCustomerSession:()=>({session:identity.session,restoring:false})}));
import BusinessConnectPage from '../src/pages/BusinessConnectPage';
import {ownedBusinessFixture} from './fixtures/business-connect';
const request=vi.fn();const response=(body:unknown)=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
function view(path='/business-connect') {return <MemoryRouter initialEntries={[path]}><Routes><Route path="/business-connect" element={<BusinessConnectPage/>}/><Route path="/business-connect/:id" element={<BusinessConnectPage/>}/></Routes></MemoryRouter>;}
beforeEach(()=>{localStorage.clear();identity.session={token:'business-owner-one',user:{email:'owner@example.invalid'}};request.mockReset();vi.stubGlobal('fetch',request);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('keeps the prototype disabled without suggesting that a directory is already available',async()=>{
  request.mockResolvedValue(response({enabled:false,publicDirectory:false,mode:'disabled'}));render(view());
  await screen.findByRole('heading',{name:'Business Connect is being prepared for review'});
  expect(request).toHaveBeenCalledTimes(1);expect(screen.queryByRole('button',{name:'Add your business'})).toBeNull();
  expect(localStorage.length).toBe(0);
});
it('offers language assistance and home-based registration without GPS, uploads or mandatory private coordinates',async()=>{
  request.mockImplementation((url:string)=>Promise.resolve(response(url.endsWith('/status')?{enabled:true,publicDirectory:false,mode:'authenticated_preview'}:{businesses:[],canReview:false})));
  render(view());await screen.findByRole('button',{name:'My businesses'});fireEvent.click(screen.getByRole('button',{name:'My businesses'}));fireEvent.click(screen.getByRole('button',{name:'Add your business'}));
  fireEvent.change(screen.getByLabelText('How you trade'),{target:{value:'home_based'}});
  expect(screen.queryByLabelText('Optional public latitude')).toBeNull();expect(screen.queryByLabelText('Public storefront address')).toBeNull();expect(document.querySelector('input[type=file]')).toBeNull();
  fireEvent.change(screen.getByLabelText('Business Connect language'),{target:{value:'zu'}});
  expect(screen.getByRole('heading',{name:'Thola amabhizinisi aseduze'})).toBeTruthy();
  expect(screen.getByText('Ikheli lakho lasekhaya lingahlala liyimfihlo.')).toBeTruthy();
  expect(request.mock.calls.every(([url])=>url.startsWith('/api/v1/business-connect/'))).toBe(true);
});
it('saves a private owner draft with separate unchecked publication/contact permissions',async()=>{
  request.mockImplementation((url:string,init:RequestInit)=>{
    if(init?.method==='PUT'){const body=JSON.parse(init.body as string);return Promise.resolve(response({business:{...ownedBusinessFixture(),id:url.split('/').pop(),profile:body.profile}}));}
    return Promise.resolve(response(url.endsWith('/status')?{enabled:true,publicDirectory:false,mode:'authenticated_preview'}:{businesses:[],canReview:false}));
  });render(view());await screen.findByRole('button',{name:'My businesses'});fireEvent.click(screen.getByRole('button',{name:'My businesses'}));fireEvent.click(screen.getByRole('button',{name:'Add your business'}));
  for(const [label,value]of [['Owner-confirmed business name','Private business name'],['Public trading name','Village Repairs'],['Business description','We repair clothes for our community.'],['Township, town or village','Mabopane'],['Public service area','Mabopane and nearby areas'],['Services and optional prices · one per line, e.g. Haircut | R80','Clothing repairs | R50']]){
    fireEvent.change(screen.getByLabelText(label,{exact:false}),{target:{value}});
  }
  fireEvent.click(screen.getByLabelText('I own this business or have authority to represent it.'));
  fireEvent.click(screen.getByLabelText('I consent to Luqi storing these details to run and review my listing under the Business Connect privacy notice.'));
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));await screen.findByText('Private draft saved. Preview the public details before sending for review.');
  const calls=request.mock.calls.filter(([,init])=>init?.method==='PUT');expect(calls).toHaveLength(1);
  const body=JSON.parse(calls[0][1].body);expect(body.expectedRevision).toBe(0);expect(body.profile.consent.publicListing).toBe(false);expect(body.profile.consent.contacts).toBe(false);
  expect(body.profile.publicPoint).toBeNull();expect(localStorage.length).toBe(0);expect(screen.queryByText('Private business name')).toBeNull();
});
it('drops private listings immediately when the shared account changes',async()=>{
  request.mockImplementation((url:string,init:RequestInit)=>Promise.resolve(response(url.endsWith('/status')?{enabled:true,publicDirectory:false,mode:'authenticated_preview'}:
    {businesses:(init.headers as Record<string,string>)?.Authorization==='Bearer business-owner-one'?[ownedBusinessFixture()]:[],canReview:false})));
  const page=render(view());await screen.findByRole('button',{name:'My businesses'});fireEvent.click(screen.getByRole('button',{name:'My businesses'}));
  await screen.findByRole('heading',{name:'Mabopane Sewing Studio'});
  identity.session={token:'business-owner-two',user:{email:'two@example.invalid'}};page.rerender(view());
  expect(screen.queryByRole('heading',{name:'Mabopane Sewing Studio'})).toBeNull();
  await waitFor(()=>expect(request.mock.calls.some(([,init])=>init?.headers?.Authorization==='Bearer business-owner-two')).toBe(true));
  expect(screen.queryByText('Private Sewing Enterprise')).toBeNull();
});
