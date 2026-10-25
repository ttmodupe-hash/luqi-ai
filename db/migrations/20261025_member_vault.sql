-- Manual, additive, opt-in migration only; never run during web startup.
-- No member or payment records are seeded. A trusted future merchant webhook
-- is required before real commercial entitlements can be issued.
CREATE TABLE IF NOT EXISTS luqi_member_entitlements_v1 (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  plan VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  valid_until DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT member_entitlement_owner_fk FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT member_entitlement_plan_ck CHECK (plan IN ('starter','creator')),
  CONSTRAINT member_entitlement_status_ck CHECK (status IN ('active','past_due','cancelled')),
  CONSTRAINT member_entitlement_source_ck CHECK (source = 'merchant_verified')
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS luqi_member_projects_v1 (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'quote',
  title VARCHAR(90) NOT NULL,
  document JSON NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT member_project_owner_fk FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT member_project_kind_ck CHECK (kind = 'quote'),
  CONSTRAINT member_project_revision_ck CHECK (revision >= 1),
  KEY member_project_owner_order (user_id, updated_at, id)
) ENGINE=InnoDB;
