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
test('Hide for unknown tab IDs cannot exhaust the four genuine foreground leases',()=>{
  const {p}=fixture();p.update(1,'first',1,true);
  for(const id of ['ghost-1','ghost-2','ghost-3','ghost-4','ghost-5'])p.update(1,id,1,false);
  p.update(1,'second',1,true);p.update(1,'third',1,true);p.update(1,'fourth',1,true);
  assert.equal(p.read(1),'online');
  assert.throws(()=>p.update(1,'fifth',1,true),/PRESENCE_CAPACITY/);
});
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

test('fresh tab accepted after four legitimate Hides with old sequences still fenced',()=>{
  const {p}=fixture();
  for(let i=0;i<4;i++){p.update(7,`old-${i}`,1,true);p.update(7,`old-${i}`,2,false)}
  assert.equal(p.read(7),'not_shared');p.update(7,'fresh',1,true);
  p.update(7,'old-0',1,true);assert.equal(p.read(7),'online');
});
test('retained inactive sessions do not permit a fifth live tab or stale reactivation',()=>{
  const {p}=fixture();
  for(let i=0;i<4;i++){p.update(7,`old-${i}`,1,true);p.update(7,`old-${i}`,2,false)}
  for(let i=0;i<4;i++)p.update(7,`fresh-${i}`,1,true);
  assert.throws(()=>p.update(7,'fifth',1,true),/PRESENCE_CAPACITY/);
  assert.throws(()=>p.update(7,'old-0',3,true),/PRESENCE_CAPACITY/);
});
test('expired prior tabs do not prevent a new foreground lease',()=>{
  const {p,advance}=fixture();
  for(let i=0;i<4;i++)p.update(7,`old-${i}`,1,true);
  advance(PRESENCE_TTL_MS);p.update(7,'fresh',1,true);
  assert.equal(p.read(7),'online');
});
test('retained tombstone memory remains bounded to sixteen per account',()=>{
  const {p}=fixture();
  for(let i=0;i<16;i++){p.update(7,`old-${i}`,1,true);p.update(7,`old-${i}`,2,false)}
  assert.throws(()=>p.update(7,'fresh',1,true),/PRESENCE_CAPACITY/);
  assert.equal(p.read(7),'not_shared');
});

test('repeated Hide cannot prolong tombstone capacity lockout beyond retention',()=>{
  const {p,advance}=fixture();
  for(let i=0;i<16;i++){p.update(7,`old-${i}`,1,true);p.update(7,`old-${i}`,2,false)}
  advance(14*60_000);
  for(let i=0;i<16;i++){p.update(7,`old-${i}`,3,false);p.update(7,`old-${i}`,2,true)}
  assert.equal(p.read(7),'not_shared');
  advance(2*60_000);
  p.update(7,'replacement',1,true);
  assert.equal(p.read(7),'online');
});
test('newer repeated Hide sequence keeps older queued heartbeat revoked',()=>{
  const {p}=fixture();
  p.update(7,'a',1,true);p.update(7,'a',2,false);
  p.update(7,'a',4,false);p.update(7,'a',3,true,true);
  assert.equal(p.read(7),'not_shared');
});

test('backward clock adjustment cannot resurrect expired Online',()=>{
  let now=1_000_000;const p=new ContactPresence(()=>now);
  p.update(7,'rollback-online',1,true);now+=PRESENCE_TTL_MS;
  assert.equal(p.read(7),'offline');now-=PRESENCE_TTL_MS+5_000;
  assert.equal(p.read(7),'offline');
});
test('backward clock adjustment cannot resurrect expired Away',()=>{
  let now=1_000_000;const p=new ContactPresence(()=>now);
  p.update(7,'rollback-away',1,true,true);now+=PRESENCE_TTL_MS;
  assert.equal(p.read(7),'offline');now-=PRESENCE_TTL_MS+5_000;
  assert.equal(p.read(7),'offline');
});
test('invalid clock cannot publish an unverified status',()=>{
  const p=new ContactPresence(()=>Number.NaN);
  assert.throws(()=>p.update(7,'bad-clock',1,true),/PRESENCE_CLOCK/);
  assert.throws(()=>p.read(7),/PRESENCE_CLOCK/);
});
