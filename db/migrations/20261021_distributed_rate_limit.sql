-- Apply in reviewed staging migration only. Do not auto-apply on application startup.
CREATE TABLE IF NOT EXISTS rate_limit_windows (
  bucket VARCHAR(100) NOT NULL,
  window_start BIGINT NOT NULL,
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start),
  INDEX rate_limit_windows_expiry_idx (window_start)
) ENGINE=InnoDB;
-- Operational maintenance: remove windows older than 48 hours using a scheduled
-- database maintenance job. Never depend on cleanup for quota correctness.
