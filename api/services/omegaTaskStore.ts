/** Shared MySQL queue contract with omega_ai.mysql_workflow; no DDL or execution. */
import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPersistentMySqlPool } from '../queries/connection';
import { canonicalJson, OMEGA_HANDLERS, OMEGA_OWNER_TASK_LIMIT, OMEGA_VERSION, omegaOwner,
  omegaState, omegaSubmission, validateOmegaResult, type OmegaSubmission } from './omegaTaskContract';

export class OmegaTaskError extends Error {
  constructor(public readonly code: 'OMEGA_TASK_NOT_FOUND' | 'OMEGA_TASK_CONFLICT' |
    'OMEGA_TASK_LIMIT' | 'AUTH_REQUIRED') { super(code); }
}
const decode = (value: unknown) => Buffer.isBuffer(value) ? value.toString('utf8') : value;
function document(row: RowDataPacket) {
  return typeof row.document === 'string' ? JSON.parse(row.document) : row.document;
}
function contract(row: RowDataPacket) {
  if (!OMEGA_HANDLERS.includes(decode(row.handler) as any) || decode(row.handler_version) !== OMEGA_VERSION || row.side_effects !== 0) {
    throw new OmegaTaskError('OMEGA_TASK_NOT_FOUND');
  }
  const doc = document(row);
  const input = omegaSubmission.parse({ handler: decode(row.handler), payload: doc.payload,
    idempotencyKey: decode(row.idempotency_key) });
  if (doc.max_attempts !== 3 || !Number.isInteger(doc.attempts) || doc.attempts < 0 || doc.attempts > 3 ||
    doc.approved_by !== null || !Array.isArray(doc.audit) || doc.audit.length > 32) throw new Error('Invalid task document');
  return { doc, input };
}
function view(row: RowDataPacket) {
  const { doc, input } = contract(row);
  const state = omegaState.parse(row.state);
  if (!doc.audit.length || doc.audit.some((event: any) => typeof event.at !== 'string' ||
    !Number.isFinite(Date.parse(event.at)))) throw new Error('Invalid task timestamps');
  if (doc.error !== null && !['HANDLER_FAILED', 'HANDLER_INTERRUPTED', 'WORKER_LEASE_EXPIRED'].includes(doc.error)) {
    throw new Error('Invalid task error');
  }
  // Do not expose owner IDs, idempotency keys, audit actors or worker lease tokens.
  return { id: row.id as string, handler: input.handler, version: OMEGA_VERSION, state,
    payload: input.payload, result: state === 'completed' ? validateOmegaResult(input.handler, doc.result) : null,
    error: doc.error, attempts: doc.attempts as number, maxAttempts: 3,
    nextRunAt: row.next_run_at ?? null, createdAt: doc.audit[0].at as string,
    updatedAt: doc.audit[doc.audit.length - 1].at as string };
}
const columns = `id,owner_id,idempotency_key,handler,handler_version,side_effects,state,document,
  DATE_FORMAT(next_run_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS next_run_at`;
const scope = `handler IN ('travel.budget','vehicle.schedule') AND handler_version='web-v1' AND side_effects=0`;

async function transaction<T>(operation: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getPersistentMySqlPool().getConnection();
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { connection.release(); }
}
async function owned(connection: PoolConnection, owner: string, id: string) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT ${columns} FROM omega_tasks_v1 WHERE id=? AND owner_id=? AND ${scope} FOR UPDATE`,
    [id, Buffer.from(owner)]);
  if (!rows[0]) throw new OmegaTaskError('OMEGA_TASK_NOT_FOUND');
  contract(rows[0]);
  return rows[0];
}
async function now(connection: PoolConnection): Promise<string> {
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT DATE_FORMAT(UTC_TIMESTAMP(6),'%Y-%m-%dT%H:%i:%s.%fZ') AS instant");
  return rows[0].instant;
}

export const omegaTaskStore = {
  async status() {
    // Connectivity/schema probe only. Configuration is not proof of an active worker.
    await getPersistentMySqlPool().query('SELECT id FROM omega_tasks_v1 LIMIT 0');
    return { intake: 'configured', storage: 'connected', execution: 'operator_run_only',
      workerVerified: false, handlers: OMEGA_HANDLERS, ownerTaskLimit: OMEGA_OWNER_TASK_LIMIT };
  },
  async submit(userId: number, submitted: OmegaSubmission) {
    const input = omegaSubmission.parse(submitted);
    const owner = omegaOwner(userId);
    return transaction(async connection => {
      // Serialize intake/quota across replicas on the existing authenticated user.
      // This lock also rechecks that the account was not deleted/disabled since auth.
      const [accounts] = await connection.execute<RowDataPacket[]>(
        'SELECT id,is_active FROM users WHERE id=? FOR UPDATE', [userId]);
      if (!accounts[0] || accounts[0].is_active !== 1) throw new OmegaTaskError('AUTH_REQUIRED');
      const [previous] = await connection.execute<RowDataPacket[]>(
        `SELECT ${columns} FROM omega_tasks_v1 WHERE owner_id=? AND idempotency_key=? FOR UPDATE`,
        [Buffer.from(owner), Buffer.from(input.idempotencyKey)]);
      if (previous[0]) {
        const saved = contract(previous[0]);
        if (saved.input.handler !== input.handler || canonicalJson(saved.input.payload) !== canonicalJson(input.payload)) {
          throw new OmegaTaskError('OMEGA_TASK_CONFLICT');
        }
        return { task: view(previous[0]), created: false };
      }
      const [counts] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM omega_tasks_v1 WHERE owner_id=?', [Buffer.from(owner)]);
      if (Number(counts[0].total) >= OMEGA_OWNER_TASK_LIMIT) throw new OmegaTaskError('OMEGA_TASK_LIMIT');
      const id = randomUUID();
      const at = await now(connection);
      const doc = { payload: input.payload, max_attempts: 3, attempts: 0, approved_by: null,
        result: null, error: null, audit: [{ action: 'submitted', actor: owner, at }] };
      await connection.execute(`INSERT INTO omega_tasks_v1
        (id,owner_id,idempotency_key,handler,handler_version,side_effects,state,document)
        VALUES (?,?,?,?,?,0,'pending',?)`, [id, Buffer.from(owner), Buffer.from(input.idempotencyKey),
        Buffer.from(input.handler), Buffer.from(OMEGA_VERSION), JSON.stringify(doc)]);
      return { task: view(await owned(connection, owner, id)), created: true };
    });
  },
  async get(userId: number, id: string) {
    return transaction(async connection => view(await owned(connection, omegaOwner(userId), id)));
  },
  async list(userId: number, limit: number, before?: string) {
    const [rows] = await getPersistentMySqlPool().execute<RowDataPacket[]>(
      `SELECT ${columns} FROM omega_tasks_v1 WHERE owner_id=? AND ${scope}
       ${before ? 'AND id < ?' : ''} ORDER BY id DESC LIMIT ?`,
      [Buffer.from(omegaOwner(userId)), ...(before ? [before] : []), limit]);
    return rows.map(view);
  },
  async cancel(userId: number, id: string) {
    const owner = omegaOwner(userId);
    return transaction(async connection => {
      const row = await owned(connection, owner, id);
      if (!['pending', 'retry_wait'].includes(row.state)) throw new OmegaTaskError('OMEGA_TASK_CONFLICT');
      const doc = document(row);
      doc.audit.push({ action: 'cancelled', actor: owner, at: await now(connection) });
      await connection.execute(`UPDATE omega_tasks_v1 SET state='cancelled',next_run_at=NULL,
        lease_token=NULL,lease_expires_at=NULL,document=? WHERE id=? AND owner_id=?`,
        [JSON.stringify(doc), id, Buffer.from(owner)]);
      return view(await owned(connection, owner, id));
    });
  },
  async removeFinished(userId: number, id: string) {
    const owner = omegaOwner(userId);
    return transaction(async connection => {
      // Lock the owning account too: a concurrent deactivation must not race
      // an authenticated cleanup request into a successful write.
      const [users] = await connection.execute<RowDataPacket[]>(
        'SELECT id,is_active FROM users WHERE id=? FOR UPDATE', [userId]);
      if (!users[0] || users[0].is_active !== 1)
        throw new OmegaTaskError('AUTH_REQUIRED');
      const row = await owned(connection, owner, id);
      // Reject malformed/contradictory stored outcomes instead of silently
      // removing records that might need operator investigation.
      view(row);
      if (!['completed', 'failed', 'cancelled'].includes(row.state))
        throw new OmegaTaskError('OMEGA_TASK_CONFLICT');
      const [deleted] = await connection.execute<ResultSetHeader>(
        `DELETE FROM omega_tasks_v1
         WHERE id=? AND owner_id=? AND
               handler IN ('travel.budget','vehicle.schedule') AND
               handler_version='web-v1' AND side_effects=0 AND
               state IN ('completed','failed','cancelled')`,
        [id, Buffer.from(owner)]);
      if (deleted.affectedRows !== 1) throw new OmegaTaskError('OMEGA_TASK_CONFLICT');
      return { removed: true as const, id };
    });
  },
};
