import { Hono } from 'hono';

// These legacy operations have no reviewed account/role ownership boundary or
// verifiable persistent result. A configured provider/admin key must not reopen
// them implicitly. Restore individually only with authenticated ownership tests.
export const retiredOperationPaths = [
  '/api/v1/audit/ledger',
  '/api/v1/audit/seal',
  '/api/v1/grading/ledger/:user_id',
  '/api/v1/offline-sync/status',
  '/api/v1/offline-sync/bundle',
  '/api/v1/edge-cache/telemetry',
  '/api/v1/security/shield-audit',
  '/security/shield-audit',
  '/api/v1/security/diagnostics',
  '/security/diagnostics',
  '/api/v1/analytics/log-progression',
  '/api/v1/diagnostics/database-indexes',
  '/api/v1/governance/system-cards',
  '/api/science/curated-targets',
  '/api/science/bio-query',
  // An empty hardcoded ledger is not proof that no errors occurred, and
  // static department scores are not measured competency/certification.
  '/api/system/diagnostics-ledger',
  '/api/v1/intelligence/corporate-report/:dept',
] as const;

export const legacyOperationsUnavailable = new Hono();
for (const path of retiredOperationPaths) {
  legacyOperationsUnavailable.all(path, c => {
    c.header('Cache-Control', 'no-store');
    return c.json({ status: 'unavailable', code: 'LEGACY_OPERATION_UNAVAILABLE',
      message: 'This legacy operation requires reviewed authorization and verified results before it can be used.' }, 503);
  });
}
