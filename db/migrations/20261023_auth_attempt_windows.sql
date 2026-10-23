-- Additive shared web-authentication limits. No account data is rewritten.
-- Deploy before enabling the new handlers; missing storage fails closed.
CREATE TABLE IF NOT EXISTS auth_attempt_windows (
  scope ENUM('login_global','login_subject','signup_global','signup_subject') NOT NULL,
  subject_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  reset_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, subject_key),
  INDEX auth_attempt_windows_expiry (reset_at)
) ENGINE=InnoDB;
