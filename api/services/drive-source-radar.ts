/** Operator-only fixed-source observation. No public endpoint, GPS, facts or model calls.
 * URL allowlisting is not a complete SSRF boundary: production requires public-only DNS/egress,
 * publisher access review, persistence and a separately approved scheduler.
 */
import { DRIVE_SOURCES, approvedDriveUrl, isoTime } from '../../src/features/drive/drive-intelligence.js';
export type DriveObservation={sourceId:string;checkedAt:string;digest:string|null;bytes:number;state:'baseline'|'unchanged'|'changed-review-required'|'unavailable';trust:'unreviewed-bytes-only'};
export type DriveRadarState={version:1;lastAttempt:Record<string,string>;lastGood:Record<string,DriveObservation>};
const HEX=/^[a-f0-9]{64}$/;
const source=(id:string)=>{const found=DRIVE_SOURCES.find(s=>s.id===id);if(!found)throw new Error('Unknown reviewed Drive source.');return found;};
export function cleanDriveState(input:unknown):DriveRadarState{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid radar state.');
 const x=input as DriveRadarState;
 if(x.version!==1||!x.lastAttempt||!x.lastGood||typeof x.lastAttempt!=='object'||typeof x.lastGood!=='object'||Array.isArray(x.lastAttempt)||Array.isArray(x.lastGood))throw new Error('Invalid radar state.');
 const lastAttempt:Record<string,string>={},lastGood:Record<string,DriveObservation>={};
 for(const [id,at] of Object.entries(x.lastAttempt)){source(id);isoTime(at);lastAttempt[id]=at;}
 for(const [id,o] of Object.entries(x.lastGood)){
  source(id);
  if(!o||o.sourceId!==id||typeof o.digest!=='string'||!HEX.test(o.digest)||!Number.isSafeInteger(o.bytes)||o.bytes<1||o.bytes>256000||o.trust!=='unreviewed-bytes-only'||!['baseline','unchanged','changed-review-required'].includes(o.state)||!lastAttempt[id]||isoTime(o.checkedAt)>isoTime(lastAttempt[id]))throw new Error('Invalid source observation.');
  lastGood[id]={sourceId:id,checkedAt:o.checkedAt,digest:o.digest,bytes:o.bytes,state:o.state,trust:'unreviewed-bytes-only'};
 }
 return {version:1,lastAttempt,lastGood};
}
export function planDriveChecks(state:DriveRadarState,now=new Date()):string[]{
 const x=cleanDriveState(state),at=isoTime(now.toISOString());
 for(const value of Object.values(x.lastAttempt))if(isoTime(value)>at)throw new Error('Future radar history.');
 return DRIVE_SOURCES.filter(s=>!x.lastAttempt[s.id]||at-isoTime(x.lastAttempt[s.id])>=s.cadenceHours*3600000).map(s=>s.id);
}
export async function observeDriveSource(id:string,fetcher:typeof fetch=fetch,now=new Date(),previous?:DriveObservation):Promise<DriveObservation>{
 const s=source(id),checkedAt=now.toISOString();isoTime(checkedAt);if(!approvedDriveUrl(s.url))throw new Error('Destination is not reviewed.');
 const unavailable:DriveObservation={sourceId:id,checkedAt,digest:null,bytes:0,state:'unavailable',trust:'unreviewed-bytes-only'};
 const ctrl=new AbortController();let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 const timer=setTimeout(()=>ctrl.abort(),4500);
 try{
  const r=await fetcher(s.url,{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:ctrl.signal,headers:{Accept:'text/html,text/plain,application/json','User-Agent':'LuqiDriveSourceReview/1.0'}});
  const length=r.headers.get('content-length');
  if(r.status!==200||r.redirected||(r.url&&r.url!==s.url)||!r.body||!/^(text\/html|text\/plain|application\/json)(?:;|$)/i.test(r.headers.get('content-type')||'')||(length!==null&&(!/^\d+$/.test(length)||Number(length)>256000)))return unavailable;
  reader=r.body.getReader();let bytes=0;const chunks:Uint8Array[]=[];
  for(;;){const p=await reader.read();if(p.done)break;bytes+=p.value.byteLength;if(bytes>256000)return unavailable;chunks.push(p.value);}
  if(!bytes)return unavailable;
  const data=new Uint8Array(bytes);let offset=0;for(const p of chunks){data.set(p,offset);offset+=p.byteLength;}
  const hash=await crypto.subtle.digest('SHA-256',data);const digest=[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
  let state:DriveObservation['state']='baseline';
  if(previous&&previous.sourceId===id&&typeof previous.digest==='string'&&HEX.test(previous.digest)&&previous.trust==='unreviewed-bytes-only'&&['baseline','unchanged','changed-review-required'].includes(previous.state)&&isoTime(previous.checkedAt)<=isoTime(checkedAt))state=previous.digest===digest?'unchanged':'changed-review-required';
  return {sourceId:id,checkedAt,digest,bytes,state,trust:'unreviewed-bytes-only'};
 }catch{return unavailable;}
 finally{clearTimeout(timer);ctrl.abort();if(reader){try{await reader.cancel();}catch{/* stream closed */}reader.releaseLock();}}
}
export async function runDriveRadarOnce(state:DriveRadarState,fetcher:typeof fetch=fetch,now=new Date()):Promise<{state:DriveRadarState;observations:DriveObservation[];scope:'source-bytes-not-road-conditions'}>{
 const next=cleanDriveState(state),ids=planDriveChecks(next,now),observations:DriveObservation[]=[];
 for(const id of ids){const observation=await observeDriveSource(id,fetcher,now,next.lastGood[id]);next.lastAttempt[id]=observation.checkedAt;if(observation.state!=='unavailable')next.lastGood[id]=observation;observations.push(observation);}
 return {state:next,observations,scope:'source-bytes-not-road-conditions'};
}
export type ReviewedTravelClaim={sourceId:string;kind:'fuel'|'tolls'|'road'|'weather'|'visits';corridor:string;direction:string;vehicleClass:string;publishedAt:string;observedAt:string;validFrom:string;validTo:string;reviewed:boolean;value:string};
/** Internal trusted-review records only; this function does NOT authenticate a reviewer or determine safety. */
export function selectTravelEvidence(records:readonly ReviewedTravelClaim[],context:{kind:ReviewedTravelClaim['kind'];corridor:string;direction:string;vehicleClass:string;asOf:string;knownAt:string;maxAgeMinutes:number}):{state:'available-evidence'|'conflict'|'stale'|'unavailable';claims:ReviewedTravelClaim[];safeToTravel:null}{
 const effective=isoTime(context.asOf),known=isoTime(context.knownAt);
 if(!Number.isFinite(context.maxAgeMinutes)||context.maxAgeMinutes<0||context.maxAgeMinutes>525600)throw new Error('Invalid freshness policy.');
 const matched=records.filter(r=>{
  try{const s=source(r.sourceId);return r.reviewed===true&&s.topic===r.kind&&s.corridors.includes(context.corridor as never)&&r.kind===context.kind&&r.corridor===context.corridor&&r.direction===context.direction&&r.vehicleClass===context.vehicleClass&&typeof r.value==='string'&&r.value.trim().length>0&&r.value.length<=2000&&isoTime(r.publishedAt)<=isoTime(r.observedAt)&&isoTime(r.observedAt)<=known&&isoTime(r.validFrom)<=effective&&effective<isoTime(r.validTo);}
  catch{return false;}
 });
 if(!matched.length)return {state:'unavailable',claims:[],safeToTravel:null};
 const state=new Set(matched.map(r=>r.value)).size>1?'conflict':matched.every(r=>known-isoTime(r.observedAt)>context.maxAgeMinutes*60000)?'stale':'available-evidence';
 return {state,claims:matched.map(r=>({...r})),safeToTravel:null};
}
