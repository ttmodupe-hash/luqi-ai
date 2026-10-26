import{describe,it}from"node:test";
import assert from"node:assert/strict";
import{spawnSync}from"node:child_process";
import{inspectP0Evidence,P0_FORMAT,P0_GATES}from"../scripts/p0-operator-handoff.mjs";
const now=new Date("2026-10-25T14:20:00Z");
const packet=(checks={})=>({format:P0_FORMAT,repository:"ttmodupe-hash/luqi-ai",
 railway_project_id:"9f627cb8-3136-4b30-89d2-32ca648a1e5f",
 environment_id:"1e192ef3-1fa6-4684-81fc-60165c7b0e22",checks});
const documented=(i,time="2026-10-25T15:00:00+02:00")=>
 ({status:"documented",reference:"OPR-EVIDENCE-"+String(i+1).padStart(3,"0"),
 observed_at_sast:time,independently_reviewed:true});
describe("P0 handoff rejects paper approval as public or paid launch clearance",()=>{
 it("treats absent checks as missing, not passed",()=>{
  const x=inspectP0Evidence(packet(),{asOf:now});
  assert.equal(x.status,"EVIDENCE_GAPS_REMAIN");
  assert.equal(x.counts.missing,P0_GATES.length);
  assert.equal(x.public_or_paid_launch_approved,false);
  assert.equal(x.production_restore_verified_by_this_tool,false);
 });
 it("even ten claimed checks require separate human approval",()=>{
  const checks=Object.fromEntries(P0_GATES.map((gate,i)=>[gate,documented(i)]));
  const x=inspectP0Evidence(packet(checks),{asOf:now});
  assert.equal(x.status,"HUMAN_SIGNOFF_REQUIRED");
  assert.equal(x.counts.documented_for_human_review,P0_GATES.length);
  assert.equal(x.public_or_paid_launch_approved,false);
  assert.equal(x.provider_bills_reconciled_by_this_tool,false);
  assert.equal(JSON.stringify(x).includes("OPR-EVIDENCE-"),false);
 });
 it("unresolved incident wins over any documented green checks",()=>{
  const checks=Object.fromEntries(P0_GATES.map((g,i)=>[g,documented(i)]));
  checks.historical_credential_review.status="problem_found";
  const x=inspectP0Evidence(packet(checks),{asOf:now});
  assert.equal(x.status,"REPORTED_ISSUE_NEEDS_ACTION");
  assert.deepEqual(x.gates.action_required,["historical_credential_review"]);
 });
 it("flags stale evidence and missing second human review",()=>{
  const old=documented(1,"2026-08-01T09:00:00+02:00");
  const unchecked={...documented(0),independently_reviewed:false};
  const x=inspectP0Evidence(packet({historical_credential_review:unchecked,
    production_derived_isolated_restore:old}),{asOf:now});
  assert.deepEqual(x.gates.needs_second_review,["historical_credential_review"]);
  assert.deepEqual(x.gates.stale,["production_derived_isolated_restore"]);
 });
 it("blocks fabricated approval, unknown gates and reused evidence references",()=>{
  const first=documented(0);
  assert.throws(()=>inspectP0Evidence({...packet(),launch_approved:true},{asOf:now}));
  assert.throws(()=>inspectP0Evidence(packet({fake_gate:first}),{asOf:now}));
  assert.throws(()=>inspectP0Evidence(packet({historical_credential_review:first,
    production_derived_isolated_restore:first}),{asOf:now}));
 });
 it("refuses other projects, sensitive fields, emails, URLs and invalid dates",()=>{
  assert.throws(()=>inspectP0Evidence({...packet(),environment_id:"another"},{asOf:now}));
  for(const a of [
   {...documented(0),api_key:"not-for-chat"},
   {...documented(0),reference:"contact@example.com"},
   {...documented(0),reference:"https://merchant.local"},
   documented(0,"2026-02-30T12:00:00+02:00"),
   documented(0,"2026-10-26T12:00:00+02:00"),
   documented(0,"2026-10-25T12:00:00Z"),
  ])assert.throws(()=>inspectP0Evidence(packet({historical_credential_review:a}),{asOf:now}));
 });
 it("stdin-only CLI redacts evidence and rejects additional input keys",()=>{
  const command="scripts/review-p0-operator-handoff.mjs";
  const valid=spawnSync(process.execPath,[command],{
    input:JSON.stringify(packet({historical_credential_review:documented(0)})),
    encoding:"utf8",timeout:5000});
  assert.equal(valid.status,2);
  assert.equal(valid.stderr,"");
  assert.equal(JSON.parse(valid.stdout).public_or_paid_launch_approved,false);
  assert.doesNotMatch(valid.stdout,/OPR-EVIDENCE|@|https:\/\//);
  const bad=spawnSync(process.execPath,[command],{
    input:JSON.stringify({...packet(),credential:"NEVER-ECHO-ME"}),
    encoding:"utf8",timeout:5000});
  assert.equal(bad.status,1);
  assert.equal(bad.stdout,"");
  assert.doesNotMatch(bad.stderr,/NEVER-ECHO-ME/);
 });
});
