/** Server-owned identity, mutual pair circles and durable block/report enforcement.
 * No plaintext message bodies or encryption keys enter the delivery store.
 */
import { randomUUID, createHmac, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getPersistentMySqlPool } from '../queries/connection';
import { getSigningSecret } from '../lib/userToken';
import type { P2PMessagePacket, P2PCircle } from '../../contracts/p2p';
export class P2PError extends Error {
  constructor(public code: 'P2P_NOT_FOUND' | 'P2P_DENIED' | 'P2P_CONFLICT' | 'P2P_LIMIT' | 'P2P_UNAVAILABLE') { super(code); }
}
export const p2pEnabled = () => process.env.LUQI_P2P_ENABLED === 'true';
function deny(): never { throw new P2PError('P2P_DENIED'); }
export function eligibility(role: string) {
  return role === 'p2p_adult' || role === 'p2p_moderator' ? 'verified_adult' as const
    : /^p2p_student:[a-z0-9_-]{1,32}$/.test(role) ? 'verified_student' as const : 'verification_needed' as const;
}
function reportKey() {
  const raw = process.env.LUQI_P2P_REPORT_KEY ?? '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(raw) || Buffer.from(raw, 'base64url').length !== 32) throw new P2PError('P2P_UNAVAILABLE');
  return Buffer.from(raw, 'base64url');
}
export function sealEvidence(evidence: string): { iv: string; ciphertext: string; tag: string } {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', createHmac('sha256',reportKey()).update('luqi-p2p-evidence-encryption-v1').digest(), iv);
  cipher.setAAD(Buffer.from('luqi-p2p-report-evidence-v1'));
  const value = Buffer.concat([cipher.update(evidence, 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64url'), ciphertext: value.toString('base64url'), tag: cipher.getAuthTag().toString('base64url') };
}
function openEvidence(value: { iv: string; ciphertext: string; tag: string }): string {
  const cipher = createDecipheriv('aes-256-gcm', createHmac('sha256',reportKey()).update('luqi-p2p-evidence-encryption-v1').digest(), Buffer.from(value.iv, 'base64url'));
  cipher.setAAD(Buffer.from('luqi-p2p-report-evidence-v1')); cipher.setAuthTag(Buffer.from(value.tag, 'base64url'));
  return Buffer.concat([cipher.update(Buffer.from(value.ciphertext, 'base64url')), cipher.final()]).toString('utf8');
}
export function auditSeal(report: { id: string; reporterId: number; offenderId: number; messageId: string; reason: string; timestamp: string; previousSeal: string; sealedEvidence: unknown }): string {
  // MySQL JSON may reorder object keys. Bind ordered fields, never property order.
  const evidence=report.sealedEvidence as ReturnType<typeof sealEvidence>;
  if(!evidence||typeof evidence.iv!=='string'||typeof evidence.ciphertext!=='string'||typeof evidence.tag!=='string')throw new P2PError('P2P_UNAVAILABLE');
  return createHmac('sha256',createHmac('sha256',reportKey()).update('luqi-p2p-report-audit-v1').digest()).update(JSON.stringify(['luqi-p2p-report-v1', report.id,
    report.reporterId, report.offenderId, report.messageId, report.reason, report.timestamp, report.previousSeal, [evidence.iv,evidence.ciphertext,evidence.tag]])).digest('hex');
}
const digest = (secret: string) => createHmac('sha256', getSigningSecret()).update('luqi-p2p-invite-v1\0' + secret).digest('hex');
async function query(connection: Pick<PoolConnection, 'query'>, sql: string, values: unknown[] = []): Promise<RowDataPacket[]> {
  return (await connection.query<RowDataPacket[]>({ sql, timeout: 4000 }, values))[0];
}
async function transaction<T>(actor: number, work: (c: PoolConnection, user: RowDataPacket) => Promise<T>): Promise<T> {
  reportKey();
  const c = await getPersistentMySqlPool().getConnection(); let begun = false;
  try {
    await c.beginTransaction(); begun = true;
    const [user] = await query(c, 'SELECT id,role,is_active FROM users WHERE id=? FOR UPDATE', [actor]);
    if (!user || Number(user.is_active) !== 1) deny();
    const result = await work(c, user); await c.commit(); begun = false; return result;
  } catch (error) {
    if (begun) await c.rollback();
    if (error instanceof P2PError) throw error;
    throw new P2PError('P2P_UNAVAILABLE');
  } finally { c.release(); }
}
const circle = (r: RowDataPacket): P2PCircle => ({ id: r.id, name: r.name, category: r.category,
  ownerId: Number(r.owner_id), peerId: r.peer_id == null ? null : Number(r.peer_id),
  requestedBy: r.requested_by == null ? null : Number(r.requested_by), active: !!r.active, studentLock: !!r.student_lock });
async function allowedPair(c: PoolConnection, owner: number, peer: number, studentLock: boolean) {
  const rows = await query(c, 'SELECT id,role,is_active FROM users WHERE id IN (?,?) FOR UPDATE', [owner, peer]);
  const a = rows.find(r => Number(r.id) === owner), b = rows.find(r => Number(r.id) === peer);
  if (!a || !b || Number(a.is_active) !== 1 || Number(b.is_active) !== 1) deny();
  const sameSchool = eligibility(a.role) === 'verified_student' && a.role === b.role;
  const bothAdults = eligibility(a.role) === 'verified_adult' && eligibility(b.role) === 'verified_adult';
  if (studentLock ? !sameSchool : !bothAdults) deny();
  // MySQL 8.4 FOR SHARE needs only SELECT; immutable blocks never get UPDATE grants.
  const blocked = await query(c, 'SELECT owner_id FROM luqi_p2p_blocks_v1 WHERE (owner_id=? AND peer_id=?) OR (owner_id=? AND peer_id=?) LIMIT 1 FOR SHARE', [owner, peer, peer, owner]);
  if (blocked.length) deny();
}
async function owned(c: PoolConnection, actor: number, id: string, active = false) {
  const [row] = await query(c, 'SELECT * FROM luqi_p2p_circles_v1 WHERE id=? FOR UPDATE', [id]);
  if (!row || (Number(row.owner_id) !== actor && Number(row.peer_id) !== actor)) throw new P2PError('P2P_NOT_FOUND');
  if (active) {
    if (!row.active || !row.peer_id) deny();
    await allowedPair(c, Number(row.owner_id), Number(row.peer_id), !!row.student_lock);
  }
  return row;
}
export class SovereignP2PEngine {
  static async status(actor: number) {
    return transaction(actor, async (c, user) => ({ enabled: true, userId: actor, eligibility: eligibility(user.role),
      blockedPeers: (await query(c, 'SELECT peer_id FROM luqi_p2p_blocks_v1 WHERE owner_id=? LIMIT 100', [actor])).map(r=>Number(r.peer_id)),
      circles: (await query(c, 'SELECT * FROM luqi_p2p_circles_v1 WHERE owner_id=? OR peer_id=? OR requested_by=? ORDER BY created_at DESC LIMIT 24', [actor,actor,actor])).map(circle) }));
  }
  static async create(actor: number, input: { id: string; name: string; category: string; inviteToken: string; studentLock: boolean }) {
    return transaction(actor, async (c, user) => {
      if (eligibility(user.role) === 'verification_needed' || (input.studentLock ? eligibility(user.role) !== 'verified_student' : eligibility(user.role) !== 'verified_adult')) deny();
      const [count] = await query(c, 'SELECT COUNT(*) AS n, SUM(owner_id=?) AS owned FROM luqi_p2p_circles_v1 WHERE owner_id=? OR peer_id=? OR requested_by=?', [actor,actor,actor,actor]);
      if (Number(count.n) >= 24 || Number(count.owned) >= 12) throw new P2PError('P2P_LIMIT');
      await query(c, 'INSERT INTO luqi_p2p_circles_v1(id,owner_id,name,category,invite_digest,invite_expires_at,student_lock) VALUES(?,?,?,?,?,DATE_ADD(CURRENT_TIMESTAMP(3),INTERVAL 1 DAY),?)',
        [input.id,actor,input.name,input.category,digest(input.inviteToken),input.studentLock]);
      return { circle: circle(await owned(c, actor, input.id)) };
    });
  }
  static async join(actor: number, id: string, inviteToken: string) {
    return transaction(actor, async c => {
      const [row] = await query(c, 'SELECT * FROM luqi_p2p_circles_v1 WHERE id=? AND invite_digest=? AND invite_expires_at>CURRENT_TIMESTAMP(3) FOR UPDATE', [id,digest(inviteToken)]);
      if (!row || row.active || row.peer_id || Number(row.owner_id) === actor || (row.requested_by && Number(row.requested_by) !== actor)) deny();
      await allowedPair(c, Number(row.owner_id), actor, !!row.student_lock);
      const [count] = await query(c, 'SELECT COUNT(*) AS n FROM luqi_p2p_circles_v1 WHERE owner_id=? OR peer_id=? OR requested_by=?', [actor,actor,actor]);
      if (!row.requested_by && Number(count.n)>=24) throw new P2PError('P2P_LIMIT');
      await query(c, 'UPDATE luqi_p2p_circles_v1 SET requested_by=? WHERE id=?', [actor,id]);
      return { requested: true, circle: circle({ ...row, requested_by: actor } as RowDataPacket) };
    });
  }
  static async confirm(actor: number, id: string) {
    return transaction(actor, async c => {
      const row = await owned(c,actor,id);
      if (Number(row.owner_id) !== actor || !row.requested_by || row.active || row.invite_expires_at <= new Date()) deny();
      await allowedPair(c,actor,Number(row.requested_by),!!row.student_lock);
      await query(c, 'UPDATE luqi_p2p_circles_v1 SET peer_id=requested_by,active=1 WHERE id=? AND active=0', [id]);
      return { circle: circle({ ...row, peer_id: row.requested_by, active: 1 } as RowDataPacket) };
    });
  }
  static async messages(actor: number, id: string) {
    return transaction(actor, async c => {
      await owned(c,actor,id,true);
      const rows = await query(c, 'SELECT * FROM luqi_p2p_messages_v1 WHERE circle_id=? ORDER BY created_at DESC,id DESC LIMIT 100', [id]);
      return { messages: rows.reverse().map(r => ({ messageId:r.id,circleId:r.circle_id,senderId:Number(r.sender_id),recipientId:Number(r.recipient_id),
        timestamp:r.client_timestamp,iv:r.iv,ciphertext:r.ciphertext })) };
    });
  }
  static async send(actor: number, p: P2PMessagePacket) {
    return transaction(actor, async c => {
      const row = await owned(c,actor,p.circleId,true);
      const peer = Number(row.owner_id) === actor ? Number(row.peer_id) : Number(row.owner_id);
      if (p.senderId !== actor || p.recipientId !== peer || p.timestamp.length !== 24) deny();
      const [existing] = await query(c, 'SELECT * FROM luqi_p2p_messages_v1 WHERE id=? FOR SHARE', [p.messageId]);
      if (existing) {
        if (existing.circle_id !== p.circleId || Number(existing.sender_id) !== actor || Number(existing.recipient_id) !== peer ||
            existing.iv !== p.iv || existing.ciphertext !== p.ciphertext || existing.client_timestamp !== p.timestamp) throw new P2PError('P2P_CONFLICT');
        return { accepted:true,messageId:p.messageId };
      }
      if (Math.abs(Date.now()-Date.parse(p.timestamp)) > 300_000) deny();
      const [count] = await query(c, 'SELECT COUNT(*) AS n FROM luqi_p2p_messages_v1 WHERE sender_id=? AND created_at>DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 1 MINUTE)', [actor]);
      const [total] = await query(c, 'SELECT COUNT(*) AS n FROM luqi_p2p_messages_v1 WHERE circle_id=?', [p.circleId]);
      if (Number(count.n) >= 20 || Number(total.n) >= 500) throw new P2PError('P2P_LIMIT');
      await query(c, 'INSERT INTO luqi_p2p_messages_v1(id,circle_id,sender_id,recipient_id,iv,ciphertext,client_timestamp) VALUES(?,?,?,?,?,?,?)',
        [p.messageId,p.circleId,actor,peer,p.iv,p.ciphertext,p.timestamp]);
      return { accepted: true, messageId:p.messageId }; // Accepted by store, not a read/delivery receipt.
    });
  }
  static async blockUser(actor: number, target: number) {
    if (actor === target) deny();
    return transaction(actor, async c => {
      const [contact] = await query(c, 'SELECT id FROM luqi_p2p_circles_v1 WHERE (owner_id=? AND (peer_id=? OR requested_by=?)) OR (owner_id=? AND (peer_id=? OR requested_by=?)) LIMIT 1', [actor,target,target,target,actor,actor]);
      if (!contact) deny();
      await query(c, 'INSERT IGNORE INTO luqi_p2p_blocks_v1(owner_id,peer_id) VALUES(?,?)', [actor,target]);
      return { blocked: true };
    });
  }
  static async reportAbuseAndBlock(actor: number, input: { messageId: string; reason: string; evidence: string }) {
    return transaction(actor, async c => {
      const [message] = await query(c, 'SELECT * FROM luqi_p2p_messages_v1 WHERE id=? AND recipient_id=?', [input.messageId,actor]);
      if (!message) deny();
      await owned(c,actor,message.circle_id); // Reporting stays possible after blocking.
      const [existing] = await query(c, 'SELECT * FROM luqi_p2p_reports_v1 WHERE reporter_id=? AND message_id=?', [actor,input.messageId]);
      if (existing) return { reportId:existing.id, previousSeal:existing.previous_seal, sha256AuditSeal:existing.seal, timestamp:existing.timestamp, blocked:true };
      const [head] = await query(c, 'SELECT seal FROM luqi_p2p_audit_head_v1 WHERE id=1 FOR UPDATE');
      if (!head) throw new P2PError('P2P_UNAVAILABLE');
      const report = { id:randomUUID(), reporterId:actor, offenderId:Number(message.sender_id), messageId:input.messageId,
        reason:input.reason, timestamp:new Date().toISOString(), previousSeal:head.seal, sealedEvidence:sealEvidence(input.evidence) };
      const seal = auditSeal(report);
      await query(c, 'INSERT INTO luqi_p2p_reports_v1(id,reporter_id,offender_id,message_id,reason,sealed_evidence,timestamp,previous_seal,seal) VALUES(?,?,?,?,?,?,?,?,?)',
        [report.id,actor,report.offenderId,report.messageId,report.reason,JSON.stringify(report.sealedEvidence),report.timestamp,report.previousSeal,seal]);
      await query(c, 'UPDATE luqi_p2p_audit_head_v1 SET seal=? WHERE id=1', [seal]);
      await query(c, 'INSERT IGNORE INTO luqi_p2p_blocks_v1(owner_id,peer_id) VALUES(?,?)', [actor,report.offenderId]);
      return { reportId:report.id, previousSeal:report.previousSeal, sha256AuditSeal:seal, timestamp:report.timestamp, blocked:true };
    });
  }
  static async reports(actor: number) {
    return transaction(actor, async (c,user) => {
      if (user.role !== 'p2p_moderator') deny();
      const [head] = await query(c, 'SELECT seal FROM luqi_p2p_audit_head_v1 WHERE id=1 FOR UPDATE');
      const rows = await query(c, 'SELECT * FROM luqi_p2p_reports_v1 ORDER BY sequence DESC LIMIT 50');
      if (!head || (!rows.length && head.seal !== '0'.repeat(64)) || (rows.length && head.seal !== rows[0].seal) ||
          rows.some((r,i)=>i+1<rows.length && r.previous_seal !== rows[i+1].seal) ||
          (rows.length<50 && rows.length && rows[rows.length-1].previous_seal !== '0'.repeat(64))) throw new P2PError('P2P_UNAVAILABLE');
      return { reports:rows.map(r => {
        const sealedEvidence = typeof r.sealed_evidence === 'string' ? JSON.parse(r.sealed_evidence) : r.sealed_evidence;
        const expected = auditSeal({ id:r.id,reporterId:Number(r.reporter_id),offenderId:Number(r.offender_id),messageId:r.message_id,
          reason:r.reason,timestamp:r.timestamp,previousSeal:r.previous_seal,sealedEvidence });
        if (expected !== r.seal) throw new P2PError('P2P_UNAVAILABLE');
        return { reportId:r.id,reason:r.reason,timestamp:r.timestamp,previousSeal:r.previous_seal,sha256AuditSeal:r.seal,
          evidence:openEvidence(sealedEvidence), reporterId:Number(r.reporter_id), offenderId:Number(r.offender_id) };
      }) };
    });
  }
}
