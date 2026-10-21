-- LUQI Video Ledger migration (MySQL 8 / InnoDB)
-- Apply explicitly to staging first; review and back up production before running.
-- No customer balances are silently seeded or migrated from the legacy memory wallet.
-- Existing ZAR credit_wallets and payment_events stay untouched.
CREATE TABLE IF NOT EXISTS video_credit_wallets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_key VARCHAR(255) NOT NULL,
  credits INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY video_credit_wallets_user_key_unique (user_key),
  CONSTRAINT video_credit_wallets_nonnegative CHECK (credits >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS video_credit_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(100) NOT NULL,
  user_key VARCHAR(255) NOT NULL,
  entry_type VARCHAR(30) NOT NULL,
  delta_credits INT NOT NULL,
  balance_after INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY video_credit_ledger_reference_unique (reference),
  INDEX video_credit_ledger_user_key_idx (user_key),
  CONSTRAINT video_credit_ledger_nonnegative CHECK (balance_after >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS video_global_daily_quota (
  day_key VARCHAR(10) NOT NULL PRIMARY KEY,
  jobs INT NOT NULL DEFAULT 0,
  CONSTRAINT video_global_daily_quota_nonnegative CHECK (jobs >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS video_render_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_key VARCHAR(64) NOT NULL,
  user_id INT NOT NULL,
  user_key VARCHAR(255) NOT NULL,
  project_id INT NOT NULL,
  request_digest VARCHAR(64) NOT NULL,
  charge_credits INT NOT NULL,
  mode VARCHAR(30) NOT NULL DEFAULT 'silent_mp4',
  status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
  error_message TEXT,
  asset_key VARCHAR(400),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  UNIQUE KEY video_render_requests_request_key_unique (request_key),
  INDEX video_render_requests_user_id_idx (user_id),
  CONSTRAINT video_render_requests_positive_charge CHECK (charge_credits > 0)
) ENGINE=InnoDB;
