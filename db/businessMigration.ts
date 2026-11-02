/** Operator/CI-only additive DDL. Never imported by the HTTP runtime. */
export const BUSINESS_CREATE_STATEMENTS=[
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
