import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PENDING_TENDER_WATCH_NOTICES as notices,pendingTenderWatchStatus as status,filterPendingTenderWatchNotices as filter,tenderWatchSastLabel} from '../src/lib/tender-watch-notices.ts';

const now=new Date('2026-11-09T09:00:00+02:00');
const water=notices.find(n=>n.reference==='T10/2026/27');
const sewage=notices.find(n=>n.reference==='T01/2026/27');
assert.ok(water);assert.ok(sewage);

test('the bounded handoff contains two distinct advertisements, not small RFQs or approved bids',()=>{
 assert.equal(notices.length,2);
 assert.equal(new Set(notices.map(n=>n.issuer+'|'+n.reference)).size,2);
 for(const n of notices){
  assert.equal(n.type,'Formal tender');
  assert.equal(n.province,'NC');
  assert.equal(n.documentsAvailableOn,'2026-11-13');
  assert.equal(n.advertisementReviewedOn,'2026-11-09');
  assert.equal(status(n,now),'documents-pending');
  assert.match(n.advertisedConditions,/CIDB 8CE/);
  assert.equal(new URL(n.advertisementUrl).hostname,'dikgatlong.gov.za');
  assert.equal(new URL(n.officialUrl).protocol,'https:');
 }
 assert.equal(water.publishedOn,'2026-11-06');
 assert.equal(sewage.publishedOn,null);
 assert.match(sewage.documentFee,/R550/);
 assert.match(sewage.documentFee,/not the contract value/);
});

test('closing and briefing times are expressed in SAST independent of local browser timezone',()=>{
 assert.equal(tenderWatchSastLabel(water.closesAt),'2026-12-18 10:00 SAST');
 assert.equal(tenderWatchSastLabel(sewage.closesAt),'2026-12-11 12:00 SAST');
 assert.equal(tenderWatchSastLabel(water.briefingAt),'2026-11-23 10:00 SAST');
 assert.equal(tenderWatchSastLabel(sewage.briefingAt),'2026-11-20 10:00 SAST');
 assert.equal(tenderWatchSastLabel('2026-12-18T10:00:00Z'),'Time not verified');
 assert.equal(tenderWatchSastLabel('2026-02-30T10:00:00+02:00'),'Time not verified');
});

test('date-only advertisement review expires after a conservative 48 hours without upgrading on book release day',()=>{
 assert.equal(status(water,new Date('2026-11-10T23:59:59+02:00')),'documents-pending');
 assert.equal(status(water,new Date('2026-11-11T00:00:00+02:00')),'source-review-needed');
 assert.equal(status(water,new Date('2026-11-13T00:00:00+02:00')),'source-review-needed');
 assert.equal(status(water,new Date('2026-11-19T12:00:00+02:00')),'source-review-needed');
});

test('a compulsory briefing ceases to be actionable at its exact starting minute',()=>{
 const before=new Date('2026-11-20T09:59:59+02:00');
 const at=new Date('2026-11-20T10:00:00+02:00');
 assert.equal(status(sewage,before),'source-review-needed');
 assert.equal(status(sewage,at),'briefing-passed');
 assert.equal(filter({now:before}).length,2);
 assert.deepEqual(filter({now:at}).map(n=>n.reference),['T10/2026/27']);
 assert.equal(filter({now:at,includeHistory:true}).length,2);
});

test('closing times take precedence and closed notices only appear in explicit history',()=>{
 assert.equal(status(sewage,new Date('2026-12-11T11:59:59+02:00')),'briefing-passed');
 assert.equal(status(sewage,new Date('2026-12-11T12:00:00+02:00')),'closed');
 assert.equal(status(water,new Date('2026-12-18T10:00:00+02:00')),'closed');
 assert.equal(filter({now:new Date('2026-12-19T00:00:00+02:00')}).length,0);
 assert.equal(filter({now:new Date('2026-12-19T00:00:00+02:00'),includeHistory:true}).length,2);
});

test('invalid clocks, impossible dates, timezone omissions and future review dates fail closed',()=>{
 assert.equal(status(water,new Date(NaN)),'unverified');
 assert.equal(status(water,new Date('2026-11-08T23:59:59+02:00')),'unverified');
 for(const patch of [
  {closesAt:'2026-12-18T10:00:00'},
  {briefingAt:'2026-11-23T25:00:00+02:00'},
  {advertisementReviewedOn:'2026-02-30'},
  {documentsAvailableOn:'not a date'},
 ])assert.equal(status({...water,...patch},now),'unverified');
 assert.equal(filter({now:new Date(NaN),includeHistory:true}).length,0);
 assert.equal(filter({now:new Date('2026-10-29T10:00:00Z'),includeHistory:true}).length,0);
});

test('province, area, service and exact reference filters operate without a value or business-size threshold',()=>{
 assert.equal(filter({now,province:'GP'}).length,0);
 assert.equal(filter({now,province:'NC'}).length,2);
 assert.equal(filter({now,province:'all'}).length,2);
 assert.deepEqual(filter({now,query:'T10/2026/27'}).map(n=>n.reference),['T10/2026/27']);
 assert.deepEqual(filter({now,query:'  wastewater  '}).map(n=>n.reference),['T01/2026/27']);
 assert.equal(filter({now,query:'Barkly West'}).length,1);
 assert.equal(filter({now,query:'Formal tender'}).length,2);
 assert.deepEqual(filter({now}).map(n=>n.reference),['T01/2026/27','T10/2026/27']);
});

test('issuer and reference normalization prevents duplicate watch cards',()=>{
 const duplicate={...water,id:'duplicate',issuer:' DIKGATLONG LOCAL MUNICIPALITY ',reference:' t10/2026/27 '};
 assert.equal(filter({now},[...notices,duplicate]).length,2);
});

test('both frontend trees use identical source, component and page code',()=>{
 for(const path of ['lib/tender-watch-notices.ts','components/TenderWatchNotices.tsx','pages/TenderDeskPage.tsx']){
  assert.equal(readFileSync('src/'+path,'utf8'),readFileSync('app/src/'+path,'utf8'),path);
 }
 const page=readFileSync('src/pages/TenderDeskPage.tsx','utf8');
 assert.match(page,/<TenderWatchNotices now=\{now\}\/>/);
 assert.match(page,/<TenderOriginalForms\/>/);
});

test('the handoff does not renew legacy reviews, change the fixed monitor or offer submission controls',()=>{
 const legacy=readFileSync('src/lib/tender-sources.ts','utf8');
 assert.match(legacy,/TENDER_REVIEWED_ON='2026-10-29'/);
 assert.match(legacy,/TENDER_RECHECK_AFTER='2026-11-02'/);
 assert.doesNotMatch(legacy,/dikgatlong-t10/);
 const component=readFileSync('src/components/TenderWatchNotices.tsx','utf8');
 assert.match(component,/latest release recheck could not retrieve/);
 assert.match(component,/Estimated contract value:<\/strong> not stated/);
 assert.doesNotMatch(component,/\bfetch\s*\(|localStorage|sessionStorage|<form\b|<button\b/);
});
