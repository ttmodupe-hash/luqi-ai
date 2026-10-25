import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {compareProviderCosts,CAPS_CENTS} from "../scripts/provider-cost-review.mjs";
const asOf=new Date("2026-10-25T04:30:00Z");
const provider=(actual,reserved)=>({billing_source:"provider_dashboard",actual_cents:actual,
  reserved_cents:reserved,project_confirmed:true,period_complete:true});
const fixture=()=>({month_utc:"2026-09",gemini:provider(120,200),openai:provider(30,80)});
describe("offline USD cost review",()=>{
  it("preserves the approved caps, never certifies paid launch",()=>{
    assert.deepEqual(CAPS_CENTS,{gemini:6000,openai:4000,combined:10000});
    const r=compareProviderCosts(fixture(),asOf);
    assert.equal(r.actual_total_cents,150);
    assert.equal(r.reserved_total_cents,280);
    assert.equal(r.providers.gemini.reservation_minus_charge_cents,80);
    assert.equal(r.status,"OPERATOR_COMPARISON_ONLY");
    assert.equal(r.independent_billing_verification,false);
    assert.equal(r.provider_costs_reconciled,false);
    assert.equal(r.launch_approved,false);
  });
  it("does not report missing provider amounts as zero",()=>{
    const v=fixture();v.openai={billing_source:"unavailable",actual_cents:null,reserved_cents:10,
      project_confirmed:false,period_complete:false};
    const r=compareProviderCosts(v,asOf);
    assert.equal(r.actual_total_cents,null);
    assert.equal(r.providers.openai.within_limit,null);
    assert.equal(r.status,"EVIDENCE_INCOMPLETE");
    v.openai.actual_cents=0;
    assert.throws(()=>compareProviderCosts(v,asOf),/MISSING_NOT_ZERO/);
  });
  it("keeps actual verified zero distinct from missing",()=>{
    const v=fixture();v.openai=provider(0,20);
    assert.equal(compareProviderCosts(v,asOf).actual_total_cents,120);
  });
  it("does not close an ongoing UTC month",()=>{
    const v=fixture();v.month_utc="2026-10";
    assert.equal(compareProviderCosts(v,asOf).status,"UTC_MONTH_OPEN");
  });
  it("flags cap exceedance even when reservations are lower",()=>{
    const v=fixture();v.gemini=provider(6001,10);
    const r=compareProviderCosts(v,asOf);
    assert.equal(r.status,"CAP_REVIEW_REQUIRED");
    assert.equal(r.providers.gemini.within_limit,false);
    assert.equal(r.launch_approved,false);
  });
  it("requires project attestation, source completeness, both reservations",()=>{
    const v=fixture();v.gemini.project_confirmed=false;
    assert.equal(compareProviderCosts(v,asOf).status,"EVIDENCE_INCOMPLETE");
    v.gemini.project_confirmed=true;v.gemini.period_complete=false;
    assert.equal(compareProviderCosts(v,asOf).status,"EVIDENCE_INCOMPLETE");
    v.gemini.period_complete=true;v.gemini.reserved_cents=null;
    assert.equal(compareProviderCosts(v,asOf).status,"EVIDENCE_INCOMPLETE");
  });
  it("rejects malformed or extra fields rather than accepting raw exports",()=>{
    const v=fixture();v.openai.api_key="do not copy credentials";
    assert.throws(()=>compareProviderCosts(v,asOf),/INVALID_AGGREGATES/);
    assert.throws(()=>compareProviderCosts({...fixture(),transactions:[]},asOf),/INVALID_AGGREGATES/);
    for(const value of ["0",-1,1.5,Infinity,Number.MAX_SAFE_INTEGER+1]){
      const r=fixture();r.openai.actual_cents=value;
      assert.throws(()=>compareProviderCosts(r,asOf),/INVALID_CENTS/);
    }
    assert.throws(()=>compareProviderCosts({...fixture(),month_utc:"2026-13"},asOf),/INVALID_MONTH/);
  });
});
