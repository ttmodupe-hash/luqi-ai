import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { tenderSastTime, tenderStatus, tenderReviewFresh, CURATED_TENDER_NOTICES, TENDER_REVIEWED_ON, TENDER_RECHECK_AFTER } from '../src/lib/tender-sources.ts';
import { describeInstall, installDiagnosticText } from '../src/lib/install-diagnostics.ts';
const notice=CURATED_TENDER_NOTICES[0];
for(const [time,status] of [['2026-11-02T10:59:59.999+02:00','source-review-needed'],['2026-11-02T11:00:00+02:00','past-deadline'],['2026-11-02T11:00:30+02:00','past-deadline'],['2026-11-02T09:00:00Z','past-deadline']]){
 test('exact official deadline '+time,()=>assert.equal(tenderStatus(notice,new Date(time)),status));
}
for(const date of ['2026-02-29','2026-02-30','2026-13-01','2026-1-01','2026-04-31','not a date',''])test('invalid calendar '+date,()=>assert.ok(Number.isNaN(tenderSastTime(date))));
for(const time of ['24:00','25:00','1:00','10:60','10:00:00',''])test('invalid time '+time,()=>assert.ok(Number.isNaN(tenderSastTime('2026-11-02',time))));
test('valid leap day and SAST offset',()=>assert.equal(tenderSastTime('2028-02-29','11:00'),Date.parse('2028-02-29T09:00:00Z')));
test('invalid clock never proves freshness',()=>{assert.equal(tenderReviewFresh(notice,new Date(NaN)),false);assert.equal(tenderStatus(notice,new Date(NaN)),'source-review-needed');});
test('future reviewed date is never fresh',()=>assert.equal(tenderReviewFresh({...notice,sourceReviewedOn:'2026-11-03'},new Date('2026-11-02T08:00:00+02:00')),false));
test('date-only source review expires conservatively at 48h',()=>{assert.equal(tenderReviewFresh(notice,new Date('2026-10-30T23:59:59+02:00')),true);assert.equal(tenderReviewFresh(notice,new Date('2026-10-31T00:00:00+02:00')),false)});
test('calendar review deadline cannot be silently bypassed',()=>assert.equal(tenderReviewFresh({...notice,sourceReviewedOn:'2026-11-01'},new Date('2026-11-02T00:00:00+02:00')),false));
test('attempts do not renew source dates',()=>{assert.equal(TENDER_REVIEWED_ON,'2026-10-29');assert.equal(TENDER_RECHECK_AFTER,'2026-11-02');assert.ok(CURATED_TENDER_NOTICES.every(n=>n.sourceReviewedOn==='2026-10-29'));});
const base={origin:'https://app.luqi-ai.com',secure:true,online:true,serviceWorker:true,standalone:false,promptAvailable:false,bootAsset:'/assets/index-Abc123.js'};
test('missing prompt gives manual steps, never diagnoses unsafe app',()=>{const d=describeInstall(base);assert.match(d.nextStep,/instructions below/);assert.equal(d.promptAvailable,false);});
test('offered prompt is not completed install',()=>{const d=describeInstall({...base,promptAvailable:true});assert.match(d.nextStep,/offering installation/);assert.equal(d.standalone,false);});
test('standalone is not physical-device security acceptance',()=>assert.match(describeInstall({...base,standalone:true}).nextStep,/not proof/));
test('offline retains explicit cached-version caveat',()=>assert.match(describeInstall({...base,online:false}).nextStep,/cached pages may be older/));
for(const origin of ['http://app.luqi-ai.com','https://app.luqi-ai.com.evil.test','https://evil.test/?secret=x','null'])test('reject noncanonical origin '+origin,()=>{const d=describeInstall({...base,origin});assert.equal(d.officialHost,false);assert.match(d.nextStep,/Do not bypass/);assert.ok(!installDiagnosticText({...base,origin}).includes(origin));});
test('insecure context cannot recommend install',()=>assert.match(describeInstall({...base,secure:false,promptAvailable:true}).nextStep,/Do not bypass/));
for(const bootAsset of ['/assets/index-ok.js?token=secret','https://evil.test/a.js','/assets/../secret.js','private text','/assets/index-a.js#secret'])test('reject unsafe boot path '+bootAsset,()=>{assert.equal(describeInstall({...base,bootAsset}).bootAsset,null);assert.ok(!installDiagnosticText({...base,bootAsset}).includes(bootAsset));});
test('report contains only safe capability values and no private URL',()=>{const report=installDiagnosticText({...base,account:'private@example.test',cookie:'secret',query:'token=secret'});assert.match(report,/NOT a security certification/);assert.match(report,/No account/);assert.doesNotMatch(report,/private@example|token=secret/);assert.match(report,/index-Abc123.js/);});
for(const path of ['lib/tender-sources.ts','lib/tender-workflow.ts','pages/TenderDeskPage.tsx','pages/InstallAppPage.tsx','components/InstallBrowserCheck.tsx','lib/install-diagnostics.ts'])test('mirrored '+path,()=>assert.equal(readFileSync(new URL('../src/'+path,import.meta.url),'utf8'),readFileSync(new URL('../app/src/'+path,import.meta.url),'utf8')));
test('browser check has no network, storage, sensor or automatic refresh path',()=>{const text=readFileSync(new URL('../src/components/InstallBrowserCheck.tsx',import.meta.url),'utf8')+readFileSync(new URL('../src/lib/install-diagnostics.ts',import.meta.url),'utf8');assert.doesNotMatch(text,/\bfetch\s*\(|localStorage|sessionStorage|indexedDB|userAgent|document\.cookie|geolocation|\.reload\(|caches\.open/);});
test('approved export recomputes readiness at the actual click',()=>{const text=readFileSync(new URL('../src/pages/TenderDeskPage.tsx',import.meta.url),'utf8');assert.match(text,/assessTenderDraft\(chosen,draft,approvals,clickedAt\)/);assert.match(text,/visibilitychange/);});
