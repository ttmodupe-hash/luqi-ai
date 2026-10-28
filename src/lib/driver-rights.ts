/**
 * Source-linked South African driver guidance. Browser-local information only.
 * Checked against publicly available sources 2026-10-28; NOT lawyer approval,
 * a live regulatory feed, dispatch, law-enforcement verification or legal advice.
 */
export const DRIVER_REVIEWED_ON = '2026-10-28';
export const DRIVER_RECHECK_AFTER = '2026-11-11';
export const DRIVER_COUNTRY = 'South Africa';
export type DriverMode = 'stop' | 'bribe' | 'search' | 'fine' | 'arrest';
export type DriverTopic = 'stopping' | 'identity' | 'recording' | 'search' | 'documents' | 'fines' | 'alcohol' | 'arrest' | 'reporting';

export interface DriverSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  reviewedOn: string;
}
export const DRIVER_SOURCES: readonly DriverSource[] = [
  { id: 'tshwane', title: 'Motorist rights and responsibilities at a traffic stop', publisher: 'City of Tshwane', url: 'https://www.tshwane.gov.za/?p=38400', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'officer-id', title: 'National Road Traffic Act section 3A: appointment and certificates', publisher: 'National Road Traffic Act (consolidated)', url: 'https://api.acts.co.za/national-road-traffic-act-1996/3a_appointment_of_officers.php', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'traffic-powers', title: 'National Road Traffic Act section 3I: officer powers and receipts', publisher: 'National Road Traffic Act (consolidated)', url: 'https://www.acts.co.za/national-road/3i_powers_and_duties_of_traffic_officer', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'police-search', title: 'South African Police Service Act section 13: roadblocks and searches', publisher: 'South African Police Service Act (consolidated)', url: 'https://www.acts.co.za/south-african-police-service-act-1995/13__members', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'criminal-search', title: 'Criminal Procedure Act sections 20–23: search and seizure', publisher: 'LawLibrary consolidated legislation', url: 'https://lawlibrary.org.za/akn/za/act/1977/51/eng%402024-04-03', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'road-alcohol', title: 'National Road Traffic Act section 65: breath, blood and two-hour evidentiary presumptions', publisher: 'National Road Traffic Act (consolidated)', url: 'https://api.acts.co.za/national-road-traffic-act-1996/65_driving_while_under_the_influence_of_intoxicating_liquor_or_drug_having_narcotic_effect_or_with_excessive_amount.php', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'aarto-faq', title: 'AARTO infringements and arrest FAQ', publisher: 'Road Traffic Infringement Authority', url: 'https://www.rtia.co.za/faq.php?read=more', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'aarto-rollout', title: '2 September 2026: phased AARTO rollout and demerit timetable', publisher: 'South African Government / Department of Transport', url: 'https://www.gov.za/news/speeches/minister-barbara-creecy-road-safety-practitioners-colloquium-02-sep-2026', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'cpa-fines', title: 'Section 56 and 341 notices under the criminal procedure system', publisher: 'City of Cape Town', url: 'https://www.capetown.gov.za/local-and-communities/transport-and-vehicles/vehicles-and-driving/understanding-traffic-fines/', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'constitution', title: 'Constitution Bill of Rights, particularly section 35', publisher: 'Department of Justice and Constitutional Development', url: 'https://www.justice.gov.za/legislation/constitution/chp02.html', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'hotlines', title: 'Official fraud and corruption reporting hotlines', publisher: 'South African Government', url: 'https://www.gov.za/anti-corruption/hotlines', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'saps-emergency', title: '10111 police emergency service', publisher: 'South African Police Service', url: 'https://www.saps.gov.za/services/cc_10111.php', reviewedOn: DRIVER_REVIEWED_ON },
  { id: 'saps-service', title: 'SAPS service complaints centre (not for emergencies)', publisher: 'South African Police Service', url: 'https://www.saps.gov.za/services/service_complaints_centre.php', reviewedOn: DRIVER_REVIEWED_ON },
] as const;

export interface DriverFact {
  id: string;
  topic: DriverTopic;
  title: string;
  summary: string;
  sourceIds: readonly string[];
}
export const DRIVER_FACTS: readonly DriverFact[] = [
  {
    id: 'safe-stop', topic: 'stopping', title: 'Stop when lawfully directed',
    summary: 'Signal and stop at the first safe, appropriate place, following an officer’s lawful direction. Keep your hands visible and explain before reaching for your documents. If you genuinely suspect an impersonator or immediate danger, do not simply speed away: signal your intention, seek help using 10111 when safe, and follow real-time police safety instructions. Luqi cannot verify an officer or authorise you to ignore a stop.',
    sourceIds: ['tshwane', 'traffic-powers', 'saps-emergency'],
  },
  {
    id: 'officer-identity', topic: 'identity', title: 'Ask who the officer is',
    summary: 'You may politely request a traffic officer’s certificate of appointment when you have a material interest. Section 3A requires authorised officers to carry and produce it on such request; uniformed traffic officers must display a name tag. Request the officer’s name and agency if uncertain. A refusal is grounds to note the facts and complain, not permission to flee or obstruct a lawful stop.',
    sourceIds: ['officer-id', 'tshwane'],
  },
  {
    id: 'film', topic: 'recording', title: 'Recording is not a licence to interfere',
    summary: 'The City of Tshwane recognises motorists’ ability to record proceedings and protection against arbitrary seizure or forced deletion. Record only if safe, without obstructing officers, endangering yourself or exposing unrelated people. A phone or recording may still be seized where lawful evidence-seizure powers genuinely apply. Never secretly reach for a device during a tense stop.',
    sourceIds: ['tshwane', 'criminal-search', 'constitution'],
  },
  {
    id: 'search-basis', topic: 'search', title: 'Vehicle searches depend on their legal basis',
    summary: 'A lawful warrant, valid consent, specified warrantless-search conditions, an arrest-related search or an authorised roadblock/checkpoint can permit a search. Ordinary suspicion alone is not an unlimited search power. You can calmly ask whether the search is under a warrant, specific law or valid roadblock authority. Do not physically resist; preserve details for legal review afterward.',
    sourceIds: ['criminal-search', 'police-search', 'tshwane'],
  },
  {
    id: 'licence', topic: 'documents', title: 'Produce your licence; seizure has legal exceptions',
    summary: 'Provide your driving licence and lawfully requested identification or vehicle documents. A traffic officer may impound a prescribed document if they consider it evidence of a road-traffic contravention, but must issue a receipt under section 3I. They cannot confiscate property merely to intimidate or extract money. Ask for the legal basis and a receipt, then dispute any irregularity safely.',
    sourceIds: ['traffic-powers', 'tshwane'],
  },
  {
    id: 'payment', topic: 'fines', title: 'Do not pay an officer personally',
    summary: 'Request the official notice/reference and verify payment using the issuing authority’s authorised channel. Do not offer a bribe, hand cash to an officer personally or transfer to a private account. AARTO administrative notices and Criminal Procedure Act sections 56/341 notices are different processes. Legitimate authorised payment centres may accept cash with receipts; “no cash anywhere” is not the law.',
    sourceIds: ['tshwane', 'aarto-faq', 'cpa-fines', 'hotlines'],
  },
  {
    id: 'warrants', topic: 'fines', title: 'An unpaid fine is not itself an arrest warrant',
    summary: 'RTIA says unpaid AARTO infringement notices are administrative, not arrest grounds. Where criminal procedure applies, failure to appear on a properly served summons may lead to a court warrant, and separate serious traffic offences can justify arrest. Ask the officer to explain and identify the lawful basis for any arrest; never resist. Confirm your municipality and notice because AARTO rollout is phased.',
    sourceIds: ['aarto-faq', 'cpa-fines', 'aarto-rollout', 'constitution'],
  },
  {
    id: 'sobriety', topic: 'alcohol', title: 'Do not refuse a lawful breath or blood specimen',
    summary: 'National Road Traffic Act section 65(9) prohibits refusal of a breath or blood specimen. The statute contains two-hour evidentiary presumptions; do not assume every later sample is automatically unlawful or invalid. Procedures, medical personnel, the allegation and your rights should be reviewed by a qualified lawyer in a specific case.',
    sourceIds: ['road-alcohol', 'constitution'],
  },
  {
    id: 'arrested', topic: 'arrest', title: 'If arrested, ask for legal help',
    summary: 'Do not resist. Ask why you are being arrested. Section 35 of the Constitution protects the right to remain silent and to consult a legal practitioner; detained people have further rights. Ask for help communicating with a lawyer or trusted person as soon as reasonably possible. Luqi cannot decide whether the arrest is lawful.',
    sourceIds: ['constitution'],
  },
  {
    id: 'report', topic: 'reporting', title: 'Report corruption after you are safe',
    summary: 'If money was demanded, stay safe and do not confront the officer for a recording. Later, note the time, location, officer/vehicle identifying details and your own recollection. South Africa’s official National Traffic Call Centre is 0861 400 800 (not toll free). The government also lists anti-corruption channels, and SAPS has a separate non-emergency service complaints process.',
    sourceIds: ['hotlines', 'saps-service'],
  },
];
export const DRIVER_TOPICS: readonly { id: DriverTopic; label: string }[] = [
  { id: 'stopping', label: 'Stopping safely' },
  { id: 'identity', label: 'Officer ID' },
  { id: 'recording', label: 'Filming' },
  { id: 'search', label: 'Searches' },
  { id: 'documents', label: 'Driver’s licence' },
  { id: 'fines', label: 'Fines and warrants' },
  { id: 'alcohol', label: 'Breath / blood' },
  { id: 'arrest', label: 'If arrested' },
  { id: 'reporting', label: 'Reporting misconduct' },
];
export interface DriverQuickGuide {
  label: string;
  title: string;
  steps: readonly [string, string, string];
  detail: string;
}
export const DRIVER_QUICK: Record<DriverMode, DriverQuickGuide> = {
  stop: {
    label: 'Being stopped', title: 'Luqi roadside safety — three immediate steps',
    steps: [
      'Signal and pull over safely when lawfully directed. Do not use your phone while driving.',
      'Stay calm, keep hands visible and follow lawful instructions. Say before reaching for documents.',
      'When safely stopped, politely ask for officer identification. If fined, request an official notice, not a personal cash demand.',
    ],
    detail: 'If you believe the person stopping you is an impersonator or poses an immediate threat, seek real-time police assistance at 10111. Do not assume you are free to ignore the stop.',
  },
  bribe: {
    label: 'Money demanded', title: 'Luqi roadside safety — money demanded',
    steps: [
      'Put your safety first. Do not confront, threaten or secretly reach for a phone.',
      'Do not offer or agree to a personal payment. Calmly request the official written notice and payment reference.',
      'Once safe, note the facts and report suspected misconduct through official channels. Luqi does not send the report.',
    ],
    detail: 'Formal fines and authorised payment points differ by jurisdiction; a cash demand to the officer personally is a red flag.',
  },
  search: {
    label: 'Vehicle search', title: 'Luqi roadside safety — requested search',
    steps: [
      'Stay calm and avoid physical resistance.',
      'Ask respectfully what legal power, warrant or roadblock authority applies; do not assume you can stop a lawful search.',
      'If safe, remember the officer’s name, time and what was searched; seek legal review afterward.',
    ],
    detail: 'Different rules apply at authorised roadblocks, during arrest and in specified warrantless-search situations.',
  },
  fine: {
    label: 'Fine or warrant', title: 'Luqi roadside safety — fine or warrant',
    steps: [
      'Ask what notice or warrant is involved and which authority issued it.',
      'Do not pay an officer or private account personally; verify the reference through the official process.',
      'Do not resist a claimed arrest. Ask the reason, request legal assistance and verify the matter afterward.',
    ],
    detail: 'AARTO administrative notices and court-based Criminal Procedure Act proceedings have different consequences.',
  },
  arrest: {
    label: 'Being arrested', title: 'Luqi roadside safety — arrest',
    steps: [
      'Do not resist or make sudden movements. Tell the officer if you need urgent medical assistance.',
      'Ask the reason for the arrest. You have constitutional rights including silence and legal counsel.',
      'Request a lawyer and, when safe, ask to inform a trusted person. Luqi cannot intervene or dispatch help.',
    ],
    detail: 'These are general constitutional protections, not an assessment of any specific arrest.',
  },
};
export function driverGuideIsCurrent(now: Date = new Date()): boolean {
  const t = now.getTime();
  return Number.isFinite(t) &&
    t >= Date.parse('2026-10-28T00:00:00+02:00') &&
    t <= Date.parse('2026-11-11T23:59:59+02:00');
}
export function driverSourcesFor(fact: DriverFact): DriverSource[] {
  return fact.sourceIds.map(id => {
    const source = DRIVER_SOURCES.find(item => item.id === id);
    if (!source) throw new Error('Missing vetted source for driver guide: ' + id);
    return source;
  });
}
/** Narrow, safe local intent classification: no location, call, recording or inference. */
export function detectDriverMode(input: unknown): DriverMode | null {
  if (typeof input !== 'string' || input.length > 500) return null;
  const q = input.trim().toLowerCase();
  if (!q) return null;
  if (/\b(cop|officer|police|traffic police|traffic officer|metro police)\b.{0,70}\b(wants money|asking for money|asked for money|bribe|cash|pay him|pay her|extort)/u.test(q) ||
      /\b(bribe|bribery|extortion)\b.{0,75}\b(police|cop|traffic|officer|roadblock)\b/u.test(q)) return 'bribe';
  if (/\b(police|cop|officer|traffic|roadblock)\b.{0,70}\b(search|searching|searched)\b.{0,25}\b(car|vehicle|boot|trunk|me)\b/u.test(q) ||
      /\b(searching my car|search my car|vehicle search|search my vehicle)\b/u.test(q)) return 'search';
  if (/\b(i (?:am|m)|i'm|im|we are|i was)\s+(?:being\s+)?arrested\b/u.test(q) ||
      /\b(police|officer|cop)\b.{0,50}\b(arresting me|arrested me)\b/u.test(q)) return 'arrest';
  if (/\b(traffic fine|traffic ticket|unpaid fines?|speeding fines?|arrest warrant|roadblock fine)\b/u.test(q)) return 'fine';
  if (/\b(pulled over|pulling me over|being pulled over|traffic stop|at a roadblock|stopped by (the )?(?:traffic )?police|officer is stopping me)\b/u.test(q)) return 'stop';
  return null;
}
