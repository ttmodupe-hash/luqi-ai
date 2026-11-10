// @vitest-environment jsdom
import React from 'react';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react';
import {TenderOriginalForms} from '../src/components/TenderOriginalForms';
import {runTenderDocument} from '../src/lib/tender-document-client';
import {VERIFIED_SBD1, type TenderDocumentResponse} from '../src/lib/tender-document-contract';
import {CustomerSessionProvider,useCustomerSession} from '../src/providers/customer-session';
vi.mock('../src/lib/tender-document-client',()=>({runTenderDocument:vi.fn()}));
const run=vi.mocked(runTenderDocument),network=vi.fn();
const inspected:TenderDocumentResponse={ok:true,inspection:{kind:'docx',sha256:VERIFIED_SBD1.sha256,size:3,templateId:VERIFIED_SBD1.id,fields:[],excerpt:'Original terms',notes:[]}};
beforeEach(()=>{
 vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',network);network.mockReset();run.mockReset();
 run.mockImplementation(async req=>req.action==='fill'?{...inspected,filled:new Uint8Array([4,5,6])}:inspected);
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers()});
function file(name='original.docx'){
 const result=new File(['abc'],name,{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
 Object.defineProperty(result,'arrayBuffer',{value:async()=>new Uint8Array([1,2,3]).buffer});return result;
}
async function importOriginal(){
 fireEvent.click(screen.getByRole('checkbox',{name:/I authorise local processing/}));
 fireEvent.change(screen.getByLabelText('Import original tender document'),{target:{files:[file()]}});
 await screen.findByLabelText('SBD 1 Name of bidder');
}
async function fillContext(){
 for(const [label,value]of [
  ['SBD 1 Name of bidder','Synthetic supplier'],['Tender reference','SYNTHETIC-001'],['Procuring authority','Synthetic test authority'],
  ['Applicant or authorised representative','Synthetic applicant'],['Closing time with timezone','2090-11-30T11:00+02:00'],
  ['Exact official submission address','Synthetic test bid box'],['Applicant-entered offer ZAR','1000.00'],
 ])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.change(screen.getByLabelText('Original form submission method'),{target:{value:'physical'}});
 fireEvent.click(screen.getByRole('button',{name:'Prepare exact original for review'}));
 await screen.findByRole('region',{name:'Original form applicant review'});
}
it('requires local-processing consent, makes no network calls and keeps unsupported exports blocked',async()=>{
 render(<TenderOriginalForms/>);
 expect(screen.getByRole('button',{name:'Use verified Treasury SBD 1'}).hasAttribute('disabled')).toBe(true);
 expect(screen.getByLabelText('Import original tender document').hasAttribute('disabled')).toBe(true);
 await importOriginal();
 expect(network).not.toHaveBeenCalled();
 expect(screen.queryByRole('button',{name:'Export filled original and review record'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Clear private document work'}));
 expect(screen.queryByLabelText('SBD 1 Name of bidder')).toBeNull();
 expect(screen.getByRole('checkbox',{name:/I authorise local processing/}).hasAttribute('checked')).toBe(false);
});
it('does not mistake enquiries contacts or generic website instructions for a bid-submission route',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();
 expect(screen.getByRole('note').textContent).toContain('An enquiries email is not proof of a bid-submission inbox.');
 expect(screen.getByRole('note').textContent).toContain('Generic issuer website instructions may differ from this specific bid.');
 expect((screen.getByRole('combobox',{name:'Original form submission method'}) as HTMLSelectElement).value).toBe('');
 expect(network).not.toHaveBeenCalled();
});

it('requires all seven gates and revokes the whole prepared version after a price or supplier edit',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const review=screen.getByRole('region',{name:'Original form applicant review'});
 const checks=within(review).getAllByRole('checkbox');
 expect(checks).toHaveLength(7);expect(checks[6].hasAttribute('disabled')).toBe(true);
 for(const checkbox of checks)fireEvent.click(checkbox);
 expect(within(review).getByRole('button',{name:'Export filled original and review record'}).hasAttribute('disabled')).toBe(false);
 fireEvent.change(screen.getByLabelText('Applicant-entered offer ZAR'),{target:{value:'2000.00'}});
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 expect(screen.getByText(/all previous approvals cleared/)).toBeTruthy();
 expect(network).not.toHaveBeenCalled();
});
it('clears approvals on addendum selection and rejects failed imports without restoring the old approval',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 run.mockResolvedValueOnce({ok:false,code:'DOCUMENT_UNSAFE'});
 fireEvent.change(screen.getByLabelText('Add tender amendment'),{target:{files:[file('amended.docx')]}});
 await screen.findByText(/unsupported active feature/);
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
});
it('discarding work aborts an in-flight parse and prevents a late result from repopulating private data',async()=>{
 let resolve!:(r:TenderDocumentResponse)=>void;
 run.mockImplementationOnce(()=>new Promise(r=>{resolve=r}));
 render(<TenderOriginalForms/>);
 fireEvent.click(screen.getByRole('checkbox',{name:/I authorise local processing/}));
 fireEvent.change(screen.getByLabelText('Import original tender document'),{target:{files:[file()]}});
 await waitFor(()=>expect(run).toHaveBeenCalledOnce());
 const signal=run.mock.calls[0][1]!;
 fireEvent.click(screen.getByRole('button',{name:'Clear private document work'}));
 expect(signal.aborted).toBe(true);resolve(inspected);
 await waitFor(()=>expect(screen.queryByLabelText('SBD 1 Name of bidder')).toBeNull());
});

function expectEmptyBidContext(){
 for(const label of ['Tender reference','Procuring authority','Applicant or authorised representative',
   'Closing time with timezone','Exact official submission address','Applicant-entered offer ZAR'])
   expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('');
 expect((screen.getByLabelText('Original form submission method') as HTMLSelectElement).value).toBe('');
}
it('replacing an imported original does not carry over another applicant or bid context',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 expect(screen.getByText(/Choosing another original also clears contact entries, bid context and the previous local review history/)).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Import original tender document'),
   {target:{files:[file('replacement-original.docx')]}});
 await screen.findByText('Exact Treasury original verified. Enter only your own accurate supplier facts.');
 expect((screen.getByLabelText('SBD 1 Name of bidder') as HTMLInputElement).value).toBe('');
 expectEmptyBidContext();
 expect(screen.getByText('Local approval and amendment history (1)')).toBeTruthy();
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 expect(network).not.toHaveBeenCalled();
});
it('replacing an original with the pinned Treasury template clears previous bid context',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 // Synthetic in-browser response: the actual worker separately enforces the pinned hash.
 vi.stubGlobal('File',class {
   readonly name:string;readonly type:string;
   constructor(_chunks:unknown[],name:string,options:{type:string}){this.name=name;this.type=options.type;}
   async arrayBuffer(){return new Uint8Array(VERIFIED_SBD1.bytes).buffer;}
 });
 network.mockResolvedValueOnce({ok:true,body:{getReader:()=>{
   let delivered=false;
   return {read:async()=>{
     if(delivered)return {done:true,value:undefined};
     delivered=true;return {done:false,value:new Uint8Array(VERIFIED_SBD1.bytes)};
   },cancel:async()=>{}};
 }}});
 fireEvent.click(screen.getByRole('button',{name:'Use verified Treasury SBD 1'}));
 await screen.findByText('Treasury original verified. This blank template is usable only where the issuer permits it.');
 expect((screen.getByLabelText('SBD 1 Name of bidder') as HTMLInputElement).value).toBe('');
 expectEmptyBidContext();
 expect(screen.getByText('Local approval and amendment history (1)')).toBeTruthy();
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 expect(network).toHaveBeenCalledTimes(1);
 expect(network.mock.calls[0][0]).toBe(VERIFIED_SBD1.localPath);
});

it('clears private inputs when the shared customer account changes',async()=>{
 function Switch(){const customer=useCustomerSession();return <button onClick={()=>customer.acceptSession({token:'synthetic',user:{email:'other@example.test',name:'Other'}} as never)}>Switch test account</button>}
 render(<CustomerSessionProvider><Switch/><TenderOriginalForms/></CustomerSessionProvider>);
 await importOriginal();fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:'Private supplier'}});
 fireEvent.click(screen.getByRole('button',{name:'Switch test account'}));
 await waitFor(()=>expect(screen.queryByLabelText('SBD 1 Name of bidder')).toBeNull());
 expect(screen.queryByDisplayValue('Private supplier')).toBeNull();
});


it('clears the previous applicant audit even when a replacement original fails inspection',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 expect(screen.getByText(/Local approval and amendment history/)).toBeTruthy();
 run.mockResolvedValueOnce({ok:false,code:'DOCUMENT_UNSAFE'});
 fireEvent.change(screen.getByLabelText('Import original tender document'),
   {target:{files:[file('unsafe-replacement.docx')]}});
 await screen.findByText(/unsupported active feature/);
 expect(screen.queryByLabelText('Tender reference')).toBeNull();
 expect(screen.queryByDisplayValue('Synthetic supplier')).toBeNull();
 expect(screen.queryByText(/Local approval and amendment history/)).toBeNull();
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
});
it('clears earlier applicant data when the pinned Treasury replacement cannot be retrieved',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 expect(screen.getByText(/Local approval and amendment history/)).toBeTruthy();
 network.mockRejectedValueOnce(new Error('offline'));
 fireEvent.click(screen.getByRole('button',{name:'Use verified Treasury SBD 1'}));
 await screen.findByText('The pinned Treasury original could not be verified. No supplier data was sent.');
 expect(screen.queryByLabelText('Tender reference')).toBeNull();
 expect(screen.queryByDisplayValue('Synthetic supplier')).toBeNull();
 expect(screen.queryByText(/Local approval and amendment history/)).toBeNull();
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
});
