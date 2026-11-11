import test from 'node:test';
import assert from 'node:assert/strict';
import { ContactPresence, PRESENCE_TTL_MS } from '../api/services/contactPresence.ts';
const fixture=()=>{let now=1000000;return {p:new ContactPresence(()=>now),advance:ms=>{now+=ms}}};
test('default hidden, online and explicit away are different states',()=>{const {p}=fixture();assert.equal(p.read(1),'not_shared');p.update(1,'a',1,true);assert.equal(p.read(1),'online');p.update(2,'b',1,true,true);assert.equal(p.read(2),'away')});
test('away expires to offline then is forgotten',()=>{const {p,advance}=fixture();p.update(1,'a',1,true,true);advance(PRESENCE_TTL_MS);assert.equal(p.read(1),'offline');advance(15*60000);assert.equal(p.read(1),'not_shared')});
test('hide revokes away; older packet cannot restore it',()=>{const {p}=fixture();p.update(1,'a',1,true,true);p.update(1,'a',3,false);p.update(1,'a',2,true,true);assert.equal(p.read(1),'not_shared')});
test('duplicate sequence cannot change online to away',()=>{const {p}=fixture();p.update(1,'a',1,true);p.update(1,'a',1,true,true);assert.equal(p.read(1),'online')});
test('new online tab wins; hiding it leaves the away tab',()=>{const {p}=fixture();p.update(1,'a',1,true,true);p.update(1,'b',1,true);assert.equal(p.read(1),'online');p.update(1,'b',2,false);assert.equal(p.read(1),'away')});
test('quick online-away-online changes do not extend original lease',()=>{const {p,advance}=fixture();p.update(1,'a',1,true);advance(5000);p.update(1,'a',2,true,true);advance(4000);p.update(1,'a',3,true);advance(PRESENCE_TTL_MS-9000);assert.equal(p.read(1),'offline')});
test('same-mode heartbeat throttle retained',()=>{const {p}=fixture();p.update(1,'a',1,true,true);assert.throws(()=>p.update(1,'a',2,true,true),/PRESENCE_RATE/)});
test('state is isolated per account and process',()=>{const {p}=fixture();p.update(1,'a',1,true,true);assert.equal(p.read(2),'not_shared');assert.equal(new ContactPresence().read(1),'not_shared')});
test('four lease cap is unchanged',()=>{const {p}=fixture();for(let i=0;i<4;i++)p.update(1,String(i),1,true,true);assert.throws(()=>p.update(1,'5',1,true,true),/PRESENCE_CAPACITY/)});
test('capacity never evicts another user to fabricate state',()=>{const p=new ContactPresence(()=>1000000,1);p.update(1,'a',1,true,true);assert.throws(()=>p.update(2,'a',1,true),/PRESENCE_CAPACITY/);assert.equal(p.read(1),'away');assert.equal(p.read(2),'not_shared')});

test('rapid alternating online/away cannot bypass presence rate limits or prolong lease',()=>{
  const {p,advance}=fixture();p.update(1,'a',1,true);
  for(let sequence=2;sequence<=7;sequence++)p.update(1,'a',sequence,true,sequence%2===0);
  assert.equal(p.read(1),'online');
  assert.throws(()=>p.update(1,'a',8,true,true),/PRESENCE_RATE/);
  advance(PRESENCE_TTL_MS);assert.equal(p.read(1),'offline');
});
test('Hide always revokes even when rapid mode-change quota is exhausted',()=>{
  const {p}=fixture();p.update(1,'a',1,true);
  for(let sequence=2;sequence<=7;sequence++)p.update(1,'a',sequence,true,sequence%2===0);
  assert.throws(()=>p.update(1,'a',8,true,true),/PRESENCE_RATE/);
  p.update(1,'a',9,false);p.update(1,'a',8,true,true);
  assert.equal(p.read(1),'not_shared');
});
test('normal heartbeat after ten seconds recovers mode change allowance',()=>{
  const {p,advance}=fixture();p.update(1,'a',1,true);
  for(let sequence=2;sequence<=7;sequence++)p.update(1,'a',sequence,true,sequence%2===0);
  advance(10_000);p.update(1,'a',8,true,true);assert.equal(p.read(1),'away');
  p.update(1,'a',9,true,false);assert.equal(p.read(1),'online');
});
test('Hide and re-enable cannot reset mode-toggle quota within the same ten-second window',()=>{
  const {p}=fixture();p.update(1,'a',1,true);
  for(let sequence=2;sequence<=7;sequence++)p.update(1,'a',sequence,true,sequence%2===0);
  p.update(1,'a',8,false);p.update(1,'a',9,true,false);
  assert.throws(()=>p.update(1,'a',10,true,true),/PRESENCE_RATE/);
  assert.equal(p.read(1),'online');
});

test('rapid Hide/re-enable cycles are capped without blocking immediate Hide',()=>{
  const {p}=fixture();p.update(1,'a',1,true);
  for(let sequence=2;sequence<=7;sequence+=2){
    p.update(1,'a',sequence,false);p.update(1,'a',sequence+1,true);
  }
  p.update(1,'a',8,false);assert.equal(p.read(1),'not_shared');
  assert.throws(()=>p.update(1,'a',9,true),/PRESENCE_RATE/);
  p.update(1,'a',10,false);assert.equal(p.read(1),'not_shared');
});
test('legitimate re-enable works after mode window and preserves separate Online-tab precedence',()=>{
  const {p,advance}=fixture();p.update(1,'a',1,true,true);
  for(let sequence=2;sequence<=7;sequence+=2){p.update(1,'a',sequence,false);p.update(1,'a',sequence+1,true,true)}
  p.update(1,'a',8,false);advance(10_000);p.update(1,'a',9,true,true);
  p.update(1,'b',1,true);assert.equal(p.read(1),'online');
  p.update(1,'b',2,false);assert.equal(p.read(1),'away');
});
