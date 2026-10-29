/** Source-linked PUBLIC guidance only: no identity, finances, eligibility decision or claims access.
 * Manually reviewed 29 Oct 2026. Check the original authority for current rules.
 */
export const SOCIAL_SUPPORT_REVIEWED_ON = '2026-10-29';
export const SOCIAL_SUPPORT_RECHECK_AFTER = '2026-11-05';
export type SupportAgency = 'sassa' | 'uif';
export interface SupportSource { label:string; url:string }
export interface SupportTopic {
  id:string; agency:SupportAgency; title:string; summary:string;
  requirements:string; steps:readonly string[]; sources:readonly SupportSource[];
  important?:string;
}
const grants='https://services.sassa.gov.za/portal/r/sassa/sassa/grants-information';
const services='https://services.sassa.gov.za/portal/r/sassa/sassa/home';
const srd='https://srd.sassa.gov.za/';
const uif='https://uifonline.labour.gov.za/uifOnline/';
const labour='https://www.labour.gov.za/DocumentCenter/Pages/DEL-Contacts-.aspx';
const migration='https://www.labour.gov.za/uif-addresses-public-concerns-regarding-online-claims-and-clarifies-platform-migration-process';
export const SOCIAL_SUPPORT_TOPICS:readonly SupportTopic[]=[
  {id:'sassa-older',agency:'sassa',title:'Older persons grant',summary:'Income support for qualifying older people, subject to the official means and other requirements.',
   requirements:'The SASSA grant information page lists age 60+, eligible residence/citizenship status, a means test and other criteria. Do not infer eligibility from age alone.',
   steps:['Read the latest requirements and means test on the official grant-information page.','Use the SASSA Services portal or a SASSA office for the current application method and required documents.','Keep the official proof of application and follow up directly with SASSA.'],
   sources:[{label:'SASSA older persons grant rules',url:grants},{label:'SASSA Services portal',url:services}]},
  {id:'sassa-child',agency:'sassa',title:'Child support grant',summary:'A grant for eligible primary caregivers of children below the programme age limit.',
   requirements:'SASSA lists primary-caregiver status, child under 18, applicable nationality/residence conditions and a means test; further conditions apply.',
   steps:['Check the full caregiver and child requirements on SASSA’s official page.','Use the official SASSA application instructions or office; prepare documents specified by SASSA.','Keep your submission receipt and use the official SASSA enquiry channel for decisions.'],
   sources:[{label:'SASSA child support grant rules',url:grants},{label:'SASSA application services',url:services}]},
  {id:'sassa-disability',agency:'sassa',title:'Disability grant',summary:'Grant information for applicants whose qualifying disability has been assessed under SASSA rules.',
   requirements:'Official guidance includes age 18–59, medical assessment, means test, residence and further exclusions. A Luqi guide cannot assess health or disability.',
   steps:['Read SASSA’s current requirements for the grant and medical assessment.','Obtain the official referral/medical form from SASSA, and apply through the permitted SASSA channel.','For a rejection or delay, obtain the official reason and ask SASSA about review or appeal.'],
   sources:[{label:'SASSA disability grant information',url:grants},{label:'SASSA Services',url:services}]},
  {id:'sassa-care',agency:'sassa',title:'Foster, care dependency and grant-in-aid',summary:'Different grants with different care, court-order, medical or assistance requirements.',
   requirements:'Foster care depends on a valid court placement. Care dependency and grant-in-aid have separate qualifying rules and cannot be assumed from a care relationship.',
   steps:['Identify the correct grant using the separate SASSA descriptions.','Review the current legal, court or medical documents required for the chosen category.','Apply using SASSA’s approved channel; ask SASSA directly about overlap and grant-in-aid rules.'],
   sources:[{label:'SASSA care and foster grant requirements',url:grants},{label:'SASSA Services',url:services}]},
  {id:'sassa-srd',agency:'sassa',title:'Social Relief of Distress (SRD)',summary:'Information on applying for or checking temporary SRD support through SASSA.',
   requirements:'SRD is a separate, means- and status-assessed programme. The current amount, availability and applicant criteria must be confirmed on the original portal; old R350 guides may be outdated.',
   steps:['Open the official SASSA SRD portal; check whether it is accepting applications and read the current eligibility declaration.','Complete identity, contact and banking steps ONLY on the genuine SASSA portal, not inside Luqi.','Return to the original SASSA service to check a month’s decision or payment status.'],
   sources:[{label:'Official SASSA SRD portal',url:srd},{label:'Official SASSA grant information',url:grants}],
   important:'The SRD website may be temporarily inaccessible. That is not proof that the grant has ended. Never enter an ID number, password or banking details into Luqi.'},
  {id:'sassa-status',agency:'sassa',title:'SASSA status, payments and appeals',summary:'Learn where to check a decision, payments, complaints or grant appeals.',
   requirements:'SASSA decides each grant. A pending, rejected or unpaid status cannot be diagnosed from a Luqi chat.',
   steps:['For SRD, use the official SRD portal’s current status and appeal instructions. For other grants, use SASSA Services or contact an office.','Check the original decision notice and the current appeal or reconsideration deadline before acting.','For payments, fraud or delays, contact SASSA directly. Do not share a case number, full ID, OTP or bank details here.'],
   sources:[{label:'SASSA SRD and status portal',url:srd},{label:'SASSA office and contact details',url:'https://services.sassa.gov.za/portal/r/sassa/sassa/contact-us-pu'}],
   important:'Official SASSA helpline: 0800 60 10 11. Calls from mobile networks may incur charges. Payment dates are not estimated by Luqi.'},
  {id:'uif-unemployed',agency:'uif',title:'Unemployment benefits',summary:'Steps for workers who have lost qualifying employment and want to claim from the UIF.',
   requirements:'Usually linked to UIF contributions and an eligible end of employment, not a voluntary resignation. Work-seeker registration and employer declarations can matter. Rules and deadlines vary; check the current notice.',
   steps:['Use the new UIF Online employee-claims system (not legacy uFiling).','Check the required UI-19 employment declaration, salary schedule, work-seeker registration and any additional documents on the official claim page.','Submit and track the claim in UIF Online, or seek help at a Labour Centre. Apply promptly and confirm the current legal deadline with UIF.'],
   sources:[{label:'Current UIF Online employee claims',url:uif},{label:'Government UIF unemployment guidance',url:'https://www.gov.za/services/services-residents/world-work/uif/uif-unemployment-benefits'},{label:'Department of Employment and Labour UIF contacts',url:labour}],
   important:'Some older government pages differ on the claim window. Do not rely on a single old “6 months” or “12 months” statement; contact UIF and apply as soon as possible.'},
  {id:'uif-maternity',agency:'uif',title:'Maternity, parental and adoption benefits',summary:'Benefit categories for qualifying contributors and family leave circumstances.',
   requirements:'Benefits have different qualifying conditions and required forms. Luqi does not assess medical, parenting or employment status.',
   steps:['Open UIF Online and select the appropriate benefit category available in your account.','Check the official leave, employer and supporting-document requirements for that specific benefit.','Submit and follow up within the official deadlines; contact the UIF for categories not shown in the portal.'],
   sources:[{label:'UIF Online',url:uif},{label:'Official UIF benefits how-to index',url:'https://www.labour.gov.za/DocumentCenter/Pages/UIF_how_to.aspx'}]},
  {id:'uif-illness',agency:'uif',title:'Illness benefits',summary:'Claim guidance for qualifying income loss through illness.',
   requirements:'Official guidance may require proof of employment, medical documents and employer remuneration information; the UIF determines eligibility.',
   steps:['Read the current UIF illness-benefit requirements.','Use the official UIF Online claims channel or a Labour Centre for the correct forms and medical certification.','Track the claim on the government portal and respond to official document requests.'],
   sources:[{label:'UIF Online claims',url:uif},{label:'Official illness-benefit guidance',url:'https://www.labour.gov.za/DocumentCenter/Pages/UIF_How_To_Claim_UIF_Illness_Benefits.aspx'}]},
  {id:'uif-reduced',agency:'uif',title:'Reduced work time or dependants benefits',summary:'Understand special UIF benefit categories and their distinct rules.',
   requirements:'Reduced work time and dependants claims have their own contribution, employment, relationship and evidence conditions.',
   steps:['Review the correct benefit category on the Department’s official UIF pages.','Prepare only the documents the UIF itself requests for your category.','Use UIF Online if the category is supported or ask a Labour Centre for the official process.'],
   sources:[{label:'Official UIF benefits guidance',url:'https://www.labour.gov.za/DocumentCenter/Pages/UIF_how_to.aspx'},{label:'UIF Online',url:uif},{label:'UIF support contacts',url:labour}]},
  {id:'uif-claim',agency:'uif',title:'UIF claim status, appeals and delayed payments',summary:'Track a submitted claim or find the official UIF complaints channel.',
   requirements:'Only the UIF can retrieve or adjudicate an individual case. Luqi does not query private claims or verify payout dates.',
   steps:['Sign in yourself to the official UIF Online portal and locate your own claim history or appeals service.','If a legacy uFiling claim is not visible, contact UIF before opening a duplicate claim.','For delayed payments, missing records or login trouble, use the official UIF call centre or complaints channel.'],
   sources:[{label:'UIF Online claim status',url:uif},{label:'Official May 2026 migration notice',url:migration},{label:'UIF complaints and contact centre',url:labour}],
   important:'UIF official contact centre: 0800 030 007. Do not send Luqi a case number, ID number, password, OTP or banking details.'},
  {id:'uif-employers',agency:'uif',title:'UIF for employers and domestic employers',summary:'Employer registration, declarations and contribution support.',
   requirements:'UIF employer obligations depend on statutory definitions, employee arrangements and contribution rules. Check the current UIF online services before filing.',
   steps:['Open the Department of Employment and Labour’s official online-tools page.','Confirm which employer portal currently handles registration, declarations and contributions; migration from legacy uFiling was in progress in 2026.','File employer declarations and payments directly with the authorised UIF service. Keep official transaction receipts.'],
   sources:[{label:'Current Department online services',url:'https://www.labour.gov.za/Online-Tools/Pages/default.aspx'},{label:'Official UIF migration announcement',url:migration},{label:'UIF employer portal (verify before use)',url:'https://ufiling.labour.gov.za/uif/'}],
   important:'Do not attempt new employee benefit claims using the old uFiling employee module. Employer-platform status must be confirmed before filing.'}
];
export function supportTopic(id:string):SupportTopic|undefined{return SOCIAL_SUPPORT_TOPICS.find(x=>x.id===id);}
export function listSupportTopics(agency:SupportAgency):SupportTopic[]{return SOCIAL_SUPPORT_TOPICS.filter(x=>x.agency===agency);}
export function isSocialSupportReviewFresh(now:Date):boolean{
 return Number.isFinite(now.getTime())&&now.getTime()<=Date.parse(SOCIAL_SUPPORT_RECHECK_AFTER+'T23:59:59+02:00');
}
/** Strong programme-specific words only. General bursaries and business funding remain in Opportunity Compass. */
export function detectSocialSupportIntent(input:unknown):boolean{
 if(typeof input!=='string'||input.length>500)return false;
 return /\b(?:sassa|srd grant|social relief of distress|older persons? grant|old age pension|child support grant|foster child grant|disability grant|care dependency grant|grant.in.aid|unemployment insurance fund|uif|uif online|ufiling|unemployment benefits?|uif claim|uif contributions?)\b/i.test(input);
}
