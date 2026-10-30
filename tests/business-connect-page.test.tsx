// @vitest-environment jsdom
import React from'react';
import{afterEach,it,expect,vi,beforeEach}from'vitest';
import{cleanup,render,screen,fireEvent,act,waitFor}from'@testing-library/react';
import{MemoryRouter}from'react-router';
import BusinessConnectPage from'../src/pages/BusinessConnectPage';
import BusinessPublicCard from'../src/components/BusinessPublicCard';
import{publicBusiness,type BusinessDraft}from'../contracts/business-connect';
let token:string|undefined;const mine=vi.fn(),save=vi.fn();
vi.mock('../src/providers/customer-session',()=>({useOptionalCustomerSession:()=>({session:token?{token}:null})}));
vi.mock('../src/lib/business-connect-client',async original=>{const actual=await original<typeof import('../src/lib/business-connect-client')>();return{...actual,businessClient:()=>({mine,save})};});
beforeEach(()=>{token=undefined;mine.mockReset();save.mockReset();});afterEach(cleanup);
it('does not fetch private profiles or expose a saved form to guests',()=>{
 render(<MemoryRouter><BusinessConnectPage/></MemoryRouter>);expect(screen.getByRole('link',{name:'Sign in to manage a business'})).toBeTruthy();expect(screen.queryByRole('button',{name:'Save private draft'})).toBeNull();expect(mine).not.toHaveBeenCalled();
});
it('signing out clears a draft and cannot expose a late private response',async()=>{
 token='synthetic-owner';let resolve:(r:unknown)=>void=()=>{};mine.mockImplementation(()=>new Promise(r=>{resolve=r;}));const view=render(<MemoryRouter><BusinessConnectPage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Business or trading name'),{target:{value:'Private owner draft'}});token=undefined;view.rerender(<MemoryRouter><BusinessConnectPage/></MemoryRouter>);
 await act(async()=>resolve({profiles:[],reviewer:false,reviewAvailable:false}));expect(screen.queryByDisplayValue('Private owner draft')).toBeNull();expect(screen.getByRole('link',{name:'Sign in to manage a business'})).toBeTruthy();
});
it('requires an explicit province, does not save on typing, and keeps address fields away from home businesses',async()=>{
 token='synthetic-owner';mine.mockResolvedValue({profiles:[],reviewer:false,reviewAvailable:false});render(<MemoryRouter><BusinessConnectPage/></MemoryRouter>);await waitFor(()=>expect(screen.getByRole('button',{name:'Save private draft'})).not.toHaveProperty('disabled',true));
 expect((screen.getByLabelText('Province') as HTMLSelectElement).value).toBe('');expect(screen.queryByLabelText('Public storefront address')).toBeNull();fireEvent.change(screen.getByLabelText('Business or trading name'),{target:{value:'A private draft'}});expect(save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Save private draft'}));expect(save).not.toHaveBeenCalled();
});
it('renders unsafe markup as text and shares only owner-approved trading addresses',()=>{
 const draft:BusinessDraft={name:'<script>Not code</script>',category:'other',description:'An owner-provided text description.',services:['Repairs'],province:'GP',locality:'Mabopane',kind:'service_area',serviceArea:'Mabopane',publicAddress:'',phone:'',email:'',website:'',hours:'',pricing:'',languages:['English'],visibility:{phone:false,email:false,website:false,address:false,pricing:false}};
 const view=render(<MemoryRouter><BusinessPublicCard business={publicBusiness('00000000-0000-4000-8000-000000000001',1,draft)} detail/></MemoryRouter>);expect(screen.getByRole('heading',{name:'<script>Not code</script>'})).toBeTruthy();expect(view.container.querySelector('script')).toBeNull();expect(screen.queryByRole('link',{name:/Open public trading address/})).toBeNull();
});
