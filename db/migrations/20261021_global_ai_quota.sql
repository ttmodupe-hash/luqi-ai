-- LUQI paid AI provider global quota.
-- Reviewed migration required in staging first; no implicit production DDL.
-- This table contains no personal data or provider secrets.
CREATE TABLE IF NOT EXISTS ai_global_daily_quota (
  day_key VARCHAR(10) NOT NULL PRIMARY KEY,
  jobs INT NOT NULL DEFAULT 0,
  CONSTRAINT ai_global_daily_quota_nonnegative CHECK (jobs >= 0)
) ENGINE=InnoDB;
