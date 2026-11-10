import { describe, expect, it } from 'vitest';
import { cloudCost, courseOutline, generatedPractice, gradePractice, impulse, ipv4, nextReview, photoelectric, risk, safeVideoId, solar, sourceReviewStatus, workEnergy, type TrackId } from './academy-engine';
import { initialTerminal, runAcademyCommand, terminalPrompt, traceArithmetic } from './academy-terminal';
import { ACADEMY_TRACKS } from './academy-catalog';

describe('universal academy deterministic engines', () => {
  it('calculates a subnet crossing an octet boundary', () => { expect(ipv4('192.168.17.42',20)).toMatchObject({ network:'192.168.16.0', broadcast:'192.168.31.255', firstHost:'192.168.16.1', lastHost:'192.168.31.254', usable:4094 }); });
  it('calculates high-bit IPv4 addresses without signed integer corruption', () => { expect(ipv4('255.255.255.254',30)).toMatchObject({ network:'255.255.255.252', broadcast:'255.255.255.255', usable:2 }); });
  it('handles /0, /31 and /32 explicitly', () => { expect(ipv4('10.2.3.4',0)).toMatchObject({network:'0.0.0.0',broadcast:'255.255.255.255',total:4294967296}); expect(ipv4('192.0.2.10',31)).toMatchObject({usable:2,broadcast:null,firstHost:'192.0.2.10',lastHost:'192.0.2.11'}); expect(ipv4('192.0.2.10',32)).toMatchObject({usable:1,broadcast:null,network:'192.0.2.10'}); });
  it.each(['999.1.2.3','1.2.3','01.2.3.4','1.2.3.4<script>','1.2.3.-1'])('rejects malformed IPv4 %s', address => expect(()=>ipv4(address,24)).toThrow());
  it.each([-1,33,1.5,NaN,Infinity])('rejects invalid prefix %s', prefix => expect(()=>ipv4('1.2.3.4',prefix)).toThrow());
  it('computes independently checkable financial-risk estimates', () => { expect(risk(100000,.25,.4)).toEqual({sle:25000,ale:10000}); expect(risk(100,.5,2).ale).toBe(100); expect(()=>risk(100,25,1)).toThrow(); });
  it('keeps cloud assumptions separate from a provider quote', () => { expect(cloudCost(100,.02,10,.05)).toBe(2.5); expect(()=>cloudCost(100,-.02,10,.05)).toThrow(); });
  it('returns positive and negative work correctly', () => { expect(workEnergy(2,3,5)).toBe(16); expect(workEnergy(2,5,3)).toBe(-16); expect(()=>workEnergy(0,1,2)).toThrow(); });
  it('preserves direction and reports average force', () => { expect(impulse(2,3,-1,.5)).toEqual({momentumChange:-8,averageForce:-16}); expect(()=>impulse(2,3,4,0)).toThrow(); });
  it('does not report negative photoelectron energy below threshold', () => { expect(photoelectric(1e14,2)).toMatchObject({emitted:false,maximumKineticJ:0}); const result=photoelectric(8e14,2); expect(result.emitted).toBe(true); expect(result.maximumKineticJ).toBeCloseTo(6.62607015e-34*8e14-2*1.602176634e-19,30); });
  it('includes battery delivery loss and PV performance assumptions', () => { const result=solar(.4,6,.8,.9,10,5,.8); expect(result.deliveredKwh).toBeCloseTo(2.4); expect(result.nominalBatteryKwh).toBeCloseTo(3.333333333); expect(result.pvKw).toBe(2.5); expect(()=>solar(.4,6,0,.9,10,5,.8)).toThrow(); });
  it('generates reproducible valid practice for all tracks', () => { for (const track of ['ccna','security','aws','python','matric','solar'] as TrackId[]) for(let seed=0;seed<200;seed++){ const q=generatedPractice(track,seed); expect(generatedPractice(track,seed)).toEqual(q); expect(Number.isFinite(q.answer)).toBe(true); expect(gradePractice(q,String(q.answer))).toBe(true); expect(gradePractice(q,'')).toBe(false); expect(gradePractice(q,'NaN')).toBe(false); expect(gradePractice(q,String(q.answer+100000))).toBe(false); } });
  it('does not pass incorrect IPv4 host counts or fractional Python sums under a percentage margin', () => {
    const ccna = generatedPractice('ccna', 6); // /20, exactly 4094 usable addresses
    expect(ccna.answer).toBe(4094);
    expect(ccna.tolerance).toBe(0);
    for (const input of ['4090', '4093', '4095', '4094.1']) expect(gradePractice(ccna, input)).toBe(false);
    expect(gradePractice(ccna, '4094.0')).toBe(true);
    const python = generatedPractice('python', 0);
    expect(python.tolerance).toBe(0);
    expect(gradePractice(python, String(python.answer + 0.1))).toBe(false);
    expect(gradePractice(python, String(python.answer))).toBe(true);
    // Physical/currency estimates retain their existing bounded numerical tolerance.
    expect(generatedPractice('solar', 0).tolerance).toBeGreaterThan(0);
  });
  it('rejects bad generation seeds', () => { expect(()=>generatedPractice('ccna',-1)).toThrow(); expect(()=>generatedPractice('ccna',.5)).toThrow(); });
  it('accepts only bounded HTTPS YouTube watch/share URLs', () => { expect(safeVideoId('https://www.youtube.com/watch?v=bQ8sdpGQu8c')).toBe('bQ8sdpGQu8c'); expect(safeVideoId('https://youtu.be/bQ8sdpGQu8c')).toBe('bQ8sdpGQu8c'); for (const url of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=bQ8sdpGQu8c','https://attacker@youtube.com/watch?v=bQ8sdpGQu8c','https://youtube.com:444/watch?v=bQ8sdpGQu8c','https://youtu.be/../../etc/passwd','http://youtu.be/bQ8sdpGQu8c']) expect(safeVideoId(url)).toBe(null); });
  it('builds learner-owned outlines without inventing subject content', () => { const plan=courseOutline('Water systems','Explain and test a safe filter model','Flow\nMaterials\nFlow',90); expect(plan.modules.map(m=>m.title)).toEqual(['Flow','Materials']); expect(plan.status).toContain('need review'); expect(()=>courseOutline('','goal','topic',90)).toThrow(); expect(()=>courseOutline('a','goal','topic',0)).toThrow(); expect(()=>courseOutline('a','goal','x'.repeat(161),90)).toThrow(); });
  it('schedules review suggestions without background work', () => { expect(nextReview('2026-11-05T12:00:00Z',0,true)).toBe('2026-11-06T12:00:00.000Z'); expect(nextReview('2026-11-05T12:00:00Z',2,true)).toBe('2026-11-12T12:00:00.000Z'); expect(()=>nextReview('invalid',1,false)).toThrow(); });
  it('flags stale and unverified sources', () => { const now=new Date('2026-12-06T00:00:00Z'); expect(sourceReviewStatus('2026-11-05',now)).toBe('review-due'); expect(sourceReviewStatus(null,now)).toBe('unverified'); expect(sourceReviewStatus('2026-12-05',now)).toBe('reviewed'); expect(sourceReviewStatus('2027-01-01',now)).toBe('unverified'); });
  it('has six distinct paths with original lessons and source boundaries', () => { expect(ACADEMY_TRACKS).toHaveLength(6); expect(new Set(ACADEMY_TRACKS.map(t=>t.id)).size).toBe(6); for (const t of ACADEMY_TRACKS) { expect(t.lessons.length).toBeGreaterThanOrEqual(3); expect(t.sources.length).toBeGreaterThan(0); expect(t.boundary.length).toBeGreaterThan(20); for(const l of t.lessons){expect(l.practice.length).toBeGreaterThan(0);expect(l.evidence.length).toBeGreaterThan(10);} } expect(ACADEMY_TRACKS.find(t=>t.id==='python')?.video).toBeUndefined(); });
});

describe('strict local teaching terminal', () => {
  it('tracks IOS-style modes and state without modifying the input object', () => {
    const first=initialTerminal(); let state=first;
    for(const command of ['enable','conf t','hostname SchoolLab','interface gi0/1','ip address 192.0.2.1 255.255.255.0','no shutdown','end']) state=runAcademyCommand('ccna',state,command).state;
    expect(terminalPrompt(state)).toBe('SchoolLab#'); expect(state.interfaces['GigabitEthernet0/1']).toMatchObject({address:'192.0.2.1',enabled:true}); expect(first.interfaces).toEqual({}); expect(runAcademyCommand('ccna',state,'show ip interface brief').output).toContain('link not simulated');
  });
  it('rejects wrong mode and invalid masks/host assignments', () => {
    expect(runAcademyCommand('ccna',initialTerminal(),'conf t').output).toContain('wrong mode'); let state=initialTerminal(); for(const c of ['enable','conf t','interface gi0/1'])state=runAcademyCommand('ccna',state,c).state;
    expect(runAcademyCommand('ccna',state,'ip address 192.0.2.1 255.0.255.0').output).toContain('contiguous'); expect(runAcademyCommand('ccna',state,'ip address 192.0.2.0 255.255.255.0').output).toContain('usable host');
  });
  it('stores a supported VLAN and OSPF statement with explicit limitations', () => {
    let state=initialTerminal(); for(const c of ['enable','conf t','vlan 10','interface gi0/1','switchport access vlan 10','exit','router ospf 1','network 192.0.2.0 0.0.0.255 area 0']) state=runAcademyCommand('ccna',state,c).state;
    expect(state.interfaces['GigabitEthernet0/1'].vlan).toBe(10); expect(state.ospf).toEqual(['network 192.0.2.0 0.0.0.255 area 0']);
  });
  it('restricts the network-security tool to synthetic data', () => {
    const changed=runAcademyCommand('security',initialTerminal(),'ufw allow 22').state;
    expect(runAcademyCommand('security',changed,'nmap 192.0.2.10').output).toContain('No scan performed'); expect(runAcademyCommand('security',changed,'nmap 8.8.8.8').output).toContain('Unsupported'); expect(runAcademyCommand('security',changed,'ufw allow 65536').output).toContain('Unsupported');
  });
  it('does not claim real AWS resources or accept destructive commands', () => {
    expect(runAcademyCommand('aws',initialTerminal(),'aws s3 ls').output).toContain('SYNTHETIC'); expect(runAcademyCommand('aws',initialTerminal(),'aws s3 rm s3://all --recursive').output).toContain('Unsupported');
  });
  it('computes arithmetic with precedence and bounded nesting', () => { expect(traceArithmetic('2 + 3 * 4')).toBe(14); expect(traceArithmetic('(2+3)*4')).toBe(20); expect(traceArithmetic('-2 * -(3+1)')).toBe(8); expect(()=>traceArithmetic('1/0')).toThrow(); expect(()=>traceArithmetic('('.repeat(30)+'1'+')'.repeat(30))).toThrow(); });
  it.each(['import os','process.exit()','fetch("https://example.com")','__import__("os")','1;alert(1)','2**5','1/0'])('does not execute unsupported input %s', input=>{expect(()=>traceArithmetic(input)).toThrow(); const output=runAcademyCommand('python',initialTerminal(),input).output; expect(output).not.toContain('Teaching trace result:'); });
  it('traces a numeric list but does not claim a full Python runtime', () => { expect(runAcademyCommand('python',initialTerminal(),'sum([2, 3, 5])').output).toBe('Teaching trace result: 10'); expect(runAcademyCommand('python',initialTerminal(),'print(2+3*4)').output).toBe('Teaching trace result: 14'); expect(runAcademyCommand('python',initialTerminal(),'help').output).toContain('No assignment'); });
});
