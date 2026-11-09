import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
for(const file of ['drive-intelligence.ts','DriveIntelligencePanel.tsx','drive-intelligence.css','TripFuel.tsx'])test('Drive parity: '+file,()=>assert.equal(fs.readFileSync('src/features/drive/'+file,'utf8'),fs.readFileSync('app/src/features/drive/'+file,'utf8')));
test('no new public route, network request, tracking or persistent browser store in planner',()=>{
 const s=fs.readFileSync('src/features/drive/DriveIntelligencePanel.tsx','utf8');
 for(const p of [/\bfetch\s*\(/,/localStorage/,/sessionStorage/,/watchPosition\s*\(/,/getCurrentPosition\s*\(/,/sendBeacon\s*\(/,/dangerouslySetInnerHTML/])assert.equal(p.test(s),false);
 assert.ok(s.includes('customer?.session?.user.email'));assert.ok(s.includes('Download compact journey pack'));
});
test('original Drive navigation, guides, stories and maps are still integrated',()=>{
 const s=fs.readFileSync('src/features/drive/LuqiDrivePage.tsx','utf8');
 for(const text of ['<DriveMap','<FieldNotebook','<TripFuel','<DriveVoiceControls','watchPosition','Explore six roadside stories'])assert.ok(s.includes(text),text);
});
