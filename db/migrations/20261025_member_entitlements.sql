-- REVIEW-ONLY / MANUAL OPT-IN. No application startup imports this DDL.
-- These evidence tables do NOT verify webhooks, settlement, refunds, or billing.
-- Merchant integration, immutable receipt validation and operator signoff are
-- deliberately absent. Do not apply to production until an isolated restore
-- and verified merchant/account/retention review are complete.
-- SHA-256 event/order hashes are non-secret identifiers, not signatures.

CREATE TABLE IF NOT EXISTS luqi_member_receipts_v1 (
  merchant_code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  event_hash BINARY(32) NOT NULL,
  order_hash BINARY(32) NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  currency_code CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  gross_minor INT UNSIGNED NOT NULL,
  settlement_state VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  review_state VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  settled_at_utc DATETIME(6) NOT NULL,
  created_at_utc DATETIME(6) NOT NULL,
  PRIMARY KEY (merchant_code, event_hash),
  UNIQUE KEY member_receipt_order_once (order_hash),
  UNIQUE KEY member_receipt_owner_order (owner_id, order_hash),
  KEY member_receipt_owner_lookup (owner_id, settled_at_utc),
  CHECK (gross_minor > 0),
  CHECK (currency_code = 'ZAR'),
  CHECK (settlement_state IN ('pending', 'settled', 'refunded', 'disputed', 'revoked')),
  CHECK (review_state IN ('pending', 'approved', 'rejected'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS luqi_member_entitlements_v1 (
  owner_id BIGINT UNSIGNED NOT NULL,
  order_hash BINARY(32) NOT NULL,
  tier_code VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  membership_state VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  period_start_utc DATETIME(6) NOT NULL,
  period_end_utc DATETIME(6) NOT NULL,
  created_at_utc DATETIME(6) NOT NULL,
  PRIMARY KEY (owner_id, order_hash),
  KEY member_window_lookup (owner_id, membership_state, period_end_utc),
  CONSTRAINT member_receipt_bound_owner FOREIGN KEY (owner_id, order_hash)
    REFERENCES luqi_member_receipts_v1 (owner_id, order_hash) ON DELETE RESTRICT,
  CHECK (tier_code IN ('starter', 'creator')),
  CHECK (membership_state IN ('pending', 'active', 'paused', 'revoked', 'expired')),
  CHECK (period_end_utc > period_start_utc),
  CHECK (period_end_utc <= DATE_ADD(period_start_utc, INTERVAL 35 DAY))
) ENGINE=InnoDB;
