/** Funding application preparation. Educational readiness only; no automated submissions. */
export type ApplicantType="individual"|"stokvel"|"cooperative"|"startup"|"registered-business"|"community-organisation";
export type FundingSector="mining"|"agriculture"|"manufacturing"|"technology"|"energy"|"construction"|"tourism"|"other";
export type FundingPurpose="startup"|"equipment"|"working-capital"|"training"|"expansion"|"exploration";
export interface FundingApplicant { type:ApplicantType; sector:FundingSector; country:string; purpose:FundingPurpose; amountRequested?:number; }
export interface ReadinessItem { id:string; label:string; required:boolean; rationale:string; }
export interface FundingReadiness { items:ReadinessItem[]; warnings:string[]; }
const COMMON:ReadinessItem[]=[
{id:"identity",label:"Identity and applicant contact details",required:true,rationale:"Official identity and contact verification."},
{id:"plan",label:"Business or project plan with measurable milestones",required:true,rationale:"Explain feasibility, delivery and beneficiaries."},
{id:"budget",label:"Itemised project budget and supporting quotations",required:true,rationale:"Show precisely how funds will be used."},
{id:"financials",label:"Cash-flow forecast and assumptions",required:true,rationale:"Assess sustainability and repayment capacity where relevant."},
{id:"eligibility",label:"Official programme eligibility and deadline verified",required:true,rationale:"Requirements differ by funder and application round."},
{id:"consent",label:"Applicant approval before sharing any information",required:true,rationale:"Applications contain confidential personal and commercial information."},
];
export function buildFundingReadiness(a:FundingApplicant):FundingReadiness {
 const items=[...COMMON];
 const warnings=["This checklist is preparatory, not confirmation of eligibility or an open funding opportunity.","Do not pay application fees or share sensitive records until the funder's identity and requirements are verified."];
 if(a.type==="stokvel"||a.type==="cooperative"||a.type==="community-organisation") items.push({id:"governance",label:"Constitution, member resolution and authorised signatories",required:true,rationale:"Document who owns the project and who may apply on the group's behalf."});
 if(a.type==="registered-business"||a.type==="startup"||a.type==="cooperative")items.push({id:"registration",label:"Business registration, ownership and tax records where required",required:true,rationale:"Funder-specific legal and tax compliance."});
 if(a.sector==="mining"){
  items.push({id:"mineral-rights",label:"Applicable mineral rights, permits and land access evidence",required:true,rationale:"Mining or prospecting rights depend on project and jurisdiction."});
  items.push({id:"geology",label:"Geological or resource evidence and competent technical review",required:true,rationale:"Funders may require independently supported resource and feasibility information."});
  items.push({id:"environment",label:"Environmental, rehabilitation and mine health-and-safety compliance plan",required:true,rationale:"Mining may require formal approvals and financial provision before operations."});
  warnings.push("Mining rights and permits are jurisdiction-specific. Funding does not authorise prospecting or extraction.");
 }
 if(a.amountRequested!==undefined && (!Number.isFinite(a.amountRequested)||a.amountRequested<=0)) warnings.push("Enter a valid positive funding amount before evaluating funding size.");
 if(!a.country.trim())warnings.push("Specify a country to check applicable legal and funding requirements.");
 return {items,warnings};
}
export function fundingCompletion(readiness:FundingReadiness,completedIds:ReadonlySet<string>):{done:number;total:number}{
 return {done:readiness.items.filter(i=>completedIds.has(i.id)).length,total:readiness.items.length};
}
