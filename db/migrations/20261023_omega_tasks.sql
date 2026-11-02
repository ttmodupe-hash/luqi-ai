-- Explicit opt-in migration for the Python Omega worker host. The web service
-- does not apply this migration or start workers. Never drop this table during
-- a code rollback: pending work and ambiguous effects must remain inspectable.
CREATE TABLE IF NOT EXISTS omega_tasks_v1 (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    owner_id VARBINARY(512) NOT NULL,
    idempotency_key VARBINARY(512) NULL,
    handler VARBINARY(512) NOT NULL,
    handler_version VARBINARY(128) NOT NULL,
    side_effects BOOLEAN NOT NULL,
    state VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    next_run_at DATETIME(6) NULL,
    lease_token CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    lease_expires_at DATETIME(6) NULL,
    document JSON NOT NULL,
    UNIQUE KEY omega_owner_key (owner_id, idempotency_key),
    KEY omega_owner_due (owner_id, state, next_run_at),
    KEY omega_owner_expired (owner_id, state, lease_expires_at),
    CHECK (side_effects IN (0, 1)),
    CHECK (state IN ('pending', 'approval_required', 'retry_wait', 'running',
                    'completed', 'failed', 'reconciliation_required', 'cancelled')),
    CHECK ((state = 'running' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
        OR (state <> 'running' AND lease_token IS NULL AND lease_expires_at IS NULL))
) ENGINE=InnoDB;
