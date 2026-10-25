// Offline comparison of aggregate provider charges and LUQI reservations.
// This never obtains bills or queries production and never certifies launch.
export const CAPS_CENTS = Object.freeze({gemini:6000, openai:4000, combined:10000});
const sources = new Set(["provider_invoice","provider_dashboard","unavailable"]);
const keys = new Set(["billing_source","actual_cents","reserved_cents","project_confirmed","period_complete"]);
const record = v => v && typeof v === "object" && !Array.isArray(v);
const checkKeys = (v, allowed) => {
  if (!record(v) || Object.keys(v).some(k=>!allowed.has(k))) throw Error("INVALID_AGGREGATES");
};
const integer = v => {
  if (v===null) return null;
  if (!Number.isSafeInteger(v) || v<0) throw Error("INVALID_CENTS");
  return v;
};
function provider(name,v) {
  checkKeys(v,keys);
  if(!sources.has(v.billing_source) || typeof v.project_confirmed!=="boolean" ||
     typeof v.period_complete!=="boolean") throw Error("INVALID_SOURCE");
  const billed=integer(v.actual_cents), reserved=integer(v.reserved_cents);
  if(v.billing_source==="unavailable" && billed!==null) throw Error("MISSING_NOT_ZERO");
  const evidence = v.billing_source!=="unavailable" && billed!==null && reserved!==null &&
    v.project_confirmed && v.period_complete;
  return {actual_cents:billed,reserved_cents:reserved,limit_cents:CAPS_CENTS[name],
    within_limit:billed===null?null:billed<=CAPS_CENTS[name],
    reservation_minus_charge_cents:billed===null||reserved===null?null:reserved-billed,
    operator_evidence_complete:evidence};
}
export function compareProviderCosts(input,asOf=new Date()) {
  checkKeys(input,new Set(["month_utc","gemini","openai"]));
  if(typeof input.month_utc!=="string" || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(input.month_utc)) throw Error("INVALID_MONTH");
  if(!(asOf instanceof Date) || Number.isNaN(asOf.getTime())) throw Error("INVALID_DATE");
  const [year,month]=input.month_utc.split("-").map(Number);
  const closed=asOf.getTime()>=Date.UTC(year,month,1);
  const gemini=provider("gemini",input.gemini),openai=provider("openai",input.openai);
  const all=[gemini,openai],over=all.some(x=>x.within_limit===false);
  const total=(field)=>all.every(x=>x[field]!==null)?all.reduce((s,x)=>s+x[field],0):null;
  return {format:"luqi.cost-review.v1",month_utc:input.month_utc,
    status:over?"CAP_REVIEW_REQUIRED":!closed?"UTC_MONTH_OPEN":
      all.every(x=>x.operator_evidence_complete)?"OPERATOR_COMPARISON_ONLY":"EVIDENCE_INCOMPLETE",
    approved_limits_cents:CAPS_CENTS,providers:{gemini,openai},
    actual_total_cents:total("actual_cents"),reserved_total_cents:total("reserved_cents"),
    reservations_are_not_bills:true,independent_billing_verification:false,
    provider_costs_reconciled:false,launch_approved:false};
}
