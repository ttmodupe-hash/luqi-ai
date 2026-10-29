/** South African township/rural business guidance from original public sources, reviewed 29 Oct 2026.
 * These are programme descriptions, not live grants or applicant eligibility approvals.
 */
import {
 CIPC_URL,MUNICIPAL_DIRECTORY_URL,NATIONAL_TENDER_URL,NYDA_URL,
 SPAZA_FUND_URL,SPAZA_UPDATE_URL,TOWNSHIP_TREP_ANNOUNCEMENT,TOWNSHIP_TREP_URL
} from './municipal-economy';
export const TOWNSHIP_REVIEWED_ON='2026-10-29';
export const TOWNSHIP_RECHECK_AFTER='2026-11-05';
export type TownshipSector='spaza'|'food'|'beauty'|'trade'|'artisan'|'manufacturing'|'services'|'recycling';
export type TownshipGoal='register'|'licence'|'funding'|'market'|'skills';
export const TOWNSHIP_SECTORS:readonly {id:TownshipSector;title:string;extra:string}[]=[
 {id:'spaza',title:'Spaza shops and general dealers',extra:'Trading licence, zoning, stock sourcing and food handling if applicable'},
 {id:'food',title:'Food vendors, caterers and tshisanyama',extra:'Food hygiene, Certificate of Acceptability and municipal trading permission'},
 {id:'beauty',title:'Hair, nails and personal care',extra:'Local land use, health rules and formalisation where applicable'},
 {id:'trade',title:'Street traders, stalls and markets',extra:'Approved sites, by-laws, hawker permits and market fees if published'},
 {id:'artisan',title:'Plumbing, construction and repair artisans',extra:'Business registration, qualifications where regulated, quotations and procurement readiness'},
 {id:'manufacturing',title:'Clothing, textiles and small manufacturing',extra:'Workspace zoning, occupational safety, equipment and market access'},
 {id:'services',title:'Digital, transport and other services',extra:'Sector-specific licences, invoices, digital marketing and tax obligations'},
 {id:'recycling',title:'Recycling and waste economy',extra:'Local waste by-laws, safe premises, municipal permissions and buyers'}
];
export const TOWNSHIP_GOALS:readonly {id:TownshipGoal;title:string}[]=[
 {id:'register',title:'Formalise my business'},
 {id:'licence',title:'Obtain local trading permission'},
 {id:'funding',title:'Explore funding and support'},
 {id:'market',title:'Find markets, suppliers and tenders'},
 {id:'skills',title:'Improve skills and business readiness'}
];
export interface TownshipSource{
 id:string;title:string;issuer:string;kind:'programme-directory'|'funding-announcement'|'official-guidance';
 url:string;summary:string;status:'confirm-current-window'|'standing-guidance';
 reviewedOn:string;
}
export const TOWNSHIP_OFFICIAL_SOURCES:readonly TownshipSource[]=[
 {id:'trep-2026',title:'Enhanced Township and Rural Entrepreneurship Programme (TREP) — 2026 relaunch announcement',
  issuer:'Department of Small Business Development',kind:'funding-announcement',url:TOWNSHIP_TREP_ANNOUNCEMENT,
  summary:'DSBD announced a planned 27 October 2026 relaunch with financing up to R3 million, 5% interest, up to 60 months repayment and up to six months moratorium. These are announced product ceilings, not an individual offer or grant. The announcement does NOT establish that applications are currently open.',
  status:'confirm-current-window',reviewedOn:TOWNSHIP_REVIEWED_ON},
 {id:'trep-rules',title:'TREP programme description and general eligibility',issuer:'Department of Small Business Development',
  kind:'programme-directory',url:TOWNSHIP_TREP_URL,
  summary:'Official description of blended finance and business development for eligible township/rural enterprises. The original page lists business ownership, CIPC, municipal licence, SARS and UIF requirements; the relaunch may modify terms. Verify current forms and specific product.',
  status:'confirm-current-window',reviewedOn:TOWNSHIP_REVIEWED_ON},
 {id:'spaza-fund',title:'Spaza Shop Support Fund',issuer:'Department of Small Business Development',
  kind:'programme-directory',url:SPAZA_FUND_URL,
  summary:'Official spaza programme criteria include municipality-specific trading permits/licences and compliance. Do not assume an open application round, or treat spaza registration as equivalent to licensing.',
  status:'confirm-current-window',reviewedOn:TOWNSHIP_REVIEWED_ON},
 {id:'spaza-update',title:'Spaza fund progress and local licensing barriers',issuer:'South African Government / DSBD',
  kind:'official-guidance',url:SPAZA_UPDATE_URL,
  summary:'Government explains that municipal registration alone is not a full trading licence and that ownership, site verification, by-laws and health rules must be met. Historical approval statistics do not establish new awards.',
  status:'standing-guidance',reviewedOn:TOWNSHIP_REVIEWED_ON},
 {id:'cipc',title:'Business and company registration',issuer:'Companies and Intellectual Property Commission',
  kind:'official-guidance',url:CIPC_URL,summary:'Use CIPC’s genuine government portal for legal entity registration and current official fees; a CIPC company is not automatically a local trade permit.',status:'standing-guidance',reviewedOn:TOWNSHIP_REVIEWED_ON},
 {id:'municipal',title:'Find your municipality for trading permits',issuer:'South African Government',
  kind:'official-guidance',url:MUNICIPAL_DIRECTORY_URL,summary:'Local licences, trading sites, food hygiene and land-use rules vary by municipality. Identify the council with jurisdiction before applying.',status:'standing-guidance',reviewedOn:TOWNSHIP_REVIEWED_ON},
 {id:'tenders',title:'National Treasury eTenders',issuer:'National Treasury',
  kind:'programme-directory',url:NATIONAL_TENDER_URL,summary:'Search individual original procurement notices; no tender is guaranteed active without verifying deadlines, briefing rules and documents.',status:'confirm-current-window',reviewedOn:TOWNSHIP_REVIEWED_ON},
 {id:'nyda',title:'Youth entrepreneurship and support resources',issuer:'National Youth Development Agency',
  kind:'programme-directory',url:NYDA_URL,summary:'Official NYDA entry for youth development support. Find an exact currently open programme and its applicant criteria before treating it as funding.',status:'confirm-current-window',reviewedOn:TOWNSHIP_REVIEWED_ON}
];
export function isTownshipReviewFresh(now:Date):boolean{
 return Number.isFinite(now.getTime())&&now.getTime()<=Date.parse(TOWNSHIP_RECHECK_AFTER+'T23:59:59+02:00');
}
export function buildTownshipActionPlan(sector:TownshipSector,goal:TownshipGoal,municipality?:string):string[]{
 const name=TOWNSHIP_SECTORS.find(x=>x.id===sector);
 const destination=municipality?.trim()?municipality:'your local municipality';
 const base=[
  'Describe what you sell or provide and your real customers, costs and operating area. Do not enter private IDs, passwords, bank details or medical records into Luqi.',
  'Check trading, land-use, safety and licensing requirements with '+destination+' using the original government contact directory.',
  ...(sector==='spaza'||sector==='food'?['Ask the local Environmental Health service about food-handling and Certificate of Acceptability requirements.']:[]),
  ...(sector==='trade'?['Confirm approved pitches, market rules, relevant permits and council fees before setting up a street stall.']:[]),
  ...(sector==='artisan'?['Check whether your specific trade requires industry registration or certified professional sign-off before quoting regulated work.']:[]),
  ...(sector==='recycling'?['Confirm safe storage, collection and waste-handling requirements with the municipality and any relevant environmental authority.']:[])
 ];
 switch(goal){
  case'register':return [...base,'Check CIPC legal form and SARS/UIF duties for your business type; do not assume every informal seller has identical registration obligations.','Prepare a simple sales/cost record and retain original registration acknowledgements offline.'];
  case'licence':return [...base,'Read the current local by-law, zoning, food and fire conditions for the precise site and business activity.','Use the genuine municipal application channel, keep its receipt, and do not assume registration means permission to trade.'];
  case'funding':return [...base,'Review the original TREP and Spaza Fund programmes and determine whether a current application window exists.','Distinguish grant support from repayable loans or blended finance; verify interest, instalments, eligibility, costs and lender identity.','Use the funder’s official application platform, with a truthful operating plan and documents required by that exact call.'];
  case'market':return [...base,'Identify realistic local buyers, supplier qualification and lawful procurement requirements.','Search National Treasury eTenders and original municipality supply-chain notices; check individual closing dates and compulsory briefings.','Prepare your own accurate quote and delivery capacity; never pay an intermediary promising a government award.'];
  case'skills':return [...base,'List the specific skills you need in costing, stock, bookkeeping, safety, marketing and customer care.','Check DSBD, NYDA and official municipal economic development offices for a dated, eligible programme.','Record what you learned and adjust your actual cash-flow assumptions.'];
 }
}
export function townshipActionPlanText(sector:TownshipSector,goal:TownshipGoal,municipality?:string):string{
 const s=TOWNSHIP_SECTORS.find(x=>x.id===sector)?.title||'Township enterprise';
 const g=TOWNSHIP_GOALS.find(x=>x.id===goal)?.title||'Support';
 const lines=buildTownshipActionPlan(sector,goal,municipality);
 return ['LUQI · TOWNSHIP BUSINESS ACTION PLAN', 'Reviewed: '+TOWNSHIP_REVIEWED_ON,
  'Sector: '+s,'Goal: '+g,municipality?'Selected municipality: '+municipality:'',
  'Guide only. Not a funding award or a licence. Confirm all requirements with issuers.','',
  ...lines.map((t,i)=>(i+1)+'. '+t),'',
  'Official programmes: '+TOWNSHIP_TREP_URL,
  '2026 DSBD announcement: '+TOWNSHIP_TREP_ANNOUNCEMENT,
  'Spaza Fund: '+SPAZA_FUND_URL,'Municipal directory: '+MUNICIPAL_DIRECTORY_URL,
  'National Treasury eTenders: '+NATIONAL_TENDER_URL].filter(Boolean).join('\n');
}
