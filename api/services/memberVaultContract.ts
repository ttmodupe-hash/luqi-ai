import { z } from 'zod';
/** Future subscriber project vault. No endpoint can issue a paid entitlement. */
export const projectId=z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const safeText=(max:number)=>z.string().min(1).max(max).refine(s=>
  s.trim().length>0&&!/[\u0000-\u001f\u007f]/u.test(s));
const money=z.string().regex(/^(0|[1-9][0-9]{0,7})(?:\.[0-9]{1,2})?$/);
export const savedQuote=z.object({
  businessName:safeText(90),customerName:safeText(90),reference:safeText(45),
  rows:z.array(z.object({
    description:safeText(120),quantity:z.number().int().min(1).max(1000),
    unitPriceZar:money,
  }).strict()).min(1).max(12),
}).strict();
export const newMemberProject=z.object({title:safeText(90),quote:savedQuote}).strict();
export const editMemberProject=newMemberProject.extend({
  expectedRevision:z.number().int().min(1).max(999999),
}).strict();
export const deleteMemberProject=z.object({
  confirm:z.literal(true),expectedRevision:z.number().int().min(1).max(999999),
}).strict();
export type MemberProjectInput=z.infer<typeof newMemberProject>;
export const MEMBER_LIMITS={starter:12,creator:60} as const;
export type MemberPlan=keyof typeof MEMBER_LIMITS;
export class VaultError extends Error{
  constructor(public readonly code:'MEMBERSHIP_REQUIRED'|'VAULT_NOT_FOUND'|
    'VAULT_CONFLICT'|'VAULT_LIMIT'|'AUTH_REQUIRED'){super(code);}
}
