import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { newTownshipProject, readTownshipProject, writeTownshipProject, townshipContextKey } from '../src/lib/township-workspace';
import { createQuote, checkPricing } from '../src/lib/business-desk';
const context = { sector: 'beauty', goal: 'market', province: 'GP', municipality: 'Example Council' };
const review = (value: typeof context) => JSON.stringify(value) === JSON.stringify(context) ? ['Define offer', 'Prepare quote'] : null;
const project = () => ({ ...newTownshipProject(context), businessName: 'Salon', offering: 'Hair\nNails', notes: 'Ask about equipment', completedSteps: ['Define offer'] });
describe('portable township working projects, not source approval', () => {
  it('round-trips unfinished inputs and user preparation without a completed quotation', () => {
    expect(readTownshipProject(writeTownshipProject(project(), review), review)).toEqual(project());
  });
  it('refuses forged approvals, source timestamps and calculated totals', () => {
    for (const field of ['verified', 'reviewedOn', 'eligible', 'quoteTotal'])
      expect(() => readTownshipProject(JSON.stringify({ ...project(), [field]: true }), review)).toThrow();
    const value = project();
    expect(() => readTownshipProject(JSON.stringify({ ...value, items: [{ ...value.items[0], total: '999.00' }] }), review)).toThrow();
  });
  it('rejects an incompatible version and unknown context', () => {
    expect(() => readTownshipProject(JSON.stringify({ ...project(), format: 'wrong' }), review)).toThrow();
    expect(() => readTownshipProject(JSON.stringify({ ...project(), context: { ...context, province: 'OTHER' } }), review)).toThrow();
  });
  it('accepts only unique user completion ticks for the current authored steps', () => {
    for (const completedSteps of [['Define offer', 'Define offer'], ['Loan approved']])
      expect(() => readTownshipProject(JSON.stringify({ ...project(), completedSteps }), review)).toThrow();
  });
  it('rejects malformed, oversized and prototype-bearing input', () => {
    for (const raw of ['{', 'null', '[]', ' '.repeat(65537), JSON.stringify(project()).replace('{', '{"__proto__":{"polluted":true},')])
      expect(() => readTownshipProject(raw, review)).toThrow();
    expect(() => readTownshipProject(JSON.stringify({ ...project(), businessName: 'Bad\u0000' }), review)).toThrow();
  });
  it('preserves Unicode and incomplete numeric inputs without interpreting them as valid calculations', () => {
    for (let n = 0; n < 200; n++) {
      const value = project(); value.notes = 'Dumela 🌓 ' + n; value.items[0].price = '12.';
      expect(readTownshipProject(writeTownshipProject(value, review), review)).toEqual(value);
    }
  });
  it('limits notes and quote rows, and does not silently trim away user work', () => {
    expect(() => readTownshipProject(JSON.stringify({ ...project(), notes: 'x'.repeat(4001) }), review)).toThrow();
    const value = project(); value.items = Array.from({ length: 12 }, () => ({ description: 'Item', quantity: '1', price: '2' }));
    expect(readTownshipProject(JSON.stringify(value), review).items).toHaveLength(12);
    value.items.push(value.items[0]);
    expect(() => readTownshipProject(JSON.stringify(value), review)).toThrow();
  });
  it('separates scope keys without delimiter collisions', () => {
    expect(townshipContextKey({ ...context, municipality: 'x|y' }))
      .not.toBe(townshipContextKey({ ...context, province: 'GP|x', municipality: 'y' }));
  });
  it('uses the existing exact-cent quote and contribution calculations', () => {
    expect(createQuote({ businessName: 'Salon', customerName: 'Client', reference: 'Q-1', rows: [
      { description: 'Service', quantity: 3, unitPriceZar: '100.25' }, { description: 'Extra', quantity: 1, unitPriceZar: '0.10' },
    ] }).subtotalZar).toBe('300.85');
    expect(checkPricing({ sellingPriceZar: '150', directCostZar: '100', monthlyFixedZar: '1000' }).breakEvenSales).toBe('20');
    expect(checkPricing({ sellingPriceZar: '150', directCostZar: '170', monthlyFixedZar: '1000' }).breakEvenSales).toBeNull();
  });
  it('preserves mirrored code and the existing guide, source list and plain-text export', () => {
    for (const path of ['lib/township-workspace.ts', 'components/TownshipBusinessWorkspace.tsx', 'pages/TownshipEconomyPage.tsx'])
      expect(readFileSync('src/' + path, 'utf8')).toBe(readFileSync('app/src/' + path, 'utf8'));
    const page = readFileSync('src/pages/TownshipEconomyPage.tsx', 'utf8');
    for (const text of ['TOWNSHIP_OFFICIAL_SOURCES.map', 'isTownshipReviewFresh(new Date())', 'Download my private action plan', 'Local permits are different from national business registration'])
      expect(page).toContain(text);
    const component = readFileSync('src/components/TownshipBusinessWorkspace.tsx', 'utf8');
    expect(component).not.toMatch(/localStorage|sessionStorage|\bfetch\s*\(|XMLHttpRequest|dangerouslySetInnerHTML/);
  });
});
