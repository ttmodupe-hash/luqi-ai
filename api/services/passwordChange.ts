/** Current-password change, separate from operator-assisted recovery.
 * The compare-and-swap updates only the authenticated active account. No row
 * lock is held during bcrypt, and a competing change can never be overwritten.
 */
import bcrypt from 'bcryptjs';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { validNewPassword } from '../lib/passwordPolicy';
import { verifyUserCredential } from '../lib/userToken';

export class PasswordChangeError extends Error {
  constructor(public readonly code: 'INVALID_INPUT' | 'AUTH_REQUIRED' | 'CURRENT_PASSWORD_INVALID' |
    'PASSWORD_REUSED' | 'PASSWORD_CHANGE_CONFLICT' | 'PASSWORD_CHANGE_UNAVAILABLE') { super(code); }
}

export async function changeAccountPassword(pool: Pool, userId: number, token: string,
  currentPassword: string, newPassword: string): Promise<void> {
  if (!Number.isSafeInteger(userId) || userId < 1 || typeof currentPassword !== 'string' ||
      !currentPassword || Buffer.byteLength(currentPassword, 'utf8') > 72 || !validNewPassword(newPassword)) {
    throw new PasswordChangeError('INVALID_INPUT');
  }
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, password_hash, is_active FROM users WHERE id=? LIMIT 1', [userId]);
    const user = rows[0];
    if (!user || rows.length !== 1 || Number(user.is_active) !== 1) throw new PasswordChangeError('AUTH_REQUIRED');
    // Recheck the credential loaded here, closing the gap after middleware auth.
    try { verifyUserCredential(token, userId, user.password_hash); }
    catch { throw new PasswordChangeError('AUTH_REQUIRED'); }
    if (!await bcrypt.compare(currentPassword, user.password_hash)) throw new PasswordChangeError('CURRENT_PASSWORD_INVALID');
    if (await bcrypt.compare(newPassword, user.password_hash)) throw new PasswordChangeError('PASSWORD_REUSED');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const update = async (executor: Pick<Pool, 'execute'>) => {
      const [updated] = await executor.execute<ResultSetHeader>(
        'UPDATE users SET password_hash=? WHERE id=? AND is_active=1 AND BINARY password_hash=BINARY ?',
        [passwordHash, userId, user.password_hash]);
      if (updated.affectedRows !== 1) throw new PasswordChangeError('PASSWORD_CHANGE_CONFLICT');
    };
    if (process.env.LUQI_CUSTOMER_RESUME_ENABLED === 'true') {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await update(connection);
        await connection.execute('UPDATE customer_device_sessions_v1 SET revoked_at=CURRENT_TIMESTAMP(3) WHERE user_id=? AND revoked_at IS NULL', [userId]);
        await connection.commit();
      } catch (error) { await connection.rollback(); throw error; }
      finally { connection.release(); }
    } else await update(pool);
    // Existing JWTs are bound to the former hash and fail subsequent checks.
    // Never issue a replacement token or touch notes, billing or legacy sessions.
  } catch (error) {
    if (error instanceof PasswordChangeError) throw error;
    // A lost acknowledgement may follow a committed UPDATE. Never retry here.
    throw new PasswordChangeError('PASSWORD_CHANGE_UNAVAILABLE');
  }
}
