/**
 * Local editorial reading records, NOT live AI retrieval.
 * Stable source ids join each historical claim to original-object and
 * scholarship passages. Source dates are not changed by opening a page.
 */
export const AFRICAN_HISTORY_REVIEWED_ON = '2026-11-02';
export const AFRICAN_HISTORY_REVIEW_DUE = '2027-02-02';
export type AfricanHistoryTopic = 'aksum' | 'conversion' | 'timbuktu' | 'networks';
export type EvidenceStatus = 'catalogued-object' | 'attributed-tradition' | 'scholarly-reconstruction';
export interface HistorySource {
 id:string; publisher:string; title:string; url:string; passage:string;
 region:string; kind:'manuscript-catalogue'|'religious-text'|'archaeology'|'heritage';
 lastSubstantiveCheck:string; nextReviewDue:string;
}
export interface HistoryClaim {
 id:string; statement:string; status:EvidenceStatus; uncertainty:string; sourceIds:readonly string[];
}
export interface HistoryLesson {
 id:AfricanHistoryTopic; question:string; short:string; deeper:string;
 claims:readonly HistoryClaim[]; next:readonly AfricanHistoryTopic[];
}
const source=(id:string,publisher:string,title:string,url:string,passage:string,region:string,kind:HistorySource['kind']):HistorySource=>
 ({id,publisher,title,url,passage,region,kind,lastSubstantiveCheck:AFRICAN_HISTORY_REVIEWED_ON,nextReviewDue:AFRICAN_HISTORY_REVIEW_DUE});
export const HISTORY_SOURCES:readonly HistorySource[]=[
 source('aksum-research','Antiquity / Cambridge University Press','The archaeology of complexity and cosmopolitanism in medieval Ethiopia: an introduction',
 'https://www.cambridge.org/core/journals/antiquity/article/archaeology-of-complexity-and-cosmopolitanism-in-medieval-ethiopia-an-introduction/4F3CD1227F4A53E7732F4DAD9BE21F30','Islam and Muslim polities','Horn of Africa','archaeology'),
 source('bilal-hadith','Sahih al-Bukhari (Sunnah.com transcript)','Hadith 604, Book of Adhan',
 'https://sunnah.com/bukhari:604','Book 10, hadith 2','Arabia; African connections','religious-text'),
 source('fenwick','UCL Discovery / Corisande Fenwick','Conquest to Conversion: The Archaeology of Religious Transformation in Early Medieval North Africa',
 'https://discovery.ucl.ac.uk/id/eprint/10167594/','Abstract and regional interpretation','North Africa','archaeology'),
 source('loc-inheritance','Library of Congress / Mamma Haidara Commemorative Library','Islamic inheritance-law commentary, Timbuktu',
 'https://www.loc.gov/exhibits/mali/mali-exhibit.html#obj3','Exhibit object 3: Law of Inheritance','Timbuktu, Mali','manuscript-catalogue'),
 source('loc-arithmetic','Library of Congress / Mamma Haidara Commemorative Library','Arithmetic primer and commentary',
 'https://www.loc.gov/exhibits/mali/mali-exhibit.html#obj11','Exhibit object 11: Arithmetic Primer','Timbuktu, Mali','manuscript-catalogue'),
 source('loc-astronomy','Library of Congress / Mamma Haidara Commemorative Library','Structure of the Heavens',
 'https://www.loc.gov/exhibits/mali/mali-exhibit.html#obj1','Exhibit object 1: Structure of the Heavens','Timbuktu, Mali','manuscript-catalogue'),
 source('unesco','UNESCO World Heritage Centre','Timbuktu',
 'https://whc.unesco.org/en/list/119/','Brief synthesis / criteria (ii), (iv), (v)','Mali','heritage'),
 source('cambridge-optics','Cambridge University Library / Peterhouse','Peterhouse MS 209, Alhacen: De aspectibus',
 'https://medieval.lib.cam.ac.uk/catalogue/Peterhouse/MS-PETERHOUSE-00209','Catalogue introduction, translator attribution','Egypt; medieval Latin Europe','manuscript-catalogue')
];
export const HISTORY_LESSONS:readonly HistoryLesson[]=[
 {id:'aksum',question:'How were early Muslims connected with Africa?',
 short:'Islamic historical tradition places early Muslim migrants at the Christian court of Aksum in the Horn of Africa around 615 CE. A hadith separately records Bilal as the caller to prayer. Neither record establishes a racial ranking of the first converts.',
 deeper:'The migration narrative reaches us through later Islamic literature and must be attributed as tradition; the modern archaeological literature describes the Christian Aksumite context. Bilal’s prayer-call report is not a birth certificate, conversion census or contemporary racial register.',
 claims:[
  {id:'aksum-migration',statement:'Researchers report the early migration to Aksum around 615 CE as a narrative from Islamic historical tradition.',status:'attributed-tradition',uncertainty:'The number of migrants and the ruler’s later religious identity are not independently settled here.',sourceIds:['aksum-research']},
  {id:'bilal-prayer',statement:'A narration in Sahih al-Bukhari 604 attributes a call to prayer to Bilal.',status:'attributed-tradition',uncertainty:'The report does not say he was the first person of a modern racial category to embrace Islam.',sourceIds:['bilal-hadith']}
 ],next:['conversion','timbuktu']},
 {id:'conversion',question:'Was the conquest of North Africa the same as conversion?',
 short:'No. Military conquest and population conversion are separate processes. North African communities adopted Islam at different rates, and archaeologists cannot assign one conversion date to all people of the region.',
 deeper:'Corisande Fenwick examines changes in inscriptions, buildings, burials and regional archaeological records. A mosque or change in political rule cannot by itself reveal the belief of each inhabitant. The histories of North African Amazigh societies must not be flattened into one race or kingdom.',
 claims:[
  {id:'regional-change',statement:'Fenwick’s archaeological synthesis finds regional variation in the transition from conquest to religious conversion.',status:'scholarly-reconstruction',uncertainty:'These are regional interpretations from incomplete material evidence, not exact population statistics.',sourceIds:['fenwick']},
  {id:'military-not-conversion',statement:'Political conquest and material signs of state patronage cannot establish that all residents converted at once.',status:'scholarly-reconstruction',uncertainty:'Different evidence types can imply different adoption rates and remain open to scholarly revision.',sourceIds:['fenwick']}
 ],next:['aksum','timbuktu']},
 {id:'timbuktu',question:'What was studied in Timbuktu?',
 short:'Surviving catalogued manuscripts record Islamic inheritance jurisprudence, arithmetic commentary and discussions of astronomy. They show African intellectual activity without proving that every copied or studied work was invented locally.',
 deeper:'The Library of Congress exhibits specific manuscript objects: an inheritance-law commentary (object 3), arithmetic primer (object 11) and celestial-text manuscript (object 1). The latter also includes horoscope material: historical astrology is not modern validated astronomy. UNESCO documents Timbuktu as an important centre for learning and manuscript exchange.',
 claims:[
  {id:'law',statement:'A catalogued Timbuktu manuscript concerns the rules of Islamic inheritance.',status:'catalogued-object',uncertainty:'An exhibited object is not a complete inventory of juristic schools or teaching.',sourceIds:['loc-inheritance']},
  {id:'arithmetic',statement:'A catalogued Timbuktu manuscript contains an arithmetic commentary.',status:'catalogued-object',uncertainty:'The commentary has earlier intellectual influences; exclusive invention is not established.',sourceIds:['loc-arithmetic']},
  {id:'astronomy',statement:'A catalogued Timbuktu manuscript discusses celestial motions and historical horoscope practice.',status:'catalogued-object',uncertainty:'Horoscopes are historical beliefs, not scientific predictions validated today.',sourceIds:['loc-astronomy']},
  {id:'schools',statement:'UNESCO describes Timbuktu as a historical centre of Islamic scholarship and manuscript trade.',status:'catalogued-object',uncertainty:'The heritage description alone does not authenticate every popular claim about the city.',sourceIds:['unesco']}
 ],next:['networks','conversion']},
 {id:'networks',question:'How did Islamic civilisations share scientific knowledge?',
 short:'Scholars, copyists and translators transmitted ideas across Africa, Asia and Europe, sometimes across religions. Islamic religious sciences, such as tafsir and jurisprudence, differ from mathematics, optics and medicine, though people and manuscripts moved between these fields.',
 deeper:'Cambridge catalogues Peterhouse MS 209 as a medieval Latin manuscript of Ibn al-Haytham’s optical treatise; the identity of its translator is not established with certainty. Timbuktu manuscript collections document African reading, writing and circulation in several fields. Historical medical claims must never replace current clinical advice.',
 claims:[
  {id:'optics',statement:'Cambridge catalogues Peterhouse MS 209 as a Latin transmission of Ibn al-Haytham’s work on optics.',status:'catalogued-object',uncertainty:'The translator attribution is disputed; no claim is made that one person invented all optics.',sourceIds:['cambridge-optics']},
  {id:'african-networks',statement:'Catalogued Timbuktu manuscripts show scholarly commentary in mathematics and religious law.',status:'catalogued-object',uncertainty:'Survival of specific examples does not establish a complete syllabus or all collaborators’ identities.',sourceIds:['loc-arithmetic','loc-inheritance']}
 ],next:['timbuktu','aksum']}
];
export function historyIsCurrent(now:Date=new Date()):boolean {
 const n=now.getTime();
 return Number.isFinite(n) &&
 n>=Date.parse(AFRICAN_HISTORY_REVIEWED_ON+'T00:00:00+02:00') &&
 n<=Date.parse(AFRICAN_HISTORY_REVIEW_DUE+'T23:59:59+02:00');
}
export function historyClaims(lesson:HistoryLesson,now:Date=new Date()):readonly HistoryClaim[]{
 return historyIsCurrent(now)?lesson.claims:[];
}
export function sourcesForClaims(claims:readonly HistoryClaim[]):HistorySource[]{
 return [...new Set(claims.flatMap(c=>c.sourceIds))].map(id=>{
  const found=HISTORY_SOURCES.find(s=>s.id===id);
  if(!found)throw new Error('Missing historical source for claim: '+id);
  return found;
 });
}
