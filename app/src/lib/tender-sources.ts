/** Luqi South African tender discovery — curated official primary sources.
 * A notice published on an issuer's website is not proof that a bid remains
 * open. No paid scraping, customer profiles, unreviewed eligibility or tender
 * application on behalf of any user.
 */
import type {ProvinceCode} from './opportunity-sources';
export const TENDER_REVIEWED_ON='2026-10-29';
export const TENDER_RECHECK_AFTER='2026-11-02';
export type TenderMethod='physical'|'portal'|'email'|'confirm-original';
export interface TenderSource{
 id:string;name:string;url:string;description:string;
 scope:'live-discovery'|'bid-forms'|'supplier-setup'|'procurement-guide';
}
export const TENDER_OFFICIAL_SOURCES:readonly TenderSource[]=[
 {id:'etenders',name:'National Treasury eTenders — currently advertised',url:'https://www.etenders.gov.za/Home/Opportunities',
   description:'Search currently advertised tenders by province, buyer, category, number and eSubmission option. Check each tender’s documents, status, errata and deadline.',scope:'live-discovery'},
 {id:'gov-tenders',name:'South African Government tender bulletin',url:'https://www.gov.za/tenders',
   description:'Official government tender bulletin and link to eTenders; not an individual live bid.',scope:'live-discovery'},
 {id:'tshwane',name:'City of Tshwane tender notices',url:'https://www.tshwane.gov.za/?p=104421',
   description:'Municipal tenders, specialised conditions, local briefing and closing instructions.',scope:'live-discovery'},
 {id:'ekurhuleni',name:'City of Ekurhuleni tenders',url:'https://www.ekurhuleni.gov.za/tenders/',
   description:'Official municipal bid numbers, download links, briefing requirements and bid box details.',scope:'live-discovery'},
 {id:'gcis',name:'GCIS advertised bids and RFQs',url:'https://www.gcis.gov.za/content/latest-tenders',
   description:'Official bids and supporting specifications; do not confuse cancelled and previously closed notices with active bids.',scope:'live-discovery'},
 {id:'dsbd',name:'Small Business Development tenders',url:'https://www.dsbd.gov.za/tenders/',
   description:'Small-business department RFQs, original specifications and dated response instructions.',scope:'live-discovery'},
 {id:'csd',name:'National Treasury Central Supplier Database',url:'https://www.csd.gov.za/',
   description:'Supplier self-registration, not a tender application. Never share supplier portal passwords or one-time codes with Luqi.',scope:'supplier-setup'},
 {id:'sbd',name:'National Treasury official SBD and MBD forms',url:'https://ocpo.treasury.gov.za/Buyers_Area/Standard-Bidding-Forms/',
   description:'Download the actual required SBD/MBD and pricing files; Luqi’s draft worksheet is not an official substitute.',scope:'bid-forms'},
 {id:'etender-submission',name:'National Treasury eTender submission instructions',url:'https://www.etenders.gov.za/Home/',
   description:'Use eSubmission only when the individual bid permits it; other bidders may require sealed hand-delivery or a specified email.',scope:'procurement-guide'},
];
export interface TenderNotice{
 id:string;title:string;issuer:string;province:ProvinceCode|null;
 reference:string|null;publishedOn:string;deadlineDate:string;
 deadlineTimeSast:string;officialUrl:string;method:TenderMethod;
 briefingDate:string|null;briefingMandatory:boolean;
 category:string;details:string;specialCondition:string|null;
 sourceReviewedOn:string; statusNote:string;
}
export const CURATED_TENDER_NOTICES:readonly TenderNotice[]=[
 {id:'dsbd-msme-market-access',title:'Study on enhancing MSME access to regional and continental markets',
  issuer:'Department of Small Business Development',province:'GP',reference:null,publishedOn:'2026-10-23',
  deadlineDate:'2026-11-02',deadlineTimeSast:'11:00',officialUrl:'https://www.dsbd.gov.za/tenders/',
  method:'confirm-original',briefingDate:null,briefingMandatory:false,category:'Professional research / SME',
  details:'The DSBD tender page links to the RFQ Market Access Study specification and annexures. The listing does not show a reference number; retrieve the actual RFQ before preparing a final response.',
  specialCondition:'Confirm the required format and submission address in the linked RFQ; the website displays a physical bid box for hard-copy tenders but individual RFQs may differ.',
  sourceReviewedOn:TENDER_REVIEWED_ON,statusNote:'Source listing only: exact RFQ document and reference must be checked before bidding.'},
 {id:'dsbd-localisation-evaluation',title:'Implementation evaluation of MSME-focused localisation policy',
  issuer:'Department of Small Business Development',province:'GP',reference:null,publishedOn:'2026-10-21',
  deadlineDate:'2026-11-02',deadlineTimeSast:'11:00',officialUrl:'https://www.dsbd.gov.za/tenders/',
  method:'confirm-original',briefingDate:null,briefingMandatory:false,category:'Professional research / SME',
  details:'The department links the MSME localisation policy RFQ documents. Tender reference is not provided on the public index.',
  specialCondition:'Read the actual terms of reference and confirm the mandatory response documents, official delivery channel and closing time.',
  sourceReviewedOn:TENDER_REVIEWED_ON,statusNote:'Source listing only: original RFQ and required forms must be checked.'},
 {id:'ekurhuleni-ps-f-02',title:'Lead bond arranger and debt-sponsor services for the DMTN programme',
  issuer:'City of Ekurhuleni',province:'GP',reference:'PS-F 02-2027',publishedOn:'2026-10-01',
  deadlineDate:'2026-11-05',deadlineTimeSast:'10:00',
  officialUrl:'https://www.ekurhuleni.gov.za/business/tenders/ps-f-02-2027/',
  method:'physical',briefingDate:'2026-10-14',briefingMandatory:false,category:'Financial services',
  details:'Appointment of lead arranger, debt sponsor, settlement, calculating and paying agent.',
  specialCondition:'The official advert names Golden Heights Building, 141 Victoria Street, Germiston as the physical sealed-envelope bid box. A briefing was listed on 14 October; confirm whether attendance was mandatory.',
  sourceReviewedOn:TENDER_REVIEWED_ON,statusNote:'Tender page currently published; check addenda, qualification and original bidding documents.'},
 {id:'gcis-sasl-012',title:'South African Sign Language interpreting and voice-over services (600 hours)',
  issuer:'Government Communication and Information System',province:'GP',reference:'RFQ 012 2026/2027',publishedOn:'2026-10-29',
  deadlineDate:'2026-11-06',deadlineTimeSast:'11:00',
  officialUrl:'https://www.gcis.gov.za/content/latest-tenders',
  method:'confirm-original',briefingDate:'2026-10-30',briefingMandatory:false,category:'Language / accessibility services',
  details:'Official GCIS RFQ for South African Sign Language interpretation and voice-over, with downloadable specifications and an addendum.',
  specialCondition:'Noncompulsory briefing listed for 30 October 2026. Download the specification to verify exact submission method and attachments.',
  sourceReviewedOn:TENDER_REVIEWED_ON,statusNote:'Official GCIS listing with dated RFQ; not an eligibility or acceptance guarantee.'},
 {id:'tshwane-gpm04',title:'Electrical maintenance, repairs and compliance certificates for city facilities',
  issuer:'City of Tshwane',province:'GP',reference:'GPM 04-2026/27',publishedOn:'2026-10-29',
  deadlineDate:'2026-11-06',deadlineTimeSast:'10:00',
  officialUrl:'https://www.tshwane.gov.za/?p=104421',method:'confirm-original',
  briefingDate:'2026-10-12',briefingMandatory:true,category:'Construction / electrical services',
  details:'City of Tshwane three-year as-needed electrical services and compliance certificates.',
  specialCondition:'Official notice states CIDB 3EB or higher and a compulsory briefing on 12 October 2026, which has passed. Do not assume bidders who missed the briefing remain eligible.',
  sourceReviewedOn:TENDER_REVIEWED_ON,statusNote:'Past compulsory briefing: do not treat as an actionable opportunity without explicit procuring-entity confirmation.'},
 {id:'tshwane-hd01',title:'Municipal laundry services over a three-year period',
  issuer:'City of Tshwane',province:'GP',reference:'HD 01-2026/27',publishedOn:'2026-10-29',
  deadlineDate:'2026-11-09',deadlineTimeSast:'10:00',
  officialUrl:'https://www.tshwane.gov.za/?p=104421',method:'confirm-original',
  briefingDate:null,briefingMandatory:false,category:'Cleaning / laundry services',
  details:'Laundry services for the municipal health, human capital management and emergency services departments.',
  specialCondition:'The official notice marks the briefing condition as not applicable. Read the exact submission procedure rather than assuming all municipal notices use the same portal.',
  sourceReviewedOn:TENDER_REVIEWED_ON,statusNote:'Published tender table. Confirm original bid attachments and submission method.'},
 {id:'ekurhuleni-ps-redp17',title:'Contractor-development mentorship, coordination and skills services',
  issuer:'City of Ekurhuleni',province:'GP',reference:'PS-REDP 17-2026',publishedOn:'2026-10-01',
  deadlineDate:'2026-11-24',deadlineTimeSast:'10:00',
  officialUrl:'https://www.ekurhuleni.gov.za/business/tenders/ps-redp-17-2026/',
  method:'physical',briefingDate:'2026-10-13',briefingMandatory:false,category:'Training / consulting',
  details:'Programme coordination, mentorship and development capacity for the Ekurhuleni Contractor Development Programme.',
  specialCondition:'Original issuer page lists sealed physical submissions at Golden Heights Building, Germiston, and an information session on 13 October; confirm its attendance requirements.',
  sourceReviewedOn:TENDER_REVIEWED_ON,statusNote:'Download original bid documents and check amendments before submitting.'},
 {id:'ekurhuleni-aws08',title:'Pressure management, leak detection and remedial water works',
  issuer:'City of Ekurhuleni',province:'GP',reference:'A-WS 08-2026',publishedOn:'2026-10-09',
  deadlineDate:'2026-11-30',deadlineTimeSast:'10:00',
  officialUrl:'https://www.ekurhuleni.gov.za/business/tenders/a-ws-08-2026/',
  method:'physical',briefingDate:'2026-10-21',briefingMandatory:false,category:'Construction / water services',
  details:'As-needed appointment of contractors for pressure management, leakage detection, valve replacement and remedial works until June 2029.',
  specialCondition:'Original advert specifies a sealed physical tender at Golden Heights Building, Germiston. Check CIDB, briefing attendance, pricing schedules and the latest issuer addenda.',
  sourceReviewedOn:TENDER_REVIEWED_ON,statusNote:'Published tender; not proof that an applicant meets required qualifications.'},
];
export type TenderStatus='past-deadline'|'mandatory-briefing-review'|'source-review-needed';
export function tenderStatus(notice:TenderNotice,at:Date):TenderStatus{
 const end=Date.parse(notice.deadlineDate+'T'+notice.deadlineTimeSast+':59+02:00');
 if(!Number.isFinite(at.getTime())||!Number.isFinite(end))return 'source-review-needed';
 if(at.getTime()>end)return 'past-deadline';
 if(notice.briefingMandatory&&notice.briefingDate&&at.getTime()>Date.parse(notice.briefingDate+'T23:59:59+02:00'))
   return 'mandatory-briefing-review';
 return 'source-review-needed';
}
export function filterTenders(opts:{
 province:ProvinceCode|null;query:string;includeHistory:boolean;now:Date;
}):TenderNotice[]{
 const q=typeof opts.query==='string'?opts.query.trim().toLowerCase().slice(0,100):'';
 return CURATED_TENDER_NOTICES.filter(n=>
 (!opts.province||!n.province||n.province===opts.province)
 &&(opts.includeHistory||tenderStatus(n,opts.now)==='source-review-needed')
 &&(!q||[n.title,n.issuer,n.reference||'',n.category,n.details].join(' ').toLowerCase().includes(q))
 ).sort((a,b)=>a.deadlineDate.localeCompare(b.deadlineDate)||a.deadlineTimeSast.localeCompare(b.deadlineTimeSast));
}
export function tenderReviewFresh(notice:TenderNotice,at:Date):boolean{
 const reviewed=Date.parse(notice.sourceReviewedOn+'T23:59:59+02:00');
 return Number.isFinite(at.getTime())&&at.getTime()<=reviewed+48*60*60*1000;
}
export function detectTenderIntent(value:unknown):boolean{
 if(typeof value!=='string'||!value.trim()||value.length>500)return false;
 return /\b(tenders?|rfqs?|rfps?|procurement opportunities|government procurement|bid(?:ding)? documents?|sbd\s*[1346](?:\.1)?|central supplier database|csd registration|etenders|e-submission|e-tender)\b/i.test(value);
}
