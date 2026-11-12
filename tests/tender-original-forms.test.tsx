// @vitest-environment jsdom
import React from 'react';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react';
import {TenderOriginalForms} from '../src/components/TenderOriginalForms';
import {runTenderDocument} from '../src/lib/tender-document-client';
import {VERIFIED_SBD1,TENDER_FILE_MAX,EMPTY_SUPPLIER_VALUES, type TenderDocumentResponse} from '../src/lib/tender-document-contract';
import {validateSupplierValues} from '../src/lib/tender-document-engine';
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
it('rejects whitespace-only optional contact entries instead of calling them blank or inserting spaces into the original',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();
 fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:'Synthetic supplier'}});
 fireEvent.change(screen.getByLabelText('SBD 1 Postal address'),{target:{value:'   '}});
 const sample={...EMPTY_SUPPLIER_VALUES,bidderName:'Synthetic supplier',postalAddress:'   '};
 expect(()=>validateSupplierValues(sample)).toThrow('SUPPLIER_VALUES');
 expect(()=>validateSupplierValues({...sample,postalAddress:''})).not.toThrow();
 expect(screen.getByRole('button',{name:'Go to Postal address'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Guide me step by step'}));
 fireEvent.click(screen.getByRole('button',{name:'Go to Postal address'}));
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('SBD 1 Postal address')));
 fireEvent.click(screen.getByRole('button',{name:'Prepare exact original for review'}));
 expect(screen.getByText(/Check supported SBD 1 contact fields before preparing/)).toBeTruthy();
 expect(run.mock.calls.some(([request])=>request.action==='fill')).toBe(false);
 expect(network).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('SBD 1 Postal address'),{target:{value:''}});
 expect(screen.queryByRole('button',{name:'Go to Postal address'})).toBeNull();
});
it('rejects invisible-only supplier names in guidance and worker before filling the original',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();
 const hidden=String.fromCharCode(0x200b);
 fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:hidden}});
 expect(()=>validateSupplierValues({...EMPTY_SUPPLIER_VALUES,bidderName:hidden})).toThrow('SUPPLIER_VALUES');
 expect(screen.getByRole('button',{name:'Go to Name of bidder'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Prepare exact original for review'}));
 expect(screen.getByText(/Check supported SBD 1 contact fields before preparing/)).toBeTruthy();
 expect(run.mock.calls.filter(([request])=>request.action==='fill')).toHaveLength(0);
 expect(network).not.toHaveBeenCalled();
});
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
it('records explicit final-release revocation when an earlier approval gate changes',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const review=screen.getByRole('region',{name:'Original form applicant review'});
 const gates=within(review).getAllByRole('checkbox') as HTMLInputElement[];
 for(const checkbox of gates)fireEvent.click(checkbox);
 const exportButton=within(review).getByRole('button',{name:'Export filled original and review record'});
 expect(exportButton.hasAttribute('disabled')).toBe(false);
 expect(gates[6].checked).toBe(true);
 // Change the eligibility attestation after an exact packet was release-approved.
 fireEvent.click(gates[1]);
 expect(gates[1].checked).toBe(false);
 expect(gates[6].checked).toBe(false);
 expect(gates[6].hasAttribute('disabled')).toBe(true);
 expect(exportButton.hasAttribute('disabled')).toBe(true);
 const trail=screen.getByText(/Local approval and amendment history/).parentElement!;
 const rows=Array.from(trail.querySelectorAll('ol li'),element=>element.textContent||'');
 expect(rows.at(-2)).toMatch(/ · revoke · release$/);
 expect(rows.at(-1)).toMatch(/ · revoke · eligibility$/);
 expect(rows.join(' ')).not.toContain('Synthetic supplier');
 expect(network).not.toHaveBeenCalled();
});

it('records revocation before a failed re-prepare instead of leaving old approvals as the final audit event',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const review=screen.getByRole('region',{name:'Original form applicant review'});
 for(const checkbox of within(review).getAllByRole('checkbox'))fireEvent.click(checkbox);
 expect(within(review).getByRole('button',{name:'Export filled original and review record'}).hasAttribute('disabled')).toBe(false);
 const fillsBefore=run.mock.calls.filter(([request])=>request.action==='fill').length;
 run.mockResolvedValueOnce({ok:false,code:'DOCUMENT_INVALID'});
 fireEvent.click(screen.getByRole('button',{name:'Prepare exact original for review'}));
 await screen.findByText('The document is malformed or uses an unsupported structure.');
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 const history=screen.getByText(/Local approval and amendment history/).parentElement!;
 expect(history.querySelector('ol li:last-child')?.textContent).toMatch(/ · revoke · all$/);
 expect(history.textContent).not.toContain('Synthetic supplier');
 expect(run.mock.calls.filter(([request])=>request.action==='fill')).toHaveLength(fillsBefore+1);
 expect(archive).not.toHaveBeenCalled();
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

it('holds uncertain issuer instructions for applicant clarification without guessing or enabling export',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();
 const note=screen.getByRole('note');
 expect(note.textContent).toMatch(/issuer notice, SBD schedules or addenda contradict/);
 expect(note.textContent).toMatch(/mandatory briefing, qualification, closing time or required attachment/);
 expect(note.textContent).toMatch(/seek written issuer clarification before confirming the approval gates/);
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 expect(run.mock.calls.some(([request])=>request.action==='fill')).toBe(false);
 expect(network).not.toHaveBeenCalled();
});

it('leaves the issuer closing time blank and supplies a format hint instead of a fictional deadline',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();
 const closing=screen.getByLabelText('Closing time with timezone') as HTMLInputElement;
 expect(closing.value).toBe('');
 expect(closing.placeholder).toBe('YYYY-MM-DDTHH:mm+02:00');
 expect(closing.placeholder).not.toContain('2026-11-30');
 expect(network).not.toHaveBeenCalled();
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

it('revokes approval immediately on background-tab return before the next timer tick',async()=>{
  render(<TenderOriginalForms/>);await importOriginal();await fillContext();
  const review=screen.getByRole('region',{name:'Original form applicant review'});
  for(const box of within(review).getAllByRole('checkbox'))fireEvent.click(box);
  const exportButton=within(review).getByRole('button',{name:'Export filled original and review record'});
  expect(exportButton.hasAttribute('disabled')).toBe(false);
  const observed=Date.now(),deviceClock=vi.spyOn(Date,'now').mockReturnValue(observed+31*60*1000);
  // Simulate returning to the tab while interval callbacks have been throttled.
  // The visibility event must update review status synchronously.
  fireEvent(document,new Event('visibilitychange'));
  expect(within(review).getByRole('alert').textContent).toMatch(/30-minute applicant review window has ended/);
  expect(exportButton.hasAttribute('disabled')).toBe(true);
  expect(within(review).getAllByRole('checkbox').every(box=>box.hasAttribute('disabled')&&
    !(box as HTMLInputElement).checked)).toBe(true);
  // A subsequent backwards device-clock correction cannot re-enable approval.
  deviceClock.mockReturnValue(observed+1000);
  fireEvent(window,new Event('pageshow'));
  expect(within(review).getByRole('alert').textContent).toMatch(/Review expired/);
  expect(exportButton.hasAttribute('disabled')).toBe(true);
  expect(archive).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
  deviceClock.mockRestore();
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

it('links missing bid-context errors to their controls without inventing answers or filling',async()=>{
  render(<TenderOriginalForms/>);await importOriginal();
  fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:'Synthetic supplier'}});
  fireEvent.click(screen.getByRole('button',{name:'Prepare exact original for review'}));
  const reference=screen.getByLabelText('Tender reference');
  expect(reference.getAttribute('aria-invalid')).toBe('true');
  const explanationId=reference.getAttribute('aria-describedby');
  expect(explanationId).toBeTruthy();
  expect(document.getElementById(explanationId!)?.textContent).toContain('Tender reference');
  const method=screen.getByLabelText('Original form submission method');
  expect(method.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(method.getAttribute('aria-describedby')!)?.textContent).toMatch(/issuer-prescribed submission method/);
  fireEvent.change(reference,{target:{value:'SYNTHETIC-REF-1'}});
  expect(reference.getAttribute('aria-invalid')).toBe('false');
  expect(reference.hasAttribute('aria-describedby')).toBe(false);
  expect(document.getElementById(explanationId!)).toBeNull();
  expect(run.mock.calls.filter(call=>call[0].action==='fill')).toHaveLength(0);
  expect(network).not.toHaveBeenCalled();
});

it('focuses the first missing or invalid bid-context answer without fabricating facts or filling a document',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();
 fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:'Synthetic supplier'}});
 const prepare=screen.getByRole('button',{name:'Prepare exact original for review'});
 fireEvent.click(prepare);
 expect(document.activeElement).toBe(screen.getByLabelText('Tender reference'));
 expect(screen.getByText(/Complete: Tender reference/)).toBeTruthy();
 for(const [label,value] of [
  ['Tender reference','SYNTHETIC-002'],['Procuring authority','Synthetic authority'],
  ['Exact official submission address','Synthetic portal'],
  ['Applicant or authorised representative','Synthetic contact'],
  ['Applicant-entered offer ZAR','500.00'],
 ])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.change(screen.getByLabelText('Closing time with timezone'),{target:{value:'not-a-deadline'}});
 fireEvent.click(prepare);
 expect(document.activeElement).toBe(screen.getByLabelText('Closing time with timezone'));
 expect(screen.getAllByText(/Future closing time with explicit timezone/).length).toBeGreaterThan(0);
 fireEvent.change(screen.getByLabelText('Closing time with timezone'),{target:{value:'2090-11-30T11:00+02:00'}});
 fireEvent.click(prepare);
 expect(document.activeElement).toBe(screen.getByLabelText('Original form submission method'));
 expect(screen.getByText('Complete: Issuer-prescribed submission method')).toBeTruthy();
 expect(run.mock.calls.filter(call=>call[0].action==='fill')).toHaveLength(0);
 expect(network).not.toHaveBeenCalled();
});

it('focuses a missing or invalid supplier contact answer from the full and step-by-step views without filling',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();
 const prepare=screen.getByRole('button',{name:'Prepare exact original for review'});
 fireEvent.click(screen.getByRole('button',{name:'Guide me step by step'}));
 fireEvent.click(screen.getByRole('button',{name:'Next contact field'}));
 expect(screen.queryByLabelText('SBD 1 Name of bidder')).toBeNull();
 fireEvent.click(prepare);
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('SBD 1 Name of bidder')));
 expect(screen.getByText(/Check supported SBD 1 contact fields before preparing/)).toBeTruthy();
 fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:'Synthetic supplier'}});
 fireEvent.click(screen.getByRole('button',{name:'Show all contact fields'}));
 fireEvent.change(screen.getByLabelText('SBD 1 Email address'),{target:{value:'not-an-email'}});
 fireEvent.click(screen.getByRole('button',{name:'Guide me step by step'}));
 fireEvent.click(screen.getByRole('button',{name:'Previous contact field'}));
 expect(screen.queryByLabelText('SBD 1 Email address')).toBeNull();
 fireEvent.click(prepare);
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('SBD 1 Email address')));
 expect(run.mock.calls.filter(([request])=>request.action==='fill')).toHaveLength(0);
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
 expect(status.textContent).toContain('luqi-sbd1-partial-review-pack.zip');
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

it('explains rejected 24-hour deadline input beside the focused field without guessing or filling',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();await fillContext();
 const fillsBefore=run.mock.calls.filter(([request])=>request.action==='fill').length;
 const closing=screen.getByLabelText('Closing time with timezone') as HTMLInputElement;
 fireEvent.change(closing,{target:{value:'2090-11-30T24:00+02:00'}});
 fireEvent.click(screen.getByRole('button',{name:'Prepare exact original for review'}));
 expect(document.activeElement).toBe(closing);
 expect(closing.getAttribute('aria-invalid')).toBe('true');
 const errorHelp=document.getElementById(closing.getAttribute('aria-describedby')||'');
 expect(errorHelp?.textContent).toMatch(/Hour 24 may roll into the next day/);
 expect(errorHelp?.textContent).toMatch(/enter 00 through 23; do not guess a replacement/);
 expect(screen.queryByRole('region',{name:'Original form applicant review'})).toBeNull();
 expect(run.mock.calls.filter(([request])=>request.action==='fill')).toHaveLength(fillsBefore);
 expect(archive).not.toHaveBeenCalled();
 expect(network).not.toHaveBeenCalled();
});

it('counts supported entries without claiming verified phone formats or full completion',async()=>{
 render(<TenderOriginalForms/>);await importOriginal();
 expect(screen.getByText('0 of 7 supported contact fields contain entries without detected input errors.')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:'Synthetic bidder'}});
 fireEvent.change(screen.getByLabelText('SBD 1 Telephone number'),{target:{value:'SYNTHETIC-NOT-VERIFIED'}});
 expect(screen.getByText('2 of 7 supported contact fields contain entries without detected input errors.')).toBeTruthy();
 expect(screen.getByText(/The count checks text length, hidden characters and basic email syntax only/)).toBeTruthy();
 expect(screen.getByText(/This is not overall application completion or verification of your facts/)).toBeTruthy();
 expect(screen.queryByText(/valid-format entries/)).toBeNull();
 expect(run.mock.calls.filter(([request])=>request.action==='fill')).toHaveLength(0);
 expect(network).not.toHaveBeenCalled();
});
