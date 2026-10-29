/**
 * Luqi's first INDIVIDUAL, primary-source government vacancy records.
 * Reviewed 2026-10-29 against the named government publishers.
 *
 * NOT: live scrape inventory, employment offer, applicant eligibility check,
 * personal profile, exact employer geocode, or government endorsement.
 * An advert remains "needs publisher confirmation" until its original
 * individual post is checked; a working page alone cannot prove applications
 * are still accepted or the employer will appoint someone.
 */
import type {ProvinceCode} from './opportunity-sources';
export const JOB_NOTICES_REVIEWED_ON='2026-10-29';
export const JOB_NOTICES_RECHECK_AFTER='2026-11-06';
export type NoticeLevel='grade12'|'tertiary';
export interface GovernmentJobNotice{
 id:string;reference:string;title:string;employer:string;province:ProvinceCode;
 centre:string;city:string|null;level:NoticeLevel;requirements:string;experience:string;
 annualSalaryZar:number;sourceUrl:string;reviewedOn:string;
 closingDate:string;walkInCutoffSast:string|null;remoteCutoffSast:string|null;
 applicationInstructions:string;additionalSource?:string;
 withdrawnEvidenceUrl?:string;
}
const labour='Department of Employment and Labour';
const defaultReview=JOB_NOTICES_REVIEWED_ON;
export const VERIFIED_GOVERNMENT_ADVERTS: readonly GovernmentJobNotice[]=[
 {id:'labour-gp-carletonville-clerk',reference:'HR4/4/4/09/47',title:'Administrative Clerk: Management Support Services',employer:labour,province:'GP',centre:'Carletonville Labour Centre',city:'Carletonville',
  level:'grade12',requirements:'Matriculation / Grade 12 / Senior Certificate; knowledge of Batho Pele, administrative procedures and basic computer, communication and planning skills.',
  experience:'The individual notice does not specify an experience minimum; it still lists required knowledge and skills.',
  annualSalaryZar:237453,sourceUrl:'https://www.labour.gov.za/administrative-clerk-management-support-services-%2811%29',
  reviewedOn:defaultReview,closingDate:'2026-11-06',walkInCutoffSast:'16:00',remoteCutoffSast:'23:59',
  applicationInstructions:'The original notice lists hand delivery at Carletonville Labour Centre, or online submission through the official ESSA service. Check Z83, CV and reference instructions on the employer page.'},
 {id:'labour-mp-sabie-coid',reference:'HR4/4/7/97',title:'Client Service Officer: COID',employer:labour,province:'MP',centre:'Labour Centre: Sabie',city:'Sabie',
  level:'grade12',requirements:'Matriculation / Grade 12 / Senior Certificate; public service and compensation-fund knowledge, computer literacy, communication and service skills.',
  experience:'No explicit minimum years of experience appear in the published requirements; this is not a guarantee of eligibility.',
  annualSalaryZar:280278,sourceUrl:'https://www.labour.gov.za/client-service-officer-coid-%287%29',
  reviewedOn:defaultReview,closingDate:'2026-11-06',walkInCutoffSast:'16:00',remoteCutoffSast:'23:59',
  applicationInstructions:'Follow the original employer page for Sabie Labour Centre postal, hand-delivery or official email instructions. Include the correct reference and the current Z83/CV as specified.'},
 {id:'labour-mp-ict',reference:'HR 4/4/7/96',title:'Field ICT Technician',employer:labour,province:'MP',centre:'Provincial Office: Mpumalanga',city:null,
  level:'tertiary',requirements:'Three-year IT or Information Systems diploma (NQF 6) or degree (NQF 7), valid driving licence and two years of functional ICT or technical support experience.',
  experience:'Two years of relevant ICT/technical support experience explicitly required.',
  annualSalaryZar:413001,sourceUrl:'https://www.labour.gov.za/field-ict-technician-%286%29',
  reviewedOn:defaultReview,closingDate:'2026-11-06',walkInCutoffSast:'16:00',remoteCutoffSast:'23:59',
  applicationInstructions:'The department gives an Emalahleni application address and an official email; the advert identifies the centre only as Mpumalanga Provincial Office. Confirm exact duty station before relying on the location.'},
 {id:'labour-ec-office-administrator',reference:'HR4/4/1/105',title:'Office Administrator',employer:labour,province:'EC',centre:'Provincial Office: Eastern Cape',city:null,
  level:'tertiary',requirements:'Three-year national diploma or degree (NQF 6/7) in office, public or business management/administration or specified related fields; one year of office administration/secretariat experience.',
  experience:'One year of functional administration or secretariat experience required.',
  annualSalaryZar:338106,sourceUrl:'https://www.labour.gov.za/office-administrator-%2817%29',
  reviewedOn:defaultReview,closingDate:'2026-11-06',walkInCutoffSast:'16:00',remoteCutoffSast:'23:59',
  applicationInstructions:'Check the department notice for Eastern Cape Provincial Office postal, hand delivery or official email instructions. Applications are not submitted through Luqi.'},
 {id:'labour-kzn-employer-services',reference:'HR4/4/9/29',title:'Administration Officer: Employer Service',employer:labour,province:'KZN',centre:'Provincial Office: KwaZulu-Natal',city:null,
  level:'tertiary',requirements:'Undergraduate NQF 6 qualification in the listed social sciences, psychology, public/business management or administration fields and one year of functional clerical/administrative experience in Public Employment Services.',
  experience:'One year of relevant Public Employment Services experience required.',
  annualSalaryZar:338106,sourceUrl:'https://www.labour.gov.za/administration-officer-employer-service',
  reviewedOn:defaultReview,closingDate:'2026-10-30',walkInCutoffSast:'16:00',remoteCutoffSast:'23:59',
  applicationInstructions:'The original employer post lists postal, Durban hand-delivery and Jobs-KZN14@labour.gov.za online channels. The advert identifies the position as KwaZulu-Natal Provincial Office, without specifying the duty-station city.'},
 {id:'cogta-gp-scm',reference:'SSCMDSPR',title:'Senior Supply Chain Management Practitioner: Demand Management',employer:'Department of Cooperative Governance and Traditional Affairs',province:'GP',centre:'Pretoria',city:'Pretoria',
  level:'tertiary',requirements:'Three-year national diploma or degree in logistics, purchasing or supply chain management (NQF 6/7), plus two to three years of related experience.',
  experience:'Two to three years of related experience required.',
  annualSalaryZar:413001,sourceUrl:'https://www.cogta.gov.za/index.php/2026/10/18/senior-supply-chain-management-practitioner-demand-management-supplier-performance-and-reporting-ref-no-sscmdspr/',
  reviewedOn:defaultReview,closingDate:'2026-10-30',walkInCutoffSast:null,remoteCutoffSast:null,
  applicationInstructions:'The department advert directs emailed applications to its published recruitment address, with the current Z83 and comprehensive CV. It states the date but does not establish a cutoff time; confirm directly.',
  additionalSource:'https://www.dpsa.gov.za/newsroom/psvc/'},
 {id:'labour-ec-withdrawn-personnel',reference:'HR4/4/1/13',title:'Personnel Officer: Human Resources Management',employer:labour,province:'EC',centre:'East London Provincial Office',city:'East London',
  level:'grade12',requirements:'Grade 12 plus a certificate in the human resources field, according to the original advertisement.',
  experience:'Employer requirements need rechecking; this post has been explicitly withdrawn.',
  annualSalaryZar:237453,sourceUrl:'https://www.labour.gov.za/personnel-officer-human-resources-management',
  reviewedOn:defaultReview,closingDate:'2026-10-30',walkInCutoffSast:'16:00',remoteCutoffSast:'23:59',
  applicationInstructions:'Do not apply: the Department of Employment and Labour has expressly withdrawn this exact advertised reference.',
  withdrawnEvidenceUrl:'https://www.labour.gov.za/erratum-withdrawal-of-advertised-post-of-personnel-officer-human-resources-management'},
];
export type JobNoticeStatus='withdrawn'|'deadline-passed'|'published-check-original';
export function assessGovernmentJobStatus(job:GovernmentJobNotice,now:Date=new Date()):JobNoticeStatus{
 if(job.withdrawnEvidenceUrl)return'withdrawn';
 if(!Number.isFinite(now.getTime()))return'published-check-original';
 // The source-specific online deadline can be later than the physical intake.
 // When an exact hour is absent, don't assume one: treat dates as expired only
 // after the next day starts in South Africa. Never label a listing 'open'.
 const lastKnown=job.remoteCutoffSast||job.walkInCutoffSast||'23:59';
 return now.getTime()>Date.parse(job.closingDate+'T'+lastKnown+':59+02:00')?'deadline-passed':'published-check-original';
}
export type JobLevelFilter='all'|'grade12'|'tertiary';
export function matchGovernmentAdverts(options:{
 province:ProvinceCode|null;level:JobLevelFilter;query:string;includeHistory:boolean;now:Date;
}):GovernmentJobNotice[]{
 const {province,level,includeHistory,now}=options;
 const query=typeof options.query==='string'?options.query.trim().toLowerCase().slice(0,100):'';
 return VERIFIED_GOVERNMENT_ADVERTS.filter(item=>
   (!province||item.province===province)&&
   (level==='all'||item.level===level)&&
   (includeHistory||assessGovernmentJobStatus(item,now)==='published-check-original')&&
   (!query||(item.title+' '+item.employer+' '+item.centre+' '+item.reference+' '+item.requirements).toLowerCase().includes(query))
 ).sort((a,b)=>a.closingDate.localeCompare(b.closingDate)||a.title.localeCompare(b.title));
}
export function isJobNoticeReviewFresh(job:GovernmentJobNotice,now:Date):boolean{
 const at=Date.parse(job.reviewedOn+'T23:59:59+02:00');
 return Number.isFinite(now.getTime())&&now.getTime()<=at+48*60*60*1000;
}

/** Shared read-only API contract: no private data and no inference capability. */
export type IndividualNoticeCheck={
 id:string;reference:string;checkedAt:string;
 state:'reference-and-deadline-found'|'content-unconfirmed'|'publisher-unavailable'|'withdrawn';
 note:'text_evidence_only_not_live_availability';
};
export type IndividualNoticeSnapshot={
 checkedAt:string;scope:'fixed_official_individual_adverts_only';checks:IndividualNoticeCheck[];
};
