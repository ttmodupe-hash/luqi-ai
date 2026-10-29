/** Fixed-publisher, read-only checking of reviewed individual public-service posts.
 * A matching reference+closing DATE only confirms that this text appears on
 * the publisher's original page. It NEVER confirms that hiring is ongoing.
 * No applicant input, arbitrary URL, secrets, AI call, job scraping corpus,
 * paid API, user identity or application upload.
 */
import {VERIFIED_GOVERNMENT_ADVERTS,type GovernmentJobNotice} from '../../src/lib/government-job-notices';
export type NoticePageState='reference-and-deadline-found'|'content-unconfirmed'|'publisher-unavailable'|'withdrawn';
export interface IndividualNoticeCheck{
 id:string;reference:string;checkedAt:string;state:NoticePageState;
 note:'text_evidence_only_not_live_availability';
}
export interface IndividualNoticeSnapshot{
 checkedAt:string;scope:'fixed_official_individual_adverts_only';checks:IndividualNoticeCheck[];
}
const MAX_DOCUMENT_BYTES=256_000;
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'] as const;
export function verifiedDateVariants(date:string):readonly string[]{
 const m=/^(20\d\d)-(\d\d)-(\d\d)$/.exec(date);
 if(!m||Number(m[2])<1||Number(m[2])>12)return[];
 const month=MONTHS[Number(m[2])-1];
 return [m[3]+month+m[1],String(Number(m[3]))+month+m[1]];
}
function normalizedText(value:string):string{
 return value.toLowerCase().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
   .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
   .replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/gi,' ')
   .replace(/[^a-z0-9]/g,'');
}
async function boundedHtml(r:Response):Promise<string|null>{
 if(!r.ok||!/^text\/html(?:;|$)/i.test(r.headers.get('content-type')||''))return null;
 const len=r.headers.get('content-length');if(len&&Number(len)>MAX_DOCUMENT_BYTES)return null;
 if(!r.body)return null;
 const reader=r.body.getReader();const parts:Uint8Array[]=[];
 let count=0;
 try{
  for(;;){
   const part=await reader.read();if(part.done)break;
   count+=part.value.byteLength;
   if(count>MAX_DOCUMENT_BYTES)return null;
   parts.push(part.value);
  }
 }finally{try{await reader.cancel()}catch{/* stream closed */}reader.releaseLock();}
 const buf=new Uint8Array(count);let offset=0;
 for(const p of parts){buf.set(p,offset);offset+=p.byteLength;}
 return new TextDecoder('utf-8').decode(buf);
}
export async function probeIndividualAdvert(job:GovernmentJobNotice,fetcher:typeof fetch=fetch,now:Date=new Date()):Promise<IndividualNoticeCheck>{
 const checkedAt=now.toISOString(),note='text_evidence_only_not_live_availability' as const;
 // A confirmed publisher erratum is never reclassified as an open advert.
 if(job.withdrawnEvidenceUrl)return{id:job.id,reference:job.reference,checkedAt,state:'withdrawn',note};
 try{
  const url=new URL(job.sourceUrl);
  if(url.protocol!=='https:'||!['www.labour.gov.za','www.cogta.gov.za'].includes(url.hostname))
    return{id:job.id,reference:job.reference,checkedAt,state:'publisher-unavailable',note};
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),4500);
  try{
   const response=await fetcher(url.toString(),{method:'GET',redirect:'error',credentials:'omit',
     cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal,
     headers:{Accept:'text/html','User-Agent':'LuqiOfficialJobEvidence/1.0'}});
   const html=await boundedHtml(response);
   if(!html)return{id:job.id,reference:job.reference,checkedAt,state:'publisher-unavailable',note};
   const text=normalizedText(html);
   const ref=normalizedText(job.reference);
   const verifiedDates=verifiedDateVariants(job.closingDate);
   const state:NoticePageState=text.includes(ref)&&verifiedDates.some(d=>text.includes(d.toLowerCase()))
     ?'reference-and-deadline-found':'content-unconfirmed';
   return{id:job.id,reference:job.reference,checkedAt,state,note};
  }finally{clearTimeout(timer);}
 }catch{return{id:job.id,reference:job.reference,checkedAt,state:'publisher-unavailable',note};}
}
export async function scanIndividualAdverts(fetcher:typeof fetch=fetch,now:Date=new Date()):Promise<IndividualNoticeSnapshot>{
 const checkedAt=now.toISOString();
 const checks=await Promise.all(VERIFIED_GOVERNMENT_ADVERTS.map(j=>probeIndividualAdvert(j,fetcher,now)));
 return{checkedAt,scope:'fixed_official_individual_adverts_only',checks};
}
const CACHE_MS=60*60*1000;
let cache:{at:number;data:IndividualNoticeSnapshot}|null=null;
let ongoing:Promise<IndividualNoticeSnapshot>|null=null;
export async function cachedIndividualAdvertScan():Promise<IndividualNoticeSnapshot>{
 const time=Date.now();if(cache&&time-cache.at<CACHE_MS)return cache.data;
 if(!ongoing)ongoing=scanIndividualAdverts().then(data=>{cache={at:Date.now(),data};return data;}).finally(()=>{ongoing=null});
 return ongoing;
}
export function resetIndividualAdvertScanForTests(){cache=null;ongoing=null;}
