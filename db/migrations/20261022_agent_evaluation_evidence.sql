-- Review-only evaluation evidence linked to an existing independently
-- reviewed LUQI agent proposal. Apply to BACKED-UP STAGING only.
-- No real model runs, CI attestation or deployment are inferred by insert.
CREATE TABLE IF NOT EXISTS agent_evaluation_evidence (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  patch_id BIGINT UNSIGNED NOT NULL,
  submitted_by_user_id BIGINT UNSIGNED NOT NULL,
  proposal_digest CHAR(64) NOT NULL,
  review_event_hash CHAR(64) NOT NULL,
  measurement_digest CHAR(64) NOT NULL,
  dataset_digest CHAR(64) NOT NULL,
  baseline_revision CHAR(40) NOT NULL,
  candidate_revision CHAR(40) NOT NULL,
  suite_version VARCHAR(100) NOT NULL,
  observation_count INT UNSIGNED NOT NULL,
  review_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  source_attested BOOLEAN NOT NULL DEFAULT FALSE,
  release_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  summary_json JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY agent_eval_patch_digest_unique (patch_id, measurement_digest),
  INDEX agent_eval_patch_time_idx (patch_id, created_at, id),
  CONSTRAINT agent_eval_cannot_self_attest CHECK (
    source_attested = FALSE AND release_authorized = FALSE
  )
) ENGINE=InnoDB;
