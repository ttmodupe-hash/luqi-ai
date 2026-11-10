/** Offline documentary checklist. No external reads, writes or launch approval. */
export const P0_GATES=Object.freeze([
  "historical_credential_review",
  "production_derived_isolated_restore",
  "verified_private_support",
  "account_recovery_acceptance",
  "real_device_account_acceptance",
  "actual_provider_cost_reconciliation",
  "branch_and_release_controls",
  "custom_domain_and_mail_acceptance",
  "privacy_and_crypto_review",
  "seller_checkout_refunds_and_delivery",
]);
export const P0_FORMAT="luqi.p0.operator-evidence.v1";
const REPO="ttmodupe-hash/luqi-ai";
const PROJECT="9f627cb8-3136-4b30-89d2-32ca648a1e5f";
const ENV="1e192ef3-1fa6-4684-81fc-60165c7b0e22";
const DAYS30=30*24*60*60*1000;
const SAST=2*60*60*1000;
const REF=/^[A-Z0-9][A-Z0-9-]{7,63}$/;
const TIME=/^20\d{2}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\+02:00$/;
const isObj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const invalid=()=>{throw Error("INVALID_REDACTED_P0_EVIDENCE");};
function exact(obj,keys){
 if(!isObj(obj)||Object.keys(obj).length!==keys.length||
 Object.keys(obj).some(key=>!keys.includes(key))) invalid();
}
function getSastTime(value){
 if(typeof value!=="string"||!TIME.test(value))invalid();
 const parsed=new Date(value);
 if(!Number.isFinite(parsed.getTime())||
 new Date(parsed.getTime()+SAST).toISOString().slice(0,19)!==value.slice(0,19))invalid();
 return parsed.getTime();
}
function classify(entry,now){
 if(!isObj(entry)||!["not_observed","documented","problem_found"].includes(entry.status))invalid();
 if(entry.status==="not_observed"){
   exact(entry,["status"]);
   return "missing";
 }
 exact(entry,["status","reference","observed_at_sast","independently_reviewed"]);
 if(typeof entry.reference!=="string"||!REF.test(entry.reference)||
 typeof entry.independently_reviewed!=="boolean")invalid();
 const ts=getSastTime(entry.observed_at_sast);
 if(ts>now)invalid();
 if(entry.status==="problem_found")return "action_required";
 if(!entry.independently_reviewed)return "needs_second_review";
 if(now-ts>DAYS30)return "stale";
 return "documented_for_human_review";
}
const ACTIONS=Object.freeze({
 action_required:"Privately investigate the reported problem before any rollout.",
 missing:"Assign an operator to obtain missing P0 evidence privately.",
 needs_second_review:"Arrange independent human review of the logged evidence.",
 stale:"Refresh outdated evidence with a newly performed authorised check.",
 documented_for_human_review:"Have the launch owner independently verify all references and approve scope.",
});
/** User-supplied flags/references are never proof that a check was performed. */
export function inspectP0Evidence(input,{asOf=new Date()}={}){
 if(!(asOf instanceof Date)||!Number.isFinite(asOf.getTime()))invalid();
 exact(input,["format","repository","railway_project_id","environment_id","checks"]);
 if(input.format!==P0_FORMAT||input.repository!==REPO||
 input.railway_project_id!==PROJECT||input.environment_id!==ENV||!isObj(input.checks))invalid();
 const submitted=Object.keys(input.checks);
 if(submitted.length>P0_GATES.length||submitted.some(k=>!P0_GATES.includes(k)))invalid();
 const seen=new Set();
 const groups={action_required:[],missing:[],needs_second_review:[],
   stale:[],documented_for_human_review:[]};
 for(const gate of P0_GATES){
  const observation=input.checks[gate]??{status:"not_observed"};
  const category=classify(observation,asOf.getTime());
  if(observation.reference){
    if(seen.has(observation.reference))invalid();
    seen.add(observation.reference);
  }
  groups[category].push(gate);
 }
 const priority=groups.action_required.length?"action_required":
 groups.missing.length?"missing":
 groups.needs_second_review.length?"needs_second_review":
 groups.stale.length?"stale":"documented_for_human_review";
 const status=priority==="action_required"?"REPORTED_ISSUE_NEEDS_ACTION":
 priority==="documented_for_human_review"?"HUMAN_SIGNOFF_REQUIRED":"EVIDENCE_GAPS_REMAIN";
 return {
  format:"luqi.p0.operator-handoff-summary.v1",
  timestamp_sast:new Date(asOf.getTime()+SAST).toISOString().replace("Z","+02:00"),
  scope:"kind-spontaneity / production",
  status,
  required_gates:P0_GATES.length,
  counts:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),
  gates:groups,
  next_safe_action:ACTIONS[priority],
  references_not_independently_verified:true,
  scheduled_checks_are_not_continuous_monitoring:true,
  production_restore_verified_by_this_tool:false,
  provider_bills_reconciled_by_this_tool:false,
  merchant_payments_verified_by_this_tool:false,
  public_or_paid_launch_approved:false,
 };
}
