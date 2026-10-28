/** Official source DIRECTORY, not a guarantee of open places or personal eligibility.
 * Reviewed 2026-10-28. Luqi does not collect identity, disability, location or payment data here.
 */
export const OPPORTUNITY_REVIEWED_ON='2026-10-28';
export type OpportunityCountry='ZA'|'KE'|'NG'|'EG'|'CM';
export type OpportunityCategory='government'|'graduate'|'bursary'|'funding'|'sponsorship'|'learning'|'support';
export type OpportunityAudience='youth'|'graduate'|'entrepreneur'|'creative'|'accessibility'|'everyone';
export type ProvinceCode='EC'|'FS'|'GP'|'KZN'|'LP'|'MP'|'NC'|'NW'|'WC';
export const PROVINCES:readonly {id:ProvinceCode;name:string;x:number;y:number}[]=[
 {id:'EC',name:'Eastern Cape',x:65,y:79},{id:'FS',name:'Free State',x:53,y:57},
 {id:'GP',name:'Gauteng',x:59,y:32},{id:'KZN',name:'KwaZulu-Natal',x:77,y:63},
 {id:'LP',name:'Limpopo',x:67,y:18},{id:'MP',name:'Mpumalanga',x:77,y:37},
 {id:'NC',name:'Northern Cape',x:27,y:61},{id:'NW',name:'North West',x:42,y:35},
 {id:'WC',name:'Western Cape',x:29,y:88},
];
export const CATEGORIES:readonly {id:OpportunityCategory;label:string}[]=[
 {id:'government',label:'Government vacancies'},{id:'graduate',label:'Graduate opportunities'},
 {id:'bursary',label:'Bursaries and scholarships'},{id:'funding',label:'Business funding'},
 {id:'sponsorship',label:'Sponsorship and arts grants'},{id:'learning',label:'Skills and learnerships'},
 {id:'support',label:'Public and accessibility support'},
];
export interface OpportunitySource {
 id:string;title:string;organisation:string;country:OpportunityCountry;category:OpportunityCategory;
 audiences:readonly OpportunityAudience[];url:string;summary:string;reviewedOn:string;
 type:'directory'|'dated-notice';deadline?:string;notice?:string;
}
const source=(id:string,title:string,organisation:string,category:OpportunityCategory,
 audiences:OpportunityAudience[],url:string,summary:string,deadline?:string,notice?:string):OpportunitySource=>({
 id,title,organisation,country:'ZA',category,audiences,url,summary,reviewedOn:OPPORTUNITY_REVIEWED_ON,
 type:deadline?'dated-notice':'directory',...(deadline?{deadline}:{}),...(notice?{notice}:{}),
});
export const ZA_OPPORTUNITY_SOURCES:readonly OpportunitySource[]=[
 source('gov-jobs','Government jobs this week','South African Government','government',['everyone','graduate','accessibility'],
 'https://www.gov.za/government-jobs-week','Official national and provincial vacancy circulars; read each individual post for the department, closing date, requirements and Z83 form.',undefined,'Circular 38 of 23 October 2026 was current at review; check the latest circular again.'),
 source('circular-38','Public Service Vacancy Circular 38 of 2026','DPSA','government',['everyone','graduate','accessibility'],
 'https://www.dpsa.gov.za/newsroom/psvc/circular-38-of-2026/','Dated circular of government vacancy advertisements; some individual vacancies may already be closed.',undefined,'Published 23 October 2026; publication alone does not confirm that any listed vacancy is open.'),
 source('dept-labour','Department of Employment and Labour jobs','Department of Employment and Labour','government',['everyone','graduate'],
 'https://www.labour.gov.za/Vacancies/Pages/Vacancies-List.aspx','Official departmental recruitment listings, career support and links to ESSA. Check each position deadline.'),
 source('nyda','NYDA Opportunities Corner','National Youth Development Agency','graduate',['youth','graduate','entrepreneur'],
 'https://www.nyda.gov.za/Opportunities.html','Youth vacancies, internships, learnerships and funding introductions. A listing may link onward to another provider.'),
 source('sayouth','SA Youth work and learning network','SA Youth / PYEI','learning',['youth','graduate'],
 'https://sayouth.datafree.co/','Free registration and location-based work or learning discovery on the official platform; apply there, not through Luqi.'),
 source('gov-youth','Government youth opportunities','South African Government','learning',['youth','graduate'],
 'https://www.gov.za/issues/government-and-opportunities-youth','Public career, internship, bursary and skills reference directory; some listed articles are older than current application rounds.'),
 source('nrf','NRF 2026–27 scholarship calls','National Research Foundation','bursary',['graduate','youth'],
 'https://www.nrf.ac.za/funding/nrf-call-for-proposals-for-funding-in-2026-and-2027/','Postgraduate research funding guides, institutional rules and call documents; check specific application windows.'),
 source('nrf-honours','2027 NRF Honours General call','National Research Foundation','bursary',['graduate','youth'],
 'https://www.nrf.ac.za/dsti-nrf-postgraduate-student-funding-for-the-2027-academic-year/','The official schedule lists 23 November 2026 as the Honours General student closing date; other study categories differ.','2026-11-23','Different programme and university deadlines may apply.'),
 source('nsfas-2027','2027 NSFAS applications','NSFAS','bursary',['youth','accessibility'],
 'https://www.nsfas.org.za/content/how-to-apply.html','Official student financial-aid process and accessibility resources. Applications are free and require direct identity verification with NSFAS.','2026-10-31','2027 application round closes 31 October 2026 according to the official notice.'),
 source('funza-2027','2027 Funza Lushaka bursary','Department of Basic Education','bursary',['youth','graduate'],
 'https://www.education.gov.za/ArchivedDocuments/ArchivedArticles/2027FunzaLushakaBursaryProgramme.aspx','Teacher training bursary; first-time and returning applicants have different dates and eligibility.','2027-01-31','First-time applications close 31 January 2027; returning applicants close earlier.'),
 source('youth-business','Youth Challenge Fund information','Department of Small Business Development','funding',['youth','entrepreneur'],
 'https://www.dsbd.gov.za/youth-challenge-fund-ycf/','Public description of youth enterprise support and criteria; Luqi has not confirmed a currently open funding window.'),
 source('nac-calls','National Arts Council calls','National Arts Council','sponsorship',['creative','youth','accessibility'],
 'https://www.nac.org.za/latest-funding-calls/','Official creative grants, project support and scholarships; not every call is accepting applications today.'),
 source('nac-guide','Creative project funding eligibility','National Arts Council','sponsorship',['creative','accessibility'],
 'https://www.nac.org.za/funding-news/funding-overview/','Funding guidance for individual artists, students and organisations, including inclusive initiatives.'),
 source('dsd','Social-development and inclusion support','South African Government / DSD','support',['everyone','youth','accessibility'],
 'https://www.gov.za/about-sa/social-development','Public information about welfare and support services, not a promise of benefit eligibility.'),
];
export const COUNTRY_ANCHORS:readonly {id:OpportunityCountry;name:string;flag:string;url:string;status:string}[]=[
 {id:'ZA',name:'South Africa',flag:'🇿🇦',url:'https://www.gov.za/government-jobs-week',status:'Curated job and funding sources'},
 {id:'KE',name:'Kenya',flag:'🇰🇪',url:'https://www.ecitizen.go.ke/',status:'Government starting point; opportunities not yet verified'},
 {id:'NG',name:'Nigeria',flag:'🇳🇬',url:'https://www.cac.gov.ng/',status:'Business starting point; opportunities not yet verified'},
 {id:'EG',name:'Egypt',flag:'🇪🇬',url:'https://www.eta.gov.eg/',status:'Government starting point; opportunities not yet verified'},
 {id:'CM',name:'Cameroon',flag:'🇨🇲',url:'https://servicepublic.gov.cm/en/',status:'Government starting point; opportunities not yet verified'},
];
export function deadlineState(deadline:string|undefined,now:Date):'no-deadline'|'check-current'|'deadline-passed'{
 if(!deadline||!Number.isFinite(now.getTime()))return 'no-deadline';
 return now.getTime()>Date.parse(deadline+'T23:59:59+02:00')?'deadline-passed':'check-current';
}
export function matchOpportunitySources(category:OpportunityCategory|'all',audience:OpportunityAudience|'all',query:string):OpportunitySource[]{
 const q=typeof query==='string'?query.trim().toLowerCase().slice(0,100):'';
 return ZA_OPPORTUNITY_SOURCES.filter(s=>(category==='all'||s.category===category)
  &&(audience==='all'||s.audiences.includes(audience))
  &&(!q||(s.title+' '+s.organisation+' '+s.summary).toLowerCase().includes(q)));
}

/** Conservative routing for opportunity DISCOVERY, not CV writing or a generic interview. */
export function detectOpportunityIntent(input:unknown):boolean{
 if(typeof input!=='string'||!input.trim()||input.length>500)return false;
 const q=input.toLowerCase();
 return /\b(government vacancies|government jobs|government posts|public service jobs|public service vacancies|graduate opportunities|graduate internships?|internship opportunities|learnerships?|bursar(?:y|ies)|scholarships?|funding opportunities|youth funding|youth grants?|business grants?|startup funding|sponsorship opportunities|scholarship opportunities|jobs near me|graduate programme|graduate program|find jobs|find a job|opportunities for youth|opportunities for graduates)\b/u.test(q)
  || /\b(opportunities|funding|sponsor(?:ship)?|government posts?)\b.{0,45}\b(youth|young people|graduate|student|entrepreneur|disab(?:ility|led)|internship|job|programme)\b/u.test(q)
  || /\b(government job|public service post|government post|public service vacancy)\b/u.test(q)
  || (/\b(dpsa|z83|nyda|nsfas|funza lushaka|nrf funding|government vacancy circular)\b/u.test(q)
      && /\b(apply|application|requirements|eligibility|eligible|qualify|deadline|closing|verify|job|bursary|funding|vacancy|steps|guidelines)\b/u.test(q));
}
