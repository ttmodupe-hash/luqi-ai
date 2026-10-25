/** Pure browser business helpers. ZAR only, no provider, account, tax or payment processing. */
export interface QuoteRow { description: string; quantity: number; unitPriceZar: string }
export interface QuoteDraft {
  businessName: string;
  customerName: string;
  reference: string;
  rows: QuoteRow[];
}
export interface QuoteResult {
  businessName: string;
  customerName: string;
  reference: string;
  rows: Array<{ description: string; quantity: number; unitPriceZar: string; totalZar: string }>;
  subtotalZar: string;
  textDraft: string;
}
export interface PricingResult {
  unitSaleZar: string;
  unitCostZar: string;
  fixedCostsZar: string;
  grossProfitPerSaleZar: string;
  marginPercent: string | null;
  breakEvenSales: string | null;
  coversDirectCost: boolean;
}
const moneyPattern = /^(0|[1-9][0-9]{0,7})(?:\.[0-9]{1,2})?$/;
const bad = () => new Error('INVALID_BUSINESS_INPUT');

function safeName(raw: string, max: number): string {
  if (typeof raw !== 'string' || raw.length > max || /[\u0000-\u001f\u007f]/u.test(raw)) throw bad();
  const value = raw.trim();
  if (!value) throw bad();
  return value;
}
export function toCents(raw: string): bigint {
  if (typeof raw !== 'string' || !moneyPattern.test(raw)) throw bad();
  const [units, fraction = ''] = raw.split('.');
  return BigInt(units) * 100n + BigInt(fraction.padEnd(2, '0'));
}
export function asZar(cents: bigint): string {
  const negative = cents < 0n;
  const amount = negative ? -cents : cents;
  return (negative ? '-' : '') + String(amount / 100n) + '.' + String(amount % 100n).padStart(2, '0');
}
/** Returns a plain text draft, NOT a tax invoice or legally verified commercial quotation. */
export function createQuote(draft: QuoteDraft): QuoteResult {
  if (!draft || typeof draft !== 'object' || !Array.isArray(draft.rows) ||
      draft.rows.length < 1 || draft.rows.length > 12) throw bad();
  const businessName = safeName(draft.businessName, 90);
  const customerName = safeName(draft.customerName, 90);
  const reference = safeName(draft.reference, 45);
  let total = 0n;
  const rows = draft.rows.map(row => {
    if (!row || !Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 1000) throw bad();
    const description = safeName(row.description, 120);
    const cents = toCents(row.unitPriceZar);
    const lineTotal = cents * BigInt(row.quantity);
    total += lineTotal;
    return {
      description, quantity: row.quantity, unitPriceZar: asZar(cents), totalZar: asZar(lineTotal),
    };
  });
  const subtotalZar = asZar(total);
  const textDraft = [
    'LUQI BUSINESS DESK - DRAFT QUOTATION',
    'Not a tax invoice. Review the details and any applicable taxes before issuing.',
    '',
    'From: ' + businessName,
    'For: ' + customerName,
    'Reference: ' + reference,
    'Currency: ZAR',
    '',
    ...rows.map((row, index) =>
      String(index + 1) + '. ' + row.description + ' | ' + String(row.quantity) +
      ' x R ' + row.unitPriceZar + ' = R ' + row.totalZar),
    '',
    'SUBTOTAL (EXCLUDING TAXES): R ' + subtotalZar,
    'Payment terms, taxes and validity are not determined by LUQI.',
    'This draft was calculated locally and is not a receipt or proof of payment.',
  ].join('\n');
  return { businessName, customerName, reference, rows, subtotalZar, textDraft };
}
/** Unit economics screening only; excludes taxes, payment fees and variable overhead. */
export function checkPricing(input: {
  sellingPriceZar: string; directCostZar: string; monthlyFixedZar: string;
}): PricingResult {
  if (!input || typeof input !== 'object') throw bad();
  const selling = toCents(input.sellingPriceZar);
  const direct = toCents(input.directCostZar);
  const fixed = toCents(input.monthlyFixedZar);
  const margin = selling - direct;
  const positive = margin > 0n;
  const units = positive ? (fixed + margin - 1n) / margin : null;
  // 1/100th percentage-point precision, computed from integer cents.
  const percent = positive && selling > 0n
    ? String((margin * 10000n / selling) / 100n) + '.' +
        String((margin * 10000n / selling) % 100n).padStart(2, '0')
    : null;
  return {
    unitSaleZar: asZar(selling),
    unitCostZar: asZar(direct),
    fixedCostsZar: asZar(fixed),
    grossProfitPerSaleZar: asZar(margin),
    marginPercent: percent,
    breakEvenSales: units === null ? null : String(units),
    coversDirectCost: positive,
  };
}
