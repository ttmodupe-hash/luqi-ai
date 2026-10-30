import {useEffect,useRef,useState} from 'react';
import {useOptionalCustomerSession} from '../providers/customer-session';
import {EMPTY_SUPPLIER_VALUES,SBD1_FIELDS,VERIFIED_SBD1,TENDER_FILE_MAX,TENDER_DOCUMENT_ERRORS,
  type SupplierValues,type TenderDocumentInspection} from '../lib/tender-document-contract';
import {runTenderDocument} from '../lib/tender-document-client';
import {EMPTY_PACKET_CONTEXT,ORIGINAL_FORM_GATES,emptyOriginalApprovals,appendTenderAudit,prepareTenderPacket,
  validatePacketContext,canExportTenderPacket,buildTenderOriginalArchive,
  type TenderPacketContext,type PreparedTenderPacket,type OriginalFormApprovals,
  type OriginalFormGate,type TenderAuditEvent} from '../lib/tender-document-review';

interface LocalTenderFile {name:string;mime:string;bytes:Uint8Array;inspection:TenderDocumentInspection}
const inputStyle='mt-1 block w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-white';
const buttonStyle='rounded-lg border border-cyan-400 px-3 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-50';
function saveArchive(bytes:Uint8Array){
  const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/zip'}));
  const a=document.createElement('a');a.href=url;a.download='luqi-sbd1-partial-review-pack.zip';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
/** Optional local document assistance; no credentials, upload, account storage or inference. */
export function TenderOriginalForms(){
  const customer=useOptionalCustomerSession();
  const account=customer?.session?.user.email??null;
  const [consent,setConsent]=useState(false);
  const [primary,setPrimary]=useState<LocalTenderFile|null>(null);
  const [amendments,setAmendments]=useState<LocalTenderFile[]>([]);
  const [values,setValues]=useState<SupplierValues>({...EMPTY_SUPPLIER_VALUES});
  const [context,setContext]=useState<TenderPacketContext>({...EMPTY_PACKET_CONTEXT});
  const [history,setHistory]=useState<TenderAuditEvent[]>([]);
  const [revision,setRevision]=useState(0);
  const [prepared,setPrepared]=useState<{packet:PreparedTenderPacket;filled:Uint8Array}|null>(null);
  const [gates,setGates]=useState<OriginalFormApprovals>(emptyOriginalApprovals);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [clock,setClock]=useState(Date.now());
  const epoch=useRef(0),pending=useRef<AbortController|null>(null);
  const historyFull=history.length>=950;
  const accountRef=useRef(account);
  const fileInput=useRef<HTMLInputElement|null>(null),amendmentInput=useRef<HTMLInputElement|null>(null);
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer)},[]);
  useEffect(()=>()=>{epoch.current++;pending.current?.abort()},[]);
  function clearPrivateWork(){
    epoch.current++;pending.current?.abort();pending.current=null;
    setPrimary(null);setAmendments([]);setValues({...EMPTY_SUPPLIER_VALUES});setContext({...EMPTY_PACKET_CONTEXT});
    setPrepared(null);setGates(emptyOriginalApprovals());setHistory([]);setRevision(0);setBusy(false);setConsent(false);
    setMessage('Private work cleared from this tab. Any files you downloaded remain on your device.');
    if(fileInput.current)fileInput.current.value='';if(amendmentInput.current)amendmentInput.current.value='';
  }
  useEffect(()=>{const clear=()=>clearPrivateWork();window.addEventListener('pagehide',clear);
    return()=>window.removeEventListener('pagehide',clear)},[]);
  useEffect(()=>{
    if(accountRef.current!==account){accountRef.current=account;clearPrivateWork();}
  },[account]); // Account switch/logout/expiry clears private inputs and in-flight results.
  function audit(action:TenderAuditEvent['action'],subject:string,nextRevision=revision){
    setHistory(previous=>appendTenderAudit(previous,nextRevision,action,subject));
  }
  function invalidate(action:TenderAuditEvent['action'],subject:string){
    epoch.current++;pending.current?.abort();setBusy(false);
    const next=revision+1;setRevision(next);setPrepared(null);setGates(emptyOriginalApprovals());
    if(prepared)audit('revoke','all',next);
    audit(action,subject,next);setMessage('Changed: all previous approvals cleared. Prepare and review the new version.');
  }
  async function inspectFile(file:File,amendment=false){
    if(!consent||busy||historyFull)return;
    if(file.size<=0||file.size>TENDER_FILE_MAX){setMessage(TENDER_DOCUMENT_ERRORS.FILE_SIZE);return;}
    if(amendment&&(!primary||amendments.length>=6)){setMessage('Choose an original first. Up to six addenda are supported.');return;}
    const version=++epoch.current;
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    // Clear approvals as soon as a replacement is selected, even when parsing fails.
    const next=revision+1;setRevision(next);setPrepared(null);setGates(emptyOriginalApprovals());setBusy(true);
    if(!amendment){setPrimary(null);setAmendments([]);setValues({...EMPTY_SUPPLIER_VALUES});}
    setMessage('Checking file type, archive limits and unsupported active content locally…');
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(version!==epoch.current||controller.signal.aborted)return;
      const result=await runTenderDocument({action:'inspect',name:file.name,mime:file.type,bytes},controller.signal);
      if(version!==epoch.current||controller.signal.aborted)return;
      if(!result.ok){setMessage(TENDER_DOCUMENT_ERRORS[result.code]||TENDER_DOCUMENT_ERRORS.DOCUMENT_INVALID);return;}
      const item={name:file.name,mime:file.type,bytes,inspection:result.inspection};
      if(amendment){
        if(primary?.inspection.sha256===item.inspection.sha256||amendments.some(a=>a.inspection.sha256===item.inspection.sha256)){
          setMessage('This exact document is already in the review packet. Approvals remain cleared.');return;
        }
        setAmendments(previous=>[...previous,item]);audit('add-amendment',result.inspection.sha256,next);
      }else{setPrimary(item);audit('import-original',result.inspection.sha256,next);}
      setMessage(result.inspection.templateId?'Exact Treasury original verified. Enter only your own accurate supplier facts.'
        :'Structural checks passed for local inspection. No verified fill mapping exists for this exact file.');
    }catch{if(version===epoch.current)setMessage(TENDER_DOCUMENT_ERRORS.DOCUMENT_INVALID)}
    finally{if(version===epoch.current){setBusy(false);pending.current=null;}}
  }
  async function useTreasuryOriginal(){
    if(!consent||busy||historyFull)return;
    const version=++epoch.current;setBusy(true);setPrepared(null);setGates(emptyOriginalApprovals());
    const controller=new AbortController();pending.current=controller;
    const timer=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch(VERIFIED_SBD1.localPath,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
      if(!response.ok||!response.body)throw Error();
      const reader=response.body.getReader();let length=0;const chunks:Uint8Array[]=[];
      while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;
        if(length>VERIFIED_SBD1.bytes){await reader.cancel();throw Error();}chunks.push(part.value);}
      if(length!==VERIFIED_SBD1.bytes)throw Error();
      if(version!==epoch.current||controller.signal.aborted)return;
      const file=new File(chunks.map(c=>new Uint8Array(c)),'treasury-revised-sbd1.docx',
        {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
      // Use the same worker validation and exact hash check as an imported original.
      const bytes=new Uint8Array(await file.arrayBuffer());
      const result=await runTenderDocument({action:'inspect',name:file.name,mime:file.type,bytes},controller.signal);
      if(version!==epoch.current||controller.signal.aborted)return;
      if(!result.ok||result.inspection.templateId!==VERIFIED_SBD1.id)throw Error();
      const next=revision+1;setRevision(next);setPrimary({name:file.name,mime:file.type,bytes,inspection:result.inspection});
      setAmendments([]);setValues({...EMPTY_SUPPLIER_VALUES});audit('import-original',result.inspection.sha256,next);
      setMessage('Treasury original verified. This blank template is usable only where the issuer permits it.');
    }catch{if(version===epoch.current)setMessage('The pinned Treasury original could not be verified. No supplier data was sent.');}
    finally{clearTimeout(timer);if(version===epoch.current){setBusy(false);pending.current=null;}}
  }
  async function prepare(){
    if(!primary?.inspection.templateId||busy||historyFull)return;
    const missing=validatePacketContext(context);
    if(missing.length){setMessage('Complete: '+missing.join('; '));return;}
    const version=++epoch.current;setBusy(true);setGates(emptyOriginalApprovals());setPrepared(null);
    const controller=new AbortController();pending.current=controller;
    try{
      const result=await runTenderDocument({action:'fill',name:primary.name,mime:primary.mime,bytes:primary.bytes,values},controller.signal);
      if(version!==epoch.current||controller.signal.aborted)return;
      if(!result.ok||!result.filled){setMessage(TENDER_DOCUMENT_ERRORS[result.ok?'DOCUMENT_INVALID':result.code]);return;}
      const packet=await prepareTenderPacket({inspection:primary.inspection,originalName:primary.name,filled:result.filled,values,
        amendments:amendments.map((a,i)=>({name:`amendment-${i+1}.${a.inspection.kind}`,sha256:a.inspection.sha256,size:a.bytes.length,role:'amendment'})),
        context,revision});
      if(version!==epoch.current||controller.signal.aborted)return;
      setPrepared({packet,filled:result.filled});setClock(Date.now());audit('prepare',packet.digest);
      setMessage('Review the exact entered fields, packet digest and addenda, then complete each applicant approval. Export remains unsigned and partial.');
    }catch{if(version===epoch.current)setMessage('The review packet could not be prepared. Check the fields and context.');}
    finally{if(version===epoch.current){setBusy(false);pending.current=null;}}
  }
  function gate(id:OriginalFormGate,checked:boolean){
    if(!prepared||busy||historyFull)return;
    setGates(previous=>({...previous,[id]:checked,...(id==='release'?{}:{release:false})}));
    audit(checked?'approve':'revoke',id);setMessage('Approval history updated for this exact prepared version.');
  }
  async function download(){
    if(!primary||!prepared||!canExportTenderPacket(prepared.packet,revision,gates)||busy||historyFull)return;
    const version=++epoch.current;setBusy(true);
    try{
      const finalHistory=appendTenderAudit(history,revision,'export',prepared.packet.digest);
      const bytes=await buildTenderOriginalArchive(prepared.packet,revision,gates,[
        {name:'original.docx',bytes:primary.bytes},{name:'filled-sbd1-partial.docx',bytes:prepared.filled},
        ...amendments.map((a,i)=>({name:`amendment-${i+1}.${a.inspection.kind}`,bytes:a.bytes})),
      ],finalHistory);
      if(version!==epoch.current||!canExportTenderPacket(prepared.packet,revision,gates))return;
      saveArchive(bytes);setHistory(finalHistory);
      setMessage('Partial original and review record exported privately. Complete the remaining official fields and signatures before your own submission. Nothing was submitted.');
    }catch{if(version===epoch.current)setMessage('Export stopped: the packet changed, approval expired or review is incomplete. Prepare and approve it again.');}
    finally{if(version===epoch.current)setBusy(false)}
  }
  const ready=canExportTenderPacket(prepared?.packet??null,revision,gates,new Date(clock));
  return <section aria-label="Original government form assistance" className="space-y-4 rounded-xl border border-cyan-600 bg-slate-900 p-4">
    <h2 className="text-xl font-semibold">Fill a supported original government form</h2>
    <p className="text-sm text-slate-200">Start with Treasury’s verified revised SBD 1 DOCX. Luqi fills seven supplier contact fields on the actual original. Required wording, tables, declarations, pricing and signature areas remain intact for your completion.</p>
    <p className="text-sm text-amber-200">PDF: interactive field names only. Excel XLSX: cell text only. Other DOCX: text only. Filling these files is blocked until their exact originals have reviewed mappings. Scans, OCR, DOC/XLS, macros and signed files are unsupported.</p>
    <p className="text-xs text-slate-300">Files and supplier details stay in this tab’s memory. No document upload, AI call or automatic storage occurs. Clearing, reloading, leaving this page or changing accounts removes this local work. Downloads remain on your device. Structural checks are not an antivirus certificate.</p>
    <a href={VERIFIED_SBD1.source} target="_blank" rel="noopener noreferrer" className="break-words text-sm text-cyan-200 underline">Check Treasury’s original SBD 1</a>
    <p className="text-xs text-slate-300">Original checked {VERIFIED_SBD1.checkedOn}. A matching hash identifies that version; it does not confirm that your issuer accepts it or that later addenda do not exist.</p>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} className="mt-1"
      onChange={e=>{if(!e.target.checked)clearPrivateWork();else setConsent(true)}}/>
      <span>I authorise local processing of documents I may use, and understand the privacy and download controls above</span></label>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={!consent||busy||historyFull} className={buttonStyle} onClick={()=>{void useTreasuryOriginal()}}>Use verified Treasury SBD 1</button>
      <button type="button" className={buttonStyle} onClick={clearPrivateWork}>Clear private document work</button>
    </div>
    <label className="block text-sm">Import original PDF, DOCX or XLSX (maximum 3 MB)
      <input ref={fileInput} type="file" accept=".pdf,.docx,.xlsx" aria-label="Import original tender document" disabled={!consent||busy||historyFull}
        className={inputStyle} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void inspectFile(f)}}/>
    </label>
    {message&&<p role="status" aria-live="polite" className="text-sm text-cyan-100">{message}</p>}
    {historyFull&&<p role="alert">This session reached its review history limit. Clear this work to start again.</p>}
    {primary&&<>
      <div className="space-y-2 rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm">
        <h3 className="font-semibold">Imported document</h3><p className="break-all">{primary.name} · {primary.inspection.kind.toUpperCase()} · {primary.bytes.length} bytes</p>
        <p className="break-all text-xs">SHA-256: {primary.inspection.sha256}</p>
        {primary.inspection.notes.map(note=><p key={note} className="text-xs text-amber-200">{note}</p>)}
        <details><summary className="cursor-pointer">Extracted content and field locations (untrusted document data)</summary>
          <p className="my-2 text-xs">Luqi does not treat this text as instructions, verify its claims or infer missing supplier facts.</p>
          {primary.inspection.excerpt&&<pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{primary.inspection.excerpt}</pre>}
          <ul className="space-y-2 text-xs">{primary.inspection.fields.map((field,i)=><li key={i} className="break-all">
            {field.location}: {field.label}{field.value?' — '+field.value:' — blank original field'}
          </li>)}</ul>
        </details>
      </div>
      <section aria-label="Tender amendments" className="space-y-3">
        <h3 className="font-semibold">Addenda and amendment history</h3>
        <p className="text-xs text-slate-300">Import the latest issuer addenda yourself. Luqi records their exact hashes; you must reconcile changes and check for further notices. Adding or removing a document clears all approvals.</p>
        <input ref={amendmentInput} type="file" accept=".pdf,.docx,.xlsx" aria-label="Add tender amendment" disabled={busy||amendments.length>=6||historyFull}
          className={inputStyle} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void inspectFile(f,true)}}/>
        <ul className="space-y-2">{amendments.map((a,i)=><li key={a.inspection.sha256} className="rounded-lg border border-slate-700 p-2 text-xs">
          <p className="break-all">Addendum {i+1}: {a.name}</p><p className="break-all">SHA-256: {a.inspection.sha256}</p>
          <button type="button" disabled={busy||historyFull} className="mt-2 underline" onClick={()=>{
            invalidate('remove-amendment',a.inspection.sha256);setAmendments(previous=>previous.filter(x=>x!==a));
          }}>Remove addendum {i+1}</button>
        </li>)}</ul>
      </section>
      {primary.inspection.templateId&&<>
        <fieldset disabled={busy||historyFull} className="space-y-3"><legend className="font-semibold">Your verified supplier facts</legend>
          <p className="text-xs text-slate-300">Only facts you type are inserted. Leave unknown or inapplicable fields blank. No certificates, tax compliance, eligibility or experience are invented. Do not enter passwords, OTPs, tax PINs, ID numbers or bank details.</p>
          <div className="grid gap-3 sm:grid-cols-2">{SBD1_FIELDS.map(field=><label key={field.id} className="block min-w-0 text-sm">{field.label}{field.required?' (required for this export)':''}
            <input aria-label={'SBD 1 '+field.label} maxLength={field.max} type={field.id==='email'?'email':'text'} autoComplete="off" value={values[field.id]} className={inputStyle}
              onChange={e=>{setValues(previous=>({...previous,[field.id]:e.target.value}));invalidate('edit-field',field.id)}}/>
          </label>)}</div>
        </fieldset>
        <fieldset disabled={busy||historyFull} className="space-y-3"><legend className="font-semibold">Bid context for your private review record</legend>
          <p className="text-xs text-slate-300">These values identify the review packet. They do not fill the authority’s bid invitation, pricing schedule or declarations. Confirm them against the issuer originals.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['reference','Tender reference'],['issuer','Procuring authority'],['principal','Applicant or authorised representative'],
              ['deadline','Closing time with timezone'],['destination','Exact official submission address'],['priceZar','Applicant-entered offer ZAR'],
            ] as const).map(([key,label])=><label key={key} className="block min-w-0 text-sm">{label}
              <input aria-label={label} maxLength={key==='priceZar'?15:240} autoComplete="off" value={context[key]} className={inputStyle}
                placeholder={key==='deadline'?'2026-11-30T11:00+02:00':undefined}
                onChange={e=>{setContext(previous=>({...previous,[key]:e.target.value}));invalidate('edit-context',key)}}/>
            </label>)}
            <label className="block text-sm">Issuer-prescribed submission method
              <select aria-label="Original form submission method" value={context.method} className={inputStyle}
                onChange={e=>{setContext(previous=>({...previous,method:e.target.value as TenderPacketContext['method']}));invalidate('edit-context','method')}}>
                <option value="">Confirm from issuer documents</option><option value="physical">Sealed physical bid / tender box</option>
                <option value="portal">Authority-supported electronic portal</option><option value="email">Issuer-prescribed email</option>
              </select>
            </label>
          </div>
        </fieldset>
        <button type="button" className={buttonStyle} disabled={busy||historyFull} onClick={()=>{void prepare()}}>Prepare exact original for review</button>
      </>}
    </>}
    {prepared&&<section aria-label="Original form applicant review" className="space-y-3 rounded-lg border border-cyan-500 p-3">
      <h3 className="font-semibold">Review version {prepared.packet.revision}</h3>
      <p className="break-all text-xs">Exact packet digest: {prepared.packet.digest}</p>
      <p className="text-xs text-amber-200">Unsigned, partial original for manual completion. Review expires in 30 minutes or at the closing time. Every edit clears every approval. Prices and declarations have not been filled.</p>
      <dl className="space-y-1 text-sm">{SBD1_FIELDS.map(field=><div key={field.id} className="break-words"><dt className="font-semibold">{field.label}</dt><dd>{values[field.id]||'Left blank for applicant completion'}</dd></div>)}</dl>
      {prepared.packet.files.map(file=><p key={file.name} className="break-all text-xs">{file.role}: {file.name} · SHA-256 {file.sha256}</p>)}
      {ORIGINAL_FORM_GATES.map(g=><label key={g.id} className="flex items-start gap-2 rounded-lg border border-slate-700 p-3 text-sm">
        <input type="checkbox" disabled={busy||historyFull||(g.id==='release'&&!ORIGINAL_FORM_GATES.filter(x=>x.id!=='release').every(x=>gates[x.id]))}
          checked={gates[g.id]} onChange={e=>gate(g.id,e.target.checked)} className="mt-1"/><span>{g.label}</span>
      </label>)}
      <button type="button" className={buttonStyle} disabled={!ready||busy||historyFull} onClick={()=>{void download()}}>Export filled original and review record</button>
      {!ready&&<p className="text-xs text-amber-200">Export requires current review, all seven approvals and a future verified closing time.</p>}
    </section>}
    {history.length>0&&<details><summary className="cursor-pointer text-sm">Local approval and amendment history ({history.length})</summary>
      <p className="my-2 text-xs text-slate-300">No private field values appear here. Consecutive typing in one field is combined into one edit event. This local record does not independently verify identity, legal authority or the truth of a declaration.</p>
      <ol className="max-h-48 space-y-1 overflow-auto text-xs">{history.map(e=><li key={e.sequence} className="break-all">{e.sequence}. {e.at} · version {e.revision} · {e.action} · {e.subject}</li>)}</ol>
    </details>}
    <p className="text-sm text-slate-300">Submission integrations: none enabled. Submit manually using the authority’s prescribed method after completing and signing every required original. Luqi cannot report a verified receipt or acceptance.</p>
  </section>;
}
