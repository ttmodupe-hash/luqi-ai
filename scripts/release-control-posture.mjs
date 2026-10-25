/**
 * LUQI release-control observation only. Never interprets a claimed
 * protection toggle, successful build, or document as launch authorization.
 * Network/authentication are entirely outside this pure module.
 */
export const RELEASE_PACKET_FORMAT = 'luqi.release-control-observation.v1';
export const RELEASE_SCOPE = Object.freeze({
  repository: 'ttmodupe-hash/luqi-ai',
  railway_project_id: '9f627cb8-3136-4b30-89d2-32ca648a1e5f',
  environment_id: '1e192ef3-1fa6-4684-81fc-60165c7b0e22',
  web_service_id: 'a9b293e0-1966-43be-80ef-3dd27acc6ab7',
});
const SHA = /^[a-f0-9]{40}$/;
const RECENCY_MS = 24 * 60 * 60 * 1000;
const UTC = /^20\d{2}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/;
const isPlain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const invalid = () => { throw new Error('INVALID_RELEASE_CONTROL_OBSERVATION'); };
function exact(value, fields) {
  if (!isPlain(value) || Object.keys(value).length !== fields.length ||
      Object.keys(value).some(k => !fields.includes(k))) invalid();
}
function stamp(value) {
  if (typeof value !== 'string' || !UTC.test(value)) invalid();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) ||
      date.toISOString() !== (value.length === 20 ? value.replace('Z', '.000Z') : value)) invalid();
  return date.getTime();
}

const ACTION = Object.freeze({
  GITHUB_MAIN_UNPROTECTED:
    'GitHub owner: create or enable an enforced main branch ruleset. Require a PR, independent approval, required checks, and prohibit force pushes/deletions.',
  RAILWAY_WAIT_FOR_CI_OFF:
    'Railway owner: review the web service Source settings and enable Wait for CI only after confirming required main push workflows and rollback.',
  DEPLOYED_REVISION_MISMATCH:
    'Release owner: reconcile exact GitHub main commit with the successful Railway deployed SHA before any next change.',
  DEPLOYMENT_UNHEALTHY:
    'Release owner: investigate the actual Railway deployment state; a configured source or passing PR check is not live health.',
  STAGED_PRODUCTION_CHANGES:
    'Railway owner: inspect staged resource changes privately; do not accept/deploy unknown changes.',
  OBSERVATION_STALE:
    'Operator: refresh authenticated GitHub and Railway read-only snapshots before considering the release.',
});

/**
 * Consumes a *redacted* summary from an authorised operator. Strings in input
 * are not trusted evidence of GitHub/Railway authenticity; reports stay
 * explicitly unverified and cannot grant launch approval.
 */
export function assessReleaseControlPosture(packet, { asOf = new Date() } = {}) {
  if (!(asOf instanceof Date) || !Number.isFinite(asOf.getTime())) invalid();
  exact(packet, ['format','observed_at_utc','repository','github_main','railway_web']);
  if (packet.format !== RELEASE_PACKET_FORMAT ||
      packet.repository !== RELEASE_SCOPE.repository) invalid();
  exact(packet.github_main, ['branch','sha','protected']);
  exact(packet.railway_web, [
    'project_id','environment_id','service_id',
    'source_repo','source_branch','wait_for_ci',
    'deployment_sha','deployment_status','pending_change_count',
  ]);
  const g=packet.github_main, r=packet.railway_web;
  if (g.branch !== 'main' || !SHA.test(g.sha) || typeof g.protected !== 'boolean' ||
      r.project_id !== RELEASE_SCOPE.railway_project_id ||
      r.environment_id !== RELEASE_SCOPE.environment_id ||
      r.service_id !== RELEASE_SCOPE.web_service_id ||
      r.source_repo !== RELEASE_SCOPE.repository ||
      r.source_branch !== 'main' || typeof r.wait_for_ci !== 'boolean' ||
      !SHA.test(r.deployment_sha) ||
      !['SUCCESS','FAILED','BUILDING','WAITING','SKIPPED','REMOVED','UNKNOWN'].includes(r.deployment_status) ||
      !Number.isSafeInteger(r.pending_change_count) ||
      r.pending_change_count < 0 || r.pending_change_count > 10000) invalid();

  const observedAt = stamp(packet.observed_at_utc);
  if (observedAt > asOf.getTime() + 30_000) invalid();
  const problems = [];
  if (!g.protected) problems.push('GITHUB_MAIN_UNPROTECTED');
  if (!r.wait_for_ci) problems.push('RAILWAY_WAIT_FOR_CI_OFF');
  if (g.sha !== r.deployment_sha) problems.push('DEPLOYED_REVISION_MISMATCH');
  if (r.deployment_status !== 'SUCCESS') problems.push('DEPLOYMENT_UNHEALTHY');
  if (r.pending_change_count > 0) problems.push('STAGED_PRODUCTION_CHANGES');
  if (asOf.getTime() - observedAt > RECENCY_MS) problems.push('OBSERVATION_STALE');

  return {
    format:'luqi.release-control-review.v1',
    scope:'LUQI main -> kind-spontaneity / production / web',
    assessed_at_utc:asOf.toISOString(),
    status:problems.length ? 'RELEASE_CONTROLS_BLOCKED' : 'HUMAN_REVIEW_REQUIRED',
    blocking_findings:problems,
    recommended_operator_actions:problems.map(code => ({code, action:ACTION[code]})),
    main_matches_deployed_sha:g.sha===r.deployment_sha,
    latest_reported_deployment_success:r.deployment_status==='SUCCESS',
    staged_changes_reported:r.pending_change_count,
    branch_protection_reported:g.protected,
    railway_wait_for_ci_reported:r.wait_for_ci,
    required_pr_review_rules_independently_verified:false,
    exact_commit_checks_independently_verified:false,
    operator_observations_authenticated_by_this_tool:false,
    production_derived_restore_verified_by_this_tool:false,
    commercial_launch_gates_verified_by_this_tool:false,
    public_or_paid_launch_approved:false,
    production_change_performed:false,
  };
}
