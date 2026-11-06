/** V17 evidence-policy primitives. No provider calls, model training or release authority.
 * Trusted server records only: these functions are NOT authentication boundaries.
 */
export const TRACKS = ['ccna', 'security', 'aws', 'python', 'matric', 'solar'] as const;
export type Track = typeof TRACKS[number];
export type Source = Readonly<{ id: string; publisher: string; track: Track; url: string; cadenceHours: number; kind: 'issuer' | 'documentation' | 'official-guidance' }>;
export const SOURCES: readonly Source[] = Object.freeze([
  { id:'cisco-exam', publisher:'Cisco', track:'ccna', url:'https://learningnetwork.cisco.com/s/ccna-exam-topics', cadenceHours:24, kind:'issuer' },
  { id:'comptia-security', publisher:'CompTIA', track:'security', url:'https://www.comptia.org/en-us/certifications/security/', cadenceHours:24, kind:'issuer' },
  { id:'aws-revisions', publisher:'AWS', track:'aws', url:'https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/clf-02-revisions.html', cadenceHours:24, kind:'issuer' },
  { id:'python-tutorial', publisher:'Python', track:'python', url:'https://docs.python.org/3/tutorial/', cadenceHours:168, kind:'documentation' },
  { id:'dbe-guidelines', publisher:'DBE', track:'matric', url:'https://www.education.gov.za/2021Grade12ExamGuidelines.aspx', cadenceHours:168, kind:'official-guidance' },
  { id:'sa-learner-licence', publisher:'South African Government', track:'solar', url:'https://www.gov.za/services/driving-licence/apply-learners-licence', cadenceHours:168, kind:'official-guidance' },
].map(s => Object.freeze(s as Source)));
const HEX = /^[a-f0-9]{64}$/;
export function digestFormat(value: unknown): value is string { return typeof value === 'string' && HEX.test(value); }
function bounded(value: number, min: number, max: number, label: string): number {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`Invalid ${label}`);
  return value;
}
export function utc(value: string): number {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) throw new Error('Use canonical UTC ISO timestamps');
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error('Invalid timestamp');
  return parsed;
}
/** An approved URL is only a fetch destination, never proof that a claim is true. */
export function approvedSource(input: string): Source | null {
  if (typeof input !== 'string' || input.length > 2048 || input !== input.trim() || /[\\\u0000-\u0020]/u.test(input)) return null;
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash || u.search) return null;
    // Exact registry match, including path: no suffix matching, whole-domain crawl or redirect trust.
    return SOURCES.find(s => s.url === u.href && input === u.href) || null;
  } catch { return null; }
}
export function sourceById(id: string): Source {
  const source = SOURCES.find(s => s.id === id);
  if (!source) throw new Error('Source is not in the reviewed registry');
  return source;
}
export type PriorityInput = { uncertainty: number; importance: number; queryCount: number; ageHours: number; cadenceHours: number; costUnits: number };
/** Bounded operational heuristic, NOT measured Shannon entropy or calibrated EIG. */
export function curiosityPriority(x: PriorityInput): number {
  bounded(x.uncertainty,0,1,'uncertainty'); bounded(x.importance,0,1,'importance');
  bounded(x.queryCount,0,1e9,'aggregate query count'); bounded(x.ageHours,0,1e8,'age');
  bounded(x.cadenceHours,1,8760,'cadence'); bounded(x.costUnits,0,1e6,'cost');
  const demand = Math.min(1,Math.log2(1+x.queryCount)/10);
  const stale = Math.min(1,x.ageHours/x.cadenceHours);
  return 100 * (.30*x.uncertainty + .35*x.importance + .15*demand + .20*stale) / (1+x.costUnits);
}
export type Claim = {
  id: string; key: string; jurisdiction: string; value: string; digest: string;
  validFrom: string; validTo: string | null; recordedAt: string; retractedAt: string | null;
  lastVerifiedAt: string; sourceIds: string[]; status: 'quarantined' | 'approved';
};
export type FactSelection = { state:'available'|'conflict'|'stale'|'unavailable'; facts: Claim[] };
/** Bitemporal selection on trusted approved records. No mutation or automatic conflict resolution. */
export function selectFacts(records: readonly Claim[], key: string, jurisdiction: string,
  effectiveAt: string, knownAt: string, maxAgeHours: number): FactSelection {
  const effective = utc(effectiveAt), known = utc(knownAt);
  bounded(maxAgeHours,0,87600,'freshness window');
  const active = records.filter(r => {
    if (r.key !== key || r.jurisdiction !== jurisdiction || r.status !== 'approved') return false;
    try {
      const from=utc(r.validFrom), to=r.validTo===null ? Infinity : utc(r.validTo);
      const recorded=utc(r.recordedAt), verified=utc(r.lastVerifiedAt);
      const retracted=r.retractedAt===null ? Infinity : utc(r.retractedAt);
      return digestFormat(r.digest) && r.sourceIds.length > 0 && r.sourceIds.every(id=>SOURCES.some(s=>s.id===id)) &&
        from < to && recorded <= known && verified >= recorded && verified <= known && retracted >= recorded && retracted > known &&
        effective >= from && effective < to;
    } catch { return false; }
  });
  if (!active.length) return {state:'unavailable',facts:[]};
  // Conflicting approved values stay visible even if one is older: do not silently prefer the latest.
  if (new Set(active.map(r=>r.value)).size > 1) return {state:'conflict',facts:active.map(r=>({...r,sourceIds:[...r.sourceIds]}))};
  const fresh=active.filter(r=>known-utc(r.lastVerifiedAt)<=maxAgeHours*3600000);
  return {state:fresh.length?'available':'stale',facts:(fresh.length?fresh:active).map(r=>({...r,sourceIds:[...r.sourceIds]}))};
}
export type Evidence = { sourceId:string; snapshotDigest:string; supportsClaim:boolean; claimDigest:string };
/** Only review readiness. A source fetch or this returned object never grants publication rights. */
export function evidenceReview(candidateDigest: string, evidence: readonly Evidence[], policy: 'single-issuer'|'independent-publishers', soleIssuer?: string) {
  const reasons:string[]=[];
  if (!digestFormat(candidateDigest)) reasons.push('invalid_candidate_digest');
  const valid=evidence.filter(e=>e.claimDigest===candidateDigest && digestFormat(e.snapshotDigest) && e.supportsClaim===true && SOURCES.some(s=>s.id===e.sourceId));
  const publishers=new Set(valid.map(e=>sourceById(e.sourceId).publisher));
  if (policy==='single-issuer') {
    if (!soleIssuer || !valid.some(e=>{const s=sourceById(e.sourceId); return s.kind==='issuer' && s.publisher===soleIssuer;})) reasons.push('issuer_evidence_missing');
  } else if (policy==='independent-publishers') {
    if (publishers.size < 2) reasons.push('independent_publisher_evidence_missing');
  } else reasons.push('invalid_evidence_policy');
  return {eligibleForHumanReview:reasons.length===0,productionApproved:false as const,reasons};
}
export type CanaryCase = {id:string; passed:boolean};
export type CanaryReport = {candidateDigest:string; baselineDigest:string; suiteDigest:string; cases:CanaryCase[]; baselineSlices:Record<string,number>; candidateSlices:Record<string,number>};
/** Requires candidate-bound coverage. Does not authenticate CI reports or authorize a release. */
export function assessCanary(report: CanaryReport, expected: {candidateDigest:string;baselineDigest:string;suiteDigest:string;requiredCases:string[];requiredSlices:string[]}) {
  const reasons:string[]=[];
  for(const k of ['candidateDigest','baselineDigest','suiteDigest'] as const)
    if(!digestFormat(report[k])||!digestFormat(expected[k])||report[k]!==expected[k])reasons.push(`${k}_mismatch`);
  if(!expected.requiredCases.length || !expected.requiredSlices.length) reasons.push('empty_acceptance_contract');
  if(new Set(report.cases.map(c=>c.id)).size!==report.cases.length)reasons.push('duplicate_case');
  if(report.cases.some(c=>c.passed!==true))reasons.push('failed_case');
  for(const id of expected.requiredCases) if(!report.cases.some(c=>c.id===id && c.passed===true))reasons.push(`case_missing_or_failed:${id}`);
  for(const id of expected.requiredSlices) {
    const before=report.baselineSlices[id],after=report.candidateSlices[id];
    if(!Number.isFinite(before)||!Number.isFinite(after)||before<0||before>1||after<0||after>1||after<before)reasons.push(`slice_missing_or_regressed:${id}`);
  }
  return {eligibleForHumanReview:reasons.length===0,productionApproved:false as const,reasons};
}
export type ModelCandidate = {id:string;provider:string;version:string;currency:'USD';taskClass:string;approved:boolean;privacyApproved:boolean;healthy:boolean;
  evaluatedAt:string;qualityLowerBound:number;p95Ms:number;contextTokens:number;maxOutputTokens:number;worstCaseCostMicros:number};
export type RoutingPolicy = {currency:'USD';allowedProviders:readonly string[];taskClass:string;now:string;maxEvaluationAgeHours:number;
  requiredContextTokens:number;requiredOutputTokens:number;minimumQuality:number;maximumP95Ms:number;availableBudgetMicros:number};
/** Supplied prices/benchmarks must come from trusted exact-version evaluations. Never executes a provider call. */
export function chooseModel(models:readonly ModelCandidate[], p:RoutingPolicy):ModelCandidate|null {
  if(p.currency!=='USD')throw new Error('Routing budget currency must be USD');
  const now=utc(p.now); bounded(p.maxEvaluationAgeHours,0,8760,'evaluation age'); bounded(p.minimumQuality,0,1,'quality');
  for(const v of [p.requiredContextTokens,p.requiredOutputTokens,p.availableBudgetMicros]) if(!Number.isSafeInteger(v)||v<0)throw new Error('Invalid token/budget bound');
  bounded(p.maximumP95Ms,1,3600000,'latency');
  return models.filter(m=>{
    try {
      const age=now-utc(m.evaluatedAt);
      return m.id.length>0 && m.version.length>0 && m.approved===true && m.privacyApproved===true && m.healthy===true &&
        m.currency===p.currency && p.allowedProviders.includes(m.provider) && m.taskClass===p.taskClass && age>=0 && age<=p.maxEvaluationAgeHours*3600000 &&
        Number.isFinite(m.qualityLowerBound) && m.qualityLowerBound>=p.minimumQuality && m.qualityLowerBound<=1 &&
        Number.isFinite(m.p95Ms) && m.p95Ms>=0 && m.p95Ms<=p.maximumP95Ms &&
        Number.isSafeInteger(m.contextTokens) && m.contextTokens>=p.requiredContextTokens &&
        Number.isSafeInteger(m.maxOutputTokens) && m.maxOutputTokens>=p.requiredOutputTokens &&
        Number.isSafeInteger(m.worstCaseCostMicros) && m.worstCaseCostMicros>=0 && m.worstCaseCostMicros<=p.availableBudgetMicros;
    }catch{return false;}
  }).sort((a,b)=>a.worstCaseCostMicros-b.worstCaseCostMicros || b.qualityLowerBound-a.qualityLowerBound || a.p95Ms-b.p95Ms || a.id.localeCompare(b.id))[0] || null;
}
export type Telemetry = {event:'task_completed'|'task_failed'|'feedback_helpful'|'feedback_unhelpful';track:Track;latencyBucket:'under_1s'|'1_to_5s'|'over_5s'};
/** Aggregate-only schema: no free text, URL, precise time, IP, ID or learner profile. No training consent is implied. */
export function approvedTelemetry(input:unknown, analyticsOptIn:boolean):Telemetry|null {
  if(!analyticsOptIn || !input || typeof input!=='object' || Array.isArray(input))return null;
  const obj=input as Record<string,unknown>;
  if(Object.keys(obj).sort().join(',')!=='event,latencyBucket,track')return null;
  if(typeof obj.event!=='string'||typeof obj.track!=='string'||typeof obj.latencyBucket!=='string')return null;
  if(!['task_completed','task_failed','feedback_helpful','feedback_unhelpful'].includes(String(obj.event)) ||
    !TRACKS.includes(obj.track as Track) || !['under_1s','1_to_5s','over_5s'].includes(String(obj.latencyBucket)))return null;
  return {event:obj.event as Telemetry['event'],track:obj.track as Track,latencyBucket:obj.latencyBucket as Telemetry['latencyBucket']};
}
export async function sha256(text:string):Promise<string> {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export type LedgerEntry = {sequence:number;previousDigest:string;payloadDigest:string;observedAt:string;digest:string};
/** Hash chain only, NOT a digital signature or proof of source truth. Anchor the head independently. */
export async function appendDigest(previous:LedgerEntry|null, payloadDigest:string, observedAt:string):Promise<LedgerEntry> {
  utc(observedAt); if(!digestFormat(payloadDigest))throw new Error('Invalid payload digest');
  if(previous && (!Number.isSafeInteger(previous.sequence)||previous.sequence<0||!digestFormat(previous.digest)||utc(previous.observedAt)>utc(observedAt)))throw new Error('Invalid preceding entry');
  const sequence=previous?previous.sequence+1:0, previousDigest=previous?previous.digest:'0'.repeat(64);
  if(!Number.isSafeInteger(sequence))throw new Error('Sequence overflow');
  const digest=await sha256(JSON.stringify(['luqi-evidence-chain-v1',sequence,previousDigest,payloadDigest,observedAt]));
  return {sequence,previousDigest,payloadDigest,observedAt,digest};
}
export async function verifyDigestChain(entries:readonly LedgerEntry[],trustedHead:string):Promise<boolean> {
  if(!entries.length||!digestFormat(trustedHead))return false;
  let previous:LedgerEntry|null=null;
  try {
    for(const entry of entries) {
      const expected=await appendDigest(previous,entry.payloadDigest,entry.observedAt);
      if(expected.digest!==entry.digest||expected.sequence!==entry.sequence||expected.previousDigest!==entry.previousDigest)return false;
      previous=entry;
    }
    return previous?.digest===trustedHead;
  }catch{return false;}
}
