import {describe,it,expect} from 'vitest';
import {SOCIAL_SUPPORT_TOPICS,SOCIAL_SUPPORT_REVIEWED_ON,isSocialSupportReviewFresh,
 detectSocialSupportIntent,socialSupportPathForInput,supportTopic,listSupportTopics} from '../src/lib/social-support-sources';
describe('SASSA and UIF original-source public guidance',()=>{
 it('includes official SASSA and UIF categories with vetted hosts, never a financial profile',()=>{
  expect(SOCIAL_SUPPORT_TOPICS.length).toBeGreaterThanOrEqual(12);
  const allowed=new Set(['services.sassa.gov.za','srd.sassa.gov.za','www.gov.za','www.labour.gov.za',
   'uifonline.labour.gov.za','ufiling.labour.gov.za']);
  const ids=new Set<string>();
  for(const topic of SOCIAL_SUPPORT_TOPICS){
   expect(ids.has(topic.id)).toBe(false);ids.add(topic.id);
   expect(topic.requirements.length).toBeGreaterThan(35);
   expect(topic.steps.length).toBeGreaterThanOrEqual(3);
   expect(topic.sources.length).toBeGreaterThan(0);
   for(const source of topic.sources){
    const url=new URL(source.url);expect(url.protocol).toBe('https:');
    expect(allowed.has(url.hostname)).toBe(true);
    expect(url.username+url.password+url.hash).toBe('');
   }
  }
  expect(listSupportTopics('sassa').length).toBeGreaterThanOrEqual(6);
  expect(listSupportTopics('uif').length).toBeGreaterThanOrEqual(6);
 });
 it('routes strong social grant and unemployment insurance intent without hijacking generic funding',()=>{
  expect(socialSupportPathForInput('Check my SASSA child grant')).toBe('/sassa');
  expect(socialSupportPathForInput('How can I claim UIF benefits?')).toBe('/uif');
  expect(socialSupportPathForInput('I need old age pension instructions')).toBe('/sassa');
  expect(detectSocialSupportIntent('graduate bursary and business funding')).toBe(false);
  expect(socialSupportPathForInput('CCNA exam preparation')).toBeNull();
  expect(detectSocialSupportIntent('x'.repeat(501))).toBe(false);
 });
 it('warns about retired uFiling employee claims and does not invent payment dates',()=>{
  const claims=supportTopic('uif-unemployed')!;
  expect(claims.sources[0].url).toBe('https://uifonline.labour.gov.za/uifOnline/');
  expect(claims.important).toMatch(/6 months|12 months/);
  const employers=supportTopic('uif-employers')!;
  expect(employers.important).toMatch(/old uFiling employee module/);
  expect(supportTopic('sassa-status')?.important).toMatch(/Payment dates are not estimated/);
  expect(SOCIAL_SUPPORT_TOPICS.map(x=>x.summary+' '+x.steps.join(' ')).join(' '))
   .not.toMatch(/guaranteed approved|we will submit your claim|daily live status/i);
 });
 it('indicates published review ageing rather than pretending daily automatic source updates',()=>{
  expect(SOCIAL_SUPPORT_REVIEWED_ON).toBe('2026-10-29');
  expect(isSocialSupportReviewFresh(new Date('2026-10-29T12:00:00+02:00'))).toBe(true);
  expect(isSocialSupportReviewFresh(new Date('2026-11-06T00:00:00+02:00'))).toBe(false);
 });
});
