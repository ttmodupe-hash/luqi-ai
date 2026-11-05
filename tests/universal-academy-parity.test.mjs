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
  assert.match(source,/path="\/ccna" element=\{<CertMasterPage \/>\}/);
});
