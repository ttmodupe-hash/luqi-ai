import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { assessReleaseControlPosture, RELEASE_PACKET_FORMAT, RELEASE_SCOPE }
  from '../scripts/release-control-posture.mjs';

const sha='032e60056d92c55e9935c568a61b73f0fbd8c0f0';
const fixed=new Date('2026-10-25T17:25:00.000Z');
const packet=(overrides={})=>({
 format:RELEASE_PACKET_FORMAT,
 observed_at_utc:'2026-10-25T17:20:00Z',
 repository:RELEASE_SCOPE.repository,
 github_main:{branch:'main',sha,protected:false},
 railway_web:{
   project_id:RELEASE_SCOPE.railway_project_id,
   environment_id:RELEASE_SCOPE.environment_id,
   service_id:RELEASE_SCOPE.web_service_id,
   source_repo:RELEASE_SCOPE.repository,
   source_branch:'main',
   wait_for_ci:false, deployment_sha:sha, deployment_status:'SUCCESS',
   pending_change_count:0,
 },
 ...overrides,
});
const report=x=>assessReleaseControlPosture(x,{asOf:fixed});

describe('LUQI exact-scope release safeguards stay fail closed',()=>{
 it('identifies both currently observed release control weaknesses',()=>{
  const result=report(packet());
  assert.equal(result.status,'RELEASE_CONTROLS_BLOCKED');
  assert.deepEqual(result.blocking_findings,[
    'GITHUB_MAIN_UNPROTECTED','RAILWAY_WAIT_FOR_CI_OFF',
  ]);
  assert.equal(result.main_matches_deployed_sha,true);
  assert.equal(result.latest_reported_deployment_success,true);
  assert.equal(result.public_or_paid_launch_approved,false);
  assert.equal(result.operator_observations_authenticated_by_this_tool,false);
  assert.equal(result.production_change_performed,false);
 });
 it('even reported protection and CI waiting never becomes automatic approval',()=>{
  const val=packet({github_main:{branch:'main',sha,protected:true},
   railway_web:{...packet().railway_web,wait_for_ci:true}});
  const result=report(val);
  assert.deepEqual(result.blocking_findings,[]);
  assert.equal(result.status,'HUMAN_REVIEW_REQUIRED');
  assert.equal(result.required_pr_review_rules_independently_verified,false);
  assert.equal(result.exact_commit_checks_independently_verified,false);
  assert.equal(result.public_or_paid_launch_approved,false);
 });
 it('rejects a mismatched deployed revision even with both toggles set',()=>{
  const val=packet({github_main:{branch:'main',sha,protected:true},
    railway_web:{...packet().railway_web,wait_for_ci:true,deployment_sha:'a'.repeat(40)}});
  assert.deepEqual(report(val).blocking_findings,['DEPLOYED_REVISION_MISMATCH']);
 });
 it('rejects failed deployments and unaccepted Railway staged changes',()=>{
  const val=packet({railway_web:{...packet().railway_web,
    deployment_status:'FAILED',pending_change_count:1}});
  assert.ok(report(val).blocking_findings.includes('DEPLOYMENT_UNHEALTHY'));
  assert.ok(report(val).blocking_findings.includes('STAGED_PRODUCTION_CHANGES'));
 });
 it('classifies all known non-success Railway deployment states as blocked',()=>{
  for (const deployment_status of [
    'CRASHED','QUEUED','INITIALIZING','WAITING','BUILDING','DEPLOYING',
    'NEEDS_APPROVAL','FAILED','SKIPPED','REMOVING','REMOVED','SLEEPING','UNKNOWN',
  ]) {
    const val=packet({railway_web:{...packet().railway_web,deployment_status}});
    const result=report(val);
    assert.equal(result.status,'RELEASE_CONTROLS_BLOCKED',deployment_status);
    assert.ok(result.blocking_findings.includes('DEPLOYMENT_UNHEALTHY'),deployment_status);
    assert.equal(result.latest_reported_deployment_success,false,deployment_status);
    assert.equal(result.public_or_paid_launch_approved,false);
  }
 });
 it('marks observation older than one day stale, never fresh recovery evidence',()=>{
  const val=packet({observed_at_utc:'2026-10-24T14:00:00Z'});
  assert.ok(report(val).blocking_findings.includes('OBSERVATION_STALE'));
  assert.equal(report(val).production_derived_restore_verified_by_this_tool,false);
 });
 it('rejects invalid project/branch/service and every unrecognised secret field',()=>{
  for(const val of [
    {...packet(),railway_web:{...packet().railway_web,project_id:'unrelated'}},
    {...packet(),railway_web:{...packet().railway_web,service_id:'other'}},
    {...packet(),github_main:{...packet().github_main,branch:'production'}},
    {...packet(),github_main:{...packet().github_main,protected:'false'}},
    {...packet(),railway_web:{...packet().railway_web,wait_for_ci:'true'}},
    {...packet(),github_main:{...packet().github_main,admin_token:'DO_NOT_LOG'}},
    {...packet(),railway_web:{...packet().railway_web,database_url:'private'}},
    {...packet(),railway_web:{...packet().railway_web,deployment_status:'FAKE_SUCCESS'}},
    {...packet(),launch_approved:true},
    {...packet(),observed_at_utc:'2026-10-25T17:26:00Z'},
    {...packet(),observed_at_utc:'2026-02-30T12:00:00Z'},
  ]) assert.throws(()=>report(val));
 });
 it('CLI accepts only bounded local JSON, redacts values and exits blocked',()=>{
  const run=spawnSync(process.execPath,['scripts/review-release-controls.mjs'],{
    input:JSON.stringify(packet()),encoding:'utf8',timeout:5000,
  });
  assert.equal(run.status,2);
  assert.equal(run.stderr,'');
  const output=JSON.parse(run.stdout);
  assert.equal(output.public_or_paid_launch_approved,false);
  assert.ok(!run.stdout.includes(sha));
  const invalid=spawnSync(process.execPath,['scripts/review-release-controls.mjs'],{
    input:JSON.stringify({...packet(),password:'REDACT_THIS'}),encoding:'utf8',timeout:5000,
  });
  assert.equal(invalid.status,1);
  assert.ok(!invalid.stderr.includes('REDACT_THIS'));
  assert.equal(invalid.stdout,'');
 });
 it('critical web build runs on pull requests AND every main commit',()=>{
  const workflow=readFileSync('.github/workflows/web-build.yml','utf8');
  const header=workflow.split(/\npermissions:/)[0];
  assert.match(header,/\non:\n/);
  assert.match(header,/\n  pull_request:\n    branches: \[main\]/);
  assert.match(header,/\n  push:\n    branches: \[main\]/);
  assert.match(workflow,/name: LUQI Web Build/);
  assert.match(workflow,/  validate-web:/);
  assert.doesNotMatch(header,/paths:\s*\n/);
 });
});
