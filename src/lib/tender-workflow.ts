/** Luqi bidder-controlled, browser-local bid preparation.
 * No API calls, file uploads, CSD credentials, bank details, signatures or
 * unsupervised submissions. Real SBD/MBD/PDF forms remain issuer-provided.
 */
import {tenderStatus,tenderReviewFresh,type TenderNotice,type TenderMethod} from './tender-sources';
export const TENDER_DRAFT_MAX=4000;
export interface TenderDraft{
 supplierName:string; tenderReference:string; scopeResponse:string;
 deliveryApproach:string; pastExperience:string; pricingSummary:string;
 offeredTotalZar:string; keyDocuments:string; termsExcerpt:string;
 submissionMethod:TenderMethod;
}
export const EMPTY_TENDER_DRAFT:TenderDraft={
 supplierName:'',tenderReference:'',scopeResponse:'',deliveryApproach:'',
 pastExperience:'',pricingSummary:'',offeredTotalZar:'',keyDocuments:'',termsExcerpt:'',
 submissionMethod:'confirm-original',
};
export type TenderHumanGate='readOriginal'|'checkedEligibility'|'approvedSupplierFacts'
 |'approvedPrice'|'signedOfficialForms'|'reviewedMethodAndDeadline'|'authorisedRelease';
export const TENDER_HUMAN_GATES:readonly{key:TenderHumanGate;label:string}[]=[
 {key:'readOriginal',label:'I read the full original tender documents and any addenda'},
 {key:'checkedEligibility',label:'I checked all mandatory eligibility, briefing and supplier registration conditions'},
 {key:'approvedSupplierFacts',label:'I personally verified our true supplier experience and business details'},
 {key:'approvedPrice',label:'I reviewed and authorised the actual pricing and tax treatment'},
 {key:'signedOfficialForms',label:'I completed and signed the issuer’s actual required SBD/MBD or other declarations'},
 {key:'reviewedMethodAndDeadline',label:'I confirmed the exact official method, attachments, bid address and closing time'},
 {key:'authorisedRelease',label:'I approve exporting this preparation pack for my own official submission'},
];
export type TenderHumanApprovals=Record<TenderHumanGate,boolean>;
export const EMPTY_TENDER_APPROVALS:TenderHumanApprovals={
 readOriginal:false,checkedEligibility:false,approvedSupplierFacts:false,
 approvedPrice:false,signedOfficialForms:false,reviewedMethodAndDeadline:false,authorisedRelease:false,
};
export const TENDER_DOCUMENT_PROMPTS=[
 {label:'Official tender advert, full specification and all addenda',note:'Download from the procuring entity. Check the exact reference, bid validity, briefing and submission channel.'},
 {label:'CSD supplier profile and SARS tax compliance',note:'Confirm directly through CSD/SARS. Do not paste tax PINs or account credentials into Luqi.'},
 {label:'Official SBD 1 / MBD 1, if included',note:'Fill and sign the issuer-provided invitation; never substitute a recreated Luqi document.'},
 {label:'SBD 4 and other conflict-of-interest declarations, if included',note:'Truthful declarations and authorised signatures are human responsibilities.'},
 {label:'SBD 3 / pricing schedule and SBD 6.1 or municipal equivalent, if required',note:'Complete the original pricing template and check local preference conditions.'},
 {label:'Technical response, company capability and reference evidence',note:'Attach only accurate evidence requested by the original scope.'},
 {label:'CIDB / professional credentials, briefing proof or local-content documents when required',note:'Verify category-specific qualifications in the original notice.'},
] as const;
const max=(s:string,n:number)=>typeof s==='string'?s.trim().slice(0,n):'';
export function detectTenderDocumentMentions(input:unknown):string[]{
 if(typeof input!=='string'||input.length>6000)return[];
 const result:string[]=[];
 const match=(regex:RegExp,label:string)=>{if(regex.test(input))result.push(label)};
 match(/\b(?:sbd|mbd)\s*1\b/i,'SBD/MBD 1 (invitation)');
 match(/\b(?:sbd|mbd)\s*4\b/i,'SBD/MBD 4 (declarations)');
 match(/\b(?:sbd|mbd)\s*(?:3(?:\.[123])?|6\.1)\b/i,'Pricing/preference schedules');
 match(/\b(?:csd|central supplier database)\b/i,'CSD supplier registration');
 match(/\b(?:cidb|construction industry development board)\b/i,'CIDB eligibility');
 match(/\b(?:compulsory|mandatory)\s+(?:site\s+visit|briefing|information\s+session)\b/i,'Possibly compulsory briefing / site visit');
 return result;
}
export interface TenderReadiness{
 status:'withdrawn-or-expired'|'check-briefing'|'missing-draft'|'human-review-required'|'ready-for-manual-submission';
 missing:readonly string[];
 /** NEVER an external submission authorisation or actual tender award. */
 submissionConnected:false;
}
export function assessTenderDraft(
 notice:TenderNotice,draft:TenderDraft,gates:TenderHumanApprovals,now:Date=new Date(),
):TenderReadiness{
 const state=tenderStatus(notice,now);
 if(state==='past-deadline')return{status:'withdrawn-or-expired',missing:['Published closing time has passed. Recheck any official extension or corrigendum.'],submissionConnected:false};
 if(state==='mandatory-briefing-review')return{status:'check-briefing',missing:['Original notice lists a compulsory past briefing. Confirm attendance/eligibility with the procuring entity.'],submissionConnected:false};
 const missing:string[]=[];
 if(!tenderReviewFresh(notice,now))missing.push('Source review is older than 48 hours. Reconfirm official status, corrections and closing time.');
 if(!max(draft.supplierName,160))missing.push('Real, verified supplier trading name');
 if(!max(draft.tenderReference,100))missing.push('Official tender/RFQ number copied from original documents');
 else if(notice.reference&&draft.tenderReference.trim()!==notice.reference)
   missing.push('Tender reference must match the official published number');
 for(const [key,label]of[
   ['scopeResponse','Response to the required scope'],
   ['deliveryApproach','Proposed delivery method'],
   ['pastExperience','Evidence of actual, verifiable relevant experience'],
   ['pricingSummary','Reviewed pricing schedule explanation'],
 ] as const)if(!max(draft[key],TENDER_DRAFT_MAX))missing.push(label);
 if(!/^\d+(?:\.\d{1,2})?$/.test(draft.offeredTotalZar.trim())||Number(draft.offeredTotalZar)<=0||!Number.isFinite(Number(draft.offeredTotalZar)))
   missing.push('Positive, human-approved ZAR offer amount (tax basis must be confirmed on the official form)');
 if(draft.submissionMethod==='confirm-original')missing.push('Exact submission method verified from this tender (electronic, physical or email)');
 if(missing.length)return{status:'missing-draft',missing,submissionConnected:false};
 const pending=TENDER_HUMAN_GATES.filter(g=>!gates[g.key]).map(g=>g.label);
 if(pending.length)return{status:'human-review-required',missing:pending,submissionConnected:false};
 return{status:'ready-for-manual-submission',missing:[],submissionConnected:false};
}
export function buildTenderWorksheet(notice:TenderNotice,draft:TenderDraft,gates:TenderHumanApprovals,now:Date=new Date()):string{
 const outcome=assessTenderDraft(notice,draft,gates,now);
 const value=(input:string)=>max(input,TENDER_DRAFT_MAX)||'[Applicant must complete]';
 const details=[
  'LUQI — BID PREPARATION WORKSHEET (NOT AN OFFICIAL TENDER FORM)',
  'Never submit this file in place of the authority-supplied SBD/MBD and bid documents.',
  'Luqi has NOT applied, signed, uploaded, paid, or accessed the procuring entity.',
  '',
  'Official notice: '+notice.officialUrl,
  'Procuring entity: '+notice.issuer,
  'Source advert: '+notice.title,
  'Published reference: '+(notice.reference||'[No number on source index — verify original RFQ]'),
  'Bidder-researched tender reference: '+value(draft.tenderReference),
  'Closing date/time (SAST): '+notice.deadlineDate+' '+notice.deadlineTimeSast,
  'Issuer-listed submission method: '+notice.method+'; applicant-confirmed method: '+draft.submissionMethod,
  'Last source review: '+notice.sourceReviewedOn,
  'Technical conditions and original corrections must be reviewed before use.',
  '',
  'Supplier trading name (unverified draft): '+value(draft.supplierName),
  'Scope response (bidder draft): '+value(draft.scopeResponse),
  'Delivery plan (bidder draft): '+value(draft.deliveryApproach),
  'Actual experience (bidder draft): '+value(draft.pastExperience),
  'Pricing assumptions (bidder draft): '+value(draft.pricingSummary),
  'User-entered total offer ZAR (tax inclusion unverified): '+value(draft.offeredTotalZar),
  'Other documents / outstanding items (draft): '+value(draft.keyDocuments),
  'Original specification excerpt — applicant-supplied locally: '+value(draft.termsExcerpt),
  '',
  'MANDATORY APPLICANT HUMAN REVIEW',
  ...TENDER_HUMAN_GATES.map(g=>(gates[g.key]?'[confirmed by applicant] ':'[NOT confirmed] ')+g.label),
  'Readiness for local handoff: '+outcome.status,
  ...outcome.missing.map(v=>'- OUTSTANDING: '+v),
  '',
  'Official form fields, conflict declarations, signatures and final price must be approved and completed on issuer originals.',
  'Final tender submission (including any CSD login) is NOT connected to Luqi. Applicant must submit using the approved official method.',
  'Do not enter bank account numbers, IDs, passwords, OTPs or tax PINs into this worksheet.',
 ];
 return details.join('\n');
}
export function tenderDraftFileName(notice:TenderNotice){
 return 'luqi-tender-preparation-'+notice.id.replace(/[^a-z0-9-]/g,'')+'.txt';
}
