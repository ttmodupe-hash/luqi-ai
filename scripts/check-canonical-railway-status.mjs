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
export function isCanonicalRailwaySuccessStatus(event, currentMainSha) {
  if (!event || typeof event !== 'object' || !SHA.test(currentMainSha ?? '') ||
      event.sha !== currentMainSha || event.state !== 'success' || event.context !== CONTEXT ||
      event.repository?.full_name !== REPOSITORY ||
      !Array.isArray(event.branches) ||
      !event.branches.some(branch => branch?.name === 'main')) return false;
  try {
    const url = new URL(event.target_url);
    if (url.origin !== 'https://railway.com' || url.pathname !== PATH ||
        url.username || url.password || url.port || url.hash) return false;
    const params = [...url.searchParams.keys()];
    if (params.length !== 2 || !params.includes('id') || !params.includes('environmentId')) return false;
    const deploymentIds = url.searchParams.getAll('id');
    const environments = url.searchParams.getAll('environmentId');
    return deploymentIds.length === 1 && UUID.test(deploymentIds[0]) &&
      environments.length === 1 && environments[0] === ENVIRONMENT;
  } catch {
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.GITHUB_EVENT_PATH) throw new Error('Missing GitHub event');
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    if (!isCanonicalRailwaySuccessStatus(event, process.env.LUQI_MAIN_SHA)) {
      throw new Error('Incorrect status scope');
    }
    console.log('Canonical production Railway success status verified for post-deploy acceptance.');
  } catch {
    console.error('Post-deploy acceptance refused: canonical status not verified.');
    process.exitCode = 1;
  }
}
