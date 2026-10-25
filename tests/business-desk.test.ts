import { describe, expect, it } from 'vitest';
import { asZar, checkPricing, createQuote, toCents } from '../src/lib/business-desk';

describe('zero-provider LUQI Business Desk', () => {
  it('does exact-cent arithmetic instead of floating point rounding', () => {
    expect(toCents('0.10') + toCents('0.20')).toBe(30n);
    expect(asZar(30n)).toBe('0.30');
    expect(createQuote({
      businessName: 'Local Studio', customerName: 'Client A', reference: 'Q-001',
      rows: [{ description: 'Design work', quantity: 3, unitPriceZar: '100.25' },
             { description: 'Delivery', quantity: 1, unitPriceZar: '0.10' }],
    })).toMatchObject({ subtotalZar: '300.85', rows: [{ totalZar: '300.75' }, { totalZar: '0.10' }] });
  });
  it('exports accurate, explicitly non-tax invoice text', () => {
    const result = createQuote({ businessName: 'Langa Designs', customerName: 'Sipho',
      reference: 'Quote-02', rows: [{ description: 'Logo design', quantity: 2, unitPriceZar: '200.00' }] });
    expect(result.textDraft).toContain('From: Langa Designs');
    expect(result.textDraft).toContain('2 x R 200.00 = R 400.00');
    expect(result.textDraft).toContain('SUBTOTAL (EXCLUDING TAXES): R 400.00');
    expect(result.textDraft).toContain('Not a tax invoice');
    expect(result.textDraft).not.toContain('PAID');
  });
  it('rejects unbounded text, newline injection, malformed amounts and quantities', () => {
    for (const bad of ['-1', '1e5', '01', '12.345', '100000000.00', 'Infinity', ' 10']) {
      expect(() => toCents(bad)).toThrow('INVALID_BUSINESS_INPUT');
    }
    const valid = { businessName: 'Shop', customerName: 'Client', reference: 'Q-1',
      rows: [{ description: 'Service', quantity: 1, unitPriceZar: '100' }] };
    for (const patch of [
      { businessName: 'Shop\nUNVERIFIED PAYMENT' },
      { rows: [] }, { rows: Array(13).fill(valid.rows[0]) },
      { rows: [{ description: 'A', quantity: 1001, unitPriceZar: '1' }] },
      { rows: [{ description: '', quantity: 1, unitPriceZar: '1' }] },
      { rows: [{ description: 'Service', quantity: 1.1, unitPriceZar: '1' }] },
    ]) expect(() => createQuote({ ...valid, ...patch })).toThrow('INVALID_BUSINESS_INPUT');
  });
  it('calculates gross margin and whole break-even sales, not a profit guarantee', () => {
    expect(checkPricing({ sellingPriceZar: '150', directCostZar: '100', monthlyFixedZar: '1000' }))
      .toEqual({ unitSaleZar: '150.00', unitCostZar: '100.00', fixedCostsZar: '1000.00',
        grossProfitPerSaleZar: '50.00', marginPercent: '33.33', breakEvenSales: '20', coversDirectCost: true });
    expect(checkPricing({ sellingPriceZar: '40', directCostZar: '50', monthlyFixedZar: '200' }))
      .toMatchObject({ grossProfitPerSaleZar: '-10.00', marginPercent: null, breakEvenSales: null, coversDirectCost: false });
    expect(checkPricing({ sellingPriceZar: '100', directCostZar: '65', monthlyFixedZar: '100' }).breakEvenSales)
      .toBe('3');
  });
});
