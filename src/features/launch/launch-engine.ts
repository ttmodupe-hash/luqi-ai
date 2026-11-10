import { z } from 'zod';

export const LAUNCH_KINDS = ['release','health','email','review','confirm','manual'] as const;
export type LaunchKind = typeof LAUNCH_KINDS[number];
export type LaunchStatus = 'pending'|'running'|'passed'|'blocked'|'failed'|'historical';
export interface LaunchEvidence { summary:string; source:'live-http'|'local-input'|'owner-recorded'; observedAt:string; commit?:string }
export interface LaunchTask { id:string; title:string; kind:LaunchKind; dependsOn:string[]; status:LaunchStatus; evidence?:LaunchEvidence; reason?:string }
export interface LaunchPlan { name:string; expectedCommit:string; tasks:LaunchTask[] }
export type LaunchResult = { status:'passed'; evidence:LaunchEvidence } | { status:'blocked'|'failed'; reason:string };
export type LaunchAdapters = Partial<Record<LaunchKind,(signal:AbortSignal)=>Promise<LaunchResult>>>;
export const EVIDENCE_TTL_MS = 5 * 60_000;
const sha = /^[a-f0-9]{40}$/;
function publicLabel(value:string):boolean {
  const normalized=value.normalize('NFKC');
  return !/(?:PRIVATE KEY|password\s*[:=]|api[-_ ]?key\s*[:=]|\bsk-[a-z0-9]{12,})/i.test(normalized)
    && !/(?:^|\D)(?:\d{13}|\d{15})(?=\D|$)/.test(normalized.replace(/[\s-]/g,''));
}
const label=z.string().trim().min(1).max(100).refine(publicLabel,'Use a public project label without private identifiers or credentials.');
const identifier = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);
const evidenceSchema = z.object({ summary:z.string().min(1).max(240), source:z.enum(['live-http','local-input','owner-recorded']),
  observedAt:z.iso.datetime(), commit:z.string().regex(sha).optional() }).strict();
const taskSchema = z.object({ id:identifier,title:label,kind:z.enum(LAUNCH_KINDS),dependsOn:z.array(identifier).max(12),
  status:z.enum(['pending','running','passed','blocked','failed','historical']),evidence:evidenceSchema.optional(),reason:z.string().max(240).optional() }).strict();
const planSchema = z.object({name:label.refine(value=>value.length<=80),expectedCommit:z.string().refine(value=>!value||sha.test(value)),tasks:z.array(taskSchema).min(1).max(24)}).strict();

export function validateLaunchPlan(value:unknown):LaunchPlan {
  const plan = planSchema.parse(value), ids = new Set(plan.tasks.map(task=>task.id));
  if (ids.size !== plan.tasks.length) throw new Error('Task IDs must be unique.');
  const system=plan.tasks.filter(task=>task.kind!=='manual').map(task=>task.kind);
  if(new Set(system).size!==system.length)throw new Error('Each system check may appear only once.');
  const visiting=new Set<string>(), complete=new Set<string>();
  const visit=(id:string)=>{
    if(visiting.has(id)) throw new Error('Task dependencies contain a cycle.');
    if(complete.has(id))return;
    const task=plan.tasks.find(item=>item.id===id)!;
    if(new Set(task.dependsOn).size!==task.dependsOn.length)throw new Error('Duplicate dependency.');
    visiting.add(id);
    for(const parent of task.dependsOn){if(!ids.has(parent))throw new Error('Unknown task dependency.');visit(parent);}
    visiting.delete(id);complete.add(id);
  };
  for(const task of plan.tasks)visit(task.id);
  for(const task of plan.tasks){
    if(task.kind!=='manual'&&task.id!==task.kind)throw new Error('System check IDs must match their registered roles.');
    if(task.kind==='manual'&&!task.id.startsWith('manual-'))throw new Error('Owner checkpoint IDs use the manual- prefix.');
    const parents=task.dependsOn.map(id=>plan.tasks.find(item=>item.id===id)!.kind);
    if(task.kind==='review'&&(!parents.includes('release')||!parents.includes('health')))throw new Error('Release review requires identity and health evidence.');
    if(task.kind==='confirm'&&!parents.includes('review'))throw new Error('Live confirmation requires owner review.');
  }
  return plan;
}

export function newLaunchPlan():LaunchPlan {
  const tasks:LaunchTask[] = [
    {id:'release',title:'Identify the deployed revision',kind:'release',dependsOn:[],status:'pending'},
    {id:'health',title:'Check application health',kind:'health',dependsOn:[],status:'pending'},
    {id:'email',title:'Prepare email record preflight',kind:'email',dependsOn:[],status:'pending'},
    {id:'review',title:'Record owner review',kind:'review',dependsOn:['release','health'],status:'pending'},
    {id:'confirm',title:'Verify the reviewed revision is live',kind:'confirm',dependsOn:['review'],status:'pending'},
  ];
  return {name:'Luqi web release',expectedCommit:'',tasks};
}

/** Invalidate every dependent review when an input or its evidence changes. */
export function invalidateLaunchTasks(plan:LaunchPlan, changed:readonly string[]):LaunchPlan {
  const affected=new Set(changed);let more=true;
  while(more){more=false;for(const task of plan.tasks)if(!affected.has(task.id)&&task.dependsOn.some(id=>affected.has(id))){affected.add(task.id);more=true;}}
  return {...plan,tasks:plan.tasks.map(task=>affected.has(task.id)?{...task,status:'pending',evidence:undefined,reason:undefined}:task)};
}

export function evidenceFresh(evidence:LaunchEvidence|undefined, now=Date.now()):boolean {
  if(!evidence)return false;const age=now-Date.parse(evidence.observedAt);return Number.isFinite(age)&&age>=0&&age<=EVIDENCE_TTL_MS;
}

export function expireLaunchEvidence(plan:LaunchPlan, now=Date.now()):LaunchPlan {
  return invalidateLaunchTasks(plan,plan.tasks.filter(task=>task.status==='passed'&&!evidenceFresh(task.evidence,now)).map(task=>task.id));
}

export function recordLaunchReview(plan:LaunchPlan, id:string, now=new Date()):LaunchPlan {
  const current=expireLaunchEvidence(validateLaunchPlan(plan),now.getTime());
  const task=current.tasks.find(item=>item.id===id);
  if(!task||!['review','manual'].includes(task.kind)||!task.dependsOn.every(parent=>current.tasks.find(item=>item.id===parent)?.status==='passed'))throw new Error('Complete the dependencies before recording review.');
  if(task.kind==='review'&&!sha.test(current.expectedCommit))throw new Error('Choose the exact revision you reviewed first.');
  const next=invalidateLaunchTasks(current,[id]);
  return {...next,tasks:next.tasks.map(item=>item.id===id?{...item,status:'passed',evidence:{source:'owner-recorded',observedAt:now.toISOString(),summary:'Owner recorded review in this workbench.',...(task.kind==='review'?{commit:current.expectedCommit}:{})}}:item)};
}

/** Execute only registered read/local adapters. Independent branches continue. */
export async function runLaunchPlan(plan:LaunchPlan, adapters:LaunchAdapters, signal:AbortSignal, onUpdate:(plan:LaunchPlan)=>void):Promise<LaunchPlan> {
  let current=expireLaunchEvidence(validateLaunchPlan(plan));
  current={...current,tasks:current.tasks.map(task=>task.status==='passed'?task:{...task,status:'pending',reason:undefined,evidence:undefined})};
  const emit=()=>{if(!signal.aborted)onUpdate(structuredClone(current));};emit();
  while(!signal.aborted){
    const ready=current.tasks.filter(task=>task.status==='pending'&&task.dependsOn.every(id=>current.tasks.find(parent=>parent.id===id)?.status==='passed')).slice(0,2);
    if(!ready.length)break;
    await Promise.all(ready.map(async task=>{
      const replace=(result:Partial<LaunchTask>)=>{current={...current,tasks:current.tasks.map(item=>item.id===task.id?{...item,...result}:item)};emit();};
      if(task.kind==='review'||task.kind==='manual'){replace({status:'blocked',reason:'Owner review is required.'});return;}
      if(task.kind==='confirm'){
        const review=current.tasks.find(item=>item.kind==='review');
        if(!sha.test(current.expectedCommit)||review?.evidence?.source!=='owner-recorded'||review.evidence.commit!==current.expectedCommit){replace({status:'blocked',reason:'Record owner review of the exact target revision first.'});return;}
      }
      const adapter=adapters[task.kind];
      if(!adapter){replace({status:'blocked',reason:'This operation has no connected adapter.'});return;}
      replace({status:'running'});
      try {
        const result=await adapter(signal);
        if(signal.aborted)return;
        if(result.status==='passed'){
          const evidence=evidenceSchema.parse(result.evidence);
          if(!evidenceFresh(evidence))throw new Error('Stale evidence');
          replace({status:'passed',evidence,reason:undefined});
        }else replace({status:result.status,reason:result.reason.slice(0,240),evidence:undefined});
      }catch{if(!signal.aborted)replace({status:'failed',reason:'The check did not return valid, current evidence.',evidence:undefined});}
    }));
  }
  if(!signal.aborted){current={...current,tasks:current.tasks.map(task=>task.status==='pending'?{...task,status:'blocked',reason:'Waiting for a dependency.'}:task)};emit();}
  return current;
}

async function readLive(path:'/v1/release'|'/v1/health', signal:AbortSignal, request:typeof fetch):Promise<Record<string,unknown>> {
  const controller=new AbortController();const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted)controller.abort();
  const deadline=setTimeout(abort,5000);
  try{
    const response=await request(path,{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:controller.signal});
    if(response.status!==200||response.redirected||response.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json'||response.headers.get('Cache-Control')!=='no-store')throw new Error('Unavailable');
    if(!response.body)throw new Error('Empty');const reader=response.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
    try{for(;;){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>4096)throw new Error('Oversized');chunks.push(next.value);}}
    finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
    const value=JSON.parse(new TextDecoder().decode(buffer));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid');return value;
  }finally{clearTimeout(deadline);signal.removeEventListener('abort',abort);}
}

export async function probeLaunchRelease(signal:AbortSignal, expectedCommit='', request:typeof fetch=fetch):Promise<LaunchResult> {
  if(expectedCommit&&!sha.test(expectedCommit))return {status:'blocked',reason:'Enter a full 40-character reviewed commit.'};
  const value=await readLive('/v1/release',signal,request);
  if(Object.keys(value).sort().join(',')!=='commit,format'||value.format!=='luqi.release.v1'||typeof value.commit!=='string'||!sha.test(value.commit))throw new Error('Invalid release identity');
  if(expectedCommit&&value.commit!==expectedCommit)return {status:'failed',reason:'The observed deployment does not match the reviewed revision.'};
  return {status:'passed',evidence:{source:'live-http',observedAt:new Date().toISOString(),commit:value.commit,summary:expectedCommit?'The reviewed revision was observed live.':'The server returned its deployed revision.'}};
}

export async function probeLaunchHealth(signal:AbortSignal, request:typeof fetch=fetch):Promise<LaunchResult> {
  const value=await readLive('/v1/health',signal,request);
  return value.status==='healthy'?{status:'passed',evidence:{source:'live-http',observedAt:new Date().toISOString(),summary:'The application health endpoint reported healthy.'}}:{status:'failed',reason:'This check did not confirm application health.'};
}

const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
export async function launchCheckpoint(plan:LaunchPlan):Promise<string> {
  const payload={format:'luqi.launch-checkpoint.v1' as const,savedAt:new Date().toISOString(),plan:validateLaunchPlan(plan)};
  const sha256=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))));
  return JSON.stringify({...payload,sha256},null,2);
}

export async function restoreLaunchCheckpoint(text:string):Promise<LaunchPlan> {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>65536)throw new Error('Checkpoint exceeds 64 KiB.');
  const parsed=z.object({format:z.literal('luqi.launch-checkpoint.v1'),savedAt:z.iso.datetime(),plan:planSchema,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(JSON.parse(text));
  const {sha256,...payload}=parsed;
  const observed=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))));
  if(observed!==sha256)throw new Error('Checkpoint integrity check failed.');
  const plan=validateLaunchPlan(parsed.plan);
  // A matching digest checks payload integrity, never live state or approval.
  return {...plan,tasks:plan.tasks.map(task=>({...task,status:task.evidence?'historical':'pending',reason:task.evidence?'Restored historical evidence; run current checks again.':undefined}))};
}
