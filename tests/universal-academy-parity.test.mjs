import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const shared = ['features/academy/academy-engine.ts','features/academy/academy-terminal.ts','features/academy/academy-catalog.ts','features/academy/academy.css','features/academy/AcademyMathLab.tsx','pages/UniversalAcademyPage.tsx','components/workspace-catalog.ts'];
for(const name of shared) test(`Academy source parity: ${name}`,()=>{
  assert.equal(fs.readFileSync('src/'+name,'utf8'),fs.readFileSync('app/src/'+name,'utf8'));
});
for(const root of ['src','app/src']) test(`Academy and specialist routes remain explicit in ${root}`,()=>{
  const source=fs.readFileSync(root+'/App.tsx','utf8');
  for(const path of ['/academy','/cert-academy','/cert-academy/legacy','/exam-prep','/ccna','/ccnp','/itil-ai','/networking-lab']){
    assert.equal(source.split(`path="${path}"`).length-1,1,`Missing or duplicate ${path}`);
  }
  assert.match(source,/const UniversalAcademyPage = lazy\(/);
  // Core Omega release markers remain eager; only the public 404 page may be deferred.
  // Login/join stay available through the same Luqi session, but need not load on public startup.
  assert.ok(source.includes('const CustomerEntryPage = lazy(() => import("./pages/CustomerEntryPage"));'));
  assert.doesNotMatch(source, /import CustomerEntryPage from/);
  assert.ok(source.includes('path="/login" element={<CustomerEntryPage initialMode="signin" />}'));
  assert.ok(source.includes('path="/join" element={<CustomerEntryPage initialMode="signup" />}'));
  assert.match(source, /import OmegaTasksPage from/);
  assert.doesNotMatch(source, /const OmegaTasksPage = lazy/);
  assert.equal(source.split('path="/omega-tasks"').length - 1, 1);
  assert.match(source, /const NotFoundPage = lazy\(\(\) => import\("\.\/pages\/NotFoundPage"\)\);/);
  assert.match(source, /path="\*" element=\{<NotFoundPage \/>\}/);
  assert.match(source,/path="\/ccna" element=\{<CertMasterPage \/>\}/);
});
