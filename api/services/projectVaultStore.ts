/** Opt-in encrypted project vault. No DDL, provider calls or paid entitlements. */
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPersistentMySqlPool } from '../queries/connection';
import { vaultKind, vaultSealed, VAULT_ITEMS_PER_OWNER, type VaultWrite } from './projectVaultContract';

export type VaultCode = 'PROJECT_NOT_FOUND' | 'PROJECT_CONFLICT' | 'PROJECT_LIMIT' | 'AUTH_REQUIRED';
export class ProjectVaultError extends Error {
  constructor(readonly code: VaultCode) { super(code); }
}
type ProjectRow = RowDataPacket & {
  id: string; kind: string; revision: number; sealed: unknown; updated_at: string;
};
const SELECT = "id,kind,revision,sealed,DATE_FORMAT(updated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at";
const META = "id,kind,revision,DATE_FORMAT(updated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at";
function validOwner(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new ProjectVaultError('AUTH_REQUIRED');
  return value;
}
function rowValue(row: ProjectRow) {
  const kind = vaultKind.parse(row.kind);
  if (!Number.isSafeInteger(row.revision) || row.revision < 1 || row.revision > 1_000_000) throw Error('INVALID_VAULT_RECORD');
  if (typeof row.updated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(row.updated_at)) throw Error('INVALID_VAULT_RECORD');
  const decoded = typeof row.sealed === 'string' ? JSON.parse(row.sealed) : row.sealed;
  return { id: row.id, kind, revision: row.revision, sealed: vaultSealed.parse(decoded), updatedAt: row.updated_at };
}
async function userLock(connection: PoolConnection, owner: number) {
  // The persistent account lock serializes quota across web replicas.
  const [users] = await connection.execute<RowDataPacket[]>('SELECT id,is_active FROM users WHERE id=? FOR UPDATE', [owner]);
  if (!users[0] || users[0].is_active !== 1) throw new ProjectVaultError('AUTH_REQUIRED');
}
async function locked(connection: PoolConnection, owner: number, id: string): Promise<ProjectRow | undefined> {
  const [rows] = await connection.execute<ProjectRow[]>(
    'SELECT ' + SELECT + ' FROM luqi_project_vault_v1 WHERE owner_id=? AND id=? FOR UPDATE', [owner,id]);
  return rows[0];
}
async function transaction<T>(task: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getPersistentMySqlPool().getConnection();
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const result = await task(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { connection.release(); }
}
export const projectVaultStore = {
  /** Table check cannot create, migrate or seed records. */
  async status() {
    await getPersistentMySqlPool().query('SELECT id FROM luqi_project_vault_v1 LIMIT 0');
    return { availability: 'configured' as const, storage: 'connected' as const,
      encryptedPayloadOnly: true as const, ownerLimit: VAULT_ITEMS_PER_OWNER };
  },
  /** Returns metadata only, never decrypted document content. */
  async list(ownerId: number) {
    const owner = validOwner(ownerId);
    const [rows] = await getPersistentMySqlPool().execute<ProjectRow[]>(
      'SELECT ' + META + ' FROM luqi_project_vault_v1 WHERE owner_id=? ORDER BY updated_at DESC,id ASC LIMIT ?',
      [owner, VAULT_ITEMS_PER_OWNER]);
    return { projects: rows.map(row => {
      const kind = vaultKind.parse(row.kind);
      if (!Number.isSafeInteger(row.revision) || row.revision < 1 || row.revision > 1_000_000 ||
          typeof row.updated_at !== 'string') throw Error('INVALID_VAULT_RECORD');
      return { id: row.id, kind, revision: row.revision, updatedAt: row.updated_at };
    }) };
  },
  async get(ownerId: number, id: string) {
    const owner = validOwner(ownerId);
    const [rows] = await getPersistentMySqlPool().execute<ProjectRow[]>(
      'SELECT ' + SELECT + ' FROM luqi_project_vault_v1 WHERE owner_id=? AND id=? LIMIT 1', [owner, id]);
    if (!rows[0]) throw new ProjectVaultError('PROJECT_NOT_FOUND');
    return { project: rowValue(rows[0]) };
  },
  async save(ownerId: number, id: string, submitted: VaultWrite) {
    const owner = validOwner(ownerId);
    return transaction(async connection => {
      await userLock(connection, owner);
      const row = await locked(connection, owner, id);
      const sealed = vaultSealed.parse(submitted.sealed);
      const kind = vaultKind.parse(submitted.kind);
      if (row) {
        // A stale device cannot overwrite the newer version.
        rowValue(row);
        if (submitted.expectedRevision !== row.revision || kind !== row.kind ||
            row.revision >= 1_000_000) throw new ProjectVaultError('PROJECT_CONFLICT');
        const [updated] = await connection.execute<ResultSetHeader>(
          'UPDATE luqi_project_vault_v1 SET revision=revision+1,sealed=?,updated_at=UTC_TIMESTAMP(6) WHERE owner_id=? AND id=? AND revision=?',
          [JSON.stringify(sealed), owner,id,row.revision]);
        if (updated.affectedRows !== 1) throw new ProjectVaultError('PROJECT_CONFLICT');
        return { saved: true as const, id, revision: row.revision + 1, created: false as const };
      }
      if (submitted.expectedRevision !== 0) throw new ProjectVaultError('PROJECT_CONFLICT');
      const [counts] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM luqi_project_vault_v1 WHERE owner_id=?', [owner]);
      if (Number(counts[0]?.total) >= VAULT_ITEMS_PER_OWNER) throw new ProjectVaultError('PROJECT_LIMIT');
      await connection.execute(
        'INSERT INTO luqi_project_vault_v1 (owner_id,id,kind,revision,sealed,created_at,updated_at) VALUES (?,?,?,1,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',
        [owner,id,kind,JSON.stringify(sealed)]);
      return { saved: true as const, id, revision: 1, created: true as const };
    });
  },
  async remove(ownerId: number, id: string, expectedRevision: number) {
    const owner = validOwner(ownerId);
    return transaction(async connection => {
      await userLock(connection, owner);
      const row = await locked(connection, owner, id);
      if (!row) throw new ProjectVaultError('PROJECT_NOT_FOUND');
      rowValue(row);
      if (row.revision !== expectedRevision) throw new ProjectVaultError('PROJECT_CONFLICT');
      const [deleted] = await connection.execute<ResultSetHeader>(
        'DELETE FROM luqi_project_vault_v1 WHERE owner_id=? AND id=? AND revision=?',
        [owner,id,expectedRevision]);
      if (deleted.affectedRows !== 1) throw new ProjectVaultError('PROJECT_CONFLICT');
      return { removed: true as const, id };
    });
  },
};
