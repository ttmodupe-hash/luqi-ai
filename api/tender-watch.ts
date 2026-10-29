/** Restricted read-only monitor of exact reviewed tender issuers, not live bid status.
 * Never accepts a URL, applicant data, CSD login, document uploads, or payment.
 * A matching source reference and date only prove publisher text; never bid acceptance.
 */
import {Hono} from 'hono';
import {CURATED_TENDER_NOTICES,TENDER_REVIEWED_ON} from '../src/lib/tender-sources';
export const TENDER_MONITOR_TARGETS=CURATED_TENDER_NOTICES.map(n=>({
 id:n.id,url:n.officialUrl,reference:n.reference,deadlineDate:n.deadlineDate,
})) as readonly {id:string;url:string;reference:string|null;deadlineDate:string}[];
export type TenderProbeState='reference-visible'|'listing-only'|'content-unconfirmed'|'publisher-unavailable';
export interface TenderMonitorResult{id:string;state:TenderProbeState;checkedAt:string;note:'not_live_bid_availability';}
export interface TenderMonitorSnapshot{
 status:'publisher-pages-checked';reviewedOn:string;checkedAt:string;scope:'fixed_official_tender_pages';
 notices:TenderMonitorResult[];
}
const allowed=new Set(['www.dsbd.gov.za','www.ekurhuleni.gov.za','www.gcis.gov.za','www.tshwane.gov.za']);
function normalize(value:string){
 return value.toLowerCase().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]{0,1200}>/g,' ').replace(/&(?:nbsp|amp|quot);/gi,' ')
  .replace(/[^a-z0-9]/g,'');
}
async function smallHtml(r:Response):Promise<string|null>{
 if(!r.ok||!/^text\/html(?:;|$)/i.test(r.headers.get('content-type')??''))return null;
 if(Number(r.headers.get('content-length')??0)>192000)return null;
 if(!r.body)return null;
 const rd=r.body.getReader();const parts:Uint8Array[]=[];let size=0;
 try {
  for(;;){const x=await rd.read();if(x.done)break;size+=x.value.byteLength;
   if(size>192000)return null;
   parts.push(x.value);
  }
 }finally{try{await rd.cancel()}catch{/* ended */}rd.releaseLock();}
 const buf=new Uint8Array(size);let pos=0;
 for(const p of parts){buf.set(p,pos);pos+=p.length;}
 return new TextDecoder().decode(buf);
}
export async function probeTenderTarget(target:typeof TENDER_MONITOR_TARGETS[number],
 fetcher:typeof fetch=fetch,now:Date=new Date()):Promise<TenderMonitorResult>{
 const checkedAt=now.toISOString();const unavailable={id:target.id,state:'publisher-unavailable' as const,checkedAt,note:'not_live_bid_availability' as const};
 try{
  const url=new URL(target.url);
  if(url.protocol!=='https:'||!allowed.has(url.hostname))return unavailable;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
  try {
   const response=await fetcher(url.toString(),{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',
     referrerPolicy:'no-referrer',signal:controller.signal,headers:{Accept:'text/html','User-Agent':'LuqiTenderNoticeMonitor/1.0'}});
   const html=await smallHtml(response);
   if(html===null)return unavailable;
   if(!target.reference)return{id:target.id,state:'listing-only',checkedAt,note:'not_live_bid_availability'};
   const text=normalize(html);
   const hasReference=text.includes(normalize(target.reference));
   const [year,month,day]=target.deadlineDate.split('-');
   const name=['January','February','March','April','May','June','July','August','September','October','November','December'][Number(month)-1];
   const hasDate=!!name&&(text.includes(normalize(day+' '+name+' '+year))||text.includes(normalize(Number(day)+' '+name+' '+year))
     ||text.includes(normalize(year+'-'+month+'-'+day)));
   const state:TenderProbeState=hasReference&&hasDate?'reference-visible':'content-unconfirmed';
   return{id:target.id,state,checkedAt,note:'not_live_bid_availability'};
  }finally{clearTimeout(timer);}
 }catch{return unavailable;}
}
export async function scanCuratedTenders(fetcher:typeof fetch=fetch,now:Date=new Date()):Promise<TenderMonitorSnapshot>{
 const notices=await Promise.all(TENDER_MONITOR_TARGETS.map(n=>probeTenderTarget(n,fetcher,now)));
 return{status:'publisher-pages-checked',scope:'fixed_official_tender_pages',
  reviewedOn:TENDER_REVIEWED_ON,checkedAt:now.toISOString(),notices};
}
let cache:{at:number;value:TenderMonitorSnapshot}|null=null;let inflight:Promise<TenderMonitorSnapshot>|null=null;
export function clearTenderMonitorForTests(){cache=null;inflight=null;}
export const tenderWatch=new Hono();
tenderWatch.get('/',async c=>{
 c.header('Cache-Control','no-store');
 if(Object.keys(c.req.query()).length)return c.json({code:'INVALID_INPUT'},400);
 if(!cache||Date.now()-cache.at>=6*60*60*1000){
  if(!inflight)inflight=scanCuratedTenders().then(value=>{cache={at:Date.now(),value};return value}).finally(()=>{inflight=null;});
  return c.json(await inflight);
 }
 return c.json(cache.value);
});
tenderWatch.all('*',c=>c.json({code:'TENDER_ROUTE_NOT_FOUND'},404));
