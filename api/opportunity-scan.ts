/** Luqi Opportunity Watch: bounded READ-ONLY monitoring of fixed official URLs.
 * It verifies publisher page reachability, NEVER invents live individual job listings.
 * No provider keys, model inference, user profiles, indexing or outside URLs from requests.
 */
import { Hono } from 'hono';
import {cachedIndividualAdvertScan} from './services/opportunityNoticeWatcher';

export const SCOUT_TARGETS = [
 {id:'gov-jobs',url:'https://www.gov.za/government-jobs-week'},
 {id:'nyda',url:'https://www.nyda.gov.za/Opportunities.html'},
 {id:'nrf',url:'https://www.nrf.ac.za/funding/nrf-call-for-proposals-for-funding-in-2026-and-2027/'},
] as const;
export type ScoutResult = {id:string;status:'reachable'|'unavailable';checkedAt:string;publication?:string};
export type ScoutSnapshot={status:'sources_checked';checkedAt:string;scope:'publisher-pages-only';sources:ScoutResult[]};
const MAX_BYTES=192_000;
async function smallHtml(response:Response):Promise<string|null> {
 if(!response.ok)return null;
 const type=response.headers.get('content-type')??'';
 if(!/^text\/html(?:;|$)/i.test(type))return null;
 const length=Number(response.headers.get('content-length')??'0');
 if(!Number.isFinite(length)||length>MAX_BYTES)return null;
 if(!response.body)return null;
 const reader=response.body.getReader();const chunks:Uint8Array[]=[];
 let size=0;
 try {
   while(true){
     const {done,value}=await reader.read();if(done)break;
     size+=value.byteLength;
     if(size>MAX_BYTES)return null;
     chunks.push(value);
   }
 } finally {try{await reader.cancel()}catch{/* stream ended */}reader.releaseLock();}
 const out=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder('utf-8',{fatal:false}).decode(out);
}
export async function scanOfficialOpportunitySources(
 fetcher:typeof fetch=fetch,now:Date=new Date()):Promise<ScoutSnapshot>{
 const checkedAt=now.toISOString();
 const sources=await Promise.all(SCOUT_TARGETS.map(async (target):Promise<ScoutResult>=>{
   try{
     const controller=new AbortController();
     const timeout=setTimeout(()=>controller.abort(),4500);
     let response:Response;
     try {
       response=await fetcher(target.url,{method:'GET',redirect:'error',credentials:'omit',
         cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal,
         headers:{Accept:'text/html','User-Agent':'LuqiOpportunityWatch/1.0'}});
       const html=await smallHtml(response);
       if(html===null)return {id:target.id,status:'unavailable',checkedAt};
       const result:ScoutResult={id:target.id,status:'reachable',checkedAt};
       if(target.id==='gov-jobs'){
         const match=html.replace(/<[^>]{0,240}>/g,' ').replace(/\s+/g,' ')
           .match(/(?:Public Service )?Vacancy Circular (?:No\.?\s*)?(\d{1,2}) of (20\d{2})/i);
         if(match) result.publication='Public Service Vacancy Circular '+match[1]+' of '+match[2];
       }
       return result;
     }finally{clearTimeout(timeout);}
   }catch{return {id:target.id,status:'unavailable',checkedAt};}
 }));
 return {status:'sources_checked',checkedAt,scope:'publisher-pages-only',sources};
}
const CACHE_MS=6*60*60*1000;
let cache:{at:number;snapshot:ScoutSnapshot}|null=null;
let ongoing:Promise<ScoutSnapshot>|null=null;
export function clearOpportunityScoutCacheForTest(){cache=null;ongoing=null;}
export const opportunityWatch=new Hono();
opportunityWatch.get('/',async c=>{
 c.header('Cache-Control','no-store');
 c.header('X-Content-Type-Options','nosniff');
 const now=Date.now();
 if(!cache||now-cache.at>=CACHE_MS){
   if(!ongoing) ongoing=scanOfficialOpportunitySources()
     .then(snapshot=>{cache={at:Date.now(),snapshot};return snapshot})
     .finally(()=>{ongoing=null});
   const snapshot=await ongoing;
   return c.json(snapshot);
 }
 return c.json(cache.snapshot);
});
// Strictly no user-supplied URLs, names or query filters. Cached read-only checks.
opportunityWatch.get('/notices',async c=>{
 c.header('Cache-Control','no-store');
 if(Object.keys(c.req.query()).length)return c.json({code:'INVALID_INPUT'},400);
 return c.json(await cachedIndividualAdvertScan());
});
opportunityWatch.all('*',c=>c.json({code:'OPPORTUNITY_ROUTE_NOT_FOUND'},404));
