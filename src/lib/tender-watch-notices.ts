/** Owner-requested publication of the 9 November watch handoff.
 * These are advertisement-only records, never verified open/bid-ready offers.
 * Evidence: issue #390 comment 6734173189. The release recheck could not retrieve
 * either original download. Full tender books are advertised for 13 November.
 * No automatic source-date renewal, remote fetching, applicant data or spending.
 */
export interface PendingTenderWatchNotice {
 readonly id:string;
 readonly reference:string;
 readonly title:string;
 readonly issuer:string;
 readonly province:string;
 readonly location:string;
 readonly category:string;
 readonly type:'Formal tender';
 readonly publishedOn:string|null;
 readonly advertisementReviewedOn:string;
 readonly documentsAvailableOn:string;
 readonly closesAt:string;
 readonly briefingAt:string;
 readonly briefingVenue:string;
 readonly scope:string;
 readonly advertisedConditions:string;
 readonly submission:string;
 readonly documentFee:string;
 readonly officialUrl:string;
 readonly advertisementUrl:string;
 readonly nextStep:string;
}
const issuer='Dikgatlong Local Municipality';
const officialUrl='https://dikgatlong.gov.za/tenders-quotations/tenders';
export const PENDING_TENDER_WATCH_NOTICES:readonly PendingTenderWatchNotice[]=[
 {
  id:'dikgatlong-t10-2026-27',reference:'T10/2026/27',
  title:'Delportshoop Bulk Supply Scheme — Phase 1',issuer,province:'NC',
  location:'Delportshoop / Proteahof, Dikgatlong, Frances Baard, Northern Cape',
  category:'Water infrastructure',type:'Formal tender',publishedOn:'2026-11-06',
  advertisementReviewedOn:'2026-11-09',documentsAvailableOn:'2026-11-13',
  closesAt:'2026-12-18T10:00:00+02:00',briefingAt:'2026-11-23T10:00:00+02:00',
  briefingVenue:'Rolbal Hall, Diggers Street, Barkly West. Compulsory; late arrivals are not admitted.',
  scope:'Two 5-megalitre reservoirs, approximately 7.5 km of bulk-water pipeline replacement, a 1.75 km connection to Proteahof, and associated buildings and infrastructure.',
  advertisedConditions:'CIDB 8CE or higher; CSD registration; municipal-account or qualifying lease documentation; functionality evaluation. The full bid book is still required to establish all eligibility and returnables. Preference points do not guarantee awards or create unadvertised set-asides.',
  submission:'Sealed, correctly marked original to the tender box at municipal main reception, 33 Campbell Street, Barkly West. The advertisement does not permit email or fax bids. Reconfirm the full-book instructions before submitting.',
  documentFee:'Full bid book advertised as free to download from 13 November 2026; printing is at the bidder’s cost.',
  officialUrl,
  advertisementUrl:officialUrl+'?download=382:t10-2026-27-delportshoop-bulk-supply-scheme-phase-1-closing-date-closing-date-18-december-2026',
  nextStep:'Obtain the complete original bid book and addenda from 13 November, verify all conditions, and confirm attendance at the compulsory briefing. SCM enquiry contact: m.gawuzela@dikgatlong.gov.za; not a bid-submission address.',
 },
 {
  id:'dikgatlong-t01-2026-27',reference:'T01/2026/27',
  title:'Barkly West Wastewater Treatment Works upgrade',issuer,province:'NC',
  location:'Barkly West, Dikgatlong, Frances Baard, Northern Cape',
  category:'Wastewater infrastructure',type:'Formal tender',publishedOn:null,
  advertisementReviewedOn:'2026-11-09',documentsAvailableOn:'2026-11-13',
  closesAt:'2026-12-11T12:00:00+02:00',briefingAt:'2026-11-20T10:00:00+02:00',
  briefingVenue:'Rolbal Hall, Diggers Street, Barkly West. Compulsory; late arrivals are not admitted.',
  scope:'Upgrade municipal wastewater-treatment infrastructure. Detailed works and pricing schedules await the complete tender book.',
  advertisedConditions:'CIDB 8CE or higher; CSD, tax-compliance, entity-registration and municipal-account evidence, plus the advertisement’s certified-document requirements. Full-book eligibility and returnables are not yet verified. Submit private records only to the official issuer, never to this watch.',
  submission:'Sealed, correctly marked original to the municipal tender box, 33 Campbell Street, Barkly West, 8375. The advertisement does not permit email or fax bids. Reconfirm the full-book instructions before submitting.',
  documentFee:'R550 for the tender book, advertised as obtainable from municipal SCM offices from 13 November 2026. This is a document fee, not the contract value.',
  officialUrl,
  advertisementUrl:officialUrl+'?download=381:t01-2026-27-upgrade-of-barkly-west-wwtw-closing-date-11-december-2026',
  nextStep:'Confirm official tender-book availability and the published document fee with municipal SCM from 13 November. Review the full book and any addenda before the compulsory briefing. Luqi does not pay the fee or submit bids.',
 },
];
export type TenderWatchStatus='documents-pending'|'source-review-needed'|'briefing-passed'|'closed'|'unverified';
const DAY=24*60*60*1000;
function reviewedDay(value:string):number {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
 const utc=Date.parse(value+'T00:00:00Z');
 if(!Number.isFinite(utc)||new Date(utc).toISOString().slice(0,10)!==value)return NaN;
 return utc-2*60*60*1000;
}
function exactSast(value:string):number {
 if(!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:00\+02:00$/.test(value))return NaN;
 return Number.isFinite(reviewedDay(value.slice(0,10)))?Date.parse(value):NaN;
}
export function pendingTenderWatchStatus(n:PendingTenderWatchNotice,now:Date):TenderWatchStatus {
 const at=now.getTime(),closing=exactSast(n.closesAt),briefing=exactSast(n.briefingAt);
 const reviewed=reviewedDay(n.advertisementReviewedOn),documents=reviewedDay(n.documentsAvailableOn);
 if(![at,closing,briefing,reviewed,documents].every(Number.isFinite)||at<reviewed)return 'unverified';
 if(at>=closing)return 'closed';
 if(at>=briefing)return 'briefing-passed';
 // A calendar change never upgrades an advertisement into a verified tender.
 if(at>=reviewed+2*DAY||at>=documents)return 'source-review-needed';
 return 'documents-pending';
}
export function filterPendingTenderWatchNotices(opts:{now:Date;query?:string;province?:string;includeHistory?:boolean},records:readonly PendingTenderWatchNotice[]=PENDING_TENDER_WATCH_NOTICES):PendingTenderWatchNotice[] {
 const query=typeof opts.query==='string'?opts.query.trim().toLowerCase().slice(0,100):'';
 const seen=new Set<string>();
 return records.filter(n=>{
  const key=n.issuer.trim().toLowerCase()+'|'+n.reference.replace(/\s/g,'').toUpperCase();
  if(seen.has(key))return false;
  seen.add(key);
  const status=pendingTenderWatchStatus(n,opts.now);
  if(status==='unverified')return false;
  if(!opts.includeHistory&&(status==='closed'||status==='briefing-passed'))return false;
  return (!opts.province||opts.province==='all'||opts.province===n.province)&&
   (!query||[n.reference,n.title,n.issuer,n.location,n.category,n.type,n.scope].join(' ').toLowerCase().includes(query));
 }).sort((a,b)=>Date.parse(a.closesAt)-Date.parse(b.closesAt));
}
export function tenderWatchSastLabel(value:string):string {
 const parsed=exactSast(value);
 return Number.isFinite(parsed)?new Date(parsed+2*60*60*1000).toISOString().slice(0,16).replace('T',' ')+' SAST':'Time not verified';
}
