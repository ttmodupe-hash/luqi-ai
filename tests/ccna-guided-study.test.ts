import { describe, expect, it } from 'vitest';
import { CCNA_GUIDED_LESSONS, CCNA_GUIDE_REVIEWED, CISCO_CCNA_EXAM, CISCO_CCNA_V11_CHANGES, guidedLessonById } from '../src/lib/ccna-guided-study';
import { calculateIPv4Subnet } from '../src/lib/network-planner';
describe('Luqi original Cisco-mapped practice',()=>{
  it('gives six distinct original lessons with bounded answers and Cisco source links',()=>{
    expect(CCNA_GUIDED_LESSONS.length).toBe(6);
    expect(new Set(CCNA_GUIDED_LESSONS.map(l=>l.id)).size).toBe(6);
    expect(new Set(CCNA_GUIDED_LESSONS.map(l=>l.domain)).size).toBe(6);
    expect(CCNA_GUIDE_REVIEWED).toBe('2 November 2026');
    for(const lesson of CCNA_GUIDED_LESSONS){
      expect(lesson.answerIndex).toBeGreaterThanOrEqual(0);
      expect(lesson.answerIndex).toBeLessThan(3);
      expect(lesson.options).toHaveLength(3);
      expect(lesson.topic.length).toBeGreaterThan(6);
      expect(lesson.goal.length).toBeGreaterThan(25);
      expect(lesson.explanation.length).toBeGreaterThan(30);
      const url=new URL(lesson.sourceUrl);
      expect(['www.cisco.com','learningcontent.cisco.com']).toContain(url.hostname);
      expect(url.protocol).toBe('https:');
      expect(lesson.labPath).toMatch(/^\/cert-academy\?tab=(subnet|topology|terminal)&track=ccna_200_301$/);
    }
    expect(guidedLessonById('not-a-lesson')).toBeNull();
    expect(CISCO_CCNA_EXAM).toContain('cisco.com');
    expect(CISCO_CCNA_V11_CHANGES).toContain('CCNA_1_1_release_notes.pdf');
  });
  it('calculates the worked subnet examples exactly and keeps the correct choice aligned',()=>{
    const subnet=calculateIPv4Subnet('172.16.85.45',22)!;
    expect([subnet.networkAddress,subnet.broadcastAddress,subnet.usableHosts]).toEqual(['172.16.84.0','172.16.87.255',1022]);
    const problem=calculateIPv4Subnet('192.168.10.45',26)!;
    expect([problem.networkAddress,problem.broadcastAddress]).toEqual(['192.168.10.0','192.168.10.63']);
    const ipv4=guidedLessonById('ipv4')!;
    expect(ipv4.options[ipv4.answerIndex]).toContain('192.168.10.63');
  });
});
