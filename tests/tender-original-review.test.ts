import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8} from 'fflate';
import {EMPTY_SUPPLIER_VALUES} from '../src/lib/tender-document-contract';
import {inspectTenderDocument,fillVerifiedSbd1} from '../src/lib/tender-document-engine';
import {prepareTenderPacket,canExportTenderPacket,emptyOriginalApprovals,ORIGINAL_FORM_GATES,
  validatePacketContext,buildTenderOriginalArchive,appendTenderAudit,sealTenderHistory,type TenderPacketContext} from '../src/lib/tender-document-review';
const now=new Date('2026-10-30T10:00:00+02:00');
const context:TenderPacketContext={reference:'SYNTHETIC-001',issuer:'Synthetic authority for test only',deadline:'2026-11-30T11:00+02:00',
  method:'physical',destination:'Synthetic test bid box',priceZar:'1000.00',principal:'Synthetic authorised applicant'};
const original=new Uint8Array(readFileSync('tests/fixtures/tenders/treasury-revised-sbd1.docx'));
const values={...EMPTY_SUPPLIER_VALUES,bidderName:'Synthetic supplier'};
const all=()=>Object.fromEntries(ORIGINAL_FORM_GATES.map(g=>[g.id,true])) as ReturnType<typeof emptyOriginalApprovals>;
async function prepare(revision=1,change:Partial<TenderPacketContext>={}){
 const inspection=await inspectTenderDocument('original.docx','',original),filled=await fillVerifiedSbd1(original,values);
 const packet=await prepareTenderPacket({inspection,originalName:'original.docx',filled,values,context:{...context,...change},amendments:[],revision},now);
 return {packet,filled,files:[{name:'original.docx',bytes:original},{name:'filled-sbd1-partial.docx',bytes:filled}]};
}
it('requires each of seven approvals and binds review to the exact revision, deadline and 30 minute window',async()=>{
 const {packet}=await prepare();
 expect(canExportTenderPacket(packet,1,emptyOriginalApprovals(),now)).toBe(false);
 for(const g of ORIGINAL_FORM_GATES)expect(canExportTenderPacket(packet,1,{...all(),[g.id]:false},now)).toBe(false);
 expect(canExportTenderPacket(packet,1,all(),now)).toBe(true);
 expect(canExportTenderPacket(packet,2,all(),now)).toBe(false);
 expect(canExportTenderPacket(packet,1,all(),new Date(now.getTime()-1))).toBe(false);
 expect(canExportTenderPacket(packet,1,all(),new Date(now.getTime()+30*60*1000))).toBe(false);
});
it('refuses ambiguous timezones, past deadlines, invalid prices and empty channels',()=>{
 for(const change of [{deadline:'2026-11-30T11:00'},{deadline:'2027-02-30T11:00+02:00'},{deadline:'2026-10-30T09:00+02:00'},
   {priceZar:'0'},{priceZar:'-1'},{priceZar:'1e6'},{priceZar:'NaN'},{method:''},{destination:''}]){
  expect(validatePacketContext({...context,...change} as TenderPacketContext,now).length).toBeGreaterThan(0);
 }
});
it('changes the digest for each material context or file amendment',async()=>{
 const {packet}=await prepare();
 for(const change of [{priceZar:'2000.00'},{deadline:'2026-12-30T11:00+02:00'},{reference:'SYNTHETIC-002'},
  {destination:'Other bid box'},{principal:'Other authorised person'}])expect((await prepare(1,change)).packet.digest).not.toBe(packet.digest);
});
it('checks exact reviewed bytes again and rejects tampering or missing attachments',async()=>{
 const {packet,files}=await prepare();
 await expect(buildTenderOriginalArchive(packet,1,all(),files.slice(1),[],now)).rejects.toThrow('PACKET_CHANGED');
 await expect(buildTenderOriginalArchive(packet,1,all(),[files[0],{name:files[1].name,bytes:new Uint8Array(files[1].bytes.length)}],[],now)).rejects.toThrow('PACKET_CHANGED');
 await expect(buildTenderOriginalArchive({...packet,context:{...packet.context,priceZar:'2.00'}},1,all(),files,[],now)).rejects.toThrow('PACKET_CHANGED');
});
it('exports the filled ORIGINAL plus review and approval history, truthfully marked partial and unsigned',async()=>{
 const {packet,files}=await prepare();
 let history=appendTenderAudit([],1,'import-original',packet.files[0].sha256,now);
 history=appendTenderAudit(history,1,'prepare',packet.digest,now);
 for(const g of ORIGINAL_FORM_GATES)history=appendTenderAudit(history,1,'approve',g.id,now);
 history=appendTenderAudit(history,1,'export',packet.digest,now);
 const zip=unzipSync(await buildTenderOriginalArchive(packet,1,all(),files,history,now));
 expect(zip['original.docx']).toEqual(original);expect(zip['filled-sbd1-partial.docx']).toEqual(files[1].bytes);
 const record=JSON.parse(strFromU8(zip['luqi-review-record.json']));
 expect(record.approval.packetDigest).toBe(packet.digest);expect(record.approval.gates).toHaveLength(7);
 expect(record.legallySigned).toBe(false);expect(record.submissionConnected).toBe(false);
 expect(record.approval.finalSubmissionApproved).toBe(false);expect(record.history.events).toHaveLength(10);
 expect(JSON.stringify(record.history)).not.toContain('Synthetic supplier');
 expect(record.history.identityVerified).toBe(false);
});
it('chains amendment and revocation events without copying private facts into the audit log',async()=>{
 const history=appendTenderAudit(appendTenderAudit([],1,'edit-field','bidderName',now),2,'revoke','release',now);
 const chain=await sealTenderHistory(history);
 expect(chain.events[1].previous).toBe(chain.events[0].hash);
 expect(chain.events[1].hash).toBe(chain.head);
 expect(JSON.stringify(chain)).not.toContain('Synthetic supplier');
});
