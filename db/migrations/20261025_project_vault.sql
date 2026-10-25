-- Opt-in ONLY after verified production-derived recovery, user privacy and
-- dedicated table-grant review. The web service never auto-applies this DDL.
-- Encrypted payload envelope only; no plaintext client names, quotations,
-- passphrases, keys or billing entitlements are stored in this table.
CREATE TABLE IF NOT EXISTS luqi_project_vault_v1 (
  owner_id BIGINT UNSIGNED NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  kind VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT UNSIGNED NOT NULL,
  sealed JSON NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (owner_id,id),
  KEY vault_owner_updated (owner_id,updated_at,id),
  CHECK (kind IN ('quote','sales')),
  CHECK (revision BETWEEN 1 AND 1000000)
) ENGINE=InnoDB;
