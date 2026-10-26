import { describe, expect, it } from 'vitest';
import { isUnbudgetedAiRoute } from '../api/lib/legacyAiRoutes';
import {
  CONSUMER_GUIDE_RECHECK_AFTER, CONSUMER_GUIDE_REVIEWED_ON,
  CONSUMER_ISSUES, CONSUMER_SOURCES, MAX_CONSUMER_STORY_LENGTH,
  consumerGuideIsCurrent, consumerSourcesFor, makeConsumerDraft, prepareConsumerStory,
  type DisputeType,
} from '../src/lib/consumer-rights-guide';

const categories: DisputeType[] = [
  'UNSURE', 'DEFECTIVE_GOODS', 'UNFAIR_CANCELLATION',
  'ONLINE_SCAM', 'UNAUTHORIZED_DEBIT_ORDER',
  'POPIA_DATA_BREACH', 'TELCO_BILLING_DISPUTE',
  'MASHONISA_ILLEGAL_LOAN', 'DEBT_REVIEW_TRAP',
];

describe('consumer rights guide, zero-provider fallback', () => {
  it('explicitly keeps the previous unbudgeted AI endpoint disabled', () => {
    expect(isUnbudgetedAiRoute('POST', '/api/v1/consumer-rights')).toBe(true);
    expect(isUnbudgetedAiRoute('GET', '/api/v1/consumer-rights')).toBe(false);
    expect(isUnbudgetedAiRoute('POST', '/api/v1/luqi-core')).toBe(false);
  });
  it('limits every plan to its actual category and links to official sources', () => {
    const ids = new Set(CONSUMER_SOURCES.map(source => source.id));
    const hosts = new Set([
      'www.gov.za', 'www.cgso.org.za', 'thencc.org.za',
      'nfosa.co.za', 'www.icasa.org.za', 'www.ncr.org.za',
      'inforegulator.org.za',
    ]);
    expect(new Set(categories).size).toBe(categories.length);
    for (const source of CONSUMER_SOURCES) {
      const u = new URL(source.url);
      expect(u.protocol).toBe('https:');
      expect(hosts.has(u.hostname)).toBe(true);
      expect(u.username).toBe('');
      expect(u.password).toBe('');
      expect(u.search).toBe('');
      expect(source.reviewedOn).toBe(CONSUMER_GUIDE_REVIEWED_ON);
      expect(ids.has(source.id)).toBe(true);
    }
    for (const type of categories) {
      const plan = CONSUMER_ISSUES[type];
      expect(plan.title.length).toBeGreaterThan(10);
      expect(plan.explanation.length).toBeGreaterThan(40);
      expect(plan.questions.length).toBeGreaterThanOrEqual(3);
      expect(plan.options.length).toBeGreaterThanOrEqual(3);
      expect(consumerSourcesFor(type).length).toBeGreaterThan(0);
      for (const id of plan.sourceIds) expect(ids.has(id)).toBe(true);
    }
  });
  it('never uses a defective-goods assertion for bank, privacy, telecom or credit concerns', () => {
    for (const type of ['UNAUTHORIZED_DEBIT_ORDER', 'POPIA_DATA_BREACH', 'TELCO_BILLING_DISPUTE',
      'MASHONISA_ILLEGAL_LOAN', 'DEBT_REVIEW_TRAP'] as DisputeType[]) {
      const plan = CONSUMER_ISSUES[type];
      expect(plan.explanation).not.toContain('six-month return provision');
      expect(plan.explanation).not.toMatch(/guaranteed refund|absolute right|automatically unlawful/i);
      expect(consumerSourcesFor(type).some(s => s.id === 'consumer-act')).toBe(false);
    }
    expect(consumerSourcesFor('UNAUTHORIZED_DEBIT_ORDER').some(s => s.id === 'bank-ombud')).toBe(true);
    expect(consumerSourcesFor('POPIA_DATA_BREACH').some(s => s.id === 'information-regulator')).toBe(true);
    expect(consumerSourcesFor('TELCO_BILLING_DISPUTE').some(s => s.id === 'icasa')).toBe(true);
    expect(consumerSourcesFor('MASHONISA_ILLEGAL_LOAN').some(s => s.id === 'credit-regulator')).toBe(true);
  });
  it('requires a bounded, user-supplied anonymised narrative before preparing anything', () => {
    expect(prepareConsumerStory('DEFECTIVE_GOODS', '')).toBeNull();
    expect(prepareConsumerStory('DEFECTIVE_GOODS', 'short')).toBeNull();
    expect(prepareConsumerStory('DEFECTIVE_GOODS', {})).toBeNull();
    expect(prepareConsumerStory('DEFECTIVE_GOODS', 'z'.repeat(MAX_CONSUMER_STORY_LENGTH + 1))).toBeNull();
    expect(prepareConsumerStory('MADE_UP' as DisputeType, 'a believable case story')).toBeNull();
    expect(prepareConsumerStory('toString' as DisputeType, 'a believable case story')).toBeNull();
    const result = prepareConsumerStory('TELCO_BILLING_DISPUTE', '  Charged twice on my mobile account.  ');
    expect(result).not.toBeNull();
    expect(result?.userStory).toBe('Charged twice on my mobile account.');
    expect(result?.category).toBe('TELCO_BILLING_DISPUTE');
    expect(result?.guide.title).toMatch(/Cellular or internet/);
  });
  it('prepares a neutral factual review request without claiming an offence or threatening action', () => {
    const story = 'I bought an appliance and the supplier has not explained the repair charge.';
    const draft = makeConsumerDraft('Example Supplier', story);
    expect(draft).toContain(story);
    expect(draft).toContain('To: Example Supplier');
    expect(draft).toContain('please verify against your records');
    expect(draft).toContain('[insert the outcome you are requesting');
    expect(draft).not.toMatch(/formal legal demand|criminal offence|must refund|under section 56/i);
    expect(makeConsumerDraft('', story)).toContain('[Supplier or service provider]');
    expect(() => makeConsumerDraft('Supplier', 'tiny')).toThrow();
  });
  it('expires the procedural guidance after the short review period', () => {
    expect(CONSUMER_GUIDE_REVIEWED_ON).toBe('2026-10-26');
    expect(CONSUMER_GUIDE_RECHECK_AFTER).toBe('2026-11-02');
    expect(consumerGuideIsCurrent(new Date('2026-10-26T09:56:00+02:00'))).toBe(true);
    expect(consumerGuideIsCurrent(new Date('2026-11-02T23:59:59+02:00'))).toBe(true);
    expect(consumerGuideIsCurrent(new Date('2026-11-03T00:00:00+02:00'))).toBe(false);
    expect(consumerGuideIsCurrent(new Date('wrong'))).toBe(false);
  });
});
