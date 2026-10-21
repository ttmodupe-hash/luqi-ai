-- LUQI administrator review event ledger (MySQL 8 / InnoDB).
-- Apply ONLY to a backed-up staging database after review.
-- Existing healing_patches rows are not retroactively claimed as verified.
-- This is a transactionally recorded local hash chain, NOT immutable forensics.
CREATE TABLE IF NOT EXISTS agent_review_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  patch_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(40) NOT NULL,
  previous_status VARCHAR(50) NULL,
  next_status VARCHAR(50) NOT NULL,
  proposal_digest CHAR(64) NOT NULL,
  previous_event_hash CHAR(64) NOT NULL,
  event_hash CHAR(64) NOT NULL,
  reason_digest CHAR(64) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX agent_review_events_patch_id_idx (patch_id, id),
  INDEX agent_review_events_actor_user_id_idx (actor_user_id),
  CONSTRAINT agent_review_events_action_check
    CHECK (action IN ('proposed','review_requested','review_revoked','rejected')),
  CONSTRAINT agent_review_events_next_status_check
    CHECK (next_status IN ('proposed','approved_for_ci','review_revoked','rejected'))
) ENGINE=InnoDB;
