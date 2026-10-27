/** Operator-only recovery primitive, intentionally not exposed by HTTP. */
import bcrypt from "bcryptjs";
import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { validNewPassword } from "../lib/passwordPolicy";

export class AccountRecoveryError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "ACCOUNT_UNAVAILABLE" |
    "PASSWORD_REUSED" | "RECOVERY_UNAVAILABLE") {
    super(code);
  }
}

export async function resetAccountPassword(
  pool: Pool, userId: number, email: string, password: string,
): Promise<{ userId: number; sessionsRevoked: number }> {
  if (!Number.isSafeInteger(userId) || userId <= 0 ||
      typeof email !== "string" || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validNewPassword(password)) {
    throw new AccountRecoveryError("INVALID_INPUT");
  }
  let conn: Awaited<ReturnType<Pool["getConnection"]>> | undefined;
  let begun = false;
  try {
    conn = await pool.getConnection();
    const [engines] = await conn.query<RowDataPacket[]>(
      "SELECT TABLE_NAME, ENGINE FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('users', 'sessions')");
    if (engines.length !== 2 || engines.some(row => row.ENGINE !== "InnoDB")) {
      throw new AccountRecoveryError("RECOVERY_UNAVAILABLE");
    }
    await conn.beginTransaction();
    begun = true;
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT id, password_hash, is_active FROM users WHERE id=? AND email=? FOR UPDATE",
      [userId, email.trim().toLowerCase()]);
    if (rows.length !== 1 || Number(rows[0].is_active) !== 1) {
      throw new AccountRecoveryError("ACCOUNT_UNAVAILABLE");
    }
    if (await bcrypt.compare(password, rows[0].password_hash)) {
      throw new AccountRecoveryError("PASSWORD_REUSED");
    }
    const hash = await bcrypt.hash(password, 12);
    const [changed] = await conn.execute<ResultSetHeader>(
      "UPDATE users SET password_hash=? WHERE id=?", [hash, userId]);
    if (changed.affectedRows !== 1) throw new AccountRecoveryError("RECOVERY_UNAVAILABLE");
    const [revoked] = await conn.execute<ResultSetHeader>(
      "DELETE FROM sessions WHERE user_id=?", [userId]);
    let deviceRowsRevoked = 0;
    if (process.env.LUQI_CUSTOMER_RESUME_ENABLED === 'true') {
      const [devices] = await conn.execute<ResultSetHeader>(
        'UPDATE customer_device_sessions_v1 SET revoked_at=CURRENT_TIMESTAMP(3) WHERE user_id=? AND revoked_at IS NULL', [userId]);
      deviceRowsRevoked = devices.affectedRows;
    }
    await conn.commit();
    begun = false;
    return { userId, sessionsRevoked: revoked.affectedRows + deviceRowsRevoked };
  } catch (error) {
    if (begun && conn) {
      try { await conn.rollback(); }
      catch { throw new AccountRecoveryError("RECOVERY_UNAVAILABLE"); }
    }
    if (error instanceof AccountRecoveryError) throw error;
    throw new AccountRecoveryError("RECOVERY_UNAVAILABLE");
  } finally {
    conn?.release();
  }
}
