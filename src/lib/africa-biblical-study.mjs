/** Curated learning content from the owner's approved review, checked against the
 * cited texts and records. No video transcript, racial ancestry inference or AI.
 */
export const BIBLICAL_EDITION = '2026-11-01';
export const BIBLICAL_REVIEW_DUE = '2027-02-01';
export const BIBLICAL_TITLE = 'Africa and African Peoples in the Bible';
export const BIBLICAL_LAYERS = [
  { id: 'text', label: 'Read the text' },
  { id: 'evidence', label: 'Explore the evidence' },
  { id: 'interpretation', label: 'Compare interpretations' },
  { id: 'reflection', label: 'Reflect and discuss' },
];
export const BIBLICAL_SOURCES = [
  { id: 'gen10', title: 'Genesis 10', publisher: 'USCCB', kind: 'Scriptural text', url: 'https://bible.usccb.org/bible/genesis/10', scope: 'NABRE English translation; the text of the genealogy, not genetic evidence.' },
  { id: 'gen9', title: 'Genesis 9:18–27', publisher: 'USCCB', kind: 'Scriptural text', url: 'https://bible.usccb.org/bible/genesis/9', scope: 'NABRE English translation; identifies the speaker and recipient of the curse.' },
  { id: 'geography', title: 'The Table of Nations: The Geography of the World in Genesis 10', publisher: 'John Day · TheTorah.com', kind: 'Scholarly interpretation', url: 'https://www.thetorah.com/article/the-table-of-nations-the-geography-of-the-world-in-genesis-10', scope: 'Named scholar’s geographical interpretation, published in 2022; not a DNA study or a statement of all religious views.' },
  { id: 'chron14', title: '2 Chronicles 14 and editorial notes', publisher: 'USCCB', kind: 'Text and commentary', url: 'https://bible.usccb.org/bible/2chronicles/14', scope: 'The Zerah narrative and the publisher’s historical interpretation are distinct.' },
  { id: 'kings19', title: '2 Kings 19:9', publisher: 'USCCB', kind: 'Scriptural text', url: 'https://bible.usccb.org/bible/2kings/19', scope: 'NABRE English translation; the report about Tirhakah, not independent military evidence.' },
  { id: 'taharqa', title: 'Shabti of Taharqo · object 18.2.10', publisher: 'The Metropolitan Museum of Art', kind: 'Material record', url: 'https://www.metmuseum.org/art/collection/search/544883', scope: 'Museum object dated 690–664 BCE; documents Kushite kingship, not every associated biblical event.' },
  { id: 'prism', title: 'Sennacherib’s prism · registration 1855,1003.1', publisher: 'British Museum · Google Arts & Culture', kind: 'Material record', url: 'https://artsandculture.google.com/asset/sennacherib-the-assyrian-lays-siege-to-jerusalem/jQGyPHzdLoU8lw', scope: 'A royal account of the 701 BCE campaign; read with awareness of its author’s political purpose.' },
  { id: 'jer38', title: 'Jeremiah 38:7–13', publisher: 'USCCB', kind: 'Scriptural text', url: 'https://bible.usccb.org/bible/jeremiah/38', scope: 'NABRE English translation of the rescue narrative.' },
  { id: 'jer39', title: 'Jeremiah 39:15–18', publisher: 'USCCB', kind: 'Scriptural text', url: 'https://bible.usccb.org/bible/jeremiah/39', scope: 'NABRE English translation of the promise to Ebed-Melech.' },
  { id: 'mark15', title: 'Mark 15:21', publisher: 'USCCB', kind: 'Scriptural text', url: 'https://bible.usccb.org/bible/mark/15', scope: 'NABRE English translation; identifies Simon’s place of origin, not his complexion.' },
  { id: 'cyrene', title: 'Archaeological Site of Cyrene', publisher: 'UNESCO World Heritage Centre', kind: 'Heritage record', url: 'https://whc.unesco.org/en/list/190', scope: 'Records the North African site in Libya; not an individual biography of Simon.' },
  { id: 'acts8', title: 'Acts 8:26–40 and editorial notes', publisher: 'USCCB', kind: 'Text and commentary', url: 'https://bible.usccb.org/bible/acts/8', scope: 'NABRE English translation and notes identifying Candace as a Nubian royal title.' },
  { id: 'aksum', title: 'Aksum: coins and Christian history', publisher: 'Ashmolean Museum · University of Oxford', kind: 'Museum interpretation', url: 'https://www.ashmolean.org/event/aksum-late-antique-empire-faith-africa', scope: 'Archived exhibition discussion of coins and fourth-century Christianity, not a current exhibition notice.' },
];
const layer = (body, sourceIds = []) => ({ body, sourceIds });
export const BIBLICAL_STUDIES = [
  {
    id: 'geography', title: 'The Table of Nations', reference: 'Genesis 10 · places and peoples',
    text: layer('Genesis 10 names Cush, Mizraim, Put and Canaan among Ham’s descendants. It describes peoples through genealogy, languages and territories.', ['gen10']),
    evidence: layer('John Day identifies Mizraim with Egypt, Cush principally with Nubia, Put with Libya and Canaan with the Levant. Ancient regional names and modern national borders are not interchangeable.', ['geography']),
    interpretation: layer('Day reads the chapter as geographical literature. Ham’s name has an uncertain origin; a fixed meaning of “black” or “burnt” should not be presented as established. This study does not use the genealogy to assign modern racial ancestry.', ['geography']),
    reflection: layer('Learning activity: compare an ancient-region map with a modern political map. Which labels refer to places, language groups or families? Explain why belonging and human dignity need not depend on proving a biblical ancestor.'),
  },
  {
    id: 'canaan', title: 'Read the curse carefully', reference: 'Genesis 9:18–27 · words and interpretation',
    text: layer('Noah speaks the curse, and Canaan is its named recipient. The passage does not describe skin turning black or pronounce a collective curse on Black Africans.', ['gen9']),
    evidence: layer('The chapter lets the reader check who speaks and who is named. A textual claim can be checked against the passage without treating it as biological evidence.', ['gen9']),
    interpretation: layer('Do not replace one inaccurate generalisation with another: Canaan is himself listed among Ham’s descendants. The accurate correction is that the curse is not extended by this passage to all Ham’s descendants or to a modern racial group.', ['gen9', 'gen10']),
    reflection: layer('Learning activity: identify the speaker, named recipient and anything later retellings add. Apply the same reading habit to a public report: separate the document’s words from the headline about it.'),
  },
  {
    id: 'nimrod', title: 'Nimrod and early kingdoms', reference: 'Genesis 10:8–12 · genealogy and cities',
    text: layer('Nimrod is Cush’s son and therefore Ham’s grandson in this genealogy. The narrative portrays a powerful hunter and ruler and associates his kingdom with cities in Shinar, including Babel, Erech and Akkad.', ['gen10']),
    evidence: layer('The passage is evidence for the literary portrayal. This study supplies no independently identified inscription establishing Nimrod as the historical founder of those cities.', ['gen10']),
    interpretation: layer('“Early empire builder” can describe a reading of his literary role. It should not be presented as an archaeological identification or a complete history of the cities’ origins.', ['gen10']),
    reflection: layer('Learning activity: draw the relationships Ham → Cush → Nimrod. Then distinguish a genealogical relationship, a statement about a kingdom and a claim about a city’s foundation.'),
  },
  {
    id: 'kings', title: 'Zerah, Taharqa and historical evidence', reference: '2 Chronicles 14 · 2 Kings 19 · museum records',
    text: layer('Chronicles narrates Zerah’s campaign against Asa. Separately, 2 Kings reports that Tirhakah was advancing against Assyria. These are different episodes and must not be collapsed into one event.', ['chron14', 'kings19']),
    evidence: layer('The Met records a shabti of Taharqo dated 690–664 BCE. The British Museum’s prism account describes Sennacherib’s Judah campaign of 701 BCE. The latter date precedes Taharqa’s reign; an object’s existence does not settle every detail of the biblical episode.', ['taharqa', 'prism']),
    interpretation: layer('The USCCB commentary questions a straightforward historical reading of Zerah’s campaign. That commentary is an interpretation, distinct from the passage. Keep Zerah’s uncertain identification separate from the materially attested Kushite ruler Taharqa, and do not label the siege’s outcome archaeologically proven.', ['chron14', 'taharqa', 'prism']),
    reflection: layer('Learning activity: place 701 BCE and 690–664 BCE on a timeline. What can a named royal object establish? What additional evidence would a claim about a battle need?'),
  },
  {
    id: 'ebed', title: 'Ebed-Melech: courage and compassion', reference: 'Jeremiah 38:7–13; 39:15–18',
    text: layer('Jeremiah portrays Ebed-Melech, a Cushite court official, appealing to the king and rescuing Jeremiah with ropes cushioned by rags. Chapter 39 records a promise of protection because he trusted in God.', ['jer38', 'jer39']),
    evidence: layer('His African designation and actions are explicit in the narrative. This lesson does not supply independent archaeological evidence for the individual rescue.', ['jer38', 'jer39']),
    interpretation: layer('The linked English edition uses “Ethiopian”; Cushite is another rendering of the designation. Do not silently equate an ancient label with a modern nationality. The story’s spiritual promise remains a theological claim within the text.', ['jer38', 'jer39', 'geography']),
    reflection: layer('Discussion: what makes the rescue compassionate as well as courageous? Identify a way to help someone facing unfair treatment without assuming that institutions are always right or always wrong.'),
  },
  {
    id: 'simon', title: 'Simon of Cyrene', reference: 'Mark 15:21 · North African geography',
    text: layer('Mark identifies Simon as a Cyrenian and recounts his being compelled to carry Jesus’s cross. The verse does not specify his complexion.', ['mark15']),
    evidence: layer('UNESCO records Cyrene as an archaeological site in Libya. That establishes geographical context, not Simon’s individual ancestry or a portrait of him.', ['cyrene']),
    interpretation: layer('Recognise the North African connection without turning a place of origin into a complete racial biography. An artist’s reconstruction must be labelled as an illustration, not a photograph or archaeological likeness.', ['mark15', 'cyrene']),
    reflection: layer('Learning activity: sort these claims into stated, contextual and unknown: Simon is a Cyrenian; Cyrene is in North Africa; Simon’s precise appearance. What could support a stronger conclusion?'),
  },
  {
    id: 'acts', title: 'An African official and early Christianity', reference: 'Acts 8:26–40 · Aksumite coins',
    text: layer('Acts describes an official responsible for the Candace’s treasury, reading Isaiah, receiving baptism from Philip and continuing his journey joyfully. The publisher’s notes identify Candace as a Nubian royal title, not simply a personal name.', ['acts8']),
    evidence: layer('The Ashmolean describes Christian symbols on fourth-century Aksumite coins, from a kingdom centred in Eritrea and northern Ethiopia. This is separate material evidence for ancient African Christianity, not evidence that the Acts official founded that institution.', ['aksum']),
    interpretation: layer('The supplied documentary review connects the official with later Ethiopian church origins. Acts itself does not document a church foundation or an uninterrupted institutional lineage. Keep that proposed traditional connection distinct from the baptism narrative and the dated coin evidence.', ['acts8', 'aksum']),
    reflection: layer('Discussion: how does an African official’s active reading and questioning change the way you picture the narrative? Compare a text, a later community tradition and a coin: what question can each answer?'),
  },
];
export const BIBLICAL_QUIZ = [
  { id: 'parent', question: 'Who is Nimrod’s father in Genesis 10?', options: ['Cush', 'Ham', 'Canaan'], correct: 0, explanation: 'Cush is the father; Ham is the grandfather. Read Genesis 10:6–8.', sourceIds: ['gen10'] },
  { id: 'curse', question: 'Who speaks the curse and who is named in Genesis 9?', options: ['Noah names Canaan', 'God names all Africans', 'Ham names Cush'], correct: 0, explanation: 'The passage identifies Noah as the speaker and Canaan as the recipient; it does not describe a change in skin colour.', sourceIds: ['gen9'] },
  { id: 'object', question: 'What does a shabti attributed to Taharqa directly support?', options: ['Every account of the siege', 'Material evidence associated with the ruler', 'Simon’s complexion'], correct: 1, explanation: 'The object provides material evidence associated with Taharqa. It cannot alone authenticate every narrative about his military role.', sourceIds: ['taharqa'] },
  { id: 'baptism', question: 'Which event does Acts 8 narrate?', options: ['A documented national church foundation', 'A fourth-century coin issue', 'The official’s baptism by Philip'], correct: 2, explanation: 'Acts recounts baptism and the onward journey. The history of later institutions requires additional evidence.', sourceIds: ['acts8'] },
];
export function biblicalSource(id) {
  const source = BIBLICAL_SOURCES.find(value => value.id === id);
  if (!source) throw new Error('Unknown biblical-study source');
  return source;
}
export function biblicalStudyIsCurrent(date = new Date()) {
  const time = date instanceof Date ? date.getTime() : NaN;
  return Number.isFinite(time) && time >= Date.parse('2026-11-01T00:00:00+02:00') && time <= Date.parse('2027-02-01T23:59:59+02:00');
}
/** Bound choices to fixed data; never interpret supplied HTML or external IDs. */
export function checkBiblicalAnswer(questionId, answer) {
  const item = BIBLICAL_QUIZ.find(value => value.id === questionId);
  if (!item || !Number.isInteger(answer) || answer < 0 || answer >= item.options.length) return null;
  return { correct: answer === item.correct, explanation: item.explanation, sourceIds: [...item.sourceIds] };
}
