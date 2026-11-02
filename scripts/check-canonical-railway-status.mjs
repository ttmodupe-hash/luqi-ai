import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REPOSITORY = 'ttmodupe-hash/luqi-ai';
const CONTEXT = 'kind-spontaneity - web';
const PATH = '/project/9f627cb8-3136-4b30-89d2-32ca648a1e5f/service/a9b293e0-1966-43be-80ef-3dd27acc6ab7';
const ENVIRONMENT = '1e192ef3-1fa6-4684-81fc-60165c7b0e22';
const SHA = /^[a-f0-9]{40}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** Accept only a successful Railway status for the exact production web deployment
 * and the current main commit. This is a scope check, not a health or payment test.
 * Never log the complete webhook event, deployment URL, account data or tokens. */
/** Reason codes never contain user data, URLs, provider keys or raw webhook fields. */
export function canonicalRailwayStatusReason(event, currentMainSha) {
  if (!event || typeof event !== 'object') return 'invalid-event';
  if (!SHA.test(currentMainSha ?? '')) return 'invalid-main-revision';
  if (event.sha !== currentMainSha) return 'not-current-main';
  if (event.state !== 'success') return 'not-success';
  if (event.context !== CONTEXT) return 'wrong-service-context';
  if (event.repository?.full_name !== REPOSITORY) return 'wrong-repository';
  // GitHub caps status.branches at ten; it may omit main. Exact equality of the
  // event commit to GITHUB_SHA (default-branch HEAD for status events) is the
  // authoritative current-main guard. Do not require status.branches metadata.
  try {
    const url = new URL(event.target_url);
    if (url.origin !== 'https://railway.com' || url.pathname !== PATH ||
        url.username || url.password || url.port || url.hash) return 'wrong-target-origin';
    const params = [...url.searchParams.keys()];
    if (params.length !== 2 || !params.includes('id') || !params.includes('environmentId')) {
      return 'wrong-target-parameters';
    }
    const deploymentIds = url.searchParams.getAll('id');
    const environments = url.searchParams.getAll('environmentId');
    if (deploymentIds.length !== 1 || !UUID.test(deploymentIds[0])) return 'invalid-deployment-id';
    if (environments.length !== 1 || environments[0] !== ENVIRONMENT) return 'wrong-environment';
    return 'accepted';
  } catch {
    return 'invalid-target-url';
  }
}

export function isCanonicalRailwaySuccessStatus(event, currentMainSha) {
  return canonicalRailwayStatusReason(event, currentMainSha) === 'accepted';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.GITHUB_EVENT_PATH) throw new Error('Missing GitHub event');
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const reason = canonicalRailwayStatusReason(event, process.env.LUQI_MAIN_SHA);
    if (reason !== 'accepted') {
      console.error('Post-deploy acceptance refused: ' + reason + '.');
      process.exitCode = 1;
    } else {
      console.log('Canonical production Railway success status verified for post-deploy acceptance.');
    }
  } catch {
    console.error('Post-deploy acceptance refused: invalid-event-input.');
    process.exitCode = 1;
  }
}
