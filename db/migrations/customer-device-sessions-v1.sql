-- Isolated additive migration, reviewed and applied by the authorised operator.
-- Never invoked by boot, bootstrap, flag activation or an HTTP request.
-- No legacy session/account/customer rows are modified or copied.
CREATE TABLE customer_device_sessions_v1 (
  token_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  family_id CHAR(73) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  issued_at TIMESTAMP(3) NOT NULL,
  last_used_at TIMESTAMP(3) NOT NULL,
  absolute_expires_at TIMESTAMP(3) NOT NULL,
  idle_expires_at TIMESTAMP(3) NOT NULL,
  rotation INT UNSIGNED NOT NULL,
  rotated_at TIMESTAMP(3) NULL,
  revoked_at TIMESTAMP(3) NULL,
  PRIMARY KEY (token_digest),
  INDEX customer_device_family (family_id),
  INDEX customer_device_owner (user_id),
  INDEX customer_device_expiry (absolute_expires_at),
  CONSTRAINT customer_device_owner_fk FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT customer_device_expiry_bounds CHECK (idle_expires_at <= absolute_expires_at),
  CONSTRAINT customer_device_rotation_bound CHECK (rotation <= 256)
) ENGINE=InnoDB;
