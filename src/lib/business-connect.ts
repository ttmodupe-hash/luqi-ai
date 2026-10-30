import { z } from 'zod';
import { businessProfile, BUSINESS_CONSENT_VERSION, BUSINESS_DAYS, type BusinessProfile,
  type BusinessVerification, type OwnedBusiness, type PublicBusiness } from '@contracts/businessConnect';
import { requestConversationJson } from './conversation-request';

const verification = z.object({ownerApproved:z.boolean(),contactConfirmed:z.boolean(),
  locationReview:z.enum(['unreviewed','service_area_reviewed','point_reviewed']),providerListing:z.literal('not_checked')}).strict();
const owned = z.object({id:z.uuid(),revision:z.number().int().positive(),state:z.enum(['draft','pending','published','paused','rejected','suspended']),
  profile:businessProfile,verification,updatedAt:z.string().max(80)}).strict();
const s = businessProfile.shape;
const publicSchema = z.object({id:z.uuid(),tradingName:s.tradingName,categories:s.categories,description:s.description,
  descriptionLanguage:s.descriptionLanguage,translations:s.translations,services:s.services,province:s.province,municipality:s.municipality,
  locality:s.locality,kind:s.kind,serviceArea:s.serviceArea,deliveryRadiusKm:s.deliveryRadiusKm,publicAddress:s.publicAddress,
  landmark:s.landmark,publicPoint:s.publicPoint,contacts:z.object({phone:s.contacts.shape.phone.shape.value.optional(),whatsapp:s.contacts.shape.whatsapp.shape.value.optional(),email:s.contacts.shape.email.shape.value.optional(),website:s.contacts.shape.website.shape.value.optional()}).strict(),
  preferredContact:s.contacts.shape.preferred,hours:s.hours,languages:s.languages,accessibility:s.accessibility,verification,updatedAt:z.string().max(80)}).strict();
const summary = publicSchema.pick({id:true,tradingName:true,categories:true,description:true,province:true,municipality:true,
  locality:true,kind:true,languages:true,verification:true});
export type BusinessSummary = z.infer<typeof summary>;
export type BusinessDraft = Omit<BusinessProfile,'consent'> & {consent: Omit<BusinessProfile['consent'],'storage'|'ownerAuthority'> & {storage:boolean;ownerAuthority:boolean}};
export function newBusinessDraft(): BusinessDraft {
  const empty = () => ({value:'',public:false});
  return {ownerConfirmedName:'',tradingName:'',categories:['other'],description:'',descriptionLanguage:'en',translations:[],services:[{name:'',price:''}],
    province:'GP',municipality:'City of Tshwane Metropolitan Municipality',locality:'',kind:'service_area',serviceArea:'',deliveryRadiusKm:null,
    publicAddress:'',landmark:'',publicPoint:null,contacts:{phone:empty(),whatsapp:empty(),email:empty(),website:empty(),preferred:'none'},
    hours:BUSINESS_DAYS.map(day=>({day,closed:day==='sun',opens:'08:00',closes:'18:00',overnight:false})),languages:['en'],accessibility:[],
    consent:{version:BUSINESS_CONSENT_VERSION,storage:false,ownerAuthority:false,publicListing:false,contacts:false,exactLocation:false}};
}
export class BusinessRequestError extends Error {
  constructor(readonly status:number) { super(status===401?'Sign in to Luqi to continue.':status===403?'This action needs an authorised reviewer or owner.':
    status===409?'This listing changed or matches an existing business. Refresh your listings, or request a duplicate review.':
    status===429?'Too many requests. Please try later.':status===404?'This listing is unavailable.':
    status===400?'Check the listing fields and consent choices.':'Business Connect is unavailable. Your changes may not have saved; refresh before retrying.'); }
}
export async function businessRequest<T>(path:string,token:string|undefined,schema:z.ZodType<T>,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T> {
  // Fixed first-party paths only; no map calls, bearer persistence or write retry.
  if (!/^\/(?:status|directory(?:[/?].*)?|mine(?:\/.*)?|reports|moderation\/.*)$/.test(path) || path.includes('://') || path.includes('#')) throw Error('Invalid business path');
  const result = await requestConversationJson(fetch,'/api/v1/business-connect'+path,{method,credentials:'omit',cache:'no-store',
    headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  if (!result.ok) throw new BusinessRequestError(result.status);
  return schema.parse(result.body);
}
export const businessResponses = {
  status:z.object({enabled:z.boolean(),publicDirectory:z.boolean(),mode:z.enum(['disabled','authenticated_preview','public'])}).strict(),
  mine:z.object({businesses:z.array(owned).max(10),canReview:z.boolean()}).strict(),
  saved:z.object({business:owned}).strict(),
  removed:z.object({removed:z.literal(true),id:z.uuid()}).strict(),
  directory:z.object({businesses:z.array(summary).max(20),nextPage:z.number().int().min(1).max(51).nullable()}).strict(),
  page:z.object({business:publicSchema}).strict(),
  received:z.object({received:z.literal(true),id:z.uuid()}).strict(),
  queue:z.object({businesses:z.array(owned).max(50),reports:z.array(z.object({id:z.uuid(),businessId:z.uuid().nullable(),kind:z.string(),details:z.string().max(1000),createdAt:z.unknown()})).max(50)}).strict(),
  resolved:z.object({resolved:z.literal(true),id:z.uuid()}).strict(),
  history:z.object({events:z.array(z.object({action:z.string(),revision:z.number(),metadata:z.unknown(),createdAt:z.unknown()})).max(100)}).strict(),
};
export const BUSINESS_LANGUAGE_NAMES: Record<string,string> = {en:'English',af:'Afrikaans',zu:'isiZulu',xh:'isiXhosa',st:'Sesotho',
  tn:'Setswana',nso:'Sepedi',ss:'siSwati',nr:'isiNdebele',ve:'Tshivenda',ts:'itsonga'};
const copy = {
  en:['Find local businesses','Find services','My businesses','Save draft','Send for review','Your home address can stay private.'],
  af:['Vind plaaslike besighede','Vind dienste','My besighede','Stoor konsep','Stuur vir hersiening','Jou huisadres kan privaat bly.'],
  zu:['Thola amabhizinisi aseduze','Thola izinsizakalo','Amabhizinisi ami','Londoloza okusalungiswa','Thumela ukuze kubuyekezwe','Ikheli lakho lasekhaya lingahlala liyimfihlo.'],
  xh:['Fumana amashishini asekuhlaleni','Fumana iinkonzo','Amashishini am','Gcina uyilo','Thumela ukuze kuhlolwe','Idilesi yakho yasekhaya ingahlala iyimfihlo.'],
  tn:['Batla dikgwebo tsa mo lefelong','Batla ditirelo','Dikgwebo tsa me','Boloka mokwalo','Romela go sekasekwa','Aterese ya gago ya legae e ka nna sephiri.'],
  nso:['Hwetša dikgwebo tša kgauswi','Hwetša ditirelo','Dikgwebo tša ka','Boloka sengwalwa','Romela gore se lekolwe','Aterese ya gago ya gae e ka dula e le sephiri.'],
  st:['Fumana dikgwebo tsa lehae','Fumana ditshebeletso','Dikgwebo tsa ka','Boloka moralo','Romela hore e hlahlojwe','Aterese ya hao ya lapeng e ka dula e le lekunutu.'],
  ss:['Tfola emabhizinisi asendzaweni','Tfola tinsita','Emabhizinisi ami','Gcina luhlaka','Tfumela kutsi kubuyeketwe','Likheli lakho lasekhaya lingahlala liyimfihlo.'],
  nr:['Thola amabhizinisi wendawo','Thola imisebenzi','Amabhizinisi wami','Bulunga umtlolo','Thumela bona kuhlolwe','Ikheli lakho lekhaya lingahlala liyifihlo.'],
  ve:['Wanani mabindu a tsini','Wanani tshumelo','Mabindu anga','Vhulungani mvetamveto','Rumelani uri zwi sedzwe','Ḓiresi ya hayani yaṋu i nga dzula i tshiphiri.'],
  ts:['Kuma mabindzu ya le kusuhi','Kuma vukorhokeri','Mabindzu ya mina','Hlayisa mpfapfarhuto','Rhumela leswaku swi kamberiwa','Adirese ya wena ya le kaya yi nga va xihundla.'],
};
export function businessCopy(language:string) { const c=copy[language as keyof typeof copy]??copy.en;
  return {heading:c[0],find:c[1],mine:c[2],save:c[3],submit:c[4],privacy:c[5]}; }
export const initialBusinessVerification:BusinessVerification={ownerApproved:false,contactConfirmed:false,locationReview:'unreviewed',providerListing:'not_checked'};
export function businessSharePath(id:string) { return '/business-connect/'+z.uuid().parse(id); }
export function businessNavigationLink(p:PublicBusiness) {
  if (!p.publicPoint || p.kind!=='storefront') return null;
  return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(p.publicPoint.latitude+','+p.publicPoint.longitude);
}
export type { OwnedBusiness, PublicBusiness };
