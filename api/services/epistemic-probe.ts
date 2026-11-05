/** One-shot fixed-source fingerprinting. No LLM, extracted facts, credentials or automatic promotions.
 * Exact destinations/no redirects narrow the surface; deployment still needs public-only DNS/egress controls.
 */
import { approvedSource, sourceById, SOURCES, sha256, utc, digestFormat } from './epistemic-policy.js';
export type Observation = {sourceId:string;checkedAt:string;contentDigest:string|null;byteCount:number;
  state:'baseline-observed'|'bytes-unchanged'|'bytes-changed-review-required'|'unavailable';
  trust:'unreviewed-source-observation';reason:'none'|'fetch_failed'|'response_rejected'|'body_too_large';};
const MAX_BYTES=256000;
function validPrevious(value:Observation|undefined,id:string,now:string):boolean {
  if(!value || value.sourceId!==id || !digestFormat(value.contentDigest))return false;
  try{return utc(value.checkedAt)<=utc(now) && ['baseline-observed','bytes-unchanged','bytes-changed-review-required'].includes(value.state) && value.trust==='unreviewed-source-observation';}catch{return false;}
}
export async function probeSource(sourceId:string,previous?:Observation,fetcher:typeof fetch=fetch,now=new Date()):Promise<Observation> {
  const source=sourceById(sourceId),checkedAt=now.toISOString();utc(checkedAt);
  if(!approvedSource(source.url))throw new Error('Registry URL rejected');
  const base:Observation={sourceId,checkedAt,contentDigest:null,byteCount:0,state:'unavailable',trust:'unreviewed-source-observation',reason:'fetch_failed'};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
  let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
  try {
    const r=await fetcher(source.url,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal,
      headers:{Accept:'text/html,text/plain,application/json','User-Agent':'LuqiReviewedSourceRadar/0.1'}});
    if(r.status!==200 || r.redirected || (r.url && r.url!==source.url) ||
      !/^(text\/html|text\/plain|application\/json)(?:;|$)/i.test(r.headers.get('content-type')||'') || !r.body)return {...base,reason:'response_rejected'};
    const length=r.headers.get('content-length');
    if(length!==null && (!/^\d+$/.test(length)||!Number.isSafeInteger(Number(length))||Number(length)>MAX_BYTES))return {...base,reason:'body_too_large'};
    reader=r.body.getReader();const parts:Uint8Array[]=[];let count=0;
    for(;;){const p=await reader.read();if(p.done)break;count+=p.value.byteLength;if(count>MAX_BYTES)return {...base,reason:'body_too_large'};parts.push(p.value);}
    if(!count)return {...base,reason:'response_rejected'};
    const bytes=new Uint8Array(count);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
    // Hash exact bytes. No page content is returned, executed, indexed, or trusted as instructions.
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    const contentDigest=[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
    const state=validPrevious(previous,sourceId,checkedAt)
      ? previous!.contentDigest===contentDigest?'bytes-unchanged':'bytes-changed-review-required' : 'baseline-observed';
    return {...base,contentDigest,byteCount:count,state,reason:'none'};
  }catch{return base;}
  finally {clearTimeout(timer);controller.abort();if(reader){try{await reader.cancel();}catch{/* closed */}reader.releaseLock();}}
}
export type RadarState = {version:1;lastAttempt:Record<string,string>;lastSuccess:Record<string,Observation>};
/** State is operator-controlled local metadata, not end-user input. Fail closed on malformed history. */
export function validateRadarState(input:unknown):RadarState {
  if(!input || typeof input!=='object')throw new Error('Invalid radar state');
  const s=input as RadarState;if(s.version!==1||!s.lastAttempt||!s.lastSuccess||typeof s.lastAttempt!=='object'||typeof s.lastSuccess!=='object'||Array.isArray(s.lastAttempt)||Array.isArray(s.lastSuccess))throw new Error('Invalid radar state');
  const lastAttempt:Record<string,string>={},lastSuccess:Record<string,Observation>={};
  for(const [id,date] of Object.entries(s.lastAttempt)){sourceById(id);utc(date);lastAttempt[id]=date;}
  for(const [id,observation] of Object.entries(s.lastSuccess)){
    sourceById(id);
    if(!validPrevious(observation,id,observation.checkedAt) || !Number.isSafeInteger(observation.byteCount) || observation.byteCount<=0 || observation.byteCount>MAX_BYTES || observation.reason!=='none')throw new Error('Invalid success observation');
    if(!lastAttempt[id]||utc(observation.checkedAt)>utc(lastAttempt[id]))throw new Error('Inconsistent radar history');
    lastSuccess[id]={...observation};
  }
  return {version:1,lastAttempt,lastSuccess};
}
export function dueSources(state:RadarState,now:string):string[] {
  const at=utc(now);validateRadarState(state);
  return SOURCES.filter(s=>{
    const attempted=state.lastAttempt[s.id];
    if(attempted && utc(attempted)>at)throw new Error('Future radar history');
    // At most one attempt per source per configured cadence, including failures. A 6-hour wake-up does not fetch every source.
    return !attempted || at-utc(attempted)>=s.cadenceHours*3600000;
  }).map(s=>s.id);
}
export async function runRadarOnce(state:RadarState,fetcher:typeof fetch=fetch,now=new Date()):Promise<{state:RadarState;observations:Observation[];reportDigest:string}> {
  const copy=validateRadarState(state),checkedAt=now.toISOString(),observations:Observation[]=[];
  for(const id of dueSources(copy,checkedAt)) {
    const observation=await probeSource(id,copy.lastSuccess[id],fetcher,now);
    copy.lastAttempt[id]=checkedAt;observations.push(observation);
    if(observation.state!=='unavailable')copy.lastSuccess[id]=observation;
  }
  return {state:copy,observations,reportDigest:await sha256(JSON.stringify(['luqi-source-observations-v1',observations]))};
}
