import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORKSPACE_NOTICES as notices,workspaceMatches as match,workspaceState as state,workspaceDate,workspaceChecklist,parseWorkspaceSaved,exactWorkspaceTime} from '../src/lib/tender-opportunity-workspace.ts';
const now=new Date('2026-11-09T12:00:00+02:00');
const ict=notices.find(n=>n.reference==='Q315/2027');
const supplies=notices.find(n=>n.category==='supplies');
assert.ok(ict);assert.ok(supplies);
test('five original-linked dated handoffs have no fabricated exact values, fees or live verification',()=>{
 assert.equal(notices.length,5);
 for(const n of notices){
  assert.equal(n.reviewedOn,'2026-11-09');assert.equal(n.sourceAccess,'recheck-unavailable');
  assert.equal(state(n,now),'review-needed');assert.equal(n.fee,'not stated');
  for(const url of [n.originalUrl,n.listingUrl,n.evidenceUrl])assert.equal(new URL(url).protocol,'https:');
  assert.ok(n.requirements.length>2);assert.ok(n.cautions.length>0);
 }
 assert.match(supplies.reference,/no number published/);assert.equal(supplies.ceilingZar,30000);
});
test('service, area and province filters combine without demographic or business-size assumptions',()=>{
 assert.equal(match({now}).length,5);
 assert.equal(match({now,province:'EC'}).length,1);
 assert.equal(match({now,province:'GP'}).length,0);
 assert.equal(match({now,category:'roadworks'}).length,2);
 assert.equal(match({now,category:'catering'}).length,0);
 assert.equal(match({now,query:'Motherwell'})[0].reference,'CSQ10266160');
 assert.equal(match({now,query:'  Q315/2027  '})[0].id,ict.id);
 assert.equal(match({now,province:'WC',category:'repairs'}).length,0);
});
test('published small-value ceiling is not inferred from method or unknown value',()=>{
 assert.deepEqual(match({now,smallCeiling:true}).map(n=>n.id),[supplies.id]);
 assert.equal(match({now}).filter(n=>n.ceilingZar===null).length,4);
});
test('mandatory briefing and closing use exact SAST, not machine timezone or end of day',()=>{
 const before=new Date('2026-11-10T09:59:59+02:00'),at=new Date('2026-11-10T10:00:00+02:00');
 assert.equal(state(ict,before),'review-needed');assert.equal(state(ict,at),'briefing-passed');
 assert.ok(!match({now:at}).some(n=>n.id===ict.id));
 assert.ok(match({now:at,history:true}).some(n=>n.id===ict.id));
 assert.equal(state(supplies,new Date('2026-11-10T12:00:00+02:00')),'closed');
 assert.equal(match({now:new Date('2026-11-24T00:00:00+02:00')}).length,0);
 assert.equal(match({now:new Date('2026-11-24T00:00:00+02:00'),history:true}).length,5);
 assert.match(workspaceDate(ict.closesAt),/13 Nov 2026.*12:00 SAST/);
});
test('invalid dates, invalid clock and future reviews fail closed even in history',()=>{
 assert.ok(Number.isNaN(exactWorkspaceTime('2026-02-30T10:00:00+02:00')));
 assert.ok(Number.isNaN(exactWorkspaceTime('2026-11-10T10:00:00Z')));
 assert.ok(Number.isNaN(exactWorkspaceTime('2026-11-10T25:00:00+02:00')));
 assert.equal(state({...ict,briefingAt:'bad'},now),'unverified');
 assert.equal(state(ict,new Date(NaN)),'unverified');
 assert.equal(match({now:new Date('2026-11-08T12:00:00+02:00'),history:true}).length,0);
});
test('source recovery never silently occurs on a later date',()=>{
 assert.equal(state(ict,new Date('2026-11-10T09:00:00+02:00')),'review-needed');
 assert.equal(state({...ict,sourceAccess:'retrieved'},now),'original-reviewed');
 const n={...notices[4],sourceAccess:'retrieved'};
 assert.equal(state(n,new Date('2026-11-11T00:00:00+02:00')),'review-needed');
});
test('dedup preserves distinct Q314 and Q317 work areas while dropping repeated issuer/reference',()=>{
 const duplicate={...ict,id:'duplicate',issuer:' SALDANHA BAY MUNICIPALITY ',reference:' q315/2027 '};
 assert.equal(match({now},[...notices,duplicate]).length,5);
 assert.equal(match({now,category:'roadworks'}).length,2);
});
test('saved storage permits only current public identifiers; corrupt or private payloads discarded',()=>{
 for(const raw of ['not-json','{}','null','"secret"'])assert.deepEqual(parseWorkspaceSaved(raw),[]);
 assert.deepEqual(parseWorkspaceSaved(JSON.stringify([ict.id,ict.id,'private@example.test',{taxPin:'secret'},null])),[ict.id]);
 assert.equal(match({now,savedOnly:true,savedIds:[ict.id]}).length,1);
 assert.equal(match({now,savedOnly:true,savedIds:[]}).length,0);
});
test('export reports exact evidence, self-checked fields, unknowns and current expiry without bidding',()=>{
 const out=workspaceChecklist(supplies,{'0':'checked','1':'missing'},now);
 assert.match(out,/Not a bid, legal declaration, eligibility approval or official form/);
 assert.match(out,/Estimated contract value: not stated/);assert.match(out,/Published procurement ceiling: R30000/);
 assert.match(out,/Self-marked checked/);assert.match(out,/Missing/);assert.match(out,/Still to check/);
 assert.match(out,/adeline.ramadie@stellenbosch.gov.za/);assert.match(out,/scm.quotes@stellenbosch.gov.za/);
 assert.match(out,/within 48 hours/);assert.match(out,/Luqi has not contacted/);
 assert.match(workspaceChecklist(supplies,{},new Date('2026-11-11T13:00:00+02:00')),/Status at export: closed/);
});
test('frontend mirrors match and discovery introduces no network, inference or bid-submit path',()=>{
 for(const p of ['lib/tender-opportunity-workspace.ts','components/TenderOpportunityWorkspace.tsx','components/tender-opportunity-workspace.css','pages/TenderDeskPage.tsx'])assert.equal(readFileSync('src/'+p,'utf8'),readFileSync('app/src/'+p,'utf8'),p);
 const component=readFileSync('src/components/TenderOpportunityWorkspace.tsx','utf8');
 assert.doesNotMatch(component,/\bfetch\s*\(|axios|api\/v1|<form\b/);
 assert.match(component,/localStorage\.setItem\(STORE,JSON\.stringify\(next\)\)/);
 assert.match(component,/workspaceChecklist\(selected,answers,new Date\(\)\)/);
});
