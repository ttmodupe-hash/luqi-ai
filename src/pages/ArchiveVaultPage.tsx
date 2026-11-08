import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router';
import { useOptionalCustomerSession } from '../providers/customer-session';
import { MAX_ARCHIVE_BYTES, MAX_RECOVERY_BYTES, utf8, validateDocument, validatedBundle,
  type ArchiveDocument, type LocalArchiveBundle } from '../features/archive/archive-contract';
import '../features/archive/archive.css';

export default function ArchiveVaultPage() {
  const identity = useOptionalCustomerSession()?.session?.user.email ?? null;
  const [title,setTitle] = useState(''), [text,setText] = useState('');
  const [bundle,setBundle] = useState<LocalArchiveBundle|null>(null);
  const [recoveryPrepared,setRecoveryPrepared] = useState(false), [keptRecovery,setKeptRecovery] = useState(false);
  const [archiveFile,setArchiveFile] = useState<File|null>(null), [recoveryFile,setRecoveryFile] = useState<File|null>(null);
  const [opened,setOpened] = useState<ArchiveDocument|null>(null);
  const [busy,setBusy] = useState(false), [notice,setNotice] = useState(''), [failed,setFailed] = useState(false);
  const pass = useRef<HTMLInputElement>(null), repeat = useRef<HTMLInputElement>(null), unlock = useRef<HTMLInputElement>(null);
  const archivePicker = useRef<HTMLInputElement>(null), recoveryPicker = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker|null>(null), timer = useRef<ReturnType<typeof setTimeout>|null>(null), epoch = useRef(0);
  const downloads = useRef(new Map<string,ReturnType<typeof setTimeout>>());
  function stop() { epoch.current++;worker.current?.terminate();worker.current=null;
    if(timer.current)clearTimeout(timer.current);timer.current=null; }
  function clearSecrets() {for(const ref of [pass,repeat,unlock])if(ref.current)ref.current.value='';}
  function revokeDownloads() {for(const [url,id] of downloads.current){clearTimeout(id);URL.revokeObjectURL(url);}downloads.current.clear();}
  function message(value:string,error=false){setNotice(value);setFailed(error);}
  function discardBundle(){setBundle(null);setRecoveryPrepared(false);setKeptRecovery(false);revokeDownloads();}
  function clearAll(){stop();clearSecrets();revokeDownloads();setTitle('');setText('');setBundle(null);
    setRecoveryPrepared(false);setKeptRecovery(false);setArchiveFile(null);setRecoveryFile(null);setOpened(null);setBusy(false);
    for(const ref of [archivePicker,recoveryPicker])if(ref.current)ref.current.value='';message('');}
  useEffect(()=>{clearAll();},[identity]);
  useEffect(()=>()=>{stop();clearSecrets();revokeDownloads();},[]);
  function fail(){stop();setBusy(false);message('Could not verify this operation. Check the files and passphrase, or try a current browser. Your original record is unchanged.',true);}
  function start(command:Record<string,unknown>,version:number){
    try{
      const current=new Worker(new URL('../features/archive/archive.worker.ts',import.meta.url),{type:'module'});
      worker.current=current;
      current.onerror=()=>{if(worker.current===current)fail();};
      current.onmessage=event=>{
        if(worker.current!==current||epoch.current!==version)return;
        try{
          if(event.data?.ok!==true)throw Error('UNCONFIRMED');
          if(command.kind==='seal'&&event.data.kind==='sealed'){
            setBundle(validatedBundle(event.data.result));setRecoveryPrepared(false);setKeptRecovery(false);
            message('Encrypted pair prepared and checked in this tab. Save the recovery file first, then the archive. Verify your saved pair below before deleting any original.');
          }else if(command.kind==='open'&&event.data.kind==='opened'){
            setOpened(validateDocument(event.data.result));message('Both signatures, the saved digest and authenticated decryption passed. Review the restored record below.');
          }else throw Error('UNCONFIRMED');
          stop();setBusy(false);
        }catch{fail();}
      };
      timer.current=setTimeout(()=>{if(worker.current===current)fail();},20_000);
      current.postMessage(command);
    }catch{fail();}
  }
  function prepare(){
    if(busy)return;
    const secret=pass.current?.value??'',confirmation=repeat.current?.value??'';clearSecrets();discardBundle();setOpened(null);
    if(secret!==confirmation){message('The two recovery passphrases do not match. No archive was prepared.',true);return;}
    try{validateDocument({title,text});if(secret.length<14||secret.length>128)throw Error('INVALID');}
    catch{message('Add a title and record within 24 KB, and a unique recovery passphrase of 14–128 characters.',true);return;}
    stop();const version=epoch.current;setBusy(true);message('Encrypting and checking the recovery pair on this device…');
    start({kind:'seal',document:{title,text},passphrase:secret},version);
  }
  function selectFile(event:ChangeEvent<HTMLInputElement>,kind:'archive'|'recovery'){
    stop();clearSecrets();setBusy(false);setOpened(null);message('');
    const file=event.currentTarget.files?.[0]??null;
    if(kind==='archive')setArchiveFile(file);else setRecoveryFile(file);
  }
  async function restore(){
    if(busy||!archiveFile||!recoveryFile)return;
    const secret=unlock.current?.value??'';clearSecrets();setOpened(null);
    stop();const version=epoch.current;
    if(secret.length<14||secret.length>128||archiveFile.size<1||archiveFile.size>MAX_ARCHIVE_BYTES||
       recoveryFile.size<1||recoveryFile.size>MAX_RECOVERY_BYTES){message('Choose a matching archive/recovery pair within the file limits and enter its recovery passphrase.',true);return;}
    setBusy(true);message('Reading and verifying your selected files locally…');
    try{
      const [envelope,recovery]=await Promise.all([archiveFile.text(),recoveryFile.text()]);
      if(version!==epoch.current)return;
      if(utf8(envelope).length>MAX_ARCHIVE_BYTES||utf8(recovery).length>MAX_RECOVERY_BYTES)throw Error('LIMIT');
      start({kind:'open',envelope,recoveryFile:recovery,passphrase:secret},version);
    }catch{if(version===epoch.current)fail();}
  }
  function download(value:string,name:string,type='application/json;charset=utf-8'){
    const url=URL.createObjectURL(new Blob([value],{type}));
    try{const a=document.createElement('a');a.href=url;a.download=name;a.click();}
    catch{URL.revokeObjectURL(url);throw Error('DOWNLOAD_UNAVAILABLE');}
    downloads.current.set(url,setTimeout(()=>{URL.revokeObjectURL(url);downloads.current.delete(url);},10_000));
  }
  const validDocument=(()=>{try{validateDocument({title,text});return true;}catch{return false;}})();
  return <section className="luqi-info luqi-archive" aria-labelledby="archive-title">
    <p className="luqi-eyebrow">LOCAL ENCRYPTED ARCHIVE · PILOT</p>
    <h1 id="archive-title">Archive vault</h1>
    <p>Protect a text record with two encrypted downloads. Create and restore on this device, without signing in, uploading to Luqi or using paid AI.</p>
    <p className="archive-note">This pilot has not been independently security-audited or FIPS-validated. Keep your original until you have reopened the saved pair. <strong>Luqi cannot recover a lost recovery file or passphrase.</strong></p>
    <div className="archive-grid">
      <section aria-labelledby="archive-create-title"><h2 id="archive-create-title">1. Prepare a protected record</h2>
        <label>Record title<input value={title} maxLength={120} disabled={busy} autoComplete="off" onChange={e=>{setTitle(e.target.value);discardBundle();}}/></label>
        <label>Record text<textarea value={text} rows={9} maxLength={20_000} disabled={busy} autoComplete="off" spellCheck={false} onChange={e=>{setText(e.target.value);discardBundle();}}/></label>
        <p className="archive-note">Up to 24 KB including the title. Plain text only; no payments or financial transactions are performed.</p>
        <label>New recovery passphrase<input ref={pass} type="password" minLength={14} maxLength={128} autoComplete="off" disabled={busy}/></label>
        <label>Repeat recovery passphrase<input ref={repeat} type="password" minLength={14} maxLength={128} autoComplete="off" disabled={busy}/></label>
        <p className="archive-note">Choose a long, unique passphrase of at least 14 characters. Keep it separately from both files and your Luqi login password.</p>
        <button type="button" className="luqi-primary" disabled={busy||!validDocument} onClick={prepare}>Encrypt record</button>
        {bundle&&<div className="archive-downloads" aria-label="Save encrypted pair">
          <h3>2. Keep both files</h3><p>The recovery file is encrypted with your passphrase. Both files and that passphrase are required to restore.</p>
          <button type="button" className="luqi-secondary" onClick={()=>{try{download(bundle.recoveryFile,`luqi-recovery-${bundle.id}.json`);setRecoveryPrepared(true);message('Recovery download requested. Check that the file is saved before continuing.');}catch{message('Download could not start. No saved file was confirmed.',true);}}}>Download recovery file</button>
          <label className="archive-check"><input type="checkbox" checked={keptRecovery} disabled={!recoveryPrepared} onChange={e=>setKeptRecovery(e.target.checked)}/>I have saved the recovery file and kept its passphrase separately.</label>
          <button type="button" className="luqi-secondary" disabled={!recoveryPrepared||!keptRecovery} onClick={()=>{try{download(bundle.envelope,`luqi-archive-${bundle.id}.json`);message('Archive download requested. Verify both saved files below before deleting your original.');}catch{message('Download could not start. No saved file was confirmed.',true);}}}>Download encrypted archive</button>
        </div>}
      </section>
      <section aria-labelledby="archive-open-title"><h2 id="archive-open-title">3. Verify and restore</h2>
        <p>Select your saved archive and its matching recovery file. Opening a record keeps your current draft.</p>
        <label>Encrypted archive file (.json)<input ref={archivePicker} type="file" accept=".json,application/json" disabled={busy} onChange={e=>selectFile(e,'archive')}/></label>
        <label>Matching recovery file (.json)<input ref={recoveryPicker} type="file" accept=".json,application/json" disabled={busy} onChange={e=>selectFile(e,'recovery')}/></label>
        <label>Recovery unlock passphrase<input ref={unlock} type="password" minLength={14} maxLength={128} autoComplete="off" disabled={busy}/></label>
        <button type="button" className="luqi-primary" disabled={busy||!archiveFile||!recoveryFile} onClick={()=>void restore()}>Verify and unlock record</button>
        <p className="archive-note">Archive limit 50 KB; recovery file limit 16 KB. A mismatch, changed file or wrong passphrase stops restoration.</p>
        {opened&&<div className="archive-restored" aria-label="Verified restored record"><h3>{opened.title}</h3><pre>{opened.text}</pre>
          <button type="button" className="luqi-secondary" onClick={()=>{try{download(opened.title+'\n\n'+opened.text,'luqi-restored-record.txt','text/plain;charset=utf-8');message('Plain-text download requested. This restored copy is unencrypted.');}catch{message('Download could not start.',true);}}}>Download restored plain text</button>
        </div>}
      </section>
    </div>
    <p role={failed?'alert':'status'} aria-live="polite">{notice}</p>
    <button type="button" className="luqi-secondary" onClick={()=>{clearAll();message('This tab has been cleared. Your downloaded files are unchanged.');}}>Clear this tab{busy?' / cancel':''}</button>
    <details><summary>Protection and limits</summary><p>Fresh ML-KEM-1024/P-384 hybrid encryption keys, AES-256-GCM and both ML-DSA-87 and ECDSA-P384 signatures protect each new standalone record. The retained encrypted recovery file supplies the trusted verification keys and exact archive digest.</p>
      <p>The hybrid construction is a draft, and its JavaScript library has no independent audit or constant-time guarantee. This is not a production cloud migration, shared Stokvel ledger, remote key-revocation service or certification. Someone with both files and your passphrase can open the record.</p>
      <p>Records, keys and passphrases are not intentionally saved in browser storage. Clear this tab on a shared device. Downloads remain wherever you save them.</p></details>
    <section className="archive-cloud"><h2>Cloud archive unavailable</h2><p>Historical checkpoint, shared-record and cloud artifact access remains paused while account-owned storage and server key recovery are implemented. Existing files are preserved.</p>
      <Link to="/companion">Open private notes</Link> · <Link to="/quantum-lab">Explore the Quantum &amp; PQC Lab</Link>
    </section>
  </section>;
}
