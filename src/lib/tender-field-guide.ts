import type {SupplierField, SupplierValues} from './tender-document-contract';

/** Plain-language help for the seven EXISTING mapped contact fields only.
 * No new issuer requirements, source-review renewal, inferred facts or storage.
 */
export const SBD1_FIELD_GUIDANCE: Readonly<Record<SupplierField, {question: string; explanation: string}>> = {
  bidderName: {question: 'Who is the bidder on this application?', explanation: 'Enter the name of the person or business submitting this bid, using your own records. Do not substitute another applicant or invent a business name.'},
  postalAddress: {question: 'Where does the bidder receive post?', explanation: 'Enter the postal address to be shown on this form. It may differ from the street address. Luqi does not look up or verify an address.'},
  streetAddress: {question: 'What street address should this form show?', explanation: 'Enter the bidder’s street address from your own information. Do not copy a postal address here unless it is also the correct street address.'},
  telephoneCode: {question: 'Which code belongs to the telephone number?', explanation: 'The original has separate CODE and NUMBER spaces. Enter the telephone area or dialling code here and check that it matches the telephone number.'},
  telephoneNumber: {question: 'What telephone number should the issuer use?', explanation: 'Enter the telephone number in the original’s NUMBER space; the code has its own field. A cellphone also has its own field below. Luqi does not verify that a number works.'},
  cellphone: {question: 'What cellphone number should this form show?', explanation: 'Enter the contact cellphone number you are authorised to provide. Leave it blank when unknown or inapplicable instead of entering an example number.'},
  email: {question: 'What email address should the issuer use?', explanation: 'Enter an email address you are authorised to provide and check its spelling. Format checking does not confirm that a mailbox exists. Never enter its password.'},
};
export type SupplierFieldSpec = Readonly<{id: SupplierField; label: string; max: number; required: boolean}>;
export type SupplierFieldState = 'entered' | 'blank' | 'attention';
/** Mirrors existing worker format restrictions; the worker remains authoritative.
 * Required means required by Luqi's existing PARTIAL export, not every issuer.
 */
export function supplierFieldIssue(field: SupplierFieldSpec, value: unknown): string | null {
  if (typeof value !== 'string') return 'Enter text for this field.';
  if (value.length > field.max) return `Use no more than ${field.max} characters for this original field.`;
  if (/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]|\p{Cs}/u.test(value)) return 'Use a single line without hidden control characters.';
  if (field.required && !value.trim()) return 'Enter the bidder name before preparing this partial export.';
  if (field.id === 'email' && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Check the email format, including @ and the domain. Remove spaces.';
  return null;
}
export function supplierFieldProgress(values: SupplierValues, fields: readonly SupplierFieldSpec[]) {
  const rows = fields.map(field => {
    const value = values[field.id];
    const issue = supplierFieldIssue(field, value);
    const state: SupplierFieldState = issue ? 'attention' : value.trim() ? 'entered' : 'blank';
    return {field, state, issue};
  });
  return {rows, entered: rows.filter(row => row.state === 'entered').length,
    blank: rows.filter(row => row.state === 'blank').length,
    attention: rows.filter(row => row.state === 'attention'), total: fields.length};
}
