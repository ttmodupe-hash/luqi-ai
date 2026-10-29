/**
 * Official South African national local-government directory, manually transcribed 29 Oct 2026.
 * Directory: https://www.gov.za/about-government/contact-directory/provincial-local-government
 * The official directory visibly lists 255 names. Two further current municipalities
 * (Collins Chabane in Limpopo and JB Marks in North West) are independently grounded
 * in original government notices; together these give 257 names, not account integrations.
 * Never infer property/service jurisdiction, live service availability or GPS.
 */
import type { ProvinceCode } from './opportunity-sources';
export const MUNICIPAL_REVIEWED_ON='2026-10-29';
export const MUNICIPAL_RECHECK_AFTER='2026-11-12';
export const MUNICIPAL_DIRECTORY_URL='https://www.gov.za/about-government/contact-directory/provincial-local-government';
export const LOCAL_GOVERNMENT_URL='https://www.gov.za/about-government/government-system/local-government';
export const FREE_BASIC_URL='https://www.cogta.gov.za/index.php/2021/04/11/how-do-i-access-free-basic-municipal-services/';
export const MUNICIPAL_SERVICE_URL='https://www.gov.za/services/place-live/municipal-services';
export const NATIONAL_TENDER_URL='https://www.etenders.gov.za/Home/Opportunities';
export const TOWNSHIP_TREP_URL='https://www.dsbd.gov.za/township-and-rural-entrepreneurship-programme-trep/';
export const TOWNSHIP_TREP_ANNOUNCEMENT='https://www.dsbd.gov.za/minister-to-relaunch-enhanced-township-and-rural-entrepreneurship-programme/';
export const SPAZA_FUND_URL='https://www.dsbd.gov.za/spaza-shop-support-fund-sssf/';
export const SPAZA_UPDATE_URL='https://www.gov.za/news/media-statements/small-business-development-and-trade-industry-and-competition-update-spaza';
export const CIPC_URL='https://www.cipc.co.za/';
export const NYDA_URL='https://www.nyda.gov.za/';
export const TSHWANE_LICENCE_GUIDE='https://www.tshwane.gov.za/?p=81721';
export const CAPE_TOWN_LICENCE_GUIDE='https://www.capetown.gov.za/work-and-business/doing-business-in-the-city/business-compliance-permits-and-licences/business-licences-and-permits/';

export type MunicipalType='metropolitan'|'district'|'local';
export interface Municipality { name:string; province:ProvinceCode; type:MunicipalType; directoryUrl:string; supplementaryEvidenceUrl?:string; }
const municipalityNames:Record<ProvinceCode,string>={
 EC:`Alfred Nzo District Municipality
Amahlathi Local Municipality
Amathole District Municipality
Blue Crane Route Local Municipality
Buffalo City Metropolitan Municipality
Chris Hani District Municipality
Dr AB Xuma Local Municipality
Dr Beyers Naudé Local Municipality
Elundini Local Municipality
Emalahleni Local Municipality
Enoch Mgijima Local Municipality
Great Kei Local Municipality
Ingquza Hill Local Municipality
Intsika Yethu Local Municipality
Inxuba Yethemba Local Municipality
Joe Gqabi District Municipality
King Sabata Dalindyebo Local Municipality
Kouga Local Municipality
KouKamma Local Municipality
Makana Local Municipality
Matatiele Local Municipality
Mbhashe Local Municipality
Mhlontlo Local Municipality
Mnquma Local Municipality
Ndlambe Local Municipality
Nelson Mandela Bay Metropolitan Municipality
Ngqushwa Local Municipality
Ntabankulu Local Municipality
Nyandeni Local Municipality
OR Tambo District Municipality
Port St Johns Local Municipality
Raymond Mhlaba Local Municipality
Sakhisizwe Local Municipality
Sarah Baartman District Municipality
Senqu Local Municipality
Sunday's River Valley Local Municipality
Umzimvubu Local Municipality
Walter Sisulu Local Municipality
Winnie Madikizela-Mandela Local Municipality`,
 FS:`Dihlabeng Local Municipality
Fezile Dabi District Municipality
Kopanong Local Municipality
Lejweleputswa District Municipality
Letsemeng Local Municipality
Mafube Local Municipality
Maluti-a-Phofung Local Municipality
Mangaung Metropolitan Municipality
Mantsopa Local Municipality
Masilonyana Local Municipality
Matjhabeng Local Municipality
Metsimaholo Local Municipality
Mohokare Local Municipality
Moqhaka Local Municipality
Nala Local Municipality
Ngwathe Local Municipality
Nketoana Local Municipality
Phumelela Local Municipality
Setsoto Local Municipality
Thabo Mofutsanyana District Municipality
Tokologo Local Municipality
Tswelopele Local Municipality
Xhariep District Municipality`,
 GP:`City of Ekurhuleni
City of Johannesburg Metropolitan Municipality
City of Tshwane Metropolitan Municipality
Emfuleni Local Municipality
Lesedi Local Municipality
Merafong Local Municipality
Midvaal Local Municipality
Mogale City Local Municipality
Rand West City Local Municipality
Sedibeng District Municipality
West Rand District Municipality`,
 KZN:`AbaQulusi Local Municipality
Alfred Duma Local Municipality
Amajuba District Municipality
Big 5 Hlabisa Local Municipality (The)
City of uMhlathuze Local Municipality
Dannhauser Local Municipality
Dr Nkosazana Dlamini Zuma Local Municipality
eDumbe Local Municipality
Emadlangeni Local Municipality
Endumeni Local Municipality
eThekwini Metropolitan Municipality
Greater Kokstad Local Municipality
Harry Gwala District Municipality
iLembe District Municipality
Impendle Local Municipality
Inkosi Langalibalele Local Municipality
Inkosi Mtubatuba Local Municipality
Johannes Phumani Phungula Local Municipality
Jozini Local Municipality
King Cetshwayo District Municipality
KwaDukuza Local Municipality
Mandeni Local Municipality
Maphumulo Local Municipality
Mkhambathini Local Municipality
Mpofana Local Municipality
Msunduzi Local Municipality
Mthonjaneni Local Municipality
Ndwedwe Local Municipality
Newcastle Local Municipality
Nkandla Local Municipality
Nongoma Local Municipality
Nquthu Local Municipality
Okhahlamba Local Municipality
Ray Nkonyeni Local Municipality
Richmond Local Municipality
Ugu District Municipality
Ulundi Local Municipality
Umdoni Local Municipality
uMfolozi Local Municipality
uMgungundlovu District Municipality
Umhlabuyalingana Local Municipality
uMkhanyakude District Municipality
uMlalazi Local Municipality
uMngeni Local Municipality
uMshwathi Local Municipality
uMsinga Local Municipality
Umuziwabantu Local Municipality
Umvoti Local Municipality
Umzimkhulu Local Municipality
uMzinyathi District Municipality
Umzumbe Local Municipality
uPhongolo Local Municipality
uThukela District Municipality
Zululand District Municipality`,
 LP:`Ba-Phalaborwa Local Municipality
Bela-Bela Local Municipality
Blouberg Local Municipality
Capricorn District Municipality
Elias Motswaledi Local Municipality
Ephraim Mogale Local Municipality
Fetakgomo Tubatse Local Municipality
Greater Giyani Local Municipality
Greater Letaba Local Municipality
Greater Tzaneen Local Municipality
Lepelle-Nkumpi Local Municipality
Lephalale Local Municipality
Makhado Local Municipality
Makhudutamaga Local Municipality
Maruleng Local Municipality
Modimolle-Mookgophong Local Municipality
Mogalakwena Local Municipality
Molemole Local Municipality
Mopani District Municipality
Musina Local Municipality
Polokwane Local Municipality
Sekhukhune District Municipality
Thabazimbi Local Municipality
Thulamela Local Municipality
Vhembe District Municipality
Waterberg District Municipality`,
 MP:`Bushbuckridge Local Municipality
Chief Albert Luthuli Local Municipality
City of Mbombela Local Municipality
Dipaleseng Local Municipality
Dr JS Moroka Local Municipality
Ehlanzeni District Municipality
Emakhazeni Local Municipality
Emalahleni Local Municipality
Gert Sibande District Municipality
Govan Mbeki Local Municipality
Lekwa Local Municipality
Mkhondo Local Municipality
Msukaligwa Local Municipality
Nkangala District Municipality
Nkomazi Local Municipality
Pixley Ka Seme Local Municipality
Steve Tshwete Local Municipality
Thaba Chweu Local Municipality
Thembisile Hani Local Municipality
Victor Khanye Local Municipality`,
 NW:`Bojanala Platinum District Municipality
City of Matlosana Local Municipality
Ditsobotla Local Municipality
Dr Kenneth Kaunda District Municipality
Dr Ruth Segomotsi Mompati District Municipality
Greater Taung Local Municipality
Kagisano-Molopo Local Municipality
Kgetlengrivier Local Municipality
Lekwa-Teemane Local Municipality
Madibeng Local Municipality
Mahikeng Local Municipality
Mamusa Local Municipality
Maquassi Hills Local Municipality
Moretele Local Municipality
Moses Kotane Local Municipality
Naledi Local Municipality
Ngaka Modiri Molema District Municipality
Ramotshere Moiloa Local Municipality
Ratlou Local Municipality
Rustenburg Local Municipality
Tswaing Local Municipality`,
 NC:`!Kheis Local Municipality
Dawid Kruiper Local Municipality
Dikgatlong Local Municipality
Emthanjeni Local Municipality
Frances Baard District Municipality
Ga-segonyana Local Municipality
Gamagara Local Municipality
Hantam Local Municipality
Joe Morolong Local Municipality
John Taolo Gaetsewe District Municipality
Kai !Garib Local Municipality
Kamiesberg Local Municipality
Kareeberg Local Municipality
Karoo Hoogland Local Municipality
Kgatelopele Local Municipality
Khâi-ma Local Municipality
Magareng Local Municipality
Nama Khoi Local Municipality
Namakwa District Municipality
Phokwane Local Municipality
Pixley Ka Seme District Municipality
Renosterberg Local Municipality
Richtersveld Local Municipality
Siyancuma Local Municipality
Siyathemba Local Municipality
Sol Plaatje Local Municipality
Thembelihle Local Municipality
Tsantsabane Local Municipality
Ubuntu Local Municipality
Umsobomvu Local Municipality
ZF Mgcawu District Municipality`,
 WC:`Beaufort West Local Municipality
Bergrivier Local Municipality
Bitou Local Municipality
Breede Valley Local Municipality
Cape Agulhas Local Municipality
Cape Winelands District Municipality
Cederberg Local Municipality
Central Karoo District Municipality
City of Cape Town Metropolitan Municipality
Drakenstein Local Municipality
Garden Route District Municipality
George Local Municipality
Hessequa Local Municipality
Kannaland Local Municipality
Knysna Local Municipality
Laingsburg Local Municipality
Langeberg Local Municipality
Matzikama Local Municipality
Mossel Bay Local Municipality
Oudtshoorn Local Municipality
Overberg District Municipality
Overstrand Local Municipality
Prince Albert Local Municipality
Saldanha Bay Local Municipality
Stellenbosch Local Municipality
Swartland Local Municipality
Swellendam Local Municipality
Theewaterskloof Local Municipality
West Coast District Municipality
Witzenberg Local Municipality`
};
export const PROVINCE_NAMES:Record<ProvinceCode,string>={
 EC:'Eastern Cape',FS:'Free State',GP:'Gauteng',KZN:'KwaZulu-Natal',LP:'Limpopo',
 MP:'Mpumalanga',NW:'North West',NC:'Northern Cape',WC:'Western Cape',
};
const directoryMunicipalities:Municipality[]=(Object.entries(municipalityNames) as [ProvinceCode,string][])
 .flatMap(([province,list])=>list.split('\n').map(raw=>{
  const name=raw.trim();
  const type:MunicipalType=/Metropolitan Municipality$/.test(name)||name==='City of Ekurhuleni'?'metropolitan':
   /District Municipality$/.test(name)?'district':'local';
  return {name,province,type,directoryUrl:MUNICIPAL_DIRECTORY_URL};
 }));
export const MUNICIPALITIES:readonly Municipality[]=[...directoryMunicipalities,
 {name:'Collins Chabane Local Municipality',province:'LP',type:'local',directoryUrl:MUNICIPAL_DIRECTORY_URL,
 supplementaryEvidenceUrl:'https://www.gov.za/links/local-government'},
 {name:'JB Marks Local Municipality',province:'NW',type:'local',directoryUrl:MUNICIPAL_DIRECTORY_URL,
 supplementaryEvidenceUrl:'https://www.gov.za/news/media-advisories/government-activities/deputy-minister-sello-seitlholo-conducts-oversight-0'},
];
export function filterMunicipalities(province:ProvinceCode|null,query:string,limit=30):Municipality[]{
 const q=(typeof query==='string'?query.toLocaleLowerCase().trim().slice(0,80):'');
 return MUNICIPALITIES.filter(m=>(!province||m.province===province)&&
  (!q||m.name.toLocaleLowerCase().includes(q))).slice(0,Math.max(1,Math.min(limit,270)));
}
export type MunicipalServiceKey='water-power'|'billing'|'indigent'|'waste-roads'|'trade-licence'|'planning'|'public-participation'|'opportunities';
export interface MunicipalService { id:MunicipalServiceKey;title:string;why:string;steps:readonly string[];url:string; }
export const MUNICIPAL_SERVICES:readonly MunicipalService[]=[
 {id:'water-power',title:'Water, sanitation and electricity',why:'Report a supply issue, connection or municipal service failure to the responsible provider.',
  steps:['Find your municipality using the official directory and verify whether your supply is municipal or Eskom-operated.',
   'Use the current authority’s service desk or fault-reporting channel; keep your address and account details on its own official site or with its staff.',
   'Keep the dated case number privately and follow the published escalation process for unresolved faults.'],url:MUNICIPAL_SERVICE_URL},
 {id:'billing',title:'Rates, accounts and billing disputes',why:'Understand bills and prepare a non-sensitive dispute checklist.',
  steps:['Review the current tariff and property category in your municipality’s published rates and billing rules.',
   'Compare readings and charges offline; ask the municipality for an official statement or meter inspection.',
   'Submit a formal query directly through the municipality and retain proof; Luqi cannot access balances or cancel charges.'],url:MUNICIPAL_DIRECTORY_URL},
 {id:'indigent',title:'Indigent register and free basic services',why:'Municipal means-tested relief may apply, but criteria and services vary by municipality.',
  steps:['Find the current local municipal indigent policy and available water, sanitation or electricity support.',
   'Follow its published means test and supporting-document instructions on the actual municipal channel, not in Luqi.',
   'Reconfirm eligibility, approval and the support amount directly with the municipality; no award is guaranteed.'],url:FREE_BASIC_URL},
 {id:'waste-roads',title:'Refuse, potholes, drains and streetlights',why:'Route local maintenance concerns to the council with responsibility for the service.',
  steps:['Identify the relevant municipality and its official service responsibilities.',
   'Collect a simple non-identifying description and approximate street or area for your own report.',
   'Submit it directly to the municipal complaints service and retain the official ticket privately.'],url:MUNICIPAL_SERVICE_URL},
 {id:'trade-licence',title:'Spaza, street trading and business licences',why:'Trading, food handling, land use and fire compliance can be municipality-specific.',
  steps:['Check the local by-laws, trading location and relevant licence/permit category before operating.',
   'Ask the municipality about zoning, health Certificate of Acceptability, fire safety and required documents if relevant.',
   'Apply only through the named municipality’s official portal or physical office; registration is not necessarily a trading licence.'],url:MUNICIPAL_DIRECTORY_URL},
 {id:'planning',title:'Land use, building plans and zoning',why:'Building, signage, business use and planning permission depend on local law and property.',
  steps:['Find the current municipality planning and land-use scheme for the site.',
   'Ask about consent use, rezonings or building-plan requirements before spending money.',
   'Have qualified professionals prepare regulated plans when required and submit through the official council.'],url:LOCAL_GOVERNMENT_URL},
 {id:'public-participation',title:'Ward committees, IDP and local budgets',why:'Community participation and Integrated Development Plans are local-government processes.',
  steps:['Use the official municipality page to check current ward, council and public-consultation notices.',
   'Review the current Integrated Development Plan and published deadline if public submissions are invited.',
   'Send feedback through the named municipal official channel; Luqi is not a council or consultation inbox.'],url:LOCAL_GOVERNMENT_URL},
 {id:'opportunities',title:'Municipal jobs, tenders and local suppliers',why:'Find original municipal notices, rather than assuming a directory link is an open tender or vacancy.',
  steps:['Use the selected municipality’s original vacancies, supply-chain or procurement page.',
   'Verify the individual post/reference, closing date, briefing, required documents and submission method.',
   'Complete applications only on the issuer’s official portal; Luqi can help prepare a checklist, never submit.'],url:NATIONAL_TENDER_URL}
];
export function detectMunicipalIntent(value:unknown):boolean{
 if(typeof value!=='string'||!value.trim()||value.length>500)return false;
 return /\b(?:municipalit(?:y|ies)|municipal services?|local council|local government|ward committee|indigent register|free basic (?:electricity|water|services)|municipal bill|municipal account|municipal rates|water outage|electricity outage|potholes?|streetlights?|refuse collection|waste collection|business licen[sc]e|hawker permit|trading permit|municipal zoning|municipal tender|municipal jobs|service delivery protest)\b/i.test(value);
}
export function detectTownshipEconomyIntent(value:unknown):boolean{
 if(typeof value!=='string'||!value.trim()||value.length>500)return false;
 return /\b(?:township econom(?:y|ies)|township business|township enterprise|township entrepreneur|rural entrepreneurship|trep|spaza shops?|spaza support fund|informal trad(?:e|er|ing)|street vend(?:or|ing)|tshisanyama|small enterprise funding|business permit for (?:food|market|stall)|hawker licen[sc]e|township manufacturing|township market|rural business funding)\b/i.test(value);
}
export function isMunicipalReviewFresh(now:Date):boolean{return Number.isFinite(now.getTime())&&now.getTime()<=Date.parse(MUNICIPAL_RECHECK_AFTER+'T23:59:59+02:00');}
