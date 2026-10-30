/** Shared, strict contract. No ID scans, uploads, marketing or map submission. */
import { z } from 'zod';
import { MUNICIPALITIES } from '../src/lib/municipal-economy';

export const BUSINESS_CONSENT_VERSION = '2026-10-30.v1' as const;
export const BUSINESS_CATEGORIES = ['food', 'retail', 'beauty', 'home', 'repairs', 'transport', 'agriculture', 'education', 'professional', 'other'] as const;
export const BUSINESS_LANGUAGES = ['en', 'af', 'zu', 'xh', 'st', 'tn', 'nso', 'ss', 'nr', 've', 'ts'] as const;
export const BUSINESS_PROVINCES = ['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NC', 'NW', 'WC'] as const;
export const BUSINESS_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const businessId = z.uuid();
const text = (min: number, max: number) => z.string().trim().min(min).max(max)
  .refine(v => !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(v), 'Use plain text');
const optionalText = (max: number) => text(0, max);
const phone = z.string().trim().max(25).refine(v => v === '' || /^\+?[\d ()-]{7,25}$/.test(v));
const email = z.union([z.literal(''), z.email().max(200)]);
const web = z.string().max(400).refine(v => {
  if (!v) return true;
  try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password &&
    /^[a-z\d-]+(\.[a-z\d-]+)+$/i.test(u.hostname) && !/\.(local|internal|localhost)$/i.test(u.hostname) &&
    !/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname); } catch { return false; }
});
const channel = (value: z.ZodType<string>) => z.object({ value, public: z.boolean() }).strict();
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const businessProfile = z.object({
  ownerConfirmedName: text(2, 120), tradingName: text(2, 120),
  categories: z.array(z.enum(BUSINESS_CATEGORIES)).min(1).max(3).refine(v => new Set(v).size === v.length),
  description: text(10, 1200), descriptionLanguage: z.enum(BUSINESS_LANGUAGES),
  translations: z.array(z.object({ language: z.enum(BUSINESS_LANGUAGES), description: text(10, 1200) }).strict()).max(10)
    .refine(v => new Set(v.map(x => x.language)).size === v.length),
  services: z.array(z.object({ name: text(2, 100), price: optionalText(80) }).strict()).min(1).max(15),
  province: z.enum(BUSINESS_PROVINCES), municipality: text(2, 120), locality: text(2, 100),
  kind: z.enum(['storefront', 'home_based', 'mobile', 'service_area']), serviceArea: optionalText(250),
  deliveryRadiusKm: z.number().int().min(0).max(200).nullable(),
  publicAddress: optionalText(250), landmark: optionalText(150),
  publicPoint: z.object({ latitude: z.number().min(-35).max(-22), longitude: z.number().min(16).max(33) }).strict().nullable(),
  contacts: z.object({ phone: channel(phone), whatsapp: channel(phone), email: channel(email), website: channel(web),
    preferred: z.enum(['none', 'phone', 'whatsapp', 'email', 'website']) }).strict(),
  hours: z.array(z.object({ day: z.enum(BUSINESS_DAYS), closed: z.boolean(), opens: time, closes: time,
    overnight: z.boolean() }).strict()).length(7)
    .refine(v => new Set(v.map(x => x.day)).size === 7 && v.every(x => x.closed || (x.overnight ? x.closes <= x.opens : x.closes > x.opens))),
  languages: z.array(z.enum(BUSINESS_LANGUAGES)).min(1).max(11).refine(v => new Set(v).size === v.length),
  accessibility: z.array(z.enum(['step_free', 'wheelchair_access', 'sign_language', 'delivery', 'by_appointment'])).max(5)
    .refine(v => new Set(v).size === v.length),
  consent: z.object({ version: z.literal(BUSINESS_CONSENT_VERSION), storage: z.literal(true), ownerAuthority: z.literal(true),
    publicListing: z.boolean(), contacts: z.boolean(), exactLocation: z.boolean() }).strict(),
}).strict().superRefine((p, c) => {
  const error = (message: string) => c.addIssue({ code: 'custom', message });
  if (p.translations.some(t => t.language === p.descriptionLanguage)) error('Use a different language for each translation');
  if (!MUNICIPALITIES.some(m => m.name === p.municipality && m.province === p.province)) error('Choose a municipality in your province');
  if ((p.publicPoint || p.publicAddress || p.landmark || p.consent.exactLocation) &&
      (p.kind !== 'storefront' || !p.consent.exactLocation)) error('Only an explicitly approved storefront can expose an address, landmark or pin');
  if (p.kind !== 'storefront' && !p.serviceArea) error('Describe a public service area without a home address');
  if (p.contacts.preferred !== 'none') {
    const contact = p.contacts[p.contacts.preferred];
    if (!p.consent.contacts || !contact.public || !contact.value) error('The preferred contact must be explicitly public');
  }
});
export type BusinessProfile = z.infer<typeof businessProfile>;
export const businessWrite = z.object({ expectedRevision: z.number().int().min(0).max(999999), profile: businessProfile }).strict();
export const businessAction = z.object({ expectedRevision: z.number().int().min(1).max(999999), confirm: z.literal(true) }).strict();
export const businessSearch = z.object({ q: text(0, 80).default(''), province: z.enum(BUSINESS_PROVINCES).optional(),
  municipality: text(2, 120).optional(), category: z.enum(BUSINESS_CATEGORIES).optional(),
  language: z.enum(BUSINESS_LANGUAGES).optional(), page: z.coerce.number().int().min(0).max(50).default(0) }).strict();
export const businessReport = z.object({ businessId: businessId.nullable(),
  kind: z.enum(['correction', 'impersonation', 'privacy', 'spam', 'duplicate_claim']), details: text(10, 1000) }).strict()
  .refine(v => v.businessId !== null || v.kind === 'duplicate_claim');
export const businessModeration = z.object({ ...businessAction.shape,
  decision: z.enum(['approve', 'reject', 'suspend', 'release']),
  reason: z.enum(['checked', 'duplicate', 'misleading', 'privacy', 'impersonation', 'other']),
  contactConfirmed: z.boolean(), locationReview: z.enum(['unreviewed', 'service_area_reviewed', 'point_reviewed']),
  method: z.enum(['content_only', 'business_contact', 'site_visit']), attested: z.literal(true),
}).strict().refine(v => (!v.contactConfirmed && v.locationReview === 'unreviewed') || v.method !== 'content_only')
  .refine(v => v.locationReview !== 'point_reviewed' || v.method === 'site_visit');
export type BusinessVerification = { ownerApproved: boolean; contactConfirmed: boolean;
  locationReview: 'unreviewed' | 'service_area_reviewed' | 'point_reviewed'; providerListing: 'not_checked' };
export type BusinessState = 'draft' | 'pending' | 'published' | 'paused' | 'rejected' | 'suspended';
export type OwnedBusiness = { id: string; revision: number; state: BusinessState; profile: BusinessProfile;
  verification: BusinessVerification; updatedAt: string };

/** Explicit allowlist projection: private names/contact channels never leave it. */
export function publicBusiness(b: OwnedBusiness) {
  const p = businessProfile.parse(b.profile);
  const contacts = Object.fromEntries((['phone', 'whatsapp', 'email', 'website'] as const)
    .filter(key => p.consent.contacts && p.contacts[key].public && p.contacts[key].value)
    .map(key => [key, p.contacts[key].value])) as Partial<Record<'phone' | 'whatsapp' | 'email' | 'website', string>>;
  const exact = p.kind === 'storefront' && p.consent.exactLocation;
  return { id: b.id, tradingName: p.tradingName, categories: p.categories, description: p.description,
    descriptionLanguage: p.descriptionLanguage, translations: p.translations, services: p.services, province: p.province, municipality: p.municipality,
    locality: p.locality, kind: p.kind, serviceArea: p.serviceArea, deliveryRadiusKm: p.deliveryRadiusKm,
    publicAddress: exact ? p.publicAddress : '', landmark: exact ? p.landmark : '',
    publicPoint: exact ? p.publicPoint : null, contacts,
    preferredContact: p.contacts.preferred !== 'none' && contacts[p.contacts.preferred] ? p.contacts.preferred : 'none',
    hours: p.hours, languages: p.languages, accessibility: p.accessibility,
    verification: b.verification, updatedAt: b.updatedAt };
}
export type PublicBusiness = ReturnType<typeof publicBusiness>;
export function businessSearchText(p: BusinessProfile) {
  // Public text only. No hidden contact/name/address data can influence discovery.
  return [p.tradingName, p.description, ...p.translations.map(t => t.description),
    ...p.services.map(s => s.name), p.locality, p.serviceArea].join(' ').toLocaleLowerCase('en-ZA');
}
