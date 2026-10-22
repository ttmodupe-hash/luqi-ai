-- Run only on a provisioned dedicated LUQI MySQL database.
-- Keep this table separate from the older PostgreSQL-powered LUQI environment.
-- Atomic SELECT ... FOR UPDATE in aiPilotBudget.ts relies on the PRIMARY KEY.
CREATE TABLE IF NOT EXISTS ai_pilot_monthly_spend (
  month_utc CHAR(7) NOT NULL,
  provider VARCHAR(16) NOT NULL,
  reserved_cents INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (month_utc, provider),
  CHECK (provider IN ('gemini', 'openai')),
  CHECK (reserved_cents >= 0)
) ENGINE=InnoDB;
