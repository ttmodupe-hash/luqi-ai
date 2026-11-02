import { describe, expect, it } from 'vitest';
import { EVIDENCE_CASES, EVIDENCE_SOURCES, EVIDENCE_RECHECK_AFTER,
  detectEvidenceTopic, evidenceIsCurrent, evidenceSourcesFor } from '../src/lib/comparative-evidence';
describe('local comparative evidence source and method boundaries', () => {
 it('offers seven distinct source-linked studies with four evidence layers', () => {
   expect(EVIDENCE_CASES).toHaveLength(7);
   const ids = EVIDENCE_SOURCES.map(s => s.id);
   expect(new Set(ids).size).toBe(ids.length);
   const hosts = new Set(['www.sefaria.org','www.nist.gov','science.nasa.gov','humanorigins.si.edu',
     'www.nature.com','www.britishmuseum.org','www.tandfonline.com','www.birmingham.ac.uk',
     'www.metmuseum.org','www.nccih.nih.gov']);
   for (const s of EVIDENCE_SOURCES) {
     const u = new URL(s.url); expect(u.protocol).toBe('https:');
     expect(u.username + u.password).toBe('');
     expect(hosts.has(u.hostname)).toBe(true);
     expect(s.reviewedOn).toBe('2026-10-28');
   }
   for (const item of EVIDENCE_CASES) {
     expect(item.tradition.length).toBeGreaterThan(65);
     expect(item.empirical.length).toBeGreaterThan(65);
     expect(item.history.length).toBeGreaterThan(65);
     expect(item.interpretation.length).toBeGreaterThan(65);
     expect(evidenceSourcesFor(item).length).toBeGreaterThan(0);
     expect(item.sourceIds.every(id => ids.includes(id))).toBe(true);
   }
 });
 it('does not confuse radiometric dating, carbon dating, locations or faith claims', () => {
   const byId = (id: string) => EVIDENCE_CASES.find(item => item.id === id)!;
   expect(byId('creation').empirical).toMatch(/4.54 billion/);
   expect(byId('creation').empirical).toMatch(/Carbon-14 is not used/);
   expect(byId('human-origins').empirical).toMatch(/MOROCCO/);
   expect(byId('human-origins').history).toMatch(/did not use carbon-14/);
   expect(byId('nicaea').history).toMatch(/no contemporaneous basis/);
   expect(byId('quran-manuscript').empirical).toMatch(/parchment, not directly/);
   expect(byId('maat').interpretation).toMatch(/do not demonstrate copying/);
   expect(byId('meditation').empirical).toMatch(/difficult to interpret/);
 });
 it('expires source reviews rather than claiming a permanent evidence audit', () => {
   expect(EVIDENCE_RECHECK_AFTER).toBe('2027-01-28');
   expect(evidenceIsCurrent(new Date('2026-10-28T10:00:00+02:00'))).toBe(true);
   expect(evidenceIsCurrent(new Date('2027-01-28T23:59:59+02:00'))).toBe(true);
   expect(evidenceIsCurrent(new Date('2027-01-29T00:00:00+02:00'))).toBe(false);
   expect(evidenceIsCurrent(new Date('invalid'))).toBe(false);
 });
 it('recognises only specific comparisons, not general religious discussion', () => {
   const cases: Array<[string,string|null]> = [
     ['Was the world created in six days?','creation'],
     ['How old is Earth according to the Bible?','creation'],
     ['Adam and Eve versus human evolution and fossils','human-origins'],
     ['Did the Council of Nicaea choose the Bible?','nicaea'],
     ['What is the Birmingham Quran manuscript?','quran-manuscript'],
     ['Explain Gilgamesh flood stories','flood'],
     ['Explain Kemetic Maat and Egyptian justice','maat'],
     ['Does Buddhist meditation change the brain?','meditation'],
     ['Can you pray for me?',null],['I need help with a medical emergency',null],['Hello',null],['x'.repeat(501),null],
   ];
   for (const [query,expected] of cases) expect(detectEvidenceTopic(query)).toBe(expected);
 });
});
