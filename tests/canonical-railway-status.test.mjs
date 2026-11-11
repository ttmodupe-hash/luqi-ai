import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { isCanonicalRailwaySuccessStatus, canonicalRailwayStatusReason } from '../scripts/check-canonical-railway-status.mjs';

const sha = 'a'.repeat(40);
const valid = {
  state: 'success', context: 'kind-spontaneity - web', sha,
  sender: { id: 68434857, login: 'railway-app[bot]', type: 'Bot' },
  creator: { id: 68434857, login: 'railway-app[bot]', type: 'Bot' },
  repository: { full_name: 'ttmodupe-hash/luqi-ai' },
  branches: [{ name: 'main' }],
  target_url: 'https://railway.com/project/9f627cb8-3136-4b30-89d2-32ca648a1e5f/service/a9b293e0-1966-43be-80ef-3dd27acc6ab7?id=7f084aad-d40d-4662-a9ee-07c97ee69be6&environmentId=1e192ef3-1fa6-4684-81fc-60165c7b0e22',
};
const web = readFileSync(new URL('../.github/workflows/public-release-checks.yml', import.meta.url), 'utf8');
const domain = readFileSync(new URL('../.github/workflows/custom-domain-https.yml', import.meta.url), 'utf8');

test('accepts only a production Railway success for the exact current main revision', () => {
  assert.equal(isCanonicalRailwaySuccessStatus(valid, sha), true);
  assert.equal(canonicalRailwayStatusReason(valid, sha), 'accepted');
  // GitHub status webhook branches[] is a truncated hint, not reliable main-HEAD evidence.
  for (const branches of [[], null, [{ name: 'unrelated' }]]) {
    assert.equal(isCanonicalRailwaySuccessStatus({ ...valid, branches }, sha), true);
  }
  assert.equal(canonicalRailwayStatusReason({ ...valid, sha: 'b'.repeat(40) }, sha), 'not-current-main');
  assert.equal(canonicalRailwayStatusReason({ ...valid, repository: { full_name: 'other/repo' } }, sha), 'wrong-repository');
  const changed = [
    { state: 'pending' }, { state: 'failure' }, { context: 'fabulous-stillness - web' },
    { sha: 'b'.repeat(40) }, { repository: { full_name: 'somewhere/else' } },
    { target_url: valid.target_url.replace('https://railway.com', 'http://railway.com') },
    { target_url: valid.target_url.replace('railway.com', 'railway.com.example') },
    { target_url: valid.target_url.replace('9f627cb8-3136-4b30-89d2-32ca648a1e5f', 'f9da0f15-a36d-4663-88ca-1149f28fbaa2') },
    { target_url: valid.target_url.replace('a9b293e0-1966-43be-80ef-3dd27acc6ab7', 'a5352134-2f48-43b1-878d-42db19b63e05') },
    { target_url: valid.target_url.replace('1e192ef3-1fa6-4684-81fc-60165c7b0e22', '62112b21-721e-4e5a-8d39-04a42a3d41cf') },
    { target_url: valid.target_url + '&environmentId=1e192ef3-1fa6-4684-81fc-60165c7b0e22' },
    { target_url: valid.target_url + '&unsafe=true' },
    { target_url: valid.target_url + '#fragment' },
    { target_url: 'not a URL' },
  ];
  for (const change of changed) {
    assert.equal(isCanonicalRailwaySuccessStatus({ ...valid, ...change }, sha), false,
      'must reject unrelated or malformed Railway status');
  }
  assert.equal(isCanonicalRailwaySuccessStatus(valid, 'b'.repeat(40)), false);
  assert.equal(isCanonicalRailwaySuccessStatus(valid, ''), false);
});

test('live public and TLS acceptance cannot execute during main push pre-deploy CI', () => {
  for (const workflow of [web, domain]) {
    assert.match(workflow, /^  push:\n    branches: \[main\]$/m);
    assert.match(workflow, /^  status:\s*$/m);
    assert.match(workflow, /^  workflow_dispatch:\s*$/m);
    assert.match(workflow, /github\.event\.state == 'success'/);
    assert.match(workflow, /github\.event\.context == 'kind-spontaneity - web'/);
    assert.match(workflow, /github\.event\.sha == github\.sha/);
    assert.match(workflow, /startsWith\(github\.event\.target_url/);
    assert.match(workflow, /run: node scripts\/check-canonical-railway-status\.mjs/);
    assert.match(workflow, /if: github\.event_name == 'status' \|\| github\.event_name == 'workflow_dispatch'/);
    assert.doesNotMatch(workflow, /if: github\.event_name != 'pull_request'/);
  }
});


test('canonical success requires GitHub-authenticated Railway App status identity, not spoofable context or URL', () => {
  const bot = { id: 68434857, login: 'railway-app[bot]', type: 'Bot' };
  assert.equal(canonicalRailwayStatusReason({ ...valid, creator: undefined }, sha), 'accepted');
  for (const sender of [
    null,
    { ...bot, id: 42 },
    { ...bot, login: 'railway-app' },
    { ...bot, type: 'User' },
    { ...bot, id: undefined },
  ]) {
    assert.equal(canonicalRailwayStatusReason({ ...valid, sender }, sha), 'untrusted-status-sender');
  }
  for (const creator of [
    { ...bot, id: 42 },
    { ...bot, login: 'other[bot]' },
    { ...bot, type: 'User' },
  ]) {
    assert.equal(canonicalRailwayStatusReason({ ...valid, creator }, sha), 'untrusted-status-creator');
  }
  // A real Railway App status for a different environment is still rejected.
  assert.equal(canonicalRailwayStatusReason({ ...valid,
    target_url: valid.target_url.replace('1e192ef3-1fa6-4684-81fc-60165c7b0e22',
      '88c0b148-c1c6-452d-98cc-adb798cda688') }, sha), 'wrong-environment');
});

test('every status/manual public check is owner-pinned before live observation', () => {
  for (const [source, expectedProbe] of [
    [web, 'verify-deployed-release.mjs'],
    [domain, 'verify-custom-domain.mjs'],
  ]) {
    const canonical = source.indexOf('run: node scripts/check-canonical-railway-status.mjs');
    const approval = source.indexOf('requireApprovedStatusRevision(');
    const publicProbe = source.indexOf('run: node scripts/' + expectedProbe);
    assert.ok(canonical !== -1 && approval > canonical && publicProbe > approval,
      'Independent approved pin must precede public probe, after canonical event validation');
    const guard = source.slice(source.lastIndexOf('      - name: ', approval), publicProbe);
    assert.ok(guard.includes("if: github.event_name == 'status' || github.event_name == 'workflow_dispatch'"));
    assert.ok(guard.includes("LUQI_STATUS_SHA: ${{ github.event_name == 'status' && github.event.sha || vars.LUQI_APPROVED_DEPLOYED_SHA }}"));
    assert.ok(guard.includes('LUQI_APPROVED_DEPLOYED_SHA: ${{ vars.LUQI_APPROVED_DEPLOYED_SHA }}'));
    assert.ok(guard.includes('LUQI_EXPECTED_COMMIT: ${{ vars.LUQI_APPROVED_DEPLOYED_SHA }}'));
    assert.ok(!guard.includes('LUQI_EXPECTED_COMMIT: ${{ github.'),
      'Neither event nor undeployed main can self-approve a public revision');
  }
});
