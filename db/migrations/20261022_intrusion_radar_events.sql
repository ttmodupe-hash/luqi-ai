-- Incident telemetry: pseudonymous security signals only, not request bodies or secrets.
-- Requires operator-approved migration on backed-up staging MySQL first.
-- This is not an immutable forensic ledger; replicate to managed SIEM for retention.
CREATE TABLE IF NOT EXISTS intrusion_radar_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(40) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  method VARCHAR(8) NOT NULL,
  subject_digest CHAR(64) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX intrusion_radar_category_time_idx (category, created_at),
  INDEX intrusion_radar_subject_time_idx (subject_digest, created_at),
  CONSTRAINT intrusion_radar_severity_check CHECK (severity IN ('medium','high','critical')),
  CONSTRAINT intrusion_radar_category_check CHECK (
    category IN ('credential_probe','canary_path','login_failure','login_throttled')
  )
) ENGINE=InnoDB;
