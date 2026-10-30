import { expect, it } from 'vitest';
import { ContactPresence, PRESENCE_TTL_MS } from '../api/services/contactPresence';
it('requires an explicit signal, expires online leases and never records last-seen history', () => {
  let now=100_000;const store=new ContactPresence(()=>now);
  expect(store.read(7)).toBe('not_shared');
  store.update(7,'a',1,true);expect(store.read(7)).toBe('online');
  now+=PRESENCE_TTL_MS;expect(store.read(7)).toBe('offline');
  now+=15*60_000;expect(store.read(7)).toBe('not_shared');
});
it('does not let late updates undo Hide or let one tab hide another consenting tab', () => {
  let now=100_000;const store=new ContactPresence(()=>now);
  store.update(7,'a',1,true);store.update(7,'b',1,true);
  store.update(7,'a',2,false);store.update(7,'a',1,true);
  expect(store.read(7)).toBe('online');
  store.update(7,'b',2,false);expect(store.read(7)).toBe('not_shared');
  now+=11_000;store.update(7,'a',3,true);expect(store.read(7)).toBe('online');
});
it('bounds accounts, tabs and heartbeat rate while always allowing opt-out', () => {
  let now=100_000;const store=new ContactPresence(()=>now,1);
  store.update(7,'a',1,true);
  expect(()=>store.update(7,'a',2,true)).toThrow();
  for(const id of ['b','c','d'])store.update(7,id,1,true);
  expect(()=>store.update(7,'e',1,true)).toThrow();
  expect(()=>store.update(8,'a',1,true)).toThrow();
  store.update(7,'a',2,false);
  now+=15*60_000;store.update(8,'a',1,true);expect(store.read(8)).toBe('online');
});
