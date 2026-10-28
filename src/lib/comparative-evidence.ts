/** Dated, browser-local comparative study. No rankings of faiths or live source verification. */
export const EVIDENCE_REVIEWED_ON = '2026-10-28';
export const EVIDENCE_RECHECK_AFTER = '2027-01-28';
export type EvidenceTopic = 'creation' | 'human-origins' | 'flood' | 'nicaea' | 'quran-manuscript' | 'maat' | 'meditation';
export interface EvidenceSource { id: string; title: string; publisher: string; url: string; reviewedOn: string; }
const source = (id: string, title: string, publisher: string, url: string): EvidenceSource =>
  ({ id, title, publisher, url, reviewedOn: EVIDENCE_REVIEWED_ON });
export const EVIDENCE_SOURCES: readonly EvidenceSource[] = [
  source('genesis','Genesis chapter 1 and translation notes','Sefaria','https://www.sefaria.org/Genesis.1'),
  source('earth','How minerals and meteorites establish Earth’s age','NIST','https://www.nist.gov/how-do-you-measure-it/how-do-you-know-age-fossils-and-other-old-things'),
  source('universe','Age of Earth and the universe','NASA','https://science.nasa.gov/exoplanets/what-is-the-universe/'),
  source('carbon','Dating methods and the carbon-14 age limit','Smithsonian','https://humanorigins.si.edu/evidence/dating'),
  source('morocco','Jebel Irhoud and early Homo sapiens','Nature','https://www.nature.com/articles/nature22336'),
  source('morocco-dating','Thermoluminescence and ESR dating of Jebel Irhoud','Nature','https://www.nature.com/articles/nature22335'),
  source('flood-old','Old Babylonian flood narrative tablet','British Museum','https://www.britishmuseum.org/collection/object/W_1889-0426-234'),
  source('flood-gilgamesh','Gilgamesh tablet XI flood narrative','British Museum','https://www.britishmuseum.org/collection/object/W_SM-1881'),
  source('nicaea','Historical evidence about Nicaea and the New Testament canon','Journal of Early Christian History','https://www.tandfonline.com/doi/full/10.1080/21692327.2025.2564797'),
  source('quran','Birmingham Qur’an manuscript dating and conservation','University of Birmingham','https://www.birmingham.ac.uk/facilities/cadbury/birmingham-quran-mingana-collection/birmingham-quran/research-and-conservation'),
  source('maat','Ancient Egyptian figure of Maat','Metropolitan Museum of Art','https://www.metmuseum.org/art/collection/search/545360'),
  source('meditation','Meditation and mindfulness research limits','US NCCIH','https://www.nccih.nih.gov/health/meditation-and-mindfulness-effectiveness-and-safety'),
];
export interface EvidenceCase {
 id: EvidenceTopic; title: string; traditions: string; tradition: string;
 empirical: string; history: string; interpretation: string; summary: string; sourceIds: readonly string[];
}
export const EVIDENCE_CASES: readonly EvidenceCase[] = [
 { id:'creation',title:'Six days and the age of Earth', traditions:'Jewish and Christian Genesis traditions',
   tradition:'Genesis 1 narrates creation across six days. Believers and scholars differ on literal, poetic and theological readings. A roughly 6,000-year chronology is a later interpretation, not a date stated in Genesis.',
   empirical:'Radiometric dating supports an Earth about 4.54 billion years old; astronomical evidence places the universe at about 13.8 billion years. Carbon-14 is not used to date the Earth and usually applies only to organic material tens of thousands of years old.',
   history:'Genesis has a complex history of manuscripts and interpretation. The Hebrew term yom must be read in context; its range of meanings does not prove that each creation day refers to a geological epoch.',
   interpretation:'A literal 6,000-year-old Earth conflicts with independent measurements. Those measurements cannot experimentally determine whether a divine creator exists or settle spiritual meanings.',
   summary:'Luqi distinguishes the measurable physical age of Earth from questions of faith and interpretation.',sourceIds:['genesis','earth','universe','carbon'] },
 { id:'human-origins',title:'Human origins and Adam and Eve',traditions:'Abrahamic traditions and African palaeoanthropology',
   tradition:'Adam and Eve appear in Abrahamic traditions, which contain different theological readings. A literal first-couple chronology is not the same thing as a scientific population history.',
   empirical:'Evolutionary evidence establishes deep human ancestry in Africa. Early Homo sapiens fossils from Jebel Irhoud are in MOROCCO, not South Africa, and date to approximately 315,000 years ago.',
   history:'Researchers dated associated heated flints with thermoluminescence and considered additional methods. They did not use carbon-14 to date 300,000-year-old human fossils.',
   interpretation:'Fossil and genetic evidence contradict humanity first arising only 6,000 years ago. Whether Adam and Eve are literal, symbolic or theological figures is debated within traditions.',
   summary:'Include African discoveries accurately while distinguishing biological evolution from spiritual interpretations.',sourceIds:['morocco','morocco-dating','carbon'] },
 { id:'flood',title:'Flood traditions: Genesis and Mesopotamia',traditions:'Ancient Mesopotamian and biblical literature',
   tradition:'Genesis recounts a flood; flood narratives also appear in Mesopotamian literature, including Babylonian texts and the Epic of Gilgamesh.',
   empirical:'Existing clay tablets demonstrate that the narratives circulated; their existence alone does not establish a worldwide geological flood.',
   history:'The British Museum holds an Old Babylonian flood tablet and later Assyrian copies of the Gilgamesh story. Dates of surviving artifacts differ from dates of original oral or written compositions.',
   interpretation:'Parallels warrant literary comparison but do not by themselves prove that a known author copied another or validate every narrated event.',
   summary:'Compare artifacts, contexts and chronology without asserting direct borrowing as an established fact.',sourceIds:['flood-old','flood-gilgamesh'] },
 { id:'nicaea',title:'Did Nicaea select the books of the Bible?',traditions:'Christian textual and council history',
   tradition:'Some modern accounts say the Council of Nicaea in 325 CE selected the entire New Testament canon.',
   empirical:'Laboratory science cannot adjudicate canon formation; historians examine dated documentary records instead.',
   history:'A study of ancient church histories finds no contemporaneous basis for the claim that Nicaea chose the New Testament canon. Canon development took place over an extended period.',
   interpretation:'Documented later changes, councils and translations merit separate study, not an unverified claim that Nicaea invented the Bible.',
   summary:'Treat dated primary records and the limits of what they establish more seriously than popular retellings.',sourceIds:['nicaea'] },
 { id:'quran-manuscript',title:'The Birmingham Qur’an manuscript',traditions:'Islamic tradition and early manuscript research',
   tradition:'Muslims understand the Qur’an as divine revelation. Manuscript analysis studies surviving physical copies, not the metaphysical truth of revelation.',
   empirical:'Radiocarbon analysis dated the Birmingham manuscript’s animal-skin parchment to 568–645 CE with 95.4% probability. This dates the parchment, not directly the day the ink was written.',
   history:'The fragments preserve parts of surahs 18–20 in an early form of Arabic script. Conservation research examined inks and found no underlying erased manuscript.',
   interpretation:'Early manuscript evidence informs textual transmission; parchment dating alone neither proves nor refutes revelation as a faith claim.',
   summary:'Distinguish parchment dates, writing, textual variants and theology.',sourceIds:['quran'] },
 { id:'maat',title:'Maat, ancient Kemet and African ethics',traditions:'Ancient Egyptian thought and diverse living African traditions',
   tradition:'Maat represents truth, justice and order in ancient Egypt. Badimo, Amadlozi and other living African traditions should not be collapsed into one uniform religion.',
   empirical:'Museum inscriptions and artifacts can document historic practices. They cannot independently test the existence of spirits or divine beings.',
   history:'The Met documents representations of Maat associated with justice and balance, grounding ancient Egyptian ethics in material evidence.',
   interpretation:'Claims that a fixed set of “42 Laws of Maat” directly caused later scriptures need specific textual transmission evidence. Earlier dates or shared ethical concepts alone do not demonstrate copying.',
   summary:'Center African records without presenting contested historical influence as established fact.',sourceIds:['maat'] },
 { id:'meditation',title:'Meditation and the brain',traditions:'Buddhist practices and contemporary mindfulness',
   tradition:'Buddhist meditation traditions vary. Modern clinical mindfulness interventions do not reproduce every spiritual, ethical or doctrinal aspect.',
   empirical:'Research has examined changes in brain activity and well-being, but NCCIH warns that neuroimaging findings are difficult to interpret and practical implications remain uncertain.',
   history:'Clinical research and historical Buddhist teachings answer different kinds of questions; one cannot be substituted for the other.',
   interpretation:'A study suggesting a benefit in one group does not establish that fMRI proves every meditation practice, universal neuroplasticity benefits or Buddhist metaphysics.',
   summary:'Explain measurable clinical outcomes with study limitations while keeping religious meaning distinct.',sourceIds:['meditation'] },
];
export function evidenceSourcesFor(item: EvidenceCase): EvidenceSource[] {
  return item.sourceIds.map(id => {
    const entry = EVIDENCE_SOURCES.find(s => s.id === id);
    if (!entry) throw new Error('Missing reviewed comparative evidence source: ' + id);
    return entry;
  });
}
export function evidenceIsCurrent(date: Date = new Date()): boolean {
 const time = date.getTime();
 return Number.isFinite(time) &&
  time >= Date.parse('2026-10-28T00:00:00+02:00') &&
  time <= Date.parse('2027-01-28T23:59:59+02:00');
}
/** Narrow opt-in local-topic recognition, not generic religious inference. */
export function detectEvidenceTopic(value: unknown): EvidenceTopic | null {
 if (typeof value !== 'string' || value.length > 500 || !value.trim()) return null;
 const q = value.toLowerCase();
 if (/\b(nicaea|nicea|nicene council|new testament canon)\b/u.test(q)) return 'nicaea';
 if (/birmingham.{0,15}(qur.?an|koran)/u.test(q) || /(qur.?an|koran).{0,60}(manuscript|radiocarbon|oldest copy)/u.test(q)) return 'quran-manuscript';
 if (/(ma.?at|kemet|kemetic)/u.test(q) && /(egypt|truth|law|ethics|justice|religion|belief|history)/u.test(q)) return 'maat';
 if (/\b(gilgamesh|mesopotamian flood|babylonian flood)\b/u.test(q) || /\b(genesis|bible)\b.{0,65}\b(noah|flood)\b/u.test(q)) return 'flood';
 if (/\b(buddhist|buddhism|meditation|mindfulness)\b.{0,90}\b(brain|fmri|neuroplasticity|neuroscience|science|evidence)\b/u.test(q) ||
     /\b(brain|neuroscience)\b.{0,90}\b(meditation|mindfulness)\b/u.test(q)) return 'meditation';
 if (/\b(adam and eve|homo sapiens|human evolution|first humans)\b/u.test(q) && /\b(fossil|evolution|science|africa|genesis|6000|6,000|origin)\b/u.test(q)) return 'human-origins';
 if (/\b(six days|6 days|six-day creation|6,000.year.old earth|6000.year.old earth|age of the earth in genesis|how old is earth according to (?:the )?bible)\b/u.test(q) ||
    /\b(genesis|biblical creation|creation story)\b.{0,90}\b(earth|six|days|science|age|evolution)\b/u.test(q)) return 'creation';
 return null;
}
