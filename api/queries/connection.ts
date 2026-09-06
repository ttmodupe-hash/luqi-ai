import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// Pool connects lazily on first query — the server process must be able
// to boot even if the database is momentarily unreachable. Railway
// health checks hit HTTP routes, not the database.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "luqi_ai",
  port: parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
});

export const db = drizzle(pool);

export async function getDb() {
  return db;
}

export async function closeDb() {
  await pool.end();
}
