/**
 * Luqi Visa & Entry — official country authorities, manually reviewed 2026-10-29.
 * Strictly an evidence navigator: no visa determination, application, passport
 * data, government integration, paid inference, or "live availability" claim.
 */
export const VISA_SOURCES_REVIEWED_ON='2026-10-29';
export const VISA_RECHECK_AFTER='2026-11-05';
export const PASSPORT_NATIONALITIES:readonly string[]=[
 'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon',
 'Central African Republic','Chad','Comoros','Congo (Republic of)','Côte d’Ivoire',
 'Democratic Republic of the Congo','Djibouti','Egypt','Equatorial Guinea','Eritrea',
 'Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Kenya','Lesotho',
 'Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco',
 'Mozambique','Namibia','Niger','Nigeria','Rwanda','São Tomé and Príncipe','Senegal',
 'Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania',
 'Togo','Tunisia','Uganda','Zambia','Zimbabwe'
];
export type VisaDestination='ZA'|'KE'|'NG'|'EG'|'CM';
export type VisaPurpose='tourism'|'visit'|'business'|'work'|'study'|'transit'|'other';
export type VisaArrival='air'|'land'|'sea'|'unsure';
export interface VisaOfficialSource{issuer:string;title:string;url:string;reviewedOn:string}
export interface VisaDestinationRecord{
 id:VisaDestination;country:string;processSummary:string;
 processWarning:string;sourceLinks:readonly VisaOfficialSource[];
}
function source(issuer:string,title:string,url:string):VisaOfficialSource{
 return {issuer,title,url,reviewedOn:VISA_SOURCES_REVIEWED_ON};
}
export const VISA_DESTINATIONS:readonly VisaDestinationRecord[]=[
 {id:'ZA',country:'South Africa',
 processSummary:'The Department of Home Affairs operates an Electronic Travel Authorisation (ETA) for eligible short-stay visitors. The published portal identifies specific airports and does not authorise employment.',
 processWarning:'Do not assume an ETA is available for every passport, purpose or arrival port; work and study permits are separate processes.',
 sourceLinks:[
  source('Department of Home Affairs','South African ETA: application and eligibility information','https://eta.dha.gov.za/'),
  source('South African Government','Visa and entry guidance','https://www.gov.za/services/temporary-residence/visa'),
  source('Department of Home Affairs','Immigration services and other visa categories','https://www.dha.gov.za/index.php/immigration-services'),
  source('South African Government','Home Affairs ETA rollout, speech dated 1 October 2026','https://www.gov.za/news/speeches/minister-leon-schreiber-home-affairs-quantum-leap-vision-future-government-01-oct')
 ]},
 {id:'KE',country:'Kenya',
 processSummary:'Kenya operates the official eTA portal, with nationality and status-based exemptions described in its official How to Apply guidance (including 2025 amendments).',
 processWarning:'Exemption lists, duration caps and immigration classifications must be rechecked for the actual passport and travel purpose. A website heading is not a personal clearance or entry approval.',
 sourceLinks:[
  source('Kenya Directorate of Immigration Services','Kenya eTA: How to Apply and national exemptions','https://etakenya.go.ke/how-to-apply'),
  source('Kenya Directorate of Immigration Services','Official eTA service','https://etakenya.go.ke/'),
  source('Kenya Directorate of Immigration Services','eTA eligibility and official categories','https://etakenya.go.ke/eligibility')
 ]},
 {id:'NG',country:'Nigeria',
 processSummary:'Nigeria Immigration Service publishes short-visit eVisa and embassy routes, with distinct classes for longer-term residence and work.',
 processWarning:'Do not treat a short-stay eVisa as employment authorisation, a guarantee of extension or an exemption from immigration checks.',
 sourceLinks:[
  source('Nigeria Immigration Service','Official Nigerian visa classes and purpose distinctions','https://immigration.gov.ng/nigerian-visa/'),
  source('Nigeria Immigration Service','eVisa rules, applications and fraud warnings','https://immigration.gov.ng/knowledge-base/'),
  source('Nigeria Immigration Service','Official immigration service home','https://immigration.gov.ng/')
 ]},
 {id:'EG',country:'Egypt',
 processSummary:'Egypt operates a government eVisa portal for listed nationalities and categories. Its published tourism eVisa FAQ includes South Africa among possible applicants.',
 processWarning:'A published eVisa nationality list does not confirm visa exemption, successful approval, work permission or actual entry. The official portal asks that eVisa applications be made at least seven days before departure.',
 sourceLinks:[
  source('Government of Egypt','Official Egypt eVisa portal and application steps','https://www.visa2egypt.gov.eg/'),
  source('Government of Egypt','Official Egypt eVisa nationality and travel-purpose FAQ','https://www.visa2egypt.gov.eg/eVisa/FAQ'),
  source('Government of Egypt','How to apply for an Egyptian eVisa','https://www.visa2egypt.gov.eg/eVisa/HowDoIApply')
 ]},
 {id:'CM',country:'Cameroon',
 processSummary:'Cameroon’s Ministry of External Relations directs visa applicants to the government eVisaCam service for online registration and the visa process.',
 processWarning:'Fees, exemptions, diplomatic/ordinary passport differences, required documents, biometrics and appointment requirements must be checked with the official mission for the traveller’s case.',
 sourceLinks:[
  source('Ministry of External Relations of Cameroon','Ministry explanation of eVisa procedure','https://www.diplocam.cm/e-visa/'),
  source('Republic of Cameroon','Official eVisaCam consular portal','https://www.evisacam.cm/'),
  source('Cameroon Ministry of Tourism','Government entry formalities','https://mintoul.gov.cm/venir-au-cameroun/formalites-dentree-au-cameroun/')
 ]}
];
export interface VisaQuery{
 destination:VisaDestination;passportNationality:string;purpose:VisaPurpose;
 arrival:VisaArrival;arrivalDate:string;stayDays:number|null;
}
export interface VisaAnswer {
 destination:VisaDestinationRecord;label:'source-review-only'|'dated-official-example'|'review-expired';
 summary:string;explanation:string;steps:readonly string[];warnings:readonly string[];
 sources:readonly VisaOfficialSource[];
}
export function isVisaReviewFresh(now:Date):boolean{
 return Number.isFinite(now.getTime())&&now.getTime()<=Date.parse(VISA_RECHECK_AFTER+'T23:59:59+02:00');
}
export function evaluateVisaEntry(input:VisaQuery,now:Date=new Date()):VisaAnswer{
 const destination=VISA_DESTINATIONS.find(x=>x.id===input.destination)||VISA_DESTINATIONS[0];
 const nationality=PASSPORT_NATIONALITIES.includes(input.passportNationality)?input.passportNationality:'';
 const purpose=['tourism','visit','business','work','study','transit','other'].includes(input.purpose)?input.purpose:'other';
 const arrival=['air','land','sea','unsure'].includes(input.arrival)?input.arrival:'unsure';
 const hasValidDays=Number.isInteger(input.stayDays)&&input.stayDays!==null&&input.stayDays>0&&input.stayDays<=365;
 const fresh=isVisaReviewFresh(now);
 const warnings:string[]=['An official source, not Luqi, determines the visa/ETA requirements for your passport, permitted stay and entry port. Entry is never guaranteed.',
 'Do not enter a passport number, identity number, biometrics, personal case, login, card details or documents into Luqi. Applications and official payments happen only on the issuing government website.'];
 if(!nationality) warnings.push('Select the actual passport nationality to make this guide more relevant; we will not infer nationality from location.');
 if(!hasValidDays) warnings.push('No valid intended stay length was supplied. The entry authority must confirm maximum stay and category.');
 if(input.arrivalDate){
  const valid=/^\d{4}-\d{2}-\d{2}$/.test(input.arrivalDate)&&Number.isFinite(Date.parse(input.arrivalDate+'T00:00:00Z'));
  if(!valid||Date.parse(input.arrivalDate+'T23:59:59+02:00')<now.getTime())warnings.push('The travel date is invalid or already passed. Check requirements again for future travel.');
 }
 if(!fresh)warnings.push('The last human source review expired. Specific nationality examples are withheld until the original rules are rechecked.');
 if(purpose==='work'||purpose==='study')
  warnings.push('Work and study need their own lawful immigration category. Do not use a tourist ETA/eVisa as proof of work or study permission.');
 if(arrival!=='air'&&destination.id==='ZA')
  warnings.push('The published South African ETA portal mentions specific arrival airports. Do not assume an ETA works for land or sea arrivals.');
 const steps=[
  'Confirm the passport-issuing country, passport type, purpose, exact dates, proposed entry point and permitted duration against the original immigration rules.',
  'Open the destination authority’s official eligibility and application instructions. Review current restrictions, fees, biometrics, supporting documents and any travel advisories.',
  'If your category requires authorisation, submit or check your application ONLY on the genuine government portal or with its authorised mission.',
  'Carry the necessary original travel evidence and confirm final entry conditions with your airline and the destination authority before departure.'
 ];
 let label:VisaAnswer['label']='source-review-only';
 let explanation=destination.processSummary;
 if(fresh&&destination.id==='KE'&&nationality==='South Africa'&&(purpose==='tourism'||purpose==='visit')&&
    hasValidDays&&Number(input.stayDays)<=90){
  label='dated-official-example';
  explanation='Kenya’s official How to Apply page lists South Africa among nationalities in the published eTA-exemption group for visits not exceeding 90 days. This is a dated source example, not a real-time personal exemption ruling; recheck passport class, conditions and any subsequent amendment before travel.';
 }else if(fresh&&destination.id==='EG'&&nationality==='South Africa'&&purpose==='tourism'){
  label='dated-official-example';
  explanation='Egypt’s official eVisa FAQ lists South Africa among nationalities that may apply for an eVisa for relevant categories. This is not a visa-free claim, approval or permission to work. Check the latest official portal instructions and apply in advance.';
 }
 if(!fresh)label='review-expired';
 if(destination.id==='ZA'&&purpose==='work') explanation='The South African ETA page expressly says ETA holders cannot work. Use the Home Affairs work-related immigration service and confirm the relevant legal category.';
 return {destination,label,summary:'Official-source guidance only. No visa or border status was retrieved.',explanation,steps,warnings,sources:destination.sourceLinks};
}
/** Do not mistake payment by Visa card, a travel ETA calculation, or general trip planning for a visa request. */
export function detectVisaEntryIntent(value:unknown):boolean{
 if(typeof value!=='string'||!value.trim()||value.length>500)return false;
 const q=value.toLowerCase();
 if(/\bvisa (?:card|payment|debit|credit)\b/.test(q)&&!/\btravel|entry|passport|immigration|evisa|tourism/.test(q))return false;
 return /\b(?:visas?|e[- ]?visa|visa.free|visa requirements?|passport entry|passport requirements?|immigration permit|electronic travel authori[sz]ation|e[- ]?ta application|travel authori[sz]ation|border entry requirements?)\b/i.test(value);
}
