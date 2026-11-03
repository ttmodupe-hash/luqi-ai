import test from 'node:test';
import assert from 'node:assert/strict';
import { ContactPresence, PRESENCE_TTL_MS } from '../api/services/contactPresence.ts';
function fixture(capacity=5000) { let now=100000;return {store:new ContactPresence(()=>now,capacity),advance:ms=>{now+=ms;}}; }
test('default is hidden, not offline or away',()=>{assert.equal(fixture().store.read(1),'not_shared');});
test('legacy heartbeat remains online',()=>{const {store}=fixture();store.update(1,'a',1,true);assert.equal(store.read(1),'online');});
test('explicit away is a distinct live state',()=>{const {store}=fixture();store.update(1,'a',1,true,'away');assert.equal(store.read(1),'away');});
test('away expires to offline exactly at the lease limit',()=>{const {store,advance}=fixture();store.update(1,'a',1,true,'away');advance(PRESENCE_TTL_MS-1);assert.equal(store.read(1),'away');advance(1);assert.equal(store.read(1),'offline');});
test('expired evidence is eventually removed, not kept as history',()=>{const {store,advance}=fixture();store.update(1,'a',1,true,'away');advance(15*60000);assert.equal(store.read(1),'not_shared');});
test('online tab wins over live away tab',()=>{const {store}=fixture();store.update(1,'a',1,true,'away');store.update(1,'b',1,true);assert.equal(store.read(1),'online');});
test('expired online tab does not override live away',()=>{const {store,advance}=fixture();store.update(1,'a',1,true);advance(20000);store.update(1,'b',1,true,'away');advance(55000);assert.equal(store.read(1),'away');});
test('hiding one tab preserves another consenting away tab',()=>{const {store}=fixture();store.update(1,'a',1,true);store.update(1,'b',1,true,'away');store.update(1,'a',2,false);assert.equal(store.read(1),'away');});
test('reordered away cannot undo hide',()=>{const {store}=fixture();store.update(1,'a',1,true);store.update(1,'a',3,false);store.update(1,'a',2,true,'away');assert.equal(store.read(1),'not_shared');});
test('duplicate sequence cannot change availability',()=>{const {store,advance}=fixture();store.update(1,'a',1,true,'away');advance(10000);store.update(1,'a',1,true,'online');assert.equal(store.read(1),'away');});
test('status switches preserve the ten-second rate limit',()=>{const {store,advance}=fixture();store.update(1,'a',1,true);assert.throws(()=>store.update(1,'a',2,true,'away'),/PRESENCE_RATE/);advance(10000);store.update(1,'a',2,true,'away');assert.equal(store.read(1),'away');});
test('away cannot bypass account or tab capacity',()=>{const {store}=fixture(1);for(const id of ['a','b','c','d'])store.update(1,id,1,true,'away');assert.throws(()=>store.update(1,'e',1,true,'away'),/PRESENCE_CAPACITY/);assert.throws(()=>store.update(2,'a',1,true,'away'),/PRESENCE_CAPACITY/);});
test('unknown modes fail closed without creating a signal',()=>{const {store}=fixture();for(const v of ['offline','hidden','busy','',null,{}])assert.throws(()=>store.update(1,'a',1,true,v),/PRESENCE_INPUT/);assert.equal(store.read(1),'not_shared');});
test('returning online is explicit, never inferred from login',()=>{const {store,advance}=fixture();store.update(1,'a',1,true,'away');advance(10000);store.update(1,'a',2,true,'online');assert.equal(store.read(1),'online');assert.equal(store.read(2),'not_shared');});
