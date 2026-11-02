import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { moonSnapshot, nextMoonEvents, parseMoonLocation, validMoonLocation, phaseName,
  compassDirection, illuminatedPath } from '../src/lib/moon-tracker.mjs';
const at = new Date('2026-11-01T20:00:00Z');
const place = { latitude: -26.2, longitude: 28.04 };
const references = JSON.parse(readFileSync(new URL('./moon-reference.json', import.meta.url), 'utf8'));
for (const r of references.samples) test(`independent numerical reference ${r.at} ${r.latitude},${r.longitude}`, () => {
  const value = moonSnapshot(new Date(r.at), r);
  assert.ok(Math.abs((value.local.azimuth-r.azimuth+540)%360-180)<0.1, 'true-north azimuth');
  assert.ok(Math.abs(value.local.altitude-r.altitude)<0.6, 'approximate refraction model, including below horizon');
  assert.ok(Math.abs(value.fraction-r.fraction)<0.001, 'illuminated fraction');
  assert.ok(Math.abs(value.distanceKm-r.distanceKm)<250, 'geocentric distance');
  const events = nextMoonEvents(new Date(r.at), r);
  for(const kind of ['rise','set']) if(r[kind]) {
    assert.ok(events[kind]);
    assert.ok(Math.abs(Date.parse(events[kind])-Date.parse(r[kind]))<5*60000, `${kind} within five minutes of reference`);
  }
});
test('phase requires no location and does not invent one', () => {
  const value = moonSnapshot(at);
  assert.equal(value.local, null); assert.ok(value.fraction>=0 && value.fraction<=1);
});
test('same instant is independent of timezone notation', () => {
  assert.deepEqual(moonSnapshot(at,place),moonSnapshot(new Date('2026-11-01T22:00:00+02:00'),place));
});
test('phase is global; direction and tilt change with location', () => {
  const south=moonSnapshot(at,place),north=moonSnapshot(at,{latitude:26.2,longitude:28.04});
  assert.equal(south.fraction,north.fraction);assert.notEqual(south.local.altitude,north.local.altitude);
  assert.notEqual(south.rotation,north.rotation);
});
test('refresh really calculates a new astronomical state', () => {
  const next=moonSnapshot(new Date(at.valueOf()+60000),place);
  assert.notEqual(next.local.azimuth,moonSnapshot(at,place).local.azimuth);
  assert.notEqual(next.at,moonSnapshot(at).at);
});
test('event window crosses midnight and includes dates', () => {
  const events=nextMoonEvents(at,place);
  for(const iso of Object.values(events)) {assert.ok(iso);assert.ok(Date.parse(iso)>at.valueOf());assert.ok(Date.parse(iso)<=at.valueOf()+48*3600000);}
  assert.match(events.set,/2026-11-02/);
});
test('poles never manufacture Invalid Date or always-up promises', () => {
  for(const latitude of [-90,90]) {
    const events=nextMoonEvents(at,{latitude,longitude:0});
    assert.deepEqual(Object.keys(events),['rise','set']);
    for(const value of Object.values(events)) assert.ok(value===null || Number.isFinite(Date.parse(value)));
  }
});
test('manual locations accept valid boundaries and reject coercion', () => {
  assert.deepEqual(parseMoonLocation(' -26.2 ','28.04'),place);
  assert.deepEqual(parseMoonLocation('0','0'),{latitude:0,longitude:0});
  assert.deepEqual(parseMoonLocation('-90','180'),{latitude:-90,longitude:180});
  for(const pair of [['','28'],['  ','0'],['91','0'],['0','181'],['0x10','0'],['1e1','0'],['Infinity','0'],['NaN','0'],['<script>','0']]) assert.equal(parseMoonLocation(...pair),null);
  assert.equal(validMoonLocation({latitude:'-26.2',longitude:28}),false);
  assert.equal(validMoonLocation(null),false);
});
test('invalid dates and coordinates fail closed', () => {
  for(const date of [new Date(NaN),new Date('1899-12-31Z'),new Date('2101-01-01Z'),'today']) assert.throws(()=>moonSnapshot(date));
  for(const v of [{latitude:NaN,longitude:0},{latitude:90.1,longitude:0},{latitude:0,longitude:-181}]) assert.throws(()=>moonSnapshot(at,v));
});
test('phase labels and north-based compass handle wraparound', () => {
  assert.equal(phaseName(0),'Near new moon');assert.equal(phaseName(.5),'Near full moon');
  assert.equal(phaseName(.25),'Near first quarter');assert.equal(phaseName(.75),'Near last quarter');
  assert.deepEqual([0,90,180,270,360,-90].map(compassDirection),['N','E','S','W','N','W']);
});
test('phase silhouette area matches computed illumination', () => {
  const area=f=>{const p=[...illuminatedPath(f).matchAll(/[ML]([\d.]+),([\d.]+)/g)].map(m=>[+m[1],+m[2]]);return Math.abs(p.reduce((sum,[x,y],i)=>{const n=p[(i+1)%p.length];return sum+x*n[1]-y*n[0];},0))/2;};
  const full=area(1);
  for(const f of [0,.1,.25,.5,.75,.9,1]) assert.ok(Math.abs(area(f)/full-f)<.001);
  for(const f of [NaN,Infinity,-.1,1.1]) assert.throws(()=>illuminatedPath(f));
});
test('panel source contains no calls that transmit or persist location', () => {
  const code=['MoonNowPanel.tsx','MoonNowContent.tsx'].map(file=>readFileSync(new URL('../src/components/'+file,import.meta.url),'utf8')).join('\n');
  assert.doesNotMatch(code,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|watchPosition)\b/);
  assert.match(code,/getCurrentPosition/);assert.match(code,/enableHighAccuracy: false/);
  assert.match(code,/requestGeneration/);assert.match(code,/visibilitychange/);
});
test('both frontends contain the same panel and homepage integration', () => {
  for(const file of ['pages/Home.tsx','components/MoonNowPanel.tsx','components/MoonNowContent.tsx','components/moon-now.css','lib/moon-tracker.mjs','lib/moon-tracker.d.mts']) {
    assert.equal(readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),readFileSync(new URL('../app/src/'+file,import.meta.url),'utf8'));
  }
  assert.match(readFileSync(new URL('../src/pages/Home.tsx',import.meta.url),'utf8'),/<MoonNowPanel\s*\/>/);
});
test('homepage entry defers the calculations but renders without user activation', () => {
  const code=readFileSync(new URL('../src/components/MoonNowPanel.tsx',import.meta.url),'utf8');
  assert.match(code,/import\('\.\/MoonNowContent'\)/);
  assert.doesNotMatch(code,/from\s+['"].*(?:moon-tracker|MoonNowContent)/);
  assert.match(code,/<Panel\s*\/>/);
  assert.match(code,/MoonErrorBoundary/);assert.match(code,/Suspense/);
});
