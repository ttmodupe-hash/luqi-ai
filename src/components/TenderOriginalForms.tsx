import {useEffect,useId,useRef,useState} from 'react';
import {useOptionalCustomerSession} from '../providers/customer-session';
import {EMPTY_SUPPLIER_VALUES,SBD1_FIELDS,VERIFIED_SBD1,TENDER_FILE_MAX,TENDER_DOCUMENT_ERRORS,
  type SupplierValues,type TenderDocumentInspection} from '../lib/tender-document-contract';
import {TenderSupplierGuide} from './TenderSupplierGuide';
import {supplierFieldProgress} from '../lib/tender-field-guide';
import {runTenderDocument} from '../lib/tender-document-client';
import {EMPTY_PACKET_CONTEXT,ORIGINAL_FORM_GATES,emptyOriginalApprovals,appendTenderAudit,prepareTenderPacket,
  validatePacketContext,canExportTenderPacket,buildTenderOriginalArchive,
  type TenderPacketContext,type PreparedTenderPacket,type OriginalFormApprovals,
  type OriginalFormGate,type TenderAuditEvent} from '../lib/tender-document-review';

interface LocalTenderFile {name:string;mime:string;bytes:Uint8Array;inspection:TenderDocumentInspection}
const inputStyle='mt-1 block w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-white';
const buttonStyle='rounded-lg border border-cyan-400 px-3 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-50';
// Match the existing packet-validator messages to their editable controls.
// These are prompts for applicant correction, not issuer-verified requirements.
const CONTEXT_ISSUE_FOCUS: Record<string, keyof TenderPacketContext> = {
  'Tender reference':'reference',
  'Procuring authority':'issuer',
  'Exact bid box, official portal or prescribed email':'destination',
  'Applicant or authorised representative':'principal',
  'Future closing time with explicit timezone (for South Africa use +02:00)':'deadline',
  'Issuer-prescribed submission method':'method',
  'Applicant-entered positive offer amount in ZAR':'priceZar',
};
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
  const [contextReviewAttempted,setContextReviewAttempted]=useState(false);
  const contextHelpId=useId();
  const [clock,setClock]=useState(Date.now());
  const epoch=useRef(0),pending=useRef<AbortController|null>(null);
  const historyFull=history.length>=950;
  const accountRef=useRef(account);
  const fileInput=useRef<HTMLInputElement|null>(null),amendmentInput=useRef<HTMLInputElement|null>(null);
  const contextInputs=useRef<Partial<Record<keyof TenderPacketContext,HTMLInputElement|HTMLSelectElement>>>({});
  const formRoot=useRef<HTMLElement|null>(null);
  // Preserve the latest observed local time while this review is mounted: a backwards
  // device-clock change must not reopen approvals after a recorded expiry.
  // This is not trusted issuer time and cannot prevent tampering before observation.
  useEffect(()=>{
    const observe=()=>setClock(previous=>Math.max(previous,Date.now()));
    const timer=setInterval(observe,1000);
    // Background-tab timers can be throttled. Refresh the applicant's expiry
    // warning and disabled approvals as soon as the tab becomes visible again.
    document.addEventListener('visibilitychange',observe);
    window.addEventListener('pageshow',observe);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',observe);
      window.removeEventListener('pageshow',observe);};
  },[]);
  useEffect(()=>()=>{epoch.current++;pending.current?.abort()},[]);
  function clearPrivateWork(){
    epoch.current++;pending.current?.abort();pending.current=null;
    setPrimary(null);setAmendments([]);setValues({...EMPTY_SUPPLIER_VALUES});setContext({...EMPTY_PACKET_CONTEXT});
    setPrepared(null);setGates(emptyOriginalApprovals());setHistory([]);setRevision(0);setBusy(false);setConsent(false);
    setContextReviewAttempted(false);
    setMessage('Private work cleared from this tab. Any files you downloaded remain on your device.');
    if(fileInput.current)fileInput.current.value='';if(amendmentInput.current)amendmentInput.current.value='';
  }
  useEffect(()=>{const clear=()=>clearPrivateWork();window.addEventListener('pagehide',clear);
    return()=>window.removeEventListener('pagehide',clear)},[]);
  useEffect(()=>{
    if(accountRef.current!==account){accountRef.current=account;clearPrivateWork();}
  },[account]); // Account switch/logout/expiry clears private inputs and in-flight results.
  // Never allow a clock correction to move this mounted review's observed time backwards.
  // This is a session-local guard, not trusted issuer or network time.
  const observedNow=()=>new Date(Math.max(clock,Date.now()));
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
    if(amendment&&(!primary||amendments.length>=6)){setMessage('Choose an original first. Up to six addenda are supported.');return;}
    const version=++epoch.current;
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    // Clear approvals as soon as a replacement is selected, even when parsing fails.
    const next=revision+1;setRevision(next);setPrepared(null);setGates(emptyOriginalApprovals());setBusy(true);
    // Preserve a truthful local revocation record even if an amendment is rejected
    // before parsing (empty/oversized), or subsequently fails inspection.
    if(amendment&&prepared&&ORIGINAL_FORM_GATES.some(g=>gates[g.id]))audit('revoke','all',next);
    if(!amendment){
      setContextReviewAttempted(false);
      // A newly selected original starts a different application. Never carry over
      // another application's tender reference, principal, price or channel.
      setPrimary(null);setAmendments([]);setValues({...EMPTY_SUPPLIER_VALUES});setContext({...EMPTY_PACKET_CONTEXT});
      // Also clear the prior application's audit even if inspection rejects the replacement.
      setHistory([]);
    }
    // Invalid-size selections are still replacement attempts: never retain an
    // older applicant's approved packet or private facts just because parsing was skipped.
    if(file.size<=0||file.size>TENDER_FILE_MAX){
      setBusy(false);pending.current=null;setMessage(TENDER_DOCUMENT_ERRORS.FILE_SIZE);return;
    }
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
      }else{
        // The new original starts a separate local review chain: do not include
        // the prior applicant's packet digests or activity in its export.
        setHistory([]);setPrimary(item);audit('import-original',result.inspection.sha256,next);
      }
      setMessage(result.inspection.templateId?'Exact Treasury original verified. Enter only your own accurate supplier facts.'
        :'Structural checks passed for local inspection. No verified fill mapping exists for this exact file.');
    }catch{if(version===epoch.current)setMessage(TENDER_DOCUMENT_ERRORS.DOCUMENT_INVALID)}
    finally{if(version===epoch.current){setBusy(false);pending.current=null;}}
  }
  async function useTreasuryOriginal(){
    if(!consent||busy||historyFull)return;
    const version=++epoch.current;pending.current?.abort();
    setBusy(true);setPrepared(null);setGates(emptyOriginalApprovals());
    // Treat choosing the pinned original as a replacement immediately. On network or
    // integrity failure, a stale applicant's packet must not remain in this session.
    setPrimary(null);setAmendments([]);setValues({...EMPTY_SUPPLIER_VALUES});
    setContext({...EMPTY_PACKET_CONTEXT});setHistory([]);setContextReviewAttempted(false);
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
      // A verified replacement must not inherit the previous application's bid context.
      setAmendments([]);setValues({...EMPTY_SUPPLIER_VALUES});setContext({...EMPTY_PACKET_CONTEXT});
      setHistory([]);audit('import-original',result.inspection.sha256,next);
      setMessage('Treasury original verified. This blank template is usable only where the issuer permits it.');
    }catch{if(version===epoch.current)setMessage('The pinned Treasury original could not be verified. No supplier data was sent.');}
    finally{clearTimeout(timer);if(version===epoch.current){setBusy(false);pending.current=null;}}
  }
  async function prepare(){
    if(!primary?.inspection.templateId||busy||historyFull)return;
    // Ask for missing/invalid contact facts before invoking the document worker.
    // Optional blank fields are not errors; never insert example values.
    const attention=supplierFieldProgress(values,SBD1_FIELDS).attention;
    if(attention.length){
      setMessage('Check supported SBD 1 contact fields before preparing: '+attention.map(({field,issue})=>field.label+': '+issue).join('; '));
      // Reuse the guide's existing Go-to action to reveal and focus the first
      // correction input, including when it is hidden in step-by-step mode.
      const choices=formRoot.current?.querySelectorAll<HTMLButtonElement>('[aria-label="Contact fields needing attention"] button');
      Array.from(choices??[]).find(button=>button.textContent?.trim()===`Go to ${attention[0].field.label}`)?.click();
      return;
    }
    const missing=validatePacketContext(context,observedNow());
    if(missing.length){
      setContextReviewAttempted(true);
      setMessage('Complete: '+missing.join('; '));
      // On Prepare, focus the first invalid or missing context answer, rather
      // than forcing applicants to search the full form or filling it for them.
      const target=CONTEXT_ISSUE_FOCUS[missing[0]];
      if(target)contextInputs.current[target]?.focus();
      return;
    }
    setContextReviewAttempted(false);
    const version=++epoch.current;setBusy(true);
    // Re-preparing discards the earlier review and approvals, even if the
    // worker rejects the new attempt. Reflect that revocation in local history.
    if(prepared&&ORIGINAL_FORM_GATES.some(g=>gates[g.id]))audit('revoke','all');
    setGates(emptyOriginalApprovals());setPrepared(null);
    const controller=new AbortController();pending.current=controller;
    try{
      const result=await runTenderDocument({action:'fill',name:primary.name,mime:primary.mime,bytes:primary.bytes,values},controller.signal);
      if(version!==epoch.current||controller.signal.aborted)return;
      if(!result.ok||!result.filled){setMessage(TENDER_DOCUMENT_ERRORS[result.ok?'DOCUMENT_INVALID':result.code]);return;}
      const packet=await prepareTenderPacket({inspection:primary.inspection,originalName:primary.name,filled:result.filled,values,
        amendments:amendments.map((a,i)=>({name:`amendment-${i+1}.${a.inspection.kind}`,sha256:a.inspection.sha256,size:a.bytes.length,role:'amendment'})),
        context,revision},observedNow());
      if(version!==epoch.current||controller.signal.aborted)return;
      setPrepared({packet,filled:result.filled});setClock(previous=>Math.max(previous,Date.now()));audit('prepare',packet.digest);
      setMessage('Review the exact entered fields, packet digest and addenda, then complete each applicant approval. Export remains unsigned and partial.');
    }catch{if(version===epoch.current)setMessage('The review packet could not be prepared. Check the fields and context.');}
    finally{if(version===epoch.current){setBusy(false);pending.current=null;}}
  }
  function gate(id:OriginalFormGate,checked:boolean){
    if(!prepared||busy||historyFull||observedNow().getTime()>=Math.min(
      Date.parse(prepared.packet.preparedAt)+30*60*1000,Date.parse(prepared.packet.context.deadline)))return;
    setGates(previous=>({...previous,[id]:checked,...(id==='release'?{}:{release:false})}));
    // Changing an earlier review gate also revokes the applicant's final release
    // permission. Record that dependent revocation, not just the gate edit.
    if(id!=='release'&&gates.release)audit('revoke','release');
    audit(checked?'approve':'revoke',id);setMessage('Approval history updated for this exact prepared version.');
  }
  async function download(){
    if(!primary||!prepared||!canExportTenderPacket(prepared.packet,revision,gates,observedNow())||busy||historyFull)return;
    const version=++epoch.current;setBusy(true);
    try{
      const finalHistory=appendTenderAudit(history,revision,'export',prepared.packet.digest);
      const bytes=await buildTenderOriginalArchive(prepared.packet,revision,gates,[
        {name:'original.docx',bytes:primary.bytes},{name:'filled-sbd1-partial.docx',bytes:prepared.filled},
        ...amendments.map((a,i)=>({name:`amendment-${i+1}.${a.inspection.kind}`,bytes:a.bytes})),
      ],finalHistory,observedNow());
      if(version!==epoch.current||!canExportTenderPacket(prepared.packet,revision,gates,observedNow()))return;
      saveArchive(bytes);setHistory(finalHistory);
      setMessage('Download requested from this browser. Check that luqi-sbd1-partial-review-pack.zip actually appears in Downloads; browsers can block or discard files. If missing, retry while this tab remains open, because leaving or reloading clears this work. Complete remaining official fields and signatures before submitting yourself. Nothing was submitted.');
    }catch{if(version===epoch.current)setMessage('Export stopped: the packet changed, approval expired or review is incomplete. Prepare and approve it again.');}
    finally{if(version===epoch.current)setBusy(false)}
  }
  const expiryAt=prepared?Math.min(
    Date.parse(prepared.packet.preparedAt)+30*60*1000,
    Date.parse(prepared.packet.context.deadline)
  ):0;
  const reviewExpired=!!prepared&&clock>=expiryAt;
  const expiredByDeadline=!!prepared&&clock>=Date.parse(prepared.packet.context.deadline);
  const ready=canExportTenderPacket(prepared?.packet??null,revision,gates,new Date(clock));
  useEffect(()=>{
    // A review time-out permanently revokes its old approval checkmarks, even
    // if the device clock subsequently moves backwards.
    if(!reviewExpired||!ORIGINAL_FORM_GATES.some(g=>gates[g.id]))return;
    setGates(emptyOriginalApprovals());
    setHistory(previous=>previous.length>=1000?previous:appendTenderAudit(previous,revision,'revoke','all'));
  },[reviewExpired,gates,revision]);
  // Expose applicant-correctable context issues after a Prepare attempt;
  // these are review-packet prompts, not universal issuer requirements.
  const contextIssues=contextReviewAttempted?validatePacketContext(context,observedNow()):[];
  return <section ref={formRoot} aria-label="Original government form assistance" className="space-y-4 rounded-xl border border-cyan-600 bg-slate-900 p-4">
    <h2 className="text-xl font-semibold">Fill a supported original government form</h2>
    <p className="text-sm text-slate-200">Start with Treasury’s verified revised SBD 1 DOCX. Luqi fills seven supplier contact fields on the actual original. Required wording, tables, declarations, pricing and signature areas remain intact for your completion.</p>
    <p className="text-sm text-amber-200">PDF: interactive field names only. Excel XLSX: cell text only. Other DOCX: text only. Filling these files is blocked until their exact originals have reviewed mappings. Scans, OCR, DOC/XLS, macros and signed files are unsupported.</p>
    <p className="text-xs text-slate-300">Files and supplier details stay in this tab’s memory. No document upload, AI call or automatic storage occurs. Clearing, reloading, leaving this page or changing accounts removes this local work. Choosing another original also clears contact entries, bid context and the previous local review history; adding an amendment does not. Downloads remain on your device. Structural checks are not an antivirus certificate.</p>
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
        <TenderSupplierGuide values={values} disabled={busy||historyFull}
          onChange={(field,value)=>{setValues(previous=>({...previous,[field]:value}));invalidate('edit-field',field)}}/>
        <fieldset disabled={busy||historyFull} className="space-y-3"><legend className="font-semibold">Bid context for your private review record</legend>
          <p className="text-xs text-slate-300">These values identify the review packet, not the authority’s bid invitation, prices or declarations. Confirm the closing time, submission method and destination against the exact issuer originals and addenda. Luqi does not independently verify the bid deadline or channel you enter.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['reference','Tender reference'],['issuer','Procuring authority'],['principal','Applicant or authorised representative'],
              ['deadline','Closing time with timezone'],['destination','Exact official submission address'],['priceZar','Applicant-entered offer ZAR'],
            ] as const).map(([key,label])=>{
              const issue=contextIssues.find(entry=>CONTEXT_ISSUE_FOCUS[entry]===key);
              const helpId=contextHelpId+'-'+key;
              return <label key={key} className="block min-w-0 text-sm">{label}
              <input ref={node=>{if(node)contextInputs.current[key]=node;else delete contextInputs.current[key];}}
                aria-label={label} maxLength={key==='priceZar'?15:240} autoComplete="off" value={context[key]} className={inputStyle}
                aria-invalid={Boolean(issue)} aria-describedby={issue?helpId:undefined}
                placeholder={key==='deadline'?'YYYY-MM-DDTHH:mm+02:00':undefined}
                onChange={e=>{setContext(previous=>({...previous,[key]:e.target.value}));invalidate('edit-context',key)}}/>
              {issue&&<span id={helpId} className="mt-1 block text-xs text-amber-200">Check this answer: {issue}. Use your own records and the issuer instructions; Luqi does not verify it.</span>}
            </label>;
            })}
            <label className="block text-sm">Issuer-prescribed submission method
              <select ref={node=>{if(node)contextInputs.current.method=node;else delete contextInputs.current.method;}}
                aria-label="Original form submission method" value={context.method} className={inputStyle}
                aria-invalid={contextIssues.includes('Issuer-prescribed submission method')}
                aria-describedby={contextIssues.includes('Issuer-prescribed submission method')?contextHelpId+'-method':undefined}
                onChange={e=>{setContext(previous=>({...previous,method:e.target.value as TenderPacketContext['method']}));invalidate('edit-context','method')}}>
                <option value="">Confirm from issuer documents</option><option value="physical">Sealed physical bid / tender box</option>
                <option value="portal">Authority-supported electronic portal</option><option value="email">Issuer-prescribed email</option>
              </select>
              {contextIssues.includes('Issuer-prescribed submission method')&&<span id={contextHelpId+'-method'} className="mt-1 block text-xs text-amber-200">Check the issuer-prescribed submission method against the original invitation and addenda. Luqi does not verify the channel.</span>}
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
      {reviewExpired&&<p role="alert" className="rounded-lg border border-amber-500 p-3 text-sm text-amber-100">
        Review expired: {expiredByDeadline?'the recorded bid closing time has passed':'the 30-minute applicant review window has ended'}.
        Earlier checkmarks no longer authorise this export.
        {expiredByDeadline
          ? ' Do not prepare or submit against this passed deadline. Check official issuer addenda for a formally extended closing time; only enter a new future deadline if the issuer confirms it, then prepare and approve a new packet.'
          : ' Confirm the issuer deadline, select Prepare exact original for review, and approve the newly prepared packet before downloading.'}
        Nothing was submitted.
      </p>}
      <dl className="space-y-1 text-sm">{SBD1_FIELDS.map(field=><div key={field.id} className="break-words"><dt className="font-semibold">{field.label}</dt><dd>{values[field.id]||'Left blank for applicant completion'}</dd></div>)}</dl>
      {prepared.packet.files.map(file=><p key={file.name} className="break-all text-xs">{file.role}: {file.name} · SHA-256 {file.sha256}</p>)}
      {ORIGINAL_FORM_GATES.map(g=><label key={g.id} className="flex items-start gap-2 rounded-lg border border-slate-700 p-3 text-sm">
        <input type="checkbox" disabled={busy||historyFull||reviewExpired||(g.id==='release'&&!ORIGINAL_FORM_GATES.filter(x=>x.id!=='release').every(x=>gates[x.id]))}
          checked={gates[g.id]} onChange={e=>gate(g.id,e.target.checked)} className="mt-1"/><span>{g.label}</span>
      </label>)}
      <button type="button" className={buttonStyle} disabled={!ready||busy||historyFull} onClick={()=>{void download()}}>Export filled original and review record</button>
      {!ready&&<p className="text-xs text-amber-200">Export requires current review, all seven approvals and a future closing time you confirmed from the issuer. Luqi has not independently verified the entered deadline or submission channel.</p>}
    </section>}
    {history.length>0&&<details><summary className="cursor-pointer text-sm">Local approval and amendment history ({history.length})</summary>
      <p className="my-2 text-xs text-slate-300">No private field values appear here. Consecutive typing in one field is combined into one edit event. This local record does not independently verify identity, legal authority or the truth of a declaration.</p>
      <ol className="max-h-48 space-y-1 overflow-auto text-xs">{history.map(e=><li key={e.sequence} className="break-all">{e.sequence}. {e.at} · version {e.revision} · {e.action} · {e.subject}</li>)}</ol>
    </details>}
    <p className="text-sm text-slate-300">Submission integrations: none enabled. Submit manually using the authority’s prescribed method after completing and signing every required original. Luqi cannot report a verified receipt or acceptance.</p>
  </section>;
}
