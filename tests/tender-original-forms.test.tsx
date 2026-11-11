// @vitest-environment jsdom
import React from 'react';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react';
import {TenderOriginalForms} from '../src/components/TenderOriginalForms';
import {runTenderDocument} from '../src/lib/tender-document-client';
import {VERIFIED_SBD1,TENDER_FILE_MAX, type TenderDocumentResponse} from '../src/lib/tender-document-contract';
import {CustomerSessionProvider,useCustomerSession} from '../src/providers/customer-session';
import {buildTenderOriginalArchive} from '../src/lib/tender-document-review';
vi.mock('../src/lib/tender-document-client',()=>({runTenderDocument:vi.fn()}));
vi.mock('../src/lib/tender-document-review',async importActual=>({
 ...(await importActual<typeof import('../src/lib/tender-document-review')>()),
 buildTenderOriginalArchive:vi.fn(),
}));
const run=vi.mocked(runTenderDocument),network=vi.fn();
const archive=vi.mocked(buildTenderOriginalArchive);
const inspected:TenderDocumentResponse={ok:true,inspection:{kind:'docx',sha256:VERIFIED_SBD1.sha256,size:3,templateId:VERIFIED_SBD1.id,fields:[],excerpt:'Original terms',notes:[]}};
beforeEach(()=>{
 vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',network);network.mockReset();run.mockReset();
 archive.mockReset();archive.mockResolvedValue(new Uint8Array([7,8,9]));
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

it('announces expired 30-minute review and locks old approvals without submitting or fetching',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const review=screen.getByRole('region',{name:'Original form applicant review'});
 for(const box of within(review).getAllByRole('checkbox'))fireEvent.click(box);
 const exportButton=within(review).getByRole('button',{name:'Export filled original and review record'});
 expect(exportButton.hasAttribute('disabled')).toBe(false);
 const observed=Date.now();
 const deviceClock=vi.spyOn(Date,'now').mockReturnValue(observed+31*60*1000);
 await waitFor(()=>expect(within(review).getByRole('alert').textContent)
   .toMatch(/30-minute applicant review window has ended/),{timeout:3000});
 expect(within(review).getByRole('alert').textContent).toMatch(/Nothing was submitted/);
 expect(within(review).getByRole('alert').textContent).toMatch(/select Prepare exact original for review/);
 expect(exportButton.hasAttribute('disabled')).toBe(true);
 expect(within(review).getAllByRole('checkbox').every(box=>box.hasAttribute('disabled'))).toBe(true);
 await waitFor(()=>expect(within(review).getAllByRole('checkbox').every(box=>(box as HTMLInputElement).checked===false)).toBe(true));
 expect(screen.getByText(/Local approval and amendment history/)).toBeTruthy();
 // A subsequent device-clock correction must not reactivate old approvals.
 deviceClock.mockReturnValue(observed+3000);
 await new Promise(resolve=>setTimeout(resolve,1200)); // Allow another live 1-second clock tick.
 expect(within(review).getByRole('alert').textContent).toMatch(/Review expired/);
 const oldGates=within(review).getAllByRole('checkbox');
 expect(oldGates.every(box=>box.hasAttribute('disabled'))).toBe(true);
 for(const box of oldGates)fireEvent.click(box);
 expect(oldGates.every(box=>(box as HTMLInputElement).checked===false)).toBe(true);
 expect(exportButton.hasAttribute('disabled')).toBe(true);
 expect(run.mock.calls.filter(call=>call[0].action==='fill')).toHaveLength(1);
 expect(network).not.toHaveBeenCalled();
});

it('announces recorded closing-time expiry before 30 minutes, revokes approvals and blocks export',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const deadline=new Date(Date.now()+2*60*1000).toISOString().replace(/\.\d{3}Z$/,'Z');
 fireEvent.change(screen.getByLabelText('Closing time with timezone'),{target:{value:deadline}});
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Prepare exact original for review'}));
 const review=await screen.findByRole('region',{name:'Original form applicant review'});
 for(const box of within(review).getAllByRole('checkbox'))fireEvent.click(box);
 const exportButton=within(review).getByRole('button',{name:'Export filled original and review record'});
 expect(exportButton.hasAttribute('disabled')).toBe(false);
 const observed=Date.now(),deviceClock=vi.spyOn(Date,'now').mockReturnValue(observed+3*60*1000);
 await waitFor(()=>expect(within(review).getByRole('alert').textContent)
   .toMatch(/recorded bid closing time has passed/),{timeout:3000});
 expect(exportButton.hasAttribute('disabled')).toBe(true);
 await waitFor(()=>expect(within(review).getAllByRole('checkbox').every(box=>
   (box as HTMLInputElement).checked===false&&box.hasAttribute('disabled'))).toBe(true));
 expect(within(review).getByRole('alert').textContent).toMatch(/Nothing was submitted/);
 expect(within(review).getByRole('alert').textContent).toMatch(/Do not prepare or submit against this passed deadline/);
 expect(within(review).getByRole('alert').textContent).toMatch(/only enter a new future deadline if the issuer confirms it/);
 expect(within(review).getByRole('alert').textContent).not.toMatch(/select Prepare exact original for review/);
 deviceClock.mockReturnValue(observed+1000);
 await new Promise(resolve=>setTimeout(resolve,1200)); // One more timer tick after rollback.
 expect(within(review).getByRole('alert').textContent).toMatch(/recorded bid closing time has passed/);
 expect(within(review).getAllByRole('checkbox').every(box=>box.hasAttribute('disabled'))).toBe(true);
 expect(exportButton.hasAttribute('disabled')).toBe(true);
 expect(run.mock.calls.filter(call=>call[0].action==='fill')).toHaveLength(2);
 expect(network).not.toHaveBeenCalled();
});

it('reports closing-time expiry when a suspended review crosses both limits',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const deadline=new Date(Date.now()+45*60*1000).toISOString().replace(/\.\d{3}Z$/,'Z');
 fireEvent.change(screen.getByLabelText('Closing time with timezone'),{target:{value:deadline}});
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Prepare exact original for review'}));
 const review=await screen.findByRole('region',{name:'Original form applicant review'});
 for(const box of within(review).getAllByRole('checkbox'))fireEvent.click(box);
 const observed=Date.now(),deviceClock=vi.spyOn(Date,'now').mockReturnValue(observed+46*60*1000);
 await waitFor(()=>expect(within(review).getByRole('alert').textContent)
   .toMatch(/recorded bid closing time has passed/),{timeout:3000});
 expect(within(review).getByRole('button',{name:'Export filled original and review record'}).hasAttribute('disabled')).toBe(true);
 await waitFor(()=>expect(within(review).getAllByRole('checkbox').every(box=>
   (box as HTMLInputElement).checked===false&&box.hasAttribute('disabled'))).toBe(true));
 expect(network).not.toHaveBeenCalled();
 deviceClock.mockRestore();
});

it('does not mislabel applicant-entered bid deadlines or submission channels as issuer-verified',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();
 expect(screen.getByText(/Luqi does not independently verify the bid deadline or channel you enter/)).toBeTruthy();
 await fillContext();
 const review=screen.getByRole('region',{name:'Original form applicant review'});
 expect(within(review).getByText(/Luqi has not independently verified the entered deadline or submission channel/)).toBeTruthy();
 expect(within(review).getByRole('button',{name:'Export filled original and review record'}).hasAttribute('disabled')).toBe(true);
 expect(network).not.toHaveBeenCalled();
});

it('does not reprepare an expired bid after an observed device-clock rollback',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const deadline=new Date(Date.now()+2*60*1000).toISOString().replace(/\.\d{3}Z$/,'Z');
 fireEvent.change(screen.getByLabelText('Closing time with timezone'),{target:{value:deadline}});
 fireEvent.click(screen.getByRole('button',{name:'Prepare exact original for review'}));
 const review=await screen.findByRole('region',{name:'Original form applicant review'});
 for(const box of within(review).getAllByRole('checkbox'))fireEvent.click(box);
 const observed=Date.now(),deviceClock=vi.spyOn(Date,'now').mockReturnValue(observed+3*60*1000);
 await waitFor(()=>expect(within(review).getByRole('alert').textContent)
   .toMatch(/recorded bid closing time has passed/),{timeout:3000});
 await waitFor(()=>expect(within(review).getAllByRole('checkbox').every(box=>
   (box as HTMLInputElement).checked===false&&box.hasAttribute('disabled'))).toBe(true));
 deviceClock.mockReturnValue(observed+1000);
 await new Promise(resolve=>setTimeout(resolve,1200)); // Recheck after rollback tick.
 fireEvent.click(screen.getByRole('button',{name:'Prepare exact original for review'}));
 expect(screen.getByText(/Complete: Future closing time with explicit timezone/)).toBeTruthy();
 expect(within(review).getByRole('alert').textContent).toMatch(/recorded bid closing time has passed/);
 expect(within(review).getByRole('button',{name:'Export filled original and review record'}).hasAttribute('disabled')).toBe(true);
 expect(run.mock.calls.filter(call=>call[0].action==='fill')).toHaveLength(2);
 expect(network).not.toHaveBeenCalled();
 deviceClock.mockRestore();
});

it('asks for missing bidder and invalid optional email before any fill, without requiring optional blanks',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();
 const prepare=screen.getByRole('button',{name:'Prepare exact original for review'});
 fireEvent.click(prepare);
 expect(screen.getByText(/Check supported SBD 1 contact fields before preparing: Name of bidder: Enter the bidder name/)).toBeTruthy();
 expect(run.mock.calls.filter(call=>call[0].action==='fill')).toHaveLength(0);
 fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:'Synthetic supplier'}});
 fireEvent.change(screen.getByLabelText('SBD 1 Email address'),{target:{value:'not-an-email'}});
 fireEvent.click(prepare);
 expect(screen.getByText(/Email address: Check the email format/)).toBeTruthy();
 expect(run.mock.calls.filter(call=>call[0].action==='fill')).toHaveLength(0);
 fireEvent.change(screen.getByLabelText('SBD 1 Email address'),{target:{value:''}});
 fireEvent.click(prepare);
 expect(screen.getByText(/Complete: Tender reference/)).toBeTruthy();
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 expect(run.mock.calls.filter(call=>call[0].action==='fill')).toHaveLength(0);
 expect(network).not.toHaveBeenCalled();
});

it('rejecting a zero-byte replacement clears prior applicant data and approvals without parsing',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const review=screen.getByRole('region',{name:'Original form applicant review'});
 for(const box of within(review).getAllByRole('checkbox'))fireEvent.click(box);
 expect(within(review).getByRole('button',{name:'Export filled original and review record'}).hasAttribute('disabled')).toBe(false);
 const empty=new File([],'empty-replacement.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
 fireEvent.change(screen.getByLabelText('Import original tender document'),{target:{files:[empty]}});
 expect(screen.getByText('Choose a non-empty file up to 3 MB.')).toBeTruthy();
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 expect(screen.queryByLabelText('SBD 1 Name of bidder')).toBeNull();
 expect(screen.queryByDisplayValue('Synthetic supplier')).toBeNull();
 expect(screen.queryByText(/Local approval and amendment history/)).toBeNull();
 expect(run.mock.calls.filter(([request])=>request.action==='inspect')).toHaveLength(1);
 expect(network).not.toHaveBeenCalled();
});

it('rejecting an oversized amendment revokes approval without reading it or losing the original',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const review=screen.getByRole('region',{name:'Original form applicant review'});
 for(const box of within(review).getAllByRole('checkbox'))fireEvent.click(box);
 expect(within(review).getByRole('button',{name:'Export filled original and review record'}).hasAttribute('disabled')).toBe(false);
 const oversized=file('oversized-amendment.docx');
 Object.defineProperty(oversized,'size',{value:TENDER_FILE_MAX+1});
 fireEvent.change(screen.getByLabelText('Add tender amendment'),{target:{files:[oversized]}});
 expect(screen.getByText('Choose a non-empty file up to 3 MB.')).toBeTruthy();
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 expect((screen.getByLabelText('SBD 1 Name of bidder') as HTMLInputElement).value).toBe('Synthetic supplier');
 // Rejecting an amendment must also leave an explicit revocation event, rather than
 // a local audit trail that ends with the old applicant approvals still granted.
 const history=screen.getByText(/Local approval and amendment history/).parentElement!;
 expect(history.querySelector('ol li:last-child')?.textContent).toMatch(/ · revoke · all$/);
 expect(history.querySelector('ol li:last-child')?.textContent).not.toMatch(/Synthetic supplier|add-amendment/);
 expect(run.mock.calls.filter(([request])=>request.action==='inspect')).toHaveLength(1);
 expect(network).not.toHaveBeenCalled();
});


it('reports only a browser download request, never a confirmed saved file or submission',async()=>{
 const originalURL=URL,createObjectURL=vi.fn(()=> 'blob:synthetic-form-review'),revokeObjectURL=vi.fn();
 vi.stubGlobal('URL',class extends originalURL{
   static createObjectURL=createObjectURL;
   static revokeObjectURL=revokeObjectURL;
 });
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const review=screen.getByRole('region',{name:'Original form applicant review'});
 for(const box of within(review).getAllByRole('checkbox'))fireEvent.click(box);
 fireEvent.click(within(review).getByRole('button',{name:'Export filled original and review record'}));
 const status=await screen.findByText(/Download requested from this browser/);
 expect(status.textContent).toMatch(/Check that luqi-sbd1-partial-review-pack\\.zip actually appears in Downloads/);
 expect(status.textContent).toMatch(/browsers can block or discard files/);
 expect(status.textContent).toMatch(/leaving or reloading clears this work/);
 expect(status.textContent).toMatch(/Nothing was submitted/);
 expect(status.textContent).not.toMatch(/download complete|receipt confirmed|approved by issuer/i);
 expect(archive).toHaveBeenCalledOnce();
 expect(createObjectURL).toHaveBeenCalledOnce();
 expect(click).toHaveBeenCalledOnce();
 expect(network).not.toHaveBeenCalled();
 click.mockRestore();
});
