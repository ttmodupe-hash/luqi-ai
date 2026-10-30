import {SBD1_FIELDS,VERIFIED_SBD1,type SupplierValues,type TenderDocumentInspection} from './tender-document-contract';
export interface TenderPacketContext {
  reference:string;issuer:string;deadline:string;method:''|'physical'|'portal'|'email';
  destination:string;priceZar:string;principal:string;
}
export const EMPTY_PACKET_CONTEXT:TenderPacketContext={reference:'',issuer:'',deadline:'',method:'',destination:'',priceZar:'',principal:''};
export const ORIGINAL_FORM_GATES=[
  {id:'originals',label:'I checked the issuer’s required originals, all addenda and whether this Treasury template is permitted'},
  {id:'eligibility',label:'I checked mandatory eligibility, briefing attendance and the supporting evidence required for this bid'},
  {id:'facts',label:'I personally verified every supplier fact entered here; unknown information remains blank'},
  {id:'price',label:'I set and reviewed the actual offer and tax treatment; Luqi has not calculated or filled a pricing schedule'},
  {id:'signing',label:'I understand declarations, signatures, authority evidence and other unmapped fields still need my completion on the issuer documents'},
  {id:'channel',label:'I confirmed the exact tender reference, deadline, attachments and issuer-prescribed submission channel'},
  {id:'release',label:'As the applicant or authorised representative, I approve this exact partial-form export for my manual completion'},
] as const;
export type OriginalFormGate=typeof ORIGINAL_FORM_GATES[number]['id'];
export type OriginalFormApprovals=Record<OriginalFormGate,boolean>;
export const emptyOriginalApprovals=():OriginalFormApprovals=>({originals:false,eligibility:false,facts:false,price:false,signing:false,channel:false,release:false});
export interface TenderAuditEvent {
  sequence:number;at:string;revision:number;action:'import-original'|'add-amendment'|'remove-amendment'|'edit-field'|'edit-context'|'prepare'|'approve'|'revoke'|'export';
  /** Field identifier, document hash, or approval identifier only; never field values. */
  subject:string;
}
export interface TenderPacketFile {name:string;sha256:string;size:number;role:'original'|'filled-partial'|'amendment'}
export interface PreparedTenderPacket {
  format:'luqi.tender.partial-original.v1'; revision:number;preparedAt:string;digest:string;
  template:{id:string;mappingVersion:number;officialSource:string;sourceCheckedOn:string};
  context:TenderPacketContext;
  files:TenderPacketFile[];
  enteredFieldIds:string[];
  status:'partial-form-for-manual-completion';submissionConnected:false;legallySigned:false;
}
const encoder=new TextEncoder();
export async function tenderDigest(value:Uint8Array|string):Promise<string>{
  const hash=await crypto.subtle.digest('SHA-256',typeof value==='string'?encoder.encode(value):new Uint8Array(value));
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export function validatePacketContext(context:TenderPacketContext,now=new Date()):string[]{
  const missing:string[]=[];
  for(const [key,label]of [['reference','Tender reference'],['issuer','Procuring authority'],['destination','Exact bid box, official portal or prescribed email'],['principal','Applicant or authorised representative']] as const){
    const s=context[key];
    if(typeof s!=='string'||!s.trim()||s.length>240||/[\x00-\x1f\u202a-\u202e\u2066-\u2069]/.test(s))missing.push(label);
  }
  // Explicit timezone only. A device's local timezone must never silently change a deadline.
  if(typeof context.deadline!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(context.deadline)||
    !Number.isFinite(Date.parse(context.deadline))||Date.parse(context.deadline)<=now.getTime()||
    new Date(context.deadline.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==context.deadline.slice(0,10))missing.push('Future closing time with explicit timezone (for South Africa use +02:00)');
  if(!['physical','portal','email'].includes(context.method))missing.push('Issuer-prescribed submission method');
  if(!/^\d{1,12}(?:\.\d{1,2})?$/.test(context.priceZar)||Number(context.priceZar)<=0)missing.push('Applicant-entered positive offer amount in ZAR');
  return missing;
}
export function appendTenderAudit(history:readonly TenderAuditEvent[],revision:number,action:TenderAuditEvent['action'],subject:string,now=new Date()):TenderAuditEvent[]{
  // Bound local history; stop new edits if full rather than silently deleting approval evidence.
  if(history.length>=1000)throw new Error('HISTORY_FULL');
  if(!/^[a-zA-Z0-9:._-]{1,160}$/.test(subject))throw new Error('INVALID_AUDIT_SUBJECT');
  // Consecutive keystrokes in one field form one edit event. An intervening
  // approval, export, addendum or different field always starts a new event.
  const last=history.at(-1);
  if((action==='edit-field'||action==='edit-context')&&last?.action===action&&last.subject===subject)
    return [...history.slice(0,-1),{...last,revision,at:now.toISOString()}];
  return [...history,{sequence:history.length+1,at:now.toISOString(),revision,action,subject}];
}
export async function prepareTenderPacket(input:{inspection:TenderDocumentInspection;originalName:string;filled:Uint8Array;
  values:SupplierValues;amendments:TenderPacketFile[];context:TenderPacketContext;revision:number},now=new Date()):Promise<PreparedTenderPacket>{
  if(input.inspection.templateId!==VERIFIED_SBD1.id||input.inspection.sha256!==VERIFIED_SBD1.sha256)throw new Error('MAPPING_UNVERIFIED');
  if(validatePacketContext(input.context,now).length)throw new Error('PACKET_CONTEXT');
  if(input.amendments.length>6||input.amendments.some(f=>f.role!=='amendment'||!/^[a-f0-9]{64}$/.test(f.sha256)))throw new Error('PACKET_CONTEXT');
  const context:TenderPacketContext={reference:input.context.reference,issuer:input.context.issuer,deadline:input.context.deadline,
    method:input.context.method,destination:input.context.destination,priceZar:input.context.priceZar,principal:input.context.principal};
  const packet={format:'luqi.tender.partial-original.v1' as const,revision:input.revision,preparedAt:now.toISOString(),
    template:{id:VERIFIED_SBD1.id,mappingVersion:VERIFIED_SBD1.mappingVersion,officialSource:VERIFIED_SBD1.source,sourceCheckedOn:VERIFIED_SBD1.checkedOn},
    context,files:[
      {name:'original.docx',sha256:input.inspection.sha256,size:input.inspection.size,role:'original' as const},
      {name:'filled-sbd1-partial.docx',sha256:await tenderDigest(input.filled),size:input.filled.length,role:'filled-partial' as const},
      ...input.amendments.map(f=>({...f})),
    ],enteredFieldIds:SBD1_FIELDS.filter(f=>input.values[f.id]).map(f=>f.id),
    status:'partial-form-for-manual-completion' as const,submissionConnected:false as const,legallySigned:false as const};
  return {...packet,digest:await tenderDigest(JSON.stringify(packet))};
}
export function canExportTenderPacket(packet:PreparedTenderPacket|null,revision:number,gates:OriginalFormApprovals,now=new Date()):boolean{
  return !!packet&&packet.revision===revision&&Number.isFinite(Date.parse(packet.preparedAt))&&
    now.getTime()>=Date.parse(packet.preparedAt)&&now.getTime()-Date.parse(packet.preparedAt)<30*60*1000&&
    validatePacketContext(packet.context,now).length===0&&ORIGINAL_FORM_GATES.every(g=>gates[g.id]===true);
}
export async function sealTenderHistory(history:readonly TenderAuditEvent[]){
  let previous='0'.repeat(64);
  const sealed=[];
  for(const event of history){
    const record={...event,previous};const hash=await tenderDigest(JSON.stringify(record));
    sealed.push({...record,hash});previous=hash;
  }
  return {events:sealed,head:previous,identityVerified:false,scope:'local-applicant-review-record'};
}
/** Export bytes are checked again against the exact reviewed packet. No outbound adapter exists. */
export async function buildTenderOriginalArchive(packet:PreparedTenderPacket,revision:number,gates:OriginalFormApprovals,
  files:{name:string;bytes:Uint8Array}[],history:readonly TenderAuditEvent[],now=new Date()):Promise<Uint8Array>{
  if(!canExportTenderPacket(packet,revision,gates,now))throw new Error('APPROVAL_REQUIRED');
  const {digest,...body}=packet;
  if(await tenderDigest(JSON.stringify(body))!==digest||files.length!==packet.files.length)throw new Error('PACKET_CHANGED');
  for(const item of packet.files){
    const matching=files.filter(f=>f.name===item.name);
    if(matching.length!==1||matching[0].bytes.length!==item.size||await tenderDigest(matching[0].bytes)!==item.sha256)throw new Error('PACKET_CHANGED');
  }
  const {zipSync,strToU8}=await import('fflate');
  const historySeal=await sealTenderHistory(history);
  const manifest={...packet,approval:{at:now.toISOString(),packetDigest:digest,revision,
    gates:ORIGINAL_FORM_GATES.map(g=>({id:g.id,text:g.label,approved:gates[g.id]})),
    legallyBindingSignature:false,finalSubmissionApproved:false},history:historySeal};
  const archive:Record<string,Uint8Array>={};
  for(const file of files){
    if(!/^(?:original\.docx|filled-sbd1-partial\.docx|amendment-[1-6]\.(?:pdf|docx|xlsx))$/.test(file.name))throw new Error('PACKET_CHANGED');
    archive[file.name]=file.bytes;
  }
  archive['luqi-review-record.json']=strToU8(JSON.stringify(manifest,null,2));
  archive['READ-ME.txt']=strToU8([
    'Luqi partial original form export',
    'Only the listed supplier contact fields were filled on a hash-verified Treasury SBD 1 original.',
    'This is NOT a complete bid, legal signature, final submission authorisation or verified issuer acceptance.',
    'Complete all remaining issuer fields, declarations, pricing schedules, signatures and attachments yourself.',
    'Check the actual issuer originals, addenda, eligibility, deadline and prescribed channel again before submitting.',
    'No document has been sent to any procuring authority. No submission adapter is enabled.',
    'The JSON record includes private context you entered. Keep this archive private.',
    'The hash chain records this local session; it does not independently verify identity, facts or legal authority.',
    'Any manual change after export requires a fresh review of the exact final documents.',
  ].join('\n'));
  return zipSync(archive,{level:6});
}
