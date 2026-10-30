// Single-file private operator derived from reviewed source e968534fa8d38e857cea543fbb9a085df5f4450f. Function binding replaces Git deployment binding only.
// db/prepareBusinessStorage.ts
import { createHash } from "node:crypto";
import mysql2 from "mysql2/promise";

// api/lib/mysqlConfig.ts
function parseMySqlConnectionSettings(environment) {
  const url = environment.DATABASE_URL?.trim();
  if (url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("DATABASE_URL is not a valid connection URL");
    }
    if (parsed.protocol !== "mysql:") {
      throw new Error("Unsupported DATABASE_URL driver: LUQI web backend requires MySQL");
    }
    const database2 = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    const port2 = parsed.port ? Number(parsed.port) : 3306;
    const user2 = decodeURIComponent(parsed.username);
    const password2 = decodeURIComponent(parsed.password);
    if (!parsed.hostname || !database2 || !user2 || !password2 || !Number.isInteger(port2) || port2 < 1 || port2 > 65535) {
      throw new Error("DATABASE_URL lacks required MySQL connection settings");
    }
    return { host: parsed.hostname, port: port2, database: database2, user: user2, password: password2 };
  }
  if (!environment.DB_HOST?.trim()) return null;
  const port = Number(environment.DB_PORT || "3306");
  const host = environment.DB_HOST.trim();
  const user = environment.DB_USER?.trim() || "";
  const password = environment.DB_PASSWORD || "";
  const database = environment.DB_NAME?.trim() || "";
  if (!host || !user || !password || !database || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Incomplete DB_HOST/DB_USER/DB_PASSWORD/DB_NAME connection settings");
  }
  return { host, port, database, user, password };
}

// db/businessMigration.ts
var BUSINESS_CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS luqi_business_meta_v1 (id TINYINT UNSIGNED PRIMARY KEY,digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,prepared_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS luqi_business_reviewers_v1 (user_id BIGINT UNSIGNED PRIMARY KEY,active TINYINT NOT NULL DEFAULT 1,assigned_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),CONSTRAINT business_reviewer_fk FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS luqi_business_profiles_v1 (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 owner_id BIGINT UNSIGNED NOT NULL, revision INT UNSIGNED NOT NULL,
 state ENUM('draft','pending','published','paused','rejected') NOT NULL,
 province VARCHAR(4) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 category VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 draft JSON NOT NULL, public_document JSON NULL, public_search VARCHAR(2200) NOT NULL DEFAULT '',
 reason VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'none',
 consent_at TIMESTAMP(6) NULL, consent_version VARCHAR(32) NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY business_owner_duplicate(owner_id,fingerprint),
 INDEX business_public_search(state,province,category,id),FULLTEXT INDEX business_text(public_search),
 CONSTRAINT business_owner_fk FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS luqi_business_audit_v1 (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,profile_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 actor_id BIGINT UNSIGNED NOT NULL,action VARCHAR(32) NOT NULL,reason VARCHAR(32) NOT NULL,created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX business_audit_retention(created_at),INDEX business_audit_profile(profile_id,id),
 CONSTRAINT business_audit_profile_fk FOREIGN KEY(profile_id) REFERENCES luqi_business_profiles_v1(id) ON DELETE CASCADE,
 CONSTRAINT business_audit_actor_fk FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS luqi_business_usage_v1 (
 owner_id BIGINT UNSIGNED NOT NULL,day_utc CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,attempts INT UNSIGNED NOT NULL,reports INT UNSIGNED NOT NULL DEFAULT 0,
 PRIMARY KEY(owner_id,day_utc),INDEX business_usage_retention(day_utc),
 CONSTRAINT business_usage_owner_fk FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS luqi_business_reports_v1 (
 profile_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,reporter_id BIGINT UNSIGNED NOT NULL,reason VARCHAR(32) NOT NULL,note VARCHAR(300) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),PRIMARY KEY(profile_id,reporter_id),INDEX business_report_retention(created_at),
 CONSTRAINT business_report_profile_fk FOREIGN KEY(profile_id) REFERENCES luqi_business_profiles_v1(id) ON DELETE CASCADE,
 CONSTRAINT business_report_actor_fk FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];

// db/businessContracts.ts
var BUSINESS_SCHEMA_DIGEST = "7283d970bfb5666320df56c17ee1a99869cdec56f15aaa6c283bcf2021573e39";
var BUSINESS_RUNTIME_GRANTS = {
  luqi_business_meta_v1: "SELECT",
  luqi_business_reviewers_v1: "SELECT",
  luqi_business_profiles_v1: "SELECT, INSERT, UPDATE, DELETE",
  luqi_business_audit_v1: "SELECT, INSERT, DELETE",
  luqi_business_usage_v1: "SELECT, INSERT, UPDATE, DELETE",
  luqi_business_reports_v1: "SELECT, INSERT, UPDATE, DELETE"
};
var id = { type: "bigint unsigned" };
var uuid = { type: "char(36)", collation: "ascii_bin" };
var BUSINESS_RUNTIME_TABLES = {
  luqi_business_reviewers_v1: { columns: ["user_id", "active", "assigned_at"], unique: [["user_id"]], critical: { user_id: { type: "bigint unsigned" }, active: { type: "tinyint" } } },
  luqi_business_meta_v1: { columns: ["id", "digest", "prepared_at"], unique: [["id"]], critical: { id: { type: "tinyint unsigned" }, digest: { type: "char(64)", collation: "ascii_bin" } } },
  luqi_business_profiles_v1: { columns: ["id", "owner_id", "revision", "state", "province", "category", "fingerprint", "draft", "public_document", "public_search", "reason", "consent_at", "consent_version", "created_at", "updated_at"], unique: [["id"], ["owner_id", "fingerprint"]], critical: { id: uuid, owner_id: id, draft: { type: "json" }, public_document: { type: "json", nullable: true }, fingerprint: { type: "char(64)", collation: "ascii_bin" } } },
  luqi_business_audit_v1: { columns: ["id", "profile_id", "actor_id", "action", "reason", "created_at"], unique: [["id"]], critical: { id, profile_id: uuid, actor_id: id } },
  luqi_business_usage_v1: { columns: ["owner_id", "day_utc", "attempts", "reports"], unique: [["owner_id", "day_utc"]], critical: { owner_id: id, day_utc: { type: "char(10)", collation: "ascii_bin" }, attempts: { type: "int unsigned" }, reports: { type: "int unsigned" } } },
  luqi_business_reports_v1: { columns: ["profile_id", "reporter_id", "reason", "note", "created_at"], unique: [["profile_id", "reporter_id"]], critical: { profile_id: uuid, reporter_id: id } }
};

// db/runtimeSchema.ts
import mysql from "mysql2/promise";
var id2 = { type: "bigint unsigned" };
var RUNTIME_TABLES = {
  users: {
    columns: [
      "id",
      "email",
      "password_hash",
      "name",
      "avatar_url",
      "role",
      "is_active",
      "email_verified",
      "last_login_at",
      "created_at",
      "updated_at"
    ],
    unique: [["id"], ["email"]],
    critical: { id: id2 }
  },
  companion_conversations: {
    columns: [
      "id",
      "personality_id",
      "user_id",
      "title",
      "status",
      "trust_score",
      "last_message_at",
      "message_count",
      "created_at",
      "updated_at"
    ],
    unique: [["id"]],
    critical: { id: id2 }
  },
  companion_messages: {
    columns: ["id", "conversation_id", "role", "content", "metadata", "tokens_used", "created_at"],
    unique: [["id"]],
    critical: { id: id2 }
  },
  companion_memories: {
    columns: [
      "id",
      "conversation_id",
      "user_id",
      "memory_type",
      "category",
      "content",
      "importance",
      "created_at"
    ],
    unique: [["id"]],
    critical: { id: id2 }
  },
  offline_sync_queue: {
    columns: ["id", "user_id", "device_id", "action", "payload_json", "synced", "synced_at", "created_at"],
    unique: [["id"]],
    critical: { id: id2 }
  },
  auth_attempt_windows: {
    columns: ["scope", "subject_key", "attempts", "reset_at"],
    unique: [["scope", "subject_key"]],
    critical: {
      scope: { type: "enum('login_global','login_subject','signup_global','signup_subject')" },
      subject_key: { type: "char(64)", collation: "ascii_bin" },
      attempts: { type: "int unsigned" },
      reset_at: { type: "bigint unsigned" }
    }
  },
  ai_pilot_monthly_spend: {
    columns: ["month_utc", "provider", "reserved_cents", "updated_at"],
    unique: [["month_utc", "provider"]],
    critical: {
      month_utc: { type: "char(7)" },
      provider: { type: "varchar(16)" },
      reserved_cents: { type: "int unsigned" }
    }
  },
  ai_pilot_daily_user_usage: {
    columns: ["day_utc", "user_id", "attempts", "updated_at"],
    unique: [["day_utc", "user_id"]],
    critical: {
      day_utc: { type: "char(10)" },
      user_id: { type: "bigint" },
      attempts: { type: "int unsigned" }
    }
  }
};
var normalizeType = (type) => type.toLowerCase().replace(/\b(tinyint|smallint|mediumint|int|bigint)\(\d+\)/g, "$1");
var unavailable = () => new Error("MYSQL_RUNTIME_SCHEMA_UNAVAILABLE");
async function validateRuntimeSchemaConnection(connection, contracts, verifySessionPrivileges = true) {
  const names = Object.keys(contracts);
  const placeholders = names.map(() => "?").join(",");
  const query = async (sql) => {
    const [rows] = await connection.query({ sql, timeout: 4e3 }, names);
    return rows;
  };
  const tables = await query(`SELECT TABLE_NAME AS table_name, ENGINE AS engine
    FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders})`);
  const columns = await query(`SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name,
    COLUMN_TYPE AS column_type, IS_NULLABLE AS is_nullable, COLLATION_NAME AS collation_name
    FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders})`);
  const indexes = await query(`SELECT TABLE_NAME AS table_name, INDEX_NAME AS index_name,
    COLUMN_NAME AS column_name, SEQ_IN_INDEX AS position, SUB_PART AS prefix_length
    FROM information_schema.statistics WHERE TABLE_SCHEMA=DATABASE() AND NON_UNIQUE=0
    AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`);
  for (const [table, contract] of Object.entries(contracts)) {
    if (tables.find((row) => row.table_name === table)?.engine?.toLowerCase() !== "innodb") throw unavailable();
    const fields = columns.filter((row) => row.table_name === table);
    if (table === "customer_device_sessions_v1" && fields.length !== contract.columns.length) throw unavailable();
    if (contract.columns.some((name) => !fields.some((row) => row.column_name === name))) throw unavailable();
    for (const [name, expected] of Object.entries(contract.critical ?? {})) {
      const field = fields.find((row) => row.column_name === name);
      if (!field || field.is_nullable !== (expected.nullable ? "YES" : "NO") || normalizeType(field.column_type) !== expected.type || expected.collation && field.collation_name !== expected.collation) throw unavailable();
    }
    const keys = /* @__PURE__ */ new Map();
    for (const row of indexes.filter((row2) => row2.table_name === table)) {
      const key = keys.get(row.index_name) ?? [];
      key.push(row);
      keys.set(row.index_name, key);
    }
    for (const required of contract.unique) {
      const matches = [...keys.values()].some((key) => key.length === required.length && key.every((part, i) => part.column_name === required[i] && part.prefix_length == null));
      if (!matches) throw unavailable();
    }
    await connection.query({ sql: `SELECT ${contract.columns.map((name) => `\`${name}\``).join(",")}
      FROM \`${table}\` LIMIT 0`, timeout: 4e3 });
    if (table === "customer_device_sessions_v1") {
      if (verifySessionPrivileges) {
        const [roles] = await connection.query({ sql: "SELECT CURRENT_ROLE() AS active_roles", timeout: 4e3 });
        const [grants] = await connection.query({ sql: "SHOW GRANTS", timeout: 4e3 });
        const [database] = await connection.query({ sql: "SELECT DATABASE() AS name", timeout: 4e3 });
        const schema = mysql.escapeId(database[0].name);
        const entries = grants.map((row) => String(Object.values(row)[0]));
        if (roles[0]?.active_roles !== "NONE" || !entries.some((grant) => grant.startsWith(`GRANT SELECT, INSERT, UPDATE ON ${schema}.\`customer_device_sessions_v1\` TO `)) || entries.some((grant) => grant.includes("WITH GRANT OPTION") || !grant.startsWith("GRANT USAGE ON *.* TO ") && (grant.includes(" ON *.* ") || grant.includes(` ON ${schema}.* `)) || grant.includes(".`customer_device_sessions_v1` TO ") && !grant.startsWith(`GRANT SELECT, INSERT, UPDATE ON ${schema}.\`customer_device_sessions_v1\` TO `))) throw unavailable();
      }
      const [owners] = await connection.query({ sql: `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM information_schema.key_column_usage WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='customer_device_sessions_v1' AND REFERENCED_TABLE_NAME IS NOT NULL`, timeout: 4e3 });
      if (owners.length !== 1 || owners[0].COLUMN_NAME !== "user_id" || owners[0].REFERENCED_TABLE_NAME !== "users" || owners[0].REFERENCED_COLUMN_NAME !== "id") throw unavailable();
    }
  }
}

// db/prepareBusinessStorage.ts
var BUSINESS_SETUP_INTENT = "create-absent-business-storage-v1";
function businessOperatorSettings(env) {
  const runtime = parseMySqlConnectionSettings(env), operator = parseMySqlConnectionSettings({ DATABASE_URL: env.LUQI_DB_OPERATOR_URL });
  const fixture = env.GITHUB_ACTIONS === "true" && env.LUQI_MYSQL_CI_FIXTURE === "true" && env.LUQI_DB_OPERATOR_URL === "mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci" && runtime?.host === "127.0.0.1" && runtime.port === 3306 && runtime.database === "luqi_ci" && runtime.user === "luqi_business_fixture";
  const production = env.RAILWAY_PROJECT_ID === "9f627cb8-3136-4b30-89d2-32ca648a1e5f" && env.RAILWAY_ENVIRONMENT_ID === "1e192ef3-1fa6-4684-81fc-60165c7b0e22" && env.RAILWAY_SERVICE_NAME === "luqi-business-private-operator" && env.RAILWAY_SERVICE_ID === "00a6c99f-39bb-43fe-99da-a520a8a0fef1" && /^[a-f0-9]{40}$/.test(env.LUQI_DB_CHECK_SOURCE_SHA ?? "") && env.LUQI_DB_CHECK_SOURCE_SHA === "e968534fa8d38e857cea543fbb9a085df5f4450f" && runtime?.host.endsWith(".railway.internal");
  if (!runtime || !operator || !fixture && !production || runtime.host !== operator.host || runtime.port !== operator.port || runtime.database !== operator.database || !/^[A-Za-z0-9_]{1,64}$/.test(runtime.database) || runtime.user !== (fixture ? "luqi_business_fixture" : "luqi_web_runtime") || runtime.user === operator.user) throw Error("BUSINESS_SETUP_SCOPE_REJECTED");
  return { runtime, operator };
}
async function validate(connection) {
  await validateRuntimeSchemaConnection(connection, BUSINESS_RUNTIME_TABLES, false);
  const [marker] = await connection.query("SELECT digest FROM luqi_business_meta_v1 WHERE id=1");
  if (marker.length !== 1 || marker[0].digest !== BUSINESS_SCHEMA_DIGEST) throw Error("BUSINESS_SETUP_MARKER_MISMATCH");
  const [index] = await connection.query("SELECT INDEX_TYPE FROM information_schema.statistics WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='luqi_business_profiles_v1' AND INDEX_NAME='business_text' AND COLUMN_NAME='public_search'");
  if (index.length !== 1 || index[0].INDEX_TYPE !== "FULLTEXT") throw Error("BUSINESS_SETUP_INDEX_MISMATCH");
  const [fks] = await connection.query("SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.key_column_usage WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('luqi_business_reviewers_v1','luqi_business_profiles_v1','luqi_business_audit_v1','luqi_business_usage_v1','luqi_business_reports_v1') AND REFERENCED_TABLE_NAME IS NOT NULL");
  const expected = /* @__PURE__ */ new Set(["luqi_business_reviewers_v1:user_id:users:id", "luqi_business_profiles_v1:owner_id:users:id", "luqi_business_audit_v1:profile_id:luqi_business_profiles_v1:id", "luqi_business_audit_v1:actor_id:users:id", "luqi_business_usage_v1:owner_id:users:id", "luqi_business_reports_v1:profile_id:luqi_business_profiles_v1:id", "luqi_business_reports_v1:reporter_id:users:id"]);
  if (fks.length !== expected.size || fks.some((r) => !expected.delete([r.TABLE_NAME, r.COLUMN_NAME, r.REFERENCED_TABLE_NAME, r.REFERENCED_COLUMN_NAME].join(":"))) || expected.size) throw Error("BUSINESS_SETUP_FOREIGN_KEYS");
  const [rules] = await connection.query("SELECT DELETE_RULE FROM information_schema.referential_constraints WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME IN ('luqi_business_reviewers_v1','luqi_business_profiles_v1','luqi_business_audit_v1','luqi_business_usage_v1','luqi_business_reports_v1')");
  if (rules.length !== 7 || rules.some((r) => r.DELETE_RULE !== "CASCADE")) throw Error("BUSINESS_SETUP_FOREIGN_KEYS");
}
async function prepareBusinessStorage(env) {
  const settings = businessOperatorSettings(env);
  if (env.LUQI_BUSINESS_CONNECT_ENABLED === "true") throw Error("BUSINESS_SETUP_FEATURE_MUST_BE_OFF");
  const apply = env.LUQI_BUSINESS_SCHEMA_INTENT === BUSINESS_SETUP_INTENT;
  if (env.LUQI_BUSINESS_SCHEMA_INTENT && !apply) throw Error("BUSINESS_SETUP_SCOPE_REJECTED");
  let operator, runtime, locked = false;
  try {
    operator = await mysql2.createConnection({ ...settings.operator, connectTimeout: 4e3 });
    runtime = await mysql2.createConnection({ ...settings.runtime, connectTimeout: 4e3 });
    await runtime.query("SET SESSION TRANSACTION READ ONLY");
    if (!apply) await operator.query("SET SESSION TRANSACTION READ ONLY");
    await validateRuntimeSchemaConnection(runtime, RUNTIME_TABLES, false);
    const [identity] = await runtime.query("SELECT CURRENT_USER() AS identity,CURRENT_ROLE() AS roles");
    if (identity[0]?.identity !== settings.runtime.user + "@%" || identity[0]?.roles !== "NONE") throw Error("BUSINESS_SETUP_IDENTITY_REJECTED");
    const [grants] = await runtime.query("SHOW GRANTS");
    const entries = grants.map((g) => String(Object.values(g)[0]));
    if (entries.some((g) => g.includes("WITH GRANT OPTION") || !g.startsWith("GRANT USAGE ON *.* TO ") && (g.includes(" ON *.* ") || g.includes(" ON `" + settings.runtime.database + "`.* ")))) throw Error("BUSINESS_SETUP_GRANTS_REJECTED");
    const [lock] = await operator.query({ sql: "SELECT GET_LOCK(CONCAT('luqi-business-setup:',DATABASE()),0) AS acquired", timeout: 4e3 });
    if (Number(lock[0]?.acquired) !== 1) throw Error("BUSINESS_SETUP_BUSY");
    locked = true;
    const [tables] = await operator.query("SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('luqi_business_meta_v1','luqi_business_reviewers_v1','luqi_business_profiles_v1','luqi_business_audit_v1','luqi_business_usage_v1','luqi_business_reports_v1')");
    let created = 0;
    if (tables.length !== 0 && tables.length !== 6) throw Error("BUSINESS_SETUP_PARTIAL_SCHEMA");
    if (tables.length === 0) {
      if (!apply) return { format: "luqi.business-storage.v1", status: "setup_required", tablesPresent: 0, customerRowsModified: false, flagsChanged: false };
      if (BUSINESS_CREATE_STATEMENTS.length !== 6 || BUSINESS_CREATE_STATEMENTS.some((s) => !/^CREATE TABLE IF NOT EXISTS luqi_business_(?:meta|reviewers|profiles|audit|usage|reports)_v1 \(/.test(s) || /\b(?:ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE)\s+(?:TABLE|INTO|FROM|users)\b/i.test(s))) throw Error("BUSINESS_SETUP_DDL_REJECTED");
      if (createHash("sha256").update(BUSINESS_CREATE_STATEMENTS.join("\n")).digest("hex") !== BUSINESS_SCHEMA_DIGEST) throw Error("BUSINESS_SETUP_DDL_REJECTED");
      for (const sql of BUSINESS_CREATE_STATEMENTS) await operator.query({ sql, timeout: 4e3 });
      created = 6;
      await operator.execute("INSERT INTO luqi_business_meta_v1(id,digest) VALUES(1,?)", [BUSINESS_SCHEMA_DIGEST]);
    }
    await validate(operator);
    const schema = mysql2.escapeId(settings.runtime.database), account = mysql2.escapeId(settings.runtime.user) + "@`%`";
    let granted = 0;
    for (const [table, privileges] of Object.entries(BUSINESS_RUNTIME_GRANTS)) {
      const exact = "GRANT " + privileges + " ON " + schema + "." + mysql2.escapeId(table) + " TO " + account;
      const existing = entries.filter((g) => g.includes("." + mysql2.escapeId(table) + " TO "));
      if (existing.length && (!existing.includes(exact) || existing.length !== 1)) throw Error("BUSINESS_SETUP_GRANTS_REJECTED");
      if (!existing.length) {
        if (!apply) throw Error("BUSINESS_SETUP_GRANTS_MISSING");
        await operator.query({ sql: exact, timeout: 4e3 });
        granted++;
      }
    }
    await validate(runtime);
    const [after] = await runtime.query("SHOW GRANTS");
    const afterEntries = after.map((g) => String(Object.values(g)[0]));
    for (const [table, privileges] of Object.entries(BUSINESS_RUNTIME_GRANTS)) if (!afterEntries.includes("GRANT " + privileges + " ON " + schema + "." + mysql2.escapeId(table) + " TO " + account)) throw Error("BUSINESS_SETUP_GRANTS_MISSING");
    const [reviewers] = await runtime.query("SELECT COUNT(*) AS n FROM luqi_business_reviewers_v1 r JOIN users u ON u.id=r.user_id WHERE r.active=1 AND u.is_active=1");
    return { format: "luqi.business-storage.v1", status: "validated", tablesCreated: created, grantsAdded: granted, reviewerAssigned: Number(reviewers[0]?.n) > 0, customerRowsModified: false, flagsChanged: false, identitiesCreated: false };
  } catch {
    throw Error("BUSINESS_SETUP_UNAVAILABLE");
  } finally {
    if (operator && locked) await operator.query("DO RELEASE_LOCK(CONCAT('luqi-business-setup:',DATABASE()))").catch(() => void 0);
    for (const c of [runtime, operator]) if (c) await c.end().catch(() => c.destroy());
  }
}

// scripts/prepare-business-storage.ts
var deadline = setTimeout(() => {
  console.error("BUSINESS_SETUP_DEADLINE");
  process.exit(1);
}, 6e4);
try {
  if (process.argv.length !== 2) throw Error("BUSINESS_SETUP_SCOPE_REJECTED");
  console.log(JSON.stringify(await prepareBusinessStorage(process.env)));
} catch {
  console.error("BUSINESS_SETUP_UNAVAILABLE");
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
}

import "mysql2@3.24.5";
