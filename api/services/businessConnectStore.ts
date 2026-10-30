/** Durable MySQL only. No memory fallback, DDL, provider API or credential store. */
import { createHash, randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { z } from 'zod';
import { getPersistentMySqlPool } from '../queries/connection';
import { businessProfile, businessSearchText, publicBusiness, type OwnedBusiness, type BusinessProfile,
  type BusinessVerification, type businessWrite, type businessSearch, type businessModeration, type businessReport } from '../../contracts/businessConnect';

export class BusinessError extends Error {
  constructor(readonly code: 'NOT_FOUND' | 'CONFLICT' | 'DUPLICATE_REVIEW_REQUIRED' | 'LIMIT' | 'DENIED' | 'CONSENT_REQUIRED') { super(code); }
}
const fail = (code: BusinessError['code']): never => { throw new BusinessError(code); };
const verification = z.object({ ownerApproved: z.boolean(), contactConfirmed: z.boolean(),
  locationReview: z.enum(['unreviewed','service_area_reviewed','point_reviewed']), providerListing: z.literal('not_checked') }).strict();
const resetVerification = (ownerApproved = false): BusinessVerification => ({ ownerApproved, contactConfirmed: false,
  locationReview: 'unreviewed', providerListing: 'not_checked' });
const states = z.enum(['draft','pending','published','paused','rejected','suspended']);
const decode = (v: unknown) => typeof v === 'string' ? JSON.parse(v) : v;
function fromRow(r: RowDataPacket): OwnedBusiness {
  return { id: z.uuid().parse(r.id), revision: z.number().int().min(1).max(1000000).parse(r.revision),
    state: states.parse(r.state), profile: businessProfile.parse(decode(r.document)),
    verification: verification.parse(decode(r.verification)), updatedAt: String(r.updated_at) };
}
const columns = "id,owner_id,revision,state,document,verification,DATE_FORMAT(updated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at";
const normalize = (v: string) => v.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function businessDedupeKey(p: BusinessProfile) {
  return createHash('sha256').update([normalize(p.tradingName),p.province,normalize(p.municipality),normalize(p.locality)].join('|')).digest('hex');
}
export function reviewerConfigured(id: number) {
  return (process.env.LUQI_BUSINESS_REVIEWER_IDS ?? '').split(',').some(v => /^[1-9]\d{0,14}$/.test(v.trim()) && Number(v.trim()) === id);
}
async function transaction<T>(task: (c: PoolConnection) => Promise<T>): Promise<T> {
  const c = await getPersistentMySqlPool().getConnection();
  try {
    await c.query("SET time_zone = '+00:00'");
    await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await c.beginTransaction(); const result = await task(c); await c.commit(); return result;
  } catch (e) {
    await c.rollback().catch(() => {});
    if ((e as { code?: string }).code === 'ER_DUP_ENTRY') fail('DUPLICATE_REVIEW_REQUIRED');
    throw e;
  } finally { c.release(); }
}
async function actor(c: PoolConnection, id: number, review = false) {
  if (!Number.isSafeInteger(id) || id < 1) fail('DENIED');
  const [users] = await c.execute<RowDataPacket[]>('SELECT id,is_active,role FROM users WHERE id=? FOR UPDATE',[id]);
  if (users[0]?.is_active !== 1 || (review && (!reviewerConfigured(id) || users[0]?.role !== 'admin'))) fail('DENIED');
}
async function limit(c: PoolConnection, id: number, reports = false) {
  // Durable daily counters across replicas; not a customer/AI subscription cap.
  await c.execute('INSERT IGNORE INTO luqi_business_limits_v1 (actor_id,day_utc,writes,reports) VALUES (?,UTC_DATE(),0,0)',[id]);
  const column = reports ? 'reports' : 'writes', maximum = reports ? 10 : 100;
  const [r] = await c.execute<ResultSetHeader>(`UPDATE luqi_business_limits_v1 SET ${column}=${column}+1 WHERE actor_id=? AND day_utc=UTC_DATE() AND ${column}<?`,[id,maximum]);
  if (r.affectedRows !== 1) fail('LIMIT');
}
async function locked(c: PoolConnection, id: string, owner?: number) {
  const [rows] = await c.execute<RowDataPacket[]>('SELECT '+columns+' FROM luqi_business_profiles_v1 WHERE id=?'+
    (owner === undefined ? '' : ' AND owner_id=?')+' FOR UPDATE',owner === undefined ? [id] : [id,owner]);
  if (!rows[0]) fail('NOT_FOUND'); return rows[0];
}
async function audit(c: PoolConnection, id: string | null, who: number, action: string, rev: number, metadata: unknown) {
  // No historical profile/contact/location snapshots. Current owner data stays editable/deletable.
  await c.execute('INSERT INTO luqi_business_audit_v1 (business_id,actor_id,action,revision,metadata,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',
    [id,who,action,rev,JSON.stringify(metadata)]);
}
async function store(c: PoolConnection, id: string, owner: number, rev: number, state: OwnedBusiness['state'], p: BusinessProfile, v: BusinessVerification, create = false) {
  const values = [state,businessDedupeKey(p),p.province,p.municipality,p.tradingName,businessSearchText(p),JSON.stringify(p),JSON.stringify(v)];
  if (create) await c.execute('INSERT INTO luqi_business_profiles_v1 (state,dedupe_key,province,municipality,trading_name,search_text,document,verification,id,owner_id,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))', [...values,id,owner]);
  else {
    const [r] = await c.execute<ResultSetHeader>('UPDATE luqi_business_profiles_v1 SET state=?,dedupe_key=?,province=?,municipality=?,trading_name=?,search_text=?,document=?,verification=?,revision=revision+1,updated_at=UTC_TIMESTAMP(6) WHERE id=? AND owner_id=? AND revision=?', [...values,id,owner,rev]);
    if (r.affectedRows !== 1) fail('CONFLICT');
  }
  return fromRow(await locked(c,id,owner));
}
const ensureRevision = (b: OwnedBusiness, rev: number) => { if (b.revision !== rev || b.revision >= 1000000) fail('CONFLICT'); };

export const businessConnectStore = {
  async mine(owner: number) {
    const [rows] = await getPersistentMySqlPool().execute<RowDataPacket[]>('SELECT '+columns+' FROM luqi_business_profiles_v1 WHERE owner_id=? ORDER BY updated_at DESC,id LIMIT 10',[owner]);
    let canReview = false;
    if (reviewerConfigured(owner)) {
      const [users] = await getPersistentMySqlPool().execute<RowDataPacket[]>('SELECT role,is_active FROM users WHERE id=?',[owner]);
      canReview = users[0]?.role === 'admin' && users[0]?.is_active === 1;
    }
    return { businesses: rows.map(fromRow), canReview };
  },
  async save(owner: number, id: string, input: z.infer<typeof businessWrite>) {
    const p = businessProfile.parse(input.profile);
    return transaction(async c => {
      await actor(c,owner); await limit(c,owner);
      if (input.expectedRevision === 0) {
        const [counts] = await c.execute<RowDataPacket[]>('SELECT COUNT(*) AS n FROM luqi_business_profiles_v1 WHERE owner_id=?',[owner]);
        if (Number(counts[0]?.n) >= 10) fail('LIMIT');
        const b = await store(c,id,owner,0,'draft',p,resetVerification(),true);
        await audit(c,id,owner,'created',1,{ consent:p.consent }); return { business:b };
      }
      const b = fromRow(await locked(c,id,owner)); ensureRevision(b,input.expectedRevision);
      // A suspended listing cannot escape review by editing or pausing.
      const updated = await store(c,id,owner,b.revision,b.state === 'suspended' ? 'suspended' : 'draft',p,resetVerification());
      await audit(c,id,owner,'edited',updated.revision,{ consent:p.consent }); return { business:updated };
    });
  },
  async ownerAction(owner: number, id: string, rev: number, action: 'submit'|'pause'|'delete') {
    return transaction(async c => {
      await actor(c,owner); await limit(c,owner);
      const b = fromRow(await locked(c,id,owner)); ensureRevision(b,rev);
      if (action === 'delete') {
        await audit(c,id,owner,'deleted',rev,{});
        await c.execute('DELETE FROM luqi_business_profiles_v1 WHERE id=? AND owner_id=?',[id,owner]);
        return { removed:true as const,id };
      }
      if (b.state === 'suspended') fail('DENIED');
      if (action === 'submit' && (!b.profile.consent.publicListing || !b.profile.consent.storage)) fail('CONSENT_REQUIRED');
      if (action === 'submit' && !['draft','paused','rejected'].includes(b.state)) fail('CONFLICT');
      const updated = await store(c,id,owner,rev,action === 'submit' ? 'pending' : 'paused',b.profile,
        action === 'submit' ? resetVerification(true) : b.verification);
      await audit(c,id,owner,action,updated.revision,{ consent:b.profile.consent }); return { business:updated };
    });
  },
  async directory(input: z.infer<typeof businessSearch>) {
    const clauses = ["b.state='published'",'u.is_active=1',"JSON_EXTRACT(b.document,'$.consent.publicListing')=true"];
    const params: (string | number)[] = [];
    if (input.q) { clauses.push("b.search_text LIKE ? ESCAPE '='"); params.push('%'+input.q.toLowerCase().replace(/[=%_]/g,'=$&')+'%'); }
    for (const key of ['province','municipality'] as const) if (input[key]) { clauses.push('b.'+key+'=?'); params.push(input[key]); }
    if (input.category) { clauses.push("JSON_CONTAINS(b.document,?, '$.categories')"); params.push(JSON.stringify(input.category)); }
    if (input.language) { clauses.push("JSON_CONTAINS(b.document,?, '$.languages')"); params.push(JSON.stringify(input.language)); }
    const [rows] = await getPersistentMySqlPool().execute<RowDataPacket[]>('SELECT b.id,b.document,b.verification,b.revision,b.state,'+
      "DATE_FORMAT(b.updated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at FROM luqi_business_profiles_v1 b JOIN users u ON u.id=b.owner_id WHERE "+
      clauses.join(' AND ')+' ORDER BY b.trading_name,b.id LIMIT 21 OFFSET ?',[...params,input.page*20]);
    return { businesses: rows.slice(0,20).map(row => {
      const p = publicBusiness(fromRow(row));
      return { id:p.id,tradingName:p.tradingName,categories:p.categories,description:p.description.slice(0,180),
        province:p.province,municipality:p.municipality,locality:p.locality,kind:p.kind,languages:p.languages,verification:p.verification };
    }), nextPage: rows.length > 20 && input.page < 50 ? input.page+1 : null };
  },
  async publicPage(id: string) {
    const [rows] = await getPersistentMySqlPool().execute<RowDataPacket[]>('SELECT '+columns+
      " FROM luqi_business_profiles_v1 WHERE id=? AND state='published' AND JSON_EXTRACT(document,'$.consent.publicListing')=true AND EXISTS (SELECT 1 FROM users WHERE users.id=owner_id AND is_active=1)",[id]);
    if (!rows[0]) fail('NOT_FOUND'); return { business:publicBusiness(fromRow(rows[0])) };
  },
  async history(owner: number, id: string) {
    return transaction(async c => {
      await actor(c,owner); await locked(c,id,owner);
      const [rows] = await c.execute<RowDataPacket[]>('SELECT action,revision,metadata,created_at FROM luqi_business_audit_v1 WHERE business_id=? ORDER BY id DESC LIMIT 100',[id]);
      return { events: rows.map(r => ({action:r.action,revision:r.revision,metadata:decode(r.metadata),createdAt:r.created_at})) };
    });
  },
  async report(owner: number, input: z.infer<typeof businessReport>) {
    return transaction(async c => {
      await actor(c,owner); await limit(c,owner,true);
      if (input.businessId) {
        const b = await locked(c,input.businessId);
        if (b.state !== 'published' && Number(b.owner_id) !== owner) fail('NOT_FOUND');
      }
      const id = randomUUID();
      await c.execute("INSERT INTO luqi_business_reports_v1 (id,business_id,reporter_id,kind,details,state,created_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))",
        [id,input.businessId,owner,input.kind,input.details]);
      await audit(c,input.businessId,owner,'report_opened',0,{kind:input.kind}); return { received:true as const,id };
    });
  },
  async reviewQueue(reviewer: number) {
    return transaction(async c => {
      await actor(c,reviewer,true);
      const [rows] = await c.execute<RowDataPacket[]>('SELECT '+columns+" FROM luqi_business_profiles_v1 WHERE state IN ('pending','suspended') OR (state='published' AND EXISTS (SELECT 1 FROM luqi_business_reports_v1 r WHERE r.business_id=luqi_business_profiles_v1.id AND r.state='open')) ORDER BY updated_at,id LIMIT 50");
      const [reports] = await c.execute<RowDataPacket[]>("SELECT id,business_id AS businessId,kind,details,created_at AS createdAt FROM luqi_business_reports_v1 WHERE state='open' ORDER BY created_at,id LIMIT 50");
      return { businesses:rows.map(fromRow),reports };
    });
  },
  async moderate(reviewer: number, id: string, input: z.infer<typeof businessModeration>) {
    return transaction(async c => {
      await actor(c,reviewer,true); await limit(c,reviewer);
      const row = await locked(c,id), b = fromRow(row); ensureRevision(b,input.expectedRevision);
      if (Number(row.owner_id) === reviewer) fail('DENIED');
      const approve = input.decision === 'approve';
      if ((approve || input.decision === 'reject') && b.state !== 'pending') fail('CONFLICT');
      if (input.decision === 'release' && b.state !== 'suspended') fail('CONFLICT');
      if (approve && (!b.profile.consent.publicListing || !b.verification.ownerApproved)) fail('CONSENT_REQUIRED');
      if (approve && input.locationReview === 'point_reviewed' && (!b.profile.publicPoint || b.profile.kind !== 'storefront')) fail('CONFLICT');
      if (approve && input.locationReview === 'service_area_reviewed' && !b.profile.serviceArea) fail('CONFLICT');
      const state = {approve:'published',reject:'rejected',suspend:'suspended',release:'draft'} as const;
      const v = approve ? { ownerApproved:true,contactConfirmed:input.contactConfirmed,
        locationReview:input.locationReview,providerListing:'not_checked' as const } : resetVerification();
      const updated = await store(c,id,Number(row.owner_id),b.revision,state[input.decision],b.profile,v);
      await audit(c,id,reviewer,'review_'+input.decision,updated.revision,{reason:input.reason,method:input.method,verification:v});
      return { business:updated };
    });
  },
  async resolveReport(reviewer: number, id: string) {
    return transaction(async c => {
      await actor(c,reviewer,true); await limit(c,reviewer);
      const [rows] = await c.execute<RowDataPacket[]>('SELECT business_id FROM luqi_business_reports_v1 WHERE id=? FOR UPDATE',[id]);
      if (!rows[0]) fail('NOT_FOUND');
      await c.execute("UPDATE luqi_business_reports_v1 SET state='resolved',resolved_at=UTC_TIMESTAMP(6) WHERE id=?",[id]);
      await audit(c,rows[0].business_id,reviewer,'report_resolved',0,{}); return {resolved:true as const,id};
    });
  },
  /** Operator/reviewer-triggered retention only; disabled routes cannot schedule work. */
  async retention(reviewer: number) {
    return transaction(async c => {
      await actor(c,reviewer,true);
      const [profiles] = await c.execute<ResultSetHeader>("DELETE FROM luqi_business_profiles_v1 WHERE state IN ('draft','paused','rejected','pending','suspended') AND updated_at < UTC_TIMESTAMP(6)-INTERVAL 180 DAY LIMIT 500");
      const [reports] = await c.execute<ResultSetHeader>("DELETE FROM luqi_business_reports_v1 WHERE (state='resolved' AND resolved_at < UTC_TIMESTAMP(6)-INTERVAL 30 DAY) OR created_at < UTC_TIMESTAMP(6)-INTERVAL 90 DAY LIMIT 500");
      const [audits] = await c.execute<ResultSetHeader>('DELETE FROM luqi_business_audit_v1 WHERE created_at < UTC_TIMESTAMP(6)-INTERVAL 90 DAY LIMIT 1000');
      await c.execute('DELETE FROM luqi_business_limits_v1 WHERE day_utc < UTC_DATE()-INTERVAL 2 DAY LIMIT 1000');
      return {profiles:profiles.affectedRows,reports:reports.affectedRows,auditEvents:audits.affectedRows};
    });
  },
};
