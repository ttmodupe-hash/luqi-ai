import {z} from 'zod';
export const BUSINESS_OWNER_PROFILE_LIMIT=10;
export const BUSINESS_DAILY_CHANGES=200;
export const BUSINESS_DAILY_REVIEW_CHANGES=2000;
export const BUSINESS_CONSENT_VERSION='2026-10-v1';
export const businessId=z.string().uuid();
export const businessProvince=z.enum(['EC','FS','GP','KZN','LP','MP','NC','NW','WC']);
export const BUSINESS_CATEGORIES=['trades','food','beauty','retail','transport','tourism','education','technology','professional','other'] as const;
export const BUSINESS_LANGUAGES=['English','Afrikaans','isiZulu','isiXhosa','Sesotho','Setswana','Sepedi','siSwati','Tshivenda','Tsonga','isiNdebele','South African Sign Language'] as const;
const text=(min:number,max:number)=>z.string().trim().min(min).max(max).refine(s=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s),'Remove control characters');
const https=z.string().max(300).refine(value=>{
 if(!value)return true;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.port===''&&u.hostname.includes('.')&&!u.hostname.endsWith('.')&&!/^[\d.]+$/.test(u.hostname)&&!/(?:^|\.)(?:localhost|local|internal|invalid)$/.test(u.hostname)&&!u.hostname.includes(':');}catch{return false;}
},'Use a public HTTPS website');
export const businessDraft=z.object({
 name:text(2,100),category:z.enum(BUSINESS_CATEGORIES),description:text(10,1000),
 services:z.array(text(2,80)).min(1).max(12),province:businessProvince,locality:text(2,80),
 kind:z.enum(['service_area','mobile','public_storefront']),serviceArea:text(2,200),
 publicAddress:text(0,180),phone:z.string().trim().max(30).refine(s=>!s||/^\+?[0-9 ()-]{7,30}$/.test(s)&&s.replace(/\D/g,'').length>=7&&s.replace(/\D/g,'').length<=15,'Use a business telephone number'),
 email:z.union([z.literal(''),z.string().trim().email().max(254)]),website:https,
 hours:text(0,180),pricing:text(0,300),languages:z.array(z.enum(BUSINESS_LANGUAGES)).min(1).max(12),
 visibility:z.object({phone:z.boolean(),email:z.boolean(),website:z.boolean(),address:z.boolean(),pricing:z.boolean()}).strict(),
}).strict().superRefine((d,c)=>{
 if(d.kind!=='public_storefront'&&(d.publicAddress||d.visibility.address))c.addIssue({code:'custom',path:['publicAddress'],message:'Mobile and service-area businesses cannot store or publish an exact address.'});
 if(d.publicAddress&&!d.visibility.address)c.addIssue({code:'custom',path:['visibility','address'],message:'Enter an address only if it is an approved public storefront address.'});
 for(const key of ['phone','email','website','address','pricing'] as const){const value=key==='address'?d.publicAddress:d[key];if(d.visibility[key]&&!value)c.addIssue({code:'custom',path:['visibility',key],message:'A visible field must have a value.'});}
});
export type BusinessDraft=z.infer<typeof businessDraft>;
export const businessPublic=z.object({id:businessId,revision:z.number().int().positive(),
 name:text(2,100),category:z.enum(BUSINESS_CATEGORIES),description:text(10,1000),services:z.array(text(2,80)).min(1).max(12),
 province:businessProvince,locality:text(2,80),kind:z.enum(['service_area','mobile','public_storefront']),serviceArea:text(2,200),
 phone:z.string().max(30).optional(),email:z.string().email().max(254).optional(),website:https.optional(),publicAddress:text(1,180).optional(),
 hours:text(0,180),pricing:text(0,300).optional(),languages:z.array(z.enum(BUSINESS_LANGUAGES)).min(1).max(12),
 reviewedAt:z.string().datetime(),listingReview:z.literal('publication_reviewed'),locationReview:z.literal('owner_provided'),contactReview:z.literal('not_independently_verified'),externalMaps:z.literal('not_submitted'),
}).strict();
export type PublicBusiness=z.infer<typeof businessPublic>;
export function publicBusiness(id:string,revision:number,input:BusinessDraft):PublicBusiness{
 const d=businessDraft.parse(input);
 return businessPublic.parse({id,revision,name:d.name,category:d.category,description:d.description,services:d.services,province:d.province,locality:d.locality,kind:d.kind,serviceArea:d.serviceArea,hours:d.hours,languages:d.languages,
 ...(d.visibility.phone?{phone:d.phone}:{}),...(d.visibility.email?{email:d.email}:{}),...(d.visibility.website?{website:d.website}:{}),
 ...(d.kind==='public_storefront'&&d.visibility.address?{publicAddress:d.publicAddress}:{}),...(d.visibility.pricing?{pricing:d.pricing}:{}),
 reviewedAt:new Date().toISOString(),listingReview:'publication_reviewed',locationReview:'owner_provided',contactReview:'not_independently_verified',externalMaps:'not_submitted'});
}
export const businessState=z.enum(['draft','pending','published','paused','rejected']);
export const businessReason=z.enum(['none','details_unclear','contact_needs_check','location_needs_check','duplicate','privacy_risk','misleading','other']);
export const businessOwned=z.object({id:businessId,revision:z.number().int().positive(),state:businessState,draft:businessDraft,reason:businessReason,updatedAt:z.string(),public:businessPublic.nullable()}).strict();
export type OwnedBusiness=z.infer<typeof businessOwned>;
export const businessSave=z.object({expectedRevision:z.number().int().min(0).max(1_000_000),draft:businessDraft}).strict();
export const businessRevision=z.object({expectedRevision:z.number().int().min(1).max(1_000_000)}).strict();
export const businessSubmit=businessRevision.extend({consentVersion:z.literal(BUSINESS_CONSENT_VERSION),ownerAuthorised:z.literal(true),publicationConsent:z.literal(true)}).strict();
export const businessDecision=businessRevision.extend({action:z.enum(['approve','reject','pause']),reviewedAuthority:z.literal(true),reason:businessReason,duplicatesChecked:z.boolean()}).strict();
export const businessReport=z.object({reason:z.enum(['impersonation','private_information','closed_moved','misleading','abuse','other']),note:text(0,300)}).strict();
export const businessReviewItem=z.object({id:businessId,revision:z.number().int().positive(),state:businessState,candidate:businessPublic,duplicateCount:z.number().int().min(0).max(100),reason:businessReason}).strict();
