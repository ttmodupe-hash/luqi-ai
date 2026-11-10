/** Reviewed public-source handoffs, not a live national tender feed.
 * Owner authorised this release on 9 Nov 2026. Source dates are provenance,
 * not deployment dates. Failed release-session retrievals are NOT refreshed.
 */
export type WorkCategory='supplies'|'repairs'|'ict'|'roadworks';
export type RequirementAnswer='unknown'|'checked'|'missing';
export interface WorkspaceNotice {
 id:string; reference:string; title:string; issuer:string; province:'WC'|'EC'; area:string;
 category:WorkCategory; type:'Written quotation'|'Municipal RFQ'; publishedOn:string;
 closesAt:string; briefingAt:string|null; briefingVenue:string|null;
 reviewedOn:string; sourceAccess:'recheck-unavailable'|'retrieved';
 originalUrl:string; listingUrl:string; evidenceUrl:string; originalPages:number;
 summary:string; delivery:string; requirements:readonly string[];
 submission:string; fee:string; ceilingZar:number|null; cautions:readonly string[];
 nextStep:string; enquiry:string; clarification:string;
}
const sbm='https://sbm.gov.za/wp-content/uploads/Pages/TENDERS_QUOTATIONS/ABOVE_30000/Above_30000_2026_2027/';
const ledger='https://github.com/ttmodupe-hash/luqi-ai/issues/390#issuecomment-';
const saldanha={issuer:'Saldanha Bay Municipality',province:'WC' as const,type:'Municipal RFQ' as const,
 publishedOn:'2026-11-06',closesAt:'2026-11-13T12:00:00+02:00',reviewedOn:'2026-11-09',
 sourceAccess:'recheck-unavailable' as const,listingUrl:'https://sbm.gov.za/quotations-above-r30000/',
 evidenceUrl:ledger+'6736052368',originalPages:20,fee:'not stated',ceilingZar:null,
 submission:'Sealed, signed original, marked with the quotation number, in the quotation box at Investment Centre, ground floor, 15 Main Road, Vredenburg 7380. No email bid submission. Confirm courier arrangements with SCM.',
};
const commonSbm=['Active CSD registration for award; original invitation and signed MBD4, MBD6.1, MBD8 and MBD9.',
 'Required municipal-account/address evidence and applicable supplier registration documents. Sole-proprietor routes are described in the original; confirm the route that applies to you.'];
export const WORKSPACE_NOTICES:readonly WorkspaceNotice[]=[
 {id:'stellenbosch-workwear-20261108',reference:'Uniform and Protective Clothing (no number published)',
 title:'Supply uniforms and protective clothing',issuer:'Stellenbosch Municipality',province:'WC',area:'Stellenbosch / Cape Winelands',category:'supplies',type:'Written quotation',
 publishedOn:'2026-11-08',closesAt:'2026-11-10T12:00:00+02:00',briefingAt:null,briefingVenue:null,
 reviewedOn:'2026-11-09',sourceAccess:'recheck-unavailable',originalPages:24,
 originalUrl:'https://stellenbosch.gov.za/wp-content/uploads/library/2026/RFQ-Uniform-and-Protective-Clothing.pdf',
 listingUrl:'https://stellenbosch.gov.za/download/rfq-uniform-and-protective-clothing/',evidenceUrl:ledger+'6729356857',
 summary:'Supply the specified work shirts, trousers, socks and tactical boots. The original lists 23 shirts, 23 trousers and five pairs of boots; check the size and fabric schedule.',
 delivery:'Stellenbosch municipal area. Exact delivery address and the socks quantity need issuer confirmation.',
 requirements:['CSD registration, tax-compliance information and applicable supplier particulars.',
 'Completed original MBD4, MBD6.1, MBD8 and MBD9 and recent municipal-account evidence.',
 'Quotation on your business letterhead, including delivery period and the issuer’s 30-day validity requirement.',
 'B-BBEE supporting proof and the prescribed physical hand-in within 48 hours of the quotation: confirm logistics with SCM.'],
 submission:'Email the quotation and prescribed supporting documents to BOTH adeline.ramadie@stellenbosch.gov.za and scm.quotes@stellenbosch.gov.za. The original additionally specifies physical hand-in of B-BBEE proof within 48 hours; confirm the address and procedure.',
 fee:'not stated',ceilingZar:30000,
 cautions:['No numeric RFQ reference is published. Do not invent one; confirm the email subject with SCM.',
 'Socks quantity and exact delivery address are not clear. B-BBEE and locality scoring are not a reserved award or an automatic location exclusion.'],
 nextStep:'Check the sizes and available stock, then ask SCM to confirm the socks quantity and supporting-document hand-in.',
 enquiry:'Adeline Ramadie · 021 808 8719',clarification:'Please confirm the required socks quantity, delivery address, quotation email subject and physical hand-in arrangements for the B-BBEE evidence for Uniform and Protective Clothing, published 8 November 2026.'},
 {...saldanha,id:'saldanha-q315-2027',reference:'Q315/2027',title:'Install wireless links and network points',area:'Vredenburg / West Coast',category:'ict',
 originalUrl:sbm+'Q315-2027.pdf',briefingAt:'2026-11-10T10:00:00+02:00',
 briefingVenue:'Investment Centre (Blue Building), LED Boardroom, Vredenburg. Attendance is compulsory.',
 summary:'Install and replace wireless radio links, Cat6a network points and associated equipment at municipal sites. Your offer must cover every item and identify the proposed makes and models.',
 delivery:'Vredenburg municipal sites and stores; the cover specifies completion/delivery within 14 days of the official order.',
 requirements:[...commonSbm,'Attend the compulsory 10 November 10:00 SAST briefing.',
 'Cover every specified item and include technical make/model sheets; equipment must meet the specified network compatibility requirements.'],
 cautions:['The original was text-inspected by the watch; its page-image recheck was rate-limited. Later addenda require issuer checking.',
 'Missing the compulsory meeting disqualifies a new bidder. No award or compatibility is guaranteed by this summary.'],
 nextStep:'Confirm your team can attend the compulsory briefing before preparing an offer.',enquiry:'J.D. van Coller · 022 701 6973 · JD.VanColler@sbm.gov.za (enquiries only)',
 clarification:'Please confirm the compulsory Q315/2027 briefing arrangements and whether any addenda or updated compatibility schedules have been issued.'},
 {...saldanha,id:'saldanha-q314-2027',reference:'Q314/2027',title:'Road marking in Vredenburg wards',area:'Vredenburg · Wards 2, 9 and 13',category:'roadworks',
 originalUrl:sbm+'Q314-2027.pdf',briefingAt:null,briefingVenue:null,
 summary:'Apply road markings in Wards 2, 9 and 13. This includes materials, equipment, labour and traffic management—not paint supply alone.',
 delivery:'Work in the named Vredenburg wards within the advertised 14 days after order.',
 requirements:[...commonSbm,'The original prints “CIBD 1 SK”; confirm intended CIDB 1SK grading with the issuer.',
 'SANS731-1 and SABS paint evidence, workers’ compensation good standing and three comparable completed projects within five years.',
 'Approved marking equipment, traffic-management and safety arrangements, and the specified minimum six-month guarantee.'],
 cautions:['The grading acronym is misprinted in the original. Get written clarification before relying on an interpretation.',
 'No compulsory briefing is specified in the inspected original. Recheck for addenda.'],
 nextStep:'Confirm the grading wording and assemble paint certificates and project references.',enquiry:'F Zimri · 022 714 8040 · Freddy.Zimri@sbm.gov.za (enquiries only)',
 clarification:'Please confirm the intended contractor grading in Q314/2027 (printed “CIBD 1 SK”) and whether any addenda change the experience, paint-certification or submission requirements.'},
 {...saldanha,id:'saldanha-q317-2027',reference:'Q317/2027',title:'Road marking on Saldanha roads',area:'Saldanha / West Coast',category:'roadworks',
 originalUrl:sbm+'Q317-2027.pdf',briefingAt:null,briefingVenue:null,
 summary:'Carry out road-marking works on various roads in Saldanha, with machinery, materials, labour and traffic management. This is a separate quotation from Q314.',
 delivery:'Various Saldanha roads; advertised work period is 14 days after order.',
 requirements:[...commonSbm,'CIDB 1SK, SANS731-1 and SABS paint evidence, plus good-standing documentation.',
 'At least two relevant completed projects in three years AND three road-marking project references; these are separate original requirements.',
 'Marking machinery, traffic management, safety compliance and the prescribed minimum six-month guarantee.'],
 cautions:['No compulsory briefing is specified in the inspected original. Check all subsequent amendments.',
 'The two-project and three-reference requirements must not be merged into a single threshold.'],
 nextStep:'Check both experience requirements against your actual records before pricing.',enquiry:'V van Rensburg · 022 714 8040 · Vivienia.vanrensburg@sbm.gov.za (enquiries only)',
 clarification:'Please confirm the Q317/2027 requirements for two completed projects and three road-marking references, and provide any later addenda.'},
 {id:'nmb-csq10266160',reference:'CSQ10266160',title:'Renovate the Ward 23 councillor office',issuer:'Nelson Mandela Bay Municipality',province:'EC',area:'NU3 Motherwell / Gqeberha',category:'repairs',type:'Municipal RFQ',
 publishedOn:'2026-11-09',closesAt:'2026-11-23T11:00:00+02:00',briefingAt:'2026-11-16T11:00:00+02:00',
 briefingVenue:'63 Khetshe Street, NU3 Motherwell, Gqeberha. Attendance is compulsory.',reviewedOn:'2026-11-09',sourceAccess:'recheck-unavailable',originalPages:7,
 originalUrl:'https://nelsonmandelabay.gov.za/DocumentDownload.aspx?f=csq10266160_De8xi.pdf',listingUrl:'https://inftenders.nelsonmandelabay.gov.za/',evidenceUrl:ledger+'6731970688',
 summary:'Repair ceilings, replace flooring and tiles, paint internal surfaces, repair leaking roofing and waterproof the township councillor office.',
 delivery:'Work at the Ward 23 office in Motherwell, using local ward-based labour. The original specifies no part-payments, so check your working-capital capacity.',
 requirements:['Active CIDB 1GB or higher.', 'Evidence of BOTH tiler and carpenter trade-test certificates.',
 'Attend the compulsory 16 November 11:00 SAST site meeting.',
 'Municipal supplier-database registration and completed original returnable schedule, safety file and online declarations.',
 'Capacity to use local ward-based labour and fund the work without part-payments.'],
 submission:'Submit through the municipality’s original informal-tender portal. You must register and log in yourself and complete its declarations. No email or fax submissions. Account-protected final fields were not inspected by Luqi.',
 fee:'not stated',ceilingZar:null,cautions:['The pricing schedule lists 65.18 m² for removal and 65.13 m² for installation; ask the technical officer to clarify.',
 'Portal-only returnables and later addenda still need the applicant’s own check. The 10% contingency line is not an estimated contract value.'],
 nextStep:'Check CIDB and both trade certificates, arrange site-meeting attendance, and clarify the flooring quantities.',
 enquiry:'Mr M Zinja · 041 506 2037 (technical enquiries)',clarification:'Please clarify the 65.18 m² removal and 65.13 m² installation quantities in CSQ10266160 and confirm the compulsory site-meeting arrangements and any addenda.'},
];
export const WORK_CATEGORIES=[{id:'all',label:'All work'},{id:'supplies',label:'Supplies'},{id:'repairs',label:'Repairs'},{id:'ict',label:'ICT'},{id:'roadworks',label:'Roadworks'},{id:'cleaning',label:'Cleaning'},{id:'catering',label:'Catering'},{id:'transport',label:'Transport'}] as const;
export function exactWorkspaceTime(value:string):number {
 if(!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:00\+02:00$/.test(value))return NaN;
 const day=Date.parse(value.slice(0,10)+'T00:00:00Z');
 return Number.isFinite(day)&&new Date(day).toISOString().slice(0,10)===value.slice(0,10)?Date.parse(value):NaN;
}
export type WorkspaceState='review-needed'|'original-reviewed'|'closed'|'briefing-passed'|'unverified';
export function workspaceState(n:WorkspaceNotice,now:Date):WorkspaceState {
 const at=now.getTime(),end=exactWorkspaceTime(n.closesAt),review=exactWorkspaceTime(n.reviewedOn+'T00:00:00+02:00');
 const briefing=n.briefingAt?exactWorkspaceTime(n.briefingAt):null;
 if(![at,end,review].every(Number.isFinite)||(briefing!==null&&!Number.isFinite(briefing))||at<review)return 'unverified';
 if(at>=end)return 'closed';
 if(briefing!==null&&at>=briefing)return 'briefing-passed';
 return n.sourceAccess!=='retrieved'||at>=review+48*3600000?'review-needed':'original-reviewed';
}
export function workspaceMatches(opts:{now:Date;query?:string;province?:string;category?:string;smallCeiling?:boolean;history?:boolean;savedOnly?:boolean;savedIds?:readonly string[]},records:readonly WorkspaceNotice[]=WORKSPACE_NOTICES):WorkspaceNotice[]{
 const q=(opts.query||'').trim().toLowerCase().slice(0,100),seen=new Set<string>();
 return records.filter(n=>{
  const key=n.issuer.trim().toLowerCase()+'|'+n.reference.replace(/\s/g,'').toLowerCase()+'|'+n.publishedOn;
  if(seen.has(key))return false;seen.add(key);
  const s=workspaceState(n,opts.now);
  return s!=='unverified'&&(opts.history||!['closed','briefing-passed'].includes(s))&&
   (!opts.province||opts.province==='all'||opts.province===n.province)&&
   (!opts.category||opts.category==='all'||opts.category===n.category)&&
   (!opts.savedOnly||opts.savedIds?.includes(n.id))&&
   (!opts.smallCeiling||(n.ceilingZar!==null&&n.ceilingZar>0&&n.ceilingZar<=200000))&&
   (!q||[n.title,n.reference,n.issuer,n.area,n.summary].join(' ').toLowerCase().includes(q));
 }).sort((a,b)=>Date.parse(a.closesAt)-Date.parse(b.closesAt)||a.id.localeCompare(b.id));
}
export function parseWorkspaceSaved(raw:string|null):string[]{
 try{const v:unknown=JSON.parse(raw||'[]');if(!Array.isArray(v))return [];
  return [...new Set(v.filter((x):x is string=>typeof x==='string'&&WORKSPACE_NOTICES.some(n=>n.id===x)))].slice(0,50);
 }catch{return []}
}
export function workspaceDate(value:string):string {
 const t=exactWorkspaceTime(value);return Number.isFinite(t)?new Intl.DateTimeFormat('en-ZA',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Africa/Johannesburg'}).format(t)+' SAST':'Time not verified';
}
export function workspaceChecklist(n:WorkspaceNotice,answers:Readonly<Record<string,RequirementAnswer>>,now:Date):string {
 return ['LUQI — OPPORTUNITY PREPARATION CHECKLIST','Not a bid, legal declaration, eligibility approval or official form.',
 n.issuer,n.reference,n.title,`Location: ${n.area}`,`Published: ${n.publishedOn}`,`Closing: ${workspaceDate(n.closesAt)}`,
 `Status at export: ${workspaceState(n,now)}`,`Original review recorded: ${n.reviewedOn}; release-session recheck unavailable.`,
 `Estimated contract value: not stated. ${n.ceilingZar!==null?`Published procurement ceiling: R${n.ceilingZar} including taxes; not the exact value.`:''}`,
 n.briefingAt?`COMPULSORY BRIEFING: ${workspaceDate(n.briefingAt)}. ${n.briefingVenue}`:'No compulsory briefing identified in the reviewed original; recheck addenda.',
 '\nWHAT THE ISSUER NEEDS',n.summary,'\nCHECK AGAINST YOUR OWN EVIDENCE',
 ...n.requirements.map((r,i)=>`[${answers[String(i)]==='checked'?'Self-marked checked':answers[String(i)]==='missing'?'Missing':'Still to check'}] ${r}`),
 '\nSUBMISSION',n.submission,`Document fee: ${n.fee}`,`Delivery: ${n.delivery}`,'\nCLARIFY BEFORE SPENDING',...n.cautions,
 '\nQUESTION TO SEND YOURSELF',n.clarification,'\nNEXT STEP',n.nextStep,n.enquiry,
 '\nORIGINAL SOURCES',n.originalUrl,n.listingUrl,`Review record: ${n.evidenceUrl}`,
 '\nLuqi has not contacted the issuer, priced, signed or submitted anything. Preference points do not guarantee an award.'
 ].join('\n');
}
