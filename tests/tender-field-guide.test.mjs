import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SBD1_FIELDS,EMPTY_SUPPLIER_VALUES} from '../src/lib/tender-document-contract.ts';
import {SBD1_FIELD_GUIDANCE,supplierFieldIssue,supplierFieldProgress} from '../src/lib/tender-field-guide.ts';
const field=id=>SBD1_FIELDS.find(f=>f.id===id);
test('help covers exactly the existing seven mapped fields without expanding requirements',()=>{
 assert.deepEqual(Object.keys(SBD1_FIELD_GUIDANCE).sort(),SBD1_FIELDS.map(f=>f.id).sort());
 assert.equal(SBD1_FIELDS.filter(f=>f.required).length,1);
 for(const f of SBD1_FIELDS){assert.ok(SBD1_FIELD_GUIDANCE[f.id].question.endsWith('?'));assert.ok(SBD1_FIELD_GUIDANCE[f.id].explanation.length>30);}
});
test('blank optional fields are not errors or fabricated answers',()=>{
 const original=JSON.stringify(EMPTY_SUPPLIER_VALUES),result=supplierFieldProgress(EMPTY_SUPPLIER_VALUES,SBD1_FIELDS);
 assert.equal(result.entered,0);assert.equal(result.blank,6);assert.equal(result.attention.length,1);
 assert.equal(result.attention[0].field.id,'bidderName');assert.equal(JSON.stringify(EMPTY_SUPPLIER_VALUES),original);
});
test('complete contact fields do not imply completion of the official application',()=>{
 const result=supplierFieldProgress({bidderName:'Synthetic bidder',postalAddress:'Synthetic post',streetAddress:'Synthetic street',telephoneCode:'012',telephoneNumber:'3456789',cellphone:'0123456789',email:'test@example.test'},SBD1_FIELDS);
 assert.equal(result.entered,7);assert.equal(result.total,7);assert.equal(result.blank,0);assert.equal(result.attention.length,0);
 assert.equal('applicationComplete' in result,false);assert.equal('eligible' in result,false);
});
for(const [id,value]of [['bidderName',''],['bidderName',' '],['email','x'],['email',' x@example.test'],['email',' '],['cellphone','a\nb'],['streetAddress','x\u202e'],['bidderName','x'.repeat(71)],['telephoneCode',null]])
 test('bounded validation '+id+' '+JSON.stringify(value),()=>assert.ok(supplierFieldIssue(field(id),value)));
test('only actual supplied acceptable text counts as entered',()=>{
 const v={...EMPTY_SUPPLIER_VALUES,bidderName:'Synthetic',email:'bad',postalAddress:' '};const r=supplierFieldProgress(v,SBD1_FIELDS);
 assert.equal(r.entered,1);assert.equal(r.blank,5);assert.equal(r.attention.length,1);assert.equal(r.attention[0].field.id,'email');
 assert.equal(supplierFieldIssue(field('bidderName'),'A & B'),null);
 assert.equal(supplierFieldIssue(field('email'),'test@example.test'),null);
});
for(const p of ['components/TenderSupplierGuide.tsx','components/TenderOriginalForms.tsx','lib/tender-field-guide.ts'])
 test('mirrored '+p,()=>assert.equal(readFileSync(new URL('../src/'+p,import.meta.url),'utf8'),readFileSync(new URL('../app/src/'+p,import.meta.url),'utf8')));
test('help implementation has no network, persistence, sensors or unescaped HTML',()=>{
 const s=['lib/tender-field-guide.ts','components/TenderSupplierGuide.tsx'].map(p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8')).join('\n');
 assert.doesNotMatch(s,/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|geolocation|dangerouslySetInnerHTML/);
});
