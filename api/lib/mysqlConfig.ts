/** Resolve the MySQL connection expected by db/schema.ts.
 * PostgreSQL is intentionally refused: these tables use mysql-core.
 * Never log the URL or include credentials in returned diagnostics.
 */
export interface MySqlConnectionSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function parseMySqlConnectionSettings(
  environment: Record<string, string | undefined>,
): MySqlConnectionSettings | null {
  const url = environment.DATABASE_URL?.trim();
  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("DATABASE_URL is not a valid connection URL");
    }
    if (parsed.protocol !== "mysql:") {
      throw new Error("Unsupported DATABASE_URL driver: LUQI web backend requires MySQL");
    }
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    const port = parsed.port ? Number(parsed.port) : 3306;
    const user = decodeURIComponent(parsed.username);
    const password = decodeURIComponent(parsed.password);
    if (!parsed.hostname || !database || !user || !password ||
        !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("DATABASE_URL lacks required MySQL connection settings");
    }
    return { host: parsed.hostname, port, database, user, password };
  }
  if (!environment.DB_HOST?.trim()) return null;
  const port = Number(environment.DB_PORT || "3306");
  const host = environment.DB_HOST.trim();
  const user = environment.DB_USER?.trim() || "";
  const password = environment.DB_PASSWORD || "";
  const database = environment.DB_NAME?.trim() || "";
  if (!host || !user || !password || !database ||
      !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Incomplete DB_HOST/DB_USER/DB_PASSWORD/DB_NAME connection settings");
  }
  return { host, port, database, user, password };
}
