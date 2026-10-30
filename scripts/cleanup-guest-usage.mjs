/** Private operator maintenance; never import into the public app. */
import mysql from 'mysql2/promise';
const apply = process.argv.slice(2);
if (apply.length !== 1 || !['--check', '--apply'].includes(apply[0])) throw new Error('Use --check or --apply');
const url = new URL(process.env.DATABASE_URL ?? '');
if (url.protocol !== 'mysql:' || !url.pathname.slice(1)) throw new Error('Dedicated MySQL database required');
const db = await mysql.createConnection(url.toString());
try {
  const cutoff = new Date(Date.now() - 62 * 86400000).toISOString().slice(0, 10);
  // Positive account IDs and -1/-2/-3 aggregate cost/count rows are preserved.
  const where = 'day_utc < ? AND user_id < -1000';
  let removed = 0;
  if (apply[0] === '--apply') for (let batch = 0; batch < 20; batch++) {
    const [r] = await db.execute(`DELETE FROM ai_pilot_daily_user_usage WHERE ${where} LIMIT 500`, [cutoff]);
    removed += r.affectedRows;
    if (r.affectedRows < 500) break;
  }
  const [rows] = await db.execute(`SELECT COUNT(*) AS pending FROM ai_pilot_daily_user_usage WHERE ${where}`, [cutoff]);
  console.log(JSON.stringify({ cutoff, removed, pending: Number(rows[0].pending) }));
  if (apply[0] === '--apply' && Number(rows[0].pending) > 0) process.exitCode = 2;
} finally { await db.end(); }
