import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { isCanonicalRailwaySuccessStatus, canonicalRailwayStatusReason } from '../scripts/check-canonical-railway-status.mjs';

const sha = 'a'.repeat(40);
const valid = {
  state: 'success', context: 'kind-spontaneity - web', sha,
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
