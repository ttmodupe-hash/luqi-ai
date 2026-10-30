-- REVIEW ONLY. Operator-applied on disposable/staging MySQL 8 before rollout.
-- Not imported by bootstrap, startup or release feature preparation.
-- DDL auto-commits in MySQL: retain completed tables after partial failure.
CREATE TABLE IF NOT EXISTS luqi_business_profiles_v1 (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  revision INT UNSIGNED NOT NULL,
  state VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  dedupe_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  province VARCHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  municipality VARCHAR(120) NOT NULL,
  trading_name VARCHAR(120) NOT NULL,
  search_text TEXT NOT NULL,
  document JSON NOT NULL,
  verification JSON NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id), UNIQUE KEY business_identity (dedupe_key),
  KEY business_owner (owner_id,updated_at,id),
  KEY business_discovery (state,province,trading_name,id),
  CONSTRAINT business_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (revision BETWEEN 1 AND 1000000),
  CHECK (state IN ('draft','pending','published','paused','rejected','suspended'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS luqi_business_audit_v1 (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT UNSIGNED NOT NULL,
  metadata JSON NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id), KEY business_audit (business_id,id), KEY business_audit_retention (created_at),
  CONSTRAINT business_audit_profile_fk FOREIGN KEY (business_id) REFERENCES luqi_business_profiles_v1(id) ON DELETE SET NULL,
  CONSTRAINT business_audit_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS luqi_business_reports_v1 (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  business_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reporter_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  details VARCHAR(1000) NOT NULL,
  state VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL,
  resolved_at DATETIME(6) NULL,
  PRIMARY KEY (id), KEY business_reports_queue (state,created_at,id),
  CONSTRAINT business_report_profile_fk FOREIGN KEY (business_id) REFERENCES luqi_business_profiles_v1(id) ON DELETE CASCADE,
  CONSTRAINT business_report_actor_fk FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (state IN ('open','resolved'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS luqi_business_limits_v1 (
  actor_id BIGINT UNSIGNED NOT NULL,
  day_utc CHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  writes INT UNSIGNED NOT NULL,
  reports INT UNSIGNED NOT NULL,
  PRIMARY KEY (actor_id,day_utc), KEY business_limits_retention (day_utc),
  CONSTRAINT business_limits_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
