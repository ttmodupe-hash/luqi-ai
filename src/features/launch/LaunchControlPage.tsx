import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, Circle, Clock3, FileCheck2, GitBranch, KeyRound, Layers3, Link2, Loader2, Mail, Play, Plus, ShieldCheck, Square, Upload } from 'lucide-react';
import { useOptionalCustomerSession } from '../../providers/customer-session';
import { evidenceFresh, expireLaunchEvidence, invalidateLaunchTasks, launchCheckpoint, newLaunchPlan, probeLaunchHealth, probeLaunchRelease, recordLaunchReview, restoreLaunchCheckpoint, runLaunchPlan, validateLaunchPlan, type LaunchPlan, type LaunchStatus, type LaunchTask } from './launch-engine';
import { EMAIL_STANDARDS, emailPreflight, type EmailInput, type EmailPreflight } from './email-preflight';
import './launch-control.css';

const labels:Record<LaunchStatus,string>={pending:'Ready to check',running:'Checking',passed:'Checked',blocked:'Needs attention',failed:'Check failed',historical:'Historical'};
const blankMail=():EmailInput=>({domain:'',records:[],includeDomain:'',selector:'',keyType:'rsa',publicKey:'',policy:'none'});
const validCommit=(value:string)=>/^[a-f0-9]{40}$/.test(value);
type LogEntry={id:number;text:string;at:string};
function StatusIcon({status}:{status:LaunchStatus}) { return status==='passed'?<Check size={17}/>:status==='running'?<Loader2 size={17} className="launch-spin"/>:status==='historical'?<Clock3 size={17}/>:status==='failed'||status==='blocked'?<ShieldCheck size={17}/>:<Circle size={15}/>; }

export default function LaunchControlPage(){
  const customer=useOptionalCustomerSession(), identity=customer?.session?.token??'';
  const [plan,setPlan]=useState<LaunchPlan>(newLaunchPlan),[selected,setSelected]=useState('release');
  const [tab,setTab]=useState<'workflow'|'email'|'evidence'>('workflow'),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [mail,setMail]=useState<EmailInput>(blankMail),[txtValues,setTxtValues]=useState(''),[mailReport,setMailReport]=useState<EmailPreflight|null>(null);
  const [mailBusy,setMailBusy]=useState(false),[ownerAck,setOwnerAck]=useState(false),[customTitle,setCustomTitle]=useState(''),[customParent,setCustomParent]=useState('');
  const [events,setEvents]=useState<LogEntry[]>([]),[checkpointBusy,setCheckpointBusy]=useState(false);
  const pending=useRef<AbortController|null>(null), mailEpoch=useRef(0), account=useRef(identity), epoch=useRef(0), logId=useRef(0), fileInput=useRef<HTMLInputElement>(null);
  const addEvent=(text:string)=>setEvents(previous=>[{id:++logId.current,text,at:new Date().toISOString()},...previous].slice(0,40));
  const stop=()=>{pending.current?.abort();pending.current=null;epoch.current++;setBusy(false);setPlan(current=>({...current,tasks:current.tasks.map(task=>task.status==='running'?{...task,status:'pending',reason:undefined}:task)}));};
  useLayoutEffect(()=>{
    if(account.current===identity)return;account.current=identity;pending.current?.abort();epoch.current++;mailEpoch.current++;
    setPlan(newLaunchPlan());setMail(blankMail());setTxtValues('');setMailReport(null);setOwnerAck(false);setEvents([]);setBusy(false);setMailBusy(false);setCheckpointBusy(false);setSelected('release');setTab('workflow');setCustomTitle('');setCustomParent('');setNotice('Account changed. The workbench was cleared.');
  },[identity]);
  useEffect(()=>()=>{pending.current?.abort();epoch.current++;mailEpoch.current++;},[]);
  useEffect(()=>{
    const expire=()=>setPlan(current=>expireLaunchEvidence(current));
    const timer=window.setInterval(expire,30_000);window.addEventListener('focus',expire);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',expire);};
  },[]);
  const choose=(id:string)=>{setSelected(id);setOwnerAck(false);};
  const changeExpected=(value:string)=>{stop();setOwnerAck(false);setPlan(current=>({...invalidateLaunchTasks(current,['review','confirm']),expectedCommit:value.trim().toLowerCase().slice(0,40)}));};
  const changeMail=(next:EmailInput)=>{stop();mailEpoch.current++;setMailBusy(false);setMail(next);setMailReport(null);setOwnerAck(false);setPlan(current=>invalidateLaunchTasks(current,['email']));};
  async function checkMail(){
    const revision=++mailEpoch.current;setMailBusy(true);setMailReport(null);setNotice('');
    try{const result=await emailPreflight({...mail,records:txtValues.split(/\r?\n/).filter(line=>line.trim()).map(content=>({name:mail.domain,content:content.trim()}))});
      if(revision!==mailEpoch.current)return;setMailReport(result);setPlan(current=>invalidateLaunchTasks(current,['email']));addEvent('Completed local email preflight; DNS publication remains unverified.');}
    catch{if(revision===mailEpoch.current)setNotice('The email preflight could not complete. No DNS change was made.');}
    finally{if(revision===mailEpoch.current)setMailBusy(false);}
  }
  async function runChecks(fresh=true){
    pending.current?.abort();const controller=new AbortController();pending.current=controller;const run=++epoch.current;
    setNotice('');setBusy(true);if(fresh)setOwnerAck(false);
    const base=invalidateLaunchTasks(plan,fresh?plan.tasks.filter(task=>['release','health'].includes(task.kind)).map(task=>task.id):['confirm']);
    const seen=new Map(base.tasks.map(task=>[task.id,task.status]));
    addEvent(fresh?'Started live release and health checks.':'Started verification of the reviewed revision.');
    try{
      await runLaunchPlan(base,{
        release:signal=>probeLaunchRelease(signal), health:signal=>probeLaunchHealth(signal),
        email:async()=>mailReport&&mailReport.issues.length===0?{status:'passed',evidence:{source:'local-input',observedAt:new Date().toISOString(),summary:'Local record structure checked; DNS and signed mail remain unverified.'}}:{status:'blocked',reason:mailReport?'Resolve the email preflight findings.':'Complete email preflight to check the supplied record structure.'},
        confirm:signal=>validCommit(base.expectedCommit)?probeLaunchRelease(signal,base.expectedCommit):Promise.resolve({status:'blocked',reason:'Choose the exact revision reviewed by the owner.'}),
      },controller.signal,next=>{
        if(run!==epoch.current)return;setPlan(next);
        for(const task of next.tasks)if(seen.get(task.id)!==task.status){seen.set(task.id,task.status);addEvent(task.title+' · '+labels[task.status]);}
      });
    }catch{if(run===epoch.current&&!controller.signal.aborted)setNotice('The workflow could not run. Check the plan and its dependencies.');}
    finally{if(run===epoch.current){setBusy(false);pending.current=null;}}
  }
  function recordReview(task:LaunchTask){
    if(!ownerAck)return;
    try{setPlan(recordLaunchReview(plan,task.id));setOwnerAck(false);setNotice('Owner review recorded locally. Deployment was not performed by this action.');addEvent(task.title+' · owner review recorded.');}
    catch(error){setNotice(error instanceof Error?error.message:'Review could not be recorded.');}
  }
  function addTask(){
    try{let number=1;while(plan.tasks.some(task=>task.id==='manual-'+number))number++;
      const task:LaunchTask={id:'manual-'+number,title:customTitle.trim(),kind:'manual',dependsOn:customParent?[customParent]:[],status:'pending'};
      const next=validateLaunchPlan({...plan,tasks:[...plan.tasks,task]});stop();setPlan(next);choose(task.id);setCustomTitle('');addEvent('Added owner checkpoint: '+task.title);setNotice('');
    }catch{setNotice('Use a checkpoint title of 1–100 characters; each plan supports up to 24 tasks.');}
  }
  async function saveCheckpoint(){
    const run=epoch.current;setCheckpointBusy(true);setNotice('');
    try{const text=await launchCheckpoint(plan);if(run!==epoch.current)return;
      const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),anchor=document.createElement('a');
      anchor.href=url;anchor.download='luqi-launch-checkpoint.json';anchor.target='_blank';anchor.rel='noopener noreferrer';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setNotice('Checkpoint downloaded. Keep it to restore this plan; email values and public-key inputs are excluded.');addEvent('Exported checkpoint with an integrity digest.');
    }catch{setNotice('Checkpoint could not be saved. Complete the project name and any revision value first.');}
    finally{setCheckpointBusy(false);}
  }
  async function loadCheckpoint(file:File|undefined){
    if(!file)return;stop();mailEpoch.current++;setMailBusy(false);const run=epoch.current;setCheckpointBusy(true);setNotice('');
    try{if(file.size>65536)throw new Error('Checkpoint exceeds 64 KiB.');const next=await restoreLaunchCheckpoint(await file.text());if(run!==epoch.current)return;
      setPlan(next);choose(next.tasks[0].id);setMail(blankMail());setTxtValues('');setMailReport(null);setOwnerAck(false);setNotice('Plan restored. Prior evidence is historical; run current checks before recording a new review.');addEvent('Restored checkpoint; live checks and approval need renewal.');
    }catch{if(run===epoch.current)setNotice('Checkpoint rejected. Use an unchanged Luqi checkpoint with a valid task graph; nothing was restored.');}
    finally{if(run===epoch.current)setCheckpointBusy(false);if(fileInput.current)fileInput.current.value='';}
  }
  const task=plan.tasks.find(item=>item.id===selected)??plan.tasks[0];
  const release=plan.tasks.find(item=>item.kind==='release'), confirmation=plan.tasks.find(item=>item.kind==='confirm');
  const passed=plan.tasks.filter(item=>item.status==='passed').length, attention=plan.tasks.filter(item=>['blocked','failed'].includes(item.status)).length;
  const dependenciesReady=task.dependsOn.every(id=>plan.tasks.find(item=>item.id===id)?.status==='passed');
  const liveConfirmed=confirmation?.status==='passed'&&evidenceFresh(confirmation.evidence)&&confirmation.evidence?.commit===plan.expectedCommit;
  const invalidInput=!plan.name.trim()||!!plan.expectedCommit&&!validCommit(plan.expectedCommit);

  return <main className="luqi-launch-page" aria-labelledby="launch-title">
    <header className="launch-header"><div className="launch-topline"><p className="launch-eyebrow"><Layers3 size={16} aria-hidden="true"/> LUQI / TOOL 024</p><span className="launch-pill"><span/> Local workflow · live release checks</span></div>
      <div className="launch-heading-row"><div><h1 id="launch-title">Launch Control<span>.</span></h1><p>Your next release. Evidence at every step.</p></div><div className="launch-actions"><button className="launch-button" disabled={busy||checkpointBusy} onClick={()=>void saveCheckpoint()}><ArrowDownToLine size={16}/> Save checkpoint</button><button className="launch-button launch-primary" disabled={busy||invalidInput} onClick={()=>void runChecks()}><Play size={15}/> Run live checks</button></div></div>
      <div className="launch-header-meta"><span><ShieldCheck size={14}/> Owner review stays explicit</span><span><KeyRound size={14}/> No credentials requested · no paid AI</span><Link to="/service-status">Service status <ArrowUpRight size={13}/></Link></div>
    </header>
    <div className="launch-metrics"><div><GitBranch size={19}/><span>Workflow tasks<strong>{String(plan.tasks.length).padStart(2,'0')}</strong></span></div><div><CheckCheck size={19}/><span>Checked steps<strong>{String(passed).padStart(2,'0')}<small>/{plan.tasks.length}</small></strong></span></div><div className={attention?'launch-attention':''}><Clock3 size={19}/><span>Need attention<strong>{String(attention).padStart(2,'0')}</strong></span></div><div className="launch-release-metric"><Activity size={19}/><span>Reviewed revision<strong>{liveConfirmed?'Observed live':'Not confirmed'}</strong></span></div></div>
    <nav className="launch-tabs" aria-label="Launch control sections">{(['workflow','email','evidence'] as const).map(value=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{value==='workflow'?<GitBranch size={16}/>:value==='email'?<Mail size={16}/>:<FileCheck2 size={16}/>} {value==='workflow'?'Workflow':value==='email'?'Email preflight':'Evidence & resume'}</button>)}</nav>
    {busy&&<div className="launch-running" role="status"><Loader2 size={16} className="launch-spin"/> Checking registered operations. Independent branches continue.<button onClick={()=>{stop();setNotice('Checks cancelled. Late replies will not update this plan.');}}>Cancel checks <Square size={12}/></button></div>}
    {notice&&<p className="launch-notice" role="status">{notice}</p>}

    {tab==='workflow'&&<div className="launch-workspace"><section className="launch-surface launch-graph" aria-labelledby="launch-graph-title"><header><div><p className="launch-eyebrow">DEPENDENCY WORKFLOW</p><h2 id="launch-graph-title">Every step has a reason.</h2></div><span className="launch-count">{passed}<small> / {plan.tasks.length}</small></span></header><div className="launch-progress" role="progressbar" aria-label="Workflow checked steps" aria-valuemin={0} aria-valuemax={plan.tasks.length} aria-valuenow={passed}><span style={{width:passed/plan.tasks.length*100+'%'}}/></div>
      <ol className="launch-task-list">{plan.tasks.map((item,index)=><li key={item.id} className={'launch-task '+item.status+(task.id===item.id?' selected':'')}><button onClick={()=>choose(item.id)} aria-pressed={task.id===item.id} aria-label={'Inspect '+item.title}><span className="launch-task-marker"><StatusIcon status={item.status}/></span><span><small>STEP {String(index+1).padStart(2,'0')} · {item.kind==='manual'||item.kind==='review'?'OWNER CHECKPOINT':item.kind==='email'?'LOCAL PREFLIGHT':'LIVE HTTP CHECK'}</small><strong>{item.title}</strong><em>{item.dependsOn.length?'After '+item.dependsOn.map(id=>plan.tasks.find(parent=>parent.id===id)?.title).join(' + '):'Independent branch'}</em></span><span className="launch-task-state">{labels[item.status]}<ChevronRight size={14}/></span></button></li>)}</ol>
      <details className="launch-add-task"><summary><Plus size={16}/> Add an owner checkpoint</summary><div><label>Checkpoint title<input aria-label="Checkpoint title" value={customTitle} onChange={event=>setCustomTitle(event.target.value)} maxLength={100} placeholder="Confirm backup recovery evidence"/></label><label>Depends on<select aria-label="Depends on" value={customParent} onChange={event=>setCustomParent(event.target.value)}><option value="">Independent</option>{plan.tasks.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label><button className="launch-button" disabled={busy||plan.tasks.length>=24||!customTitle.trim()} onClick={addTask}>Add checkpoint <Plus size={14}/></button></div></details></section>
      <aside className="launch-inspector launch-surface" aria-label="Launch step details"><p className="launch-eyebrow">STEP IN FOCUS</p><div className={'launch-inspector-status '+task.status}><StatusIcon status={task.status}/>{labels[task.status]}</div><h2>{task.title}</h2><p>{task.reason??(task.kind==='email'?'Check the record values you supply, then verify publication with the provider.':task.kind==='manual'||task.kind==='review'?'Record your own review after examining the evidence. This action does not deploy or publish changes.':'Observe this Luqi deployment using its public endpoints. No account or provider request is sent.')}</p>
        {task.evidence&&<div className="launch-evidence-card"><span>{task.status==='historical'?'Historical evidence':task.evidence.source==='live-http'?'Live HTTP observation':task.evidence.source==='local-input'?'Local input check':'Owner-recorded review'}</span><p>{task.evidence.summary}</p>{task.evidence.commit&&<code>{task.evidence.commit}</code>}<time dateTime={task.evidence.observedAt}>{new Date(task.evidence.observedAt).toLocaleString()}</time></div>}
        {task.kind==='email'&&<button className="launch-button" onClick={()=>setTab('email')}>Open email preflight <ArrowRight size={15}/></button>}
        {(task.kind==='review'||task.kind==='manual')&&<div className="launch-owner-review"><label><input type="checkbox" checked={ownerAck} onChange={event=>setOwnerAck(event.target.checked)} disabled={busy||!dependenciesReady}/> I reviewed this step and its supporting evidence.</label><button className="launch-button launch-primary" disabled={busy||!ownerAck||!dependenciesReady||(task.kind==='review'&&!validCommit(plan.expectedCommit))} onClick={()=>recordReview(task)}>Record owner review <Check size={15}/></button></div>}
        <div className="launch-target"><label>Project name<input aria-label="Project name" value={plan.name} maxLength={80} onChange={event=>{stop();setPlan(current=>({...current,name:event.target.value}));}}/></label><label>Reviewed commit (40 characters)<input aria-label="Reviewed commit (40 characters)" value={plan.expectedCommit} spellCheck={false} autoComplete="off" maxLength={40} onChange={event=>changeExpected(event.target.value)} placeholder="Full Git commit SHA"/></label>{release?.evidence?.commit&&<button className="launch-text-button" disabled={busy||release.status!=='passed'} onClick={()=>changeExpected(release.evidence!.commit!)}>Use observed revision as review target</button>}<p>Changing the target clears its review. Observations expire after five minutes.</p></div>
        <button className="launch-button launch-primary" disabled={busy||invalidInput||plan.tasks.find(item=>item.kind==='review')?.status!=='passed'} onClick={()=>void runChecks(false)}>Verify reviewed revision <ArrowRight size={15}/></button><p className="launch-fine">A successful observation confirms the revision seen at that time. It does not prove sustained uptime, AI quality, DNS authentication or payment readiness.</p>
      </aside></div>}

    {tab==='email'&&<section className="launch-mail" aria-labelledby="launch-mail-title"><div className="launch-section-heading"><div><p className="launch-eyebrow">PUBLIC RECORD PREPARATION</p><h2 id="launch-mail-title">Email authentication, with receipts.</h2><p>Check supplied TXT values and public-key structure before provider review. Passwords and private keys do not belong here.</p></div><span className="launch-pill">Local check · no DNS writes</span></div><div className="launch-mail-grid"><div className="launch-surface launch-mail-form"><h3>01 / Sending policy</h3><label>Domain<input aria-label="Domain" value={mail.domain} onChange={event=>changeMail({...mail,domain:event.target.value})} maxLength={253} placeholder="example.org"/></label><label>Existing SPF TXT values for this domain<textarea aria-label="Existing SPF TXT values for this domain" value={txtValues} onChange={event=>{setTxtValues(event.target.value);changeMail(mail);}} maxLength={8192} rows={4} placeholder="One complete value per line, without zone-file quotes"/></label><label>Provider include domain<input aria-label="Provider include domain" value={mail.includeDomain} onChange={event=>changeMail({...mail,includeDomain:event.target.value})} maxLength={253} placeholder="Use the include domain confirmed by your provider"/></label><label>DMARC policy<select aria-label="DMARC policy" value={mail.policy} onChange={event=>changeMail({...mail,policy:event.target.value as EmailInput['policy']})}><option value="none">none · monitoring preference</option><option value="quarantine">quarantine · provider review required</option><option value="reject">reject · provider review required</option></select></label><p className="launch-fine">No reporting mailbox is invented. Provider documentation and ownership checks remain necessary.</p></div>
      <div className="launch-surface launch-mail-form"><h3>02 / Signing key</h3><div className="launch-field-row"><label>DKIM selector<input aria-label="DKIM selector" value={mail.selector} onChange={event=>changeMail({...mail,selector:event.target.value})} maxLength={63} placeholder="Provider selector"/></label><label>Key type<select aria-label="Key type" value={mail.keyType} onChange={event=>changeMail({...mail,keyType:event.target.value as EmailInput['keyType']})}><option value="rsa">RSA · 2048+ bits</option><option value="ed25519">Ed25519 · 32-byte public key</option></select></label></div><label>DKIM public key<textarea aria-label="DKIM public key" value={mail.publicKey} onChange={event=>changeMail({...mail,publicKey:event.target.value})} maxLength={8192} rows={7} placeholder="Public base64 key only" spellCheck={false}/></label><button className="launch-button launch-primary" disabled={mailBusy||busy} onClick={()=>void checkMail()}>{mailBusy?<Loader2 size={16} className="launch-spin"/>:<ShieldCheck size={16}/>} Run email preflight</button><p className="launch-fine">RSA checks accept SPKI encoding. Ed25519 checks use the raw public key. Matching private keys and signed mail are not tested.</p></div></div>
      {mailReport&&<div className="launch-mail-results" aria-label="Email preflight results"><div className="launch-mail-summary"><div><span>Minimum visible DNS-querying terms</span><strong>{mailReport.minimumDnsTerms}<small> / 10</small></strong><p>Nested lookups and DNS answers remain unverified.</p></div><div><span>SPF proposal</span><strong>{mailReport.spfAction==='held'?'Held for review':mailReport.spfAction==='no-change'?'Include already present':mailReport.spfAction==='create'?'New record':'Record update'}</strong><p>{mailReport.domain||'Check the domain input'}</p></div></div>
        {!!mailReport.issues.length&&<div className="launch-findings" role="status"><h3>Needs attention</h3><ul>{mailReport.issues.map((issue,index)=><li key={index}>{issue}</li>)}</ul></div>}
        <div className="launch-record-proposals">{[{name:mailReport.domain,type:'SPF',content:mailReport.afterSpf},...(['dkimRecord','dmarcRecord'] as const).map(key=>({name:mailReport[key]?.name,type:key==='dkimRecord'?'DKIM':'DMARC',content:mailReport[key]?.content}))].filter(item=>item.content).map(item=><div className="launch-surface" key={item.type}><span>{item.type} / TXT PROPOSAL</span><h3>{item.name}</h3><code>{item.content}</code></div>)}</div><details className="launch-mail-limits"><summary>Verification scope & unresolved dependencies</summary>{mailReport.warnings.map((warning,index)=><p key={index}>{warning}</p>)}{!!mailReport.unresolved.length&&<p>Unresolved: {mailReport.unresolved.join(', ')}</p>}</details></div>}
      <div className="launch-standard-links">{EMAIL_STANDARDS.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.name}<ArrowUpRight size={13}/></a>)}</div></section>}

    {tab==='evidence'&&<div className="launch-evidence-grid"><section className="launch-surface launch-resume"><p className="launch-eyebrow">SESSION CONTINUITY</p><h2>Keep your place.</h2><p>Download the project, dependencies and last observed step results. Restore the file to resume planning on another visit.</p><div className="launch-actions"><button className="launch-button launch-primary" disabled={busy||checkpointBusy||invalidInput} onClick={()=>void saveCheckpoint()}><ArrowDownToLine size={16}/> Download checkpoint</button><button className="launch-button" disabled={busy||checkpointBusy} onClick={()=>fileInput.current?.click()}><Upload size={16}/> Restore checkpoint</button></div><input className="launch-sr-only" type="file" accept=".json,application/json" ref={fileInput} aria-label="Restore launch checkpoint file" onChange={event=>void loadCheckpoint(event.target.files?.[0])}/><p className="launch-fine">No automatic storage or upload. Raw email values, keys, account tokens and review checkboxes are excluded. SHA-256 checks checkpoint payload integrity; imported history is not live proof or a signature.</p></section>
      <section className="launch-surface launch-event-log" aria-labelledby="launch-events-title"><header><div><p className="launch-eyebrow">OBSERVED ACTIVITY</p><h2 id="launch-events-title">Your work, recorded.</h2></div><span>{events.length} events</span></header>{events.length?<ol>{events.map(event=><li key={event.id}><span/><div><p>{event.text}</p><time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time></div></li>)}</ol>:<div className="launch-empty"><Activity size={27}/><p>No activity yet. Run a check or create a checkpoint to start the record.</p></div>}<p className="launch-fine">This tab’s activity only. External integrations do not produce entries until they actually run.</p></section></div>}
    <section className="launch-connections" aria-label="Available connections"><div><Link2 size={17}/><span><strong>This Luqi deployment</strong><small>Read-only identity & health checks</small></span><em>Available</em></div><div><KeyRound size={17}/><span><strong>Cloudflare & mail provider</strong><small>DNS writes require a connected operator integration</small></span><em>Not connected</em></div><div><ShieldCheck size={17}/><span><strong>Payments & KYC</strong><small>No account or document check is performed here</small></span><em>Not checked</em></div></section>
    <footer className="launch-footer"><p>Production changes go through the reviewed release pipeline. This workbench does not deploy, change DNS, migrate databases or activate billing. Local checkpoints and current observations help you make those decisions.</p><div><Link to="/devsecnet">DevSecNet Studio <ArrowUpRight size={14}/></Link><Link to="/archive">Archive vault <ArrowUpRight size={14}/></Link><Link to="/service-status">Service status <ArrowUpRight size={14}/></Link></div></footer>
  </main>;
}
