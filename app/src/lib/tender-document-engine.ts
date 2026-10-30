/** Runs in a disposable worker. No network, HTML rendering, model or formula execution. */
import {unzipSync,zipSync,strFromU8,strToU8,Unzlib} from 'fflate';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {PDFDocument,PDFName,PDFDict,PDFArray,PDFRawStream,PDFSignature} from 'pdf-lib';
import {TENDER_FILE_MAX,TENDER_UNPACKED_MAX,TENDER_ENTRY_MAX,TENDER_ENTRY_COUNT_MAX,
  VERIFIED_SBD1,SBD1_FIELDS, type SupplierValues,type TenderDocumentInspection,
  type TenderDocumentRequest,type TenderDocumentResponse} from './tender-document-contract';

function fail(code:string):never{throw new Error(code)}
export async function tenderSha256(bytes:Uint8Array):Promise<string>{
  const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
const xml=(bytes:Uint8Array)=>{
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text))fail('DOCUMENT_UNSAFE');
  if(XMLValidator.validate(text)!==true)fail('DOCUMENT_INVALID');
  return text;
};
const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false,parseAttributeValue:false,
  // DOCTYPE/custom entities are rejected before parsing. Decode standard XML
  // and numeric character references so formula safety checks see actual text.
  trimValues:false,processEntities:true,removeNSPrefix:true,ignoreDeclaration:true});
const array=<T>(x:T|T[]|undefined):T[]=>x===undefined?[]:Array.isArray(x)?x:[x];
function leafText(node:unknown):string{
  if(typeof node==='string'||typeof node==='number')return String(node);
  if(!node||typeof node!=='object')return '';
  return Object.entries(node).filter(([k])=>!k.startsWith('@_')).map(([,v])=>
    Array.isArray(v)?v.map(leafText).join(' '):leafText(v)).join(' ');
}
function xmlTexts(text:string,tag='t'):string[]{
  // Only extract text nodes, never instructions or executable markup.
  const tree=parser.parse(text);
  const out:string[]=[];
  const walk=(n:unknown,depth:number)=>{
    if(depth>64)fail('DOCUMENT_INVALID');
    if(!n||typeof n!=='object')return;
    for(const [k,v]of Object.entries(n)){
      if(k===tag)out.push(...array(v).map(leafText));
      else if(!k.startsWith('@_'))for(const child of array(v))walk(child,depth+1);
    }
  };
  walk(tree,0);return out;
}
/** Validate central AND local ZIP headers before allocating decompression output.
 * ZIP64, encryption, split archives and ambiguous duplicate names fail closed.
 */
export function readTenderArchive(bytes:Uint8Array):Record<string,Uint8Array>{
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length<22||view.getUint32(0,true)!==0x04034b50)fail('FILE_TYPE');
  let end=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){
    if(view.getUint32(p,true)===0x06054b50&&p+22+view.getUint16(p+20,true)===bytes.length){end=p;break;}
  }
  if(end<0)fail('DOCUMENT_INVALID');
  const count=view.getUint16(end+10,true),start=view.getUint32(end+16,true),length=view.getUint32(end+12,true);
  if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||view.getUint16(end+8,true)!==count||
    !count||count>TENDER_ENTRY_COUNT_MAX||start+length!==end)fail('ARCHIVE_LIMIT');
  let p=start,total=0;
  const names=new Set<string>();
  const entries:{name:string;size:number;offset:number;end:number}[]=[];
  for(let i=0;i<count;i++){
    if(p+46>end||view.getUint32(p,true)!==0x02014b50)fail('DOCUMENT_INVALID');
    const flags=view.getUint16(p+8,true),method=view.getUint16(p+10,true);
    const packed=view.getUint32(p+20,true),size=view.getUint32(p+24,true);
    const n=view.getUint16(p+28,true),extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true);
    const offset=view.getUint32(p+42,true);
    if(p+46+n+extra+comment>end||offset+30>start)fail('DOCUMENT_INVALID');
    const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(p+46,p+46+n));
    if(!name||name.length>200||/[\\\x00-\x1f]/.test(name)||name.startsWith('/')||name.includes(':')||
      name.split('/').some(s=>s==='.'||s==='..')||names.has(name.toLowerCase()))fail('DOCUMENT_UNSAFE');
    if(flags&0x2041||![0,8].includes(method)||view.getUint16(p+34,true)||
      ((view.getUint32(p+38,true)>>>16)&0xf000)===0xa000)fail('DOCUMENT_UNSAFE');
    if(size>TENDER_ENTRY_MAX||size>Math.max(1024,packed*150)||(total+=size)>TENDER_UNPACKED_MAX)fail('ARCHIVE_LIMIT');
    if(view.getUint32(offset,true)!==0x04034b50||view.getUint16(offset+6,true)!==flags||
      view.getUint16(offset+8,true)!==method)fail('DOCUMENT_INVALID');
    const localN=view.getUint16(offset+26,true),localExtra=view.getUint16(offset+28,true);
    const dataStart=offset+30+localN+localExtra,dataEnd=dataStart+packed;
    if(dataEnd>start||localN!==n||new TextDecoder().decode(bytes.subarray(offset+30,offset+30+localN))!==name)
      fail('DOCUMENT_INVALID');
    if(!(flags&8)&&(view.getUint32(offset+18,true)!==packed||view.getUint32(offset+22,true)!==size))
      fail('DOCUMENT_INVALID');
    entries.push({name,size,offset,end:dataEnd});names.add(name.toLowerCase());p+=46+n+extra+comment;
  }
  if(p!==end)fail('DOCUMENT_INVALID');
  entries.sort((a,b)=>a.offset-b.offset);
  for(let i=1;i<entries.length;i++)if(entries[i].offset<entries[i-1].end)fail('DOCUMENT_INVALID');
  const files=unzipSync(bytes,{filter:file=>{
    const entry=entries.find(e=>e.name===file.name);
    if(!entry||file.originalSize!==entry.size)fail('DOCUMENT_INVALID');return true;
  }});
  if(Object.keys(files).length!==count)fail('DOCUMENT_INVALID');
  for(const entry of entries)if(files[entry.name]?.length!==entry.size)fail('DOCUMENT_INVALID');
  return files;
}
function validateOffice(files:Record<string,Uint8Array>,kind:'docx'|'xlsx'){
  const main=kind==='docx'?'word/document.xml':'xl/workbook.xml';
  if(!files['[Content_Types].xml']||!files['_rels/.rels']||!files[main])fail('FILE_TYPE');
  const content=xml(files['[Content_Types].xml']);
  const expected=kind==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
    :'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
  if(!content.includes(expected)||/macroEnabled|vbaProject|oleObject|activeX/i.test(content))fail('DOCUMENT_UNSAFE');
  for(const [name,bytes]of Object.entries(files)){
    if(/(?:vba|activeX|embeddings|externalLinks|_xmlsignatures|signatures|connections\.xml|queryTables|macrosheets)|\.(?:exe|dll|js|vbs|bin)$/i.test(name))
      fail('DOCUMENT_UNSAFE');
    if(!/\.(xml|rels)$/i.test(name))continue;
    const text=xml(bytes);
    if(/<(?:\w+:)?(?:altChunk|object|oleObject|attachedTemplate|DDE|externalReference|webPublishItems)\b/i.test(text)||
      /\b(?:DDEAUTO|INCLUDETEXT|INCLUDEPICTURE|MACROBUTTON)\b/i.test(text))fail('DOCUMENT_UNSAFE');
    if(kind==='xlsx'){
      for(const rawFormula of [...xmlTexts(text,'f'),...xmlTexts(text,'definedName')]){
        const formula=rawFormula.replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi,(_,hex,decimal)=>{
          const value=parseInt(hex||decimal,hex?16:10);
          if(value>0x10ffff||value>=0xd800&&value<=0xdfff)fail('DOCUMENT_INVALID');
          return String.fromCodePoint(value);
        });
        // Keep ordinary calculations inert, but do not carry network, command,
        // cloud-code or external-workbook formulas into a downloaded bid pack.
        if(/\b(?:WEBSERVICE|HYPERLINK|RTD|CALL|REGISTER(?:\.ID)?|EXEC|EXECUTE|DDE|SQL\.REQUEST|IMAGE|PY)\s*\(/i.test(formula)||
          /[|]|https?:|file:|\\\\|\[[^\]]+\][^!]*!/i.test(formula))fail('DOCUMENT_UNSAFE');
      }
    }
    if(name.endsWith('.rels')){
      const rels=array(parser.parse(text)?.Relationships?.Relationship);
      for(const rel of rels){
        if(rel['@_TargetMode']==='External'){
          // Static hyperlink only. It is displayed as text and never fetched.
          if(!String(rel['@_Type']).endsWith('/hyperlink')||!/^https?:\/\//i.test(rel['@_Target']||''))fail('DOCUMENT_UNSAFE');
        }
      }
    }
  }
}
function inspectDocx(files:Record<string,Uint8Array>,known:boolean){
  const text=xml(files['word/document.xml']);
  const all=xmlTexts(text);
  const fields=known?SBD1_FIELDS.map(f=>({location:`SBD 1 / table 1 / row ${f.row+1} / cell ${f.cell+1}`,
    label:f.label,value:''})):[];
  return {fields,excerpt:all.join(' ').slice(0,8000),notes:[
    known?'Exact Treasury original matched. Seven supplier contact fields can be filled. All other cells remain unchanged.'
      :'DOCX text inspection only. This exact original has no verified fill mapping.',
    'A Treasury blank template does not establish the requirements of a particular bid. Use the issuer’s required original and addenda.',
  ]};
}
function inspectXlsx(files:Record<string,Uint8Array>){
  const strings=files['xl/sharedStrings.xml']?
    array(parser.parse(xml(files['xl/sharedStrings.xml']))?.sst?.si).map(leafText):[];
  const fields:{location:string;label:string;value:string}[]=[];
  const sheets=Object.entries(files).filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  if(!sheets.length||sheets.length>20)fail('DOCUMENT_INVALID');
  for(const [name,bytes]of sheets){
    const sheet=parser.parse(xml(bytes));
    for(const row of array(sheet?.worksheet?.sheetData?.row))for(const cell of array(row?.c)){
      if(fields.length>=200)break;
      const ref=cell['@_r'];if(!/^[A-Z]{1,3}[1-9]\d{0,6}$/.test(ref||''))fail('DOCUMENT_INVALID');
      const value=cell.f!==undefined?'[Formula retained; not evaluated]':cell['@_t']==='s'?
        strings[Number(cell.v)]??'':cell['@_t']==='inlineStr'?leafText(cell.is):leafText(cell.v);
      if(value)fields.push({location:`${name}!${ref}`,label:ref,value:value.slice(0,300)});
    }
  }
  return {fields,excerpt:'',notes:['XLSX cell text inspection only (first 200 non-empty cells). Formulas are never evaluated. No workbook fill mapping has been verified.']};
}
/** Conservative PDF preflight before the PDF parser can inflate object streams.
 * Only direct FlateDecode streams are accepted. Ambiguous/indirect/chained filters
 * require the applicant's original PDF editor rather than speculative decoding.
 */
function preflightPdf(bytes:Uint8Array){
  const raw=strFromU8(bytes,true);
  const names=(s:string)=>s.replace(/#[a-f0-9]{2}/gi,h=>String.fromCharCode(parseInt(h.slice(1),16)));
  const totalFilters=(names(raw).match(/\/Filter\b/g)||[]).length;
  const streams=/\bstream(?:\r\n|\r|\n)/g;
  let match:RegExpExecArray|null,previousEnd=0,filtersChecked=0,decoded=0;
  while((match=streams.exec(raw))){
    const header=names(raw.slice(previousEnd,match.index));
    if(!/>>\s*$/.test(header))fail('DOCUMENT_INVALID');
    const end=raw.indexOf('endstream',streams.lastIndex);if(end<0)fail('DOCUMENT_INVALID');
    const filterCount=(header.match(/\/Filter\b/g)||[]).length;
    if(filterCount>1||filterCount===1&&!/\/Filter\s*\/FlateDecode\b/.test(header))fail('DOCUMENT_UNSAFE');
    if(filterCount){
      filtersChecked++;
      const inflate=new Unzlib((chunk)=>{decoded+=chunk.length;if(decoded>TENDER_UNPACKED_MAX)fail('ARCHIVE_LIMIT')});
      for(let p=streams.lastIndex;p<end;p+=256)inflate.push(bytes.subarray(p,Math.min(p+256,end)),Math.min(p+256,end)===end);
    }else{decoded+=end-streams.lastIndex;if(decoded>TENDER_UNPACKED_MAX)fail('ARCHIVE_LIMIT');}
    streams.lastIndex=end+9;previousEnd=end+9;
  }
  if(filtersChecked!==totalFilters)fail('DOCUMENT_UNSAFE');
}
async function inspectPdf(bytes:Uint8Array){
  preflightPdf(bytes);
  // Reject actions structurally, including compressed objects and escaped PDF names.
  const doc=await PDFDocument.load(bytes,{updateMetadata:false,throwOnInvalidObject:true});
  if(doc.isEncrypted||doc.getPageCount()>100)fail('DOCUMENT_UNSAFE');
  const forbidden=new Set(['JavaScript','JS','OpenAction','AA','Launch','EmbeddedFiles','EmbeddedFile',
    'Filespec','RichMedia','XFA','URI','SubmitForm','ImportData','GoToR','Encrypt','Sig','ByteRange']);
  const check=(object:unknown,depth=0):void=>{
    if(depth>64)fail('DOCUMENT_UNSAFE');
    if(object instanceof PDFName&&forbidden.has(object.decodeText()))fail('DOCUMENT_UNSAFE');
    if(object instanceof PDFDict)for(const [key,value]of object.entries()){
      if(forbidden.has(key.decodeText()))fail('DOCUMENT_UNSAFE');check(value,depth+1);
    }
    else if(object instanceof PDFArray)for(const value of object.asArray())check(value,depth+1);
    else if(object instanceof PDFRawStream){
      check(object.dict,depth+1);
      // Stream expansion was bounded before PDFDocument.load. No page-content
      // execution, image decoding, OCR or further speculative filters here.
    }
  };
  for(const [,object]of doc.context.enumerateIndirectObjects())check(object);
  const form=doc.getForm();
  if(form.hasXFA())fail('DOCUMENT_UNSAFE');
  const all=form.getFields();if(all.length>200)fail('ARCHIVE_LIMIT');
  if(all.some(f=>f instanceof PDFSignature))fail('DOCUMENT_UNSAFE');
  return {fields:all.map(f=>({location:'PDF AcroForm',label:f.getName().slice(0,160),value:'[Inspect in the original PDF editor]'})),
    excerpt:'',notes:[all.length?'PDF form field names extracted; no verified fill mapping for this original.'
      :'This PDF has no supported interactive fields. Scanned/flat PDF text and OCR are not supported.',
      'PDF inspection only. No signature, declaration or page content is changed.']};
}
export async function inspectTenderDocument(name:string,mime:string,bytes:Uint8Array):Promise<TenderDocumentInspection>{
  if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>TENDER_FILE_MAX)fail('FILE_SIZE');
  const kind=name.toLowerCase().match(/\.(docx|xlsx|pdf)$/)?.[1] as 'docx'|'xlsx'|'pdf'|undefined;
  if(!kind||name.length>200||/[\x00-\x1f/\\]/.test(name))fail('FILE_TYPE');
  const types={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pdf:'application/pdf'};
  if(mime&&mime!=='application/octet-stream'&&mime!==types[kind])fail('FILE_TYPE');
  if(kind==='pdf'&&strFromU8(bytes.subarray(0,5))!=='%PDF-')fail('FILE_TYPE');
  const sha256=await tenderSha256(bytes),known=kind==='docx'&&sha256===VERIFIED_SBD1.sha256;
  let content;
  if(kind==='pdf')content=await inspectPdf(bytes);
  else{const files=readTenderArchive(bytes);validateOffice(files,kind);
    content=kind==='docx'?inspectDocx(files,known):inspectXlsx(files);}
  return {kind,sha256,size:bytes.length,templateId:known?VERIFIED_SBD1.id:null,...content};
}
const escapeXml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export function validateSupplierValues(values:SupplierValues):void{
  if(!values||typeof values!=='object'||Object.keys(values).sort().join('|')!==SBD1_FIELDS.map(f=>f.id).sort().join('|'))fail('SUPPLIER_VALUES');
  for(const field of SBD1_FIELDS){const value=values[field.id];
    if(typeof value!=='string'||value.length>field.max||/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]|\p{Cs}/u.test(value)||
      (field.required&&!value.trim()))fail('SUPPLIER_VALUES');
  }
  if(values.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))fail('SUPPLIER_VALUES');
}
export async function fillVerifiedSbd1(bytes:Uint8Array,values:SupplierValues):Promise<Uint8Array>{
  if(await tenderSha256(bytes)!==VERIFIED_SBD1.sha256)fail('MAPPING_UNVERIFIED');
  validateSupplierValues(values);
  const files=readTenderArchive(bytes);validateOffice(files,'docx');
  const original=xml(files['word/document.xml']);
  let tableIndex=-1,rowIndex=-1;
  // Surgical insertion into existing empty cells. No XML reserialization: all
  // original labels, run/cell formatting, tables, terms and other ZIP parts survive.
  const changed=original.replace(/<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/g,table=>{
    tableIndex++;if(tableIndex!==0)return table;
    return table.replace(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g,row=>{
      rowIndex++;let cellIndex=-1;
      return row.replace(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g,cell=>{
        cellIndex++;const field=SBD1_FIELDS.find(f=>f.row===rowIndex&&f.cell===cellIndex);
        if(!field||!values[field.id])return cell;
        if(xmlTexts(cell).some(s=>s.trim()))fail('MAPPING_UNVERIFIED');
        const run='<w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">'+escapeXml(values[field.id])+'</w:t></w:r>';
        if(!cell.includes('</w:p>'))fail('MAPPING_UNVERIFIED');
        return cell.replace('</w:p>',run+'</w:p>');
      });
    });
  });
  if(rowIndex<22||changed===original)fail('MAPPING_UNVERIFIED');
  files['word/document.xml']=strToU8(changed);
  return zipSync(files,{level:6,mtime:new Date('2026-10-30T00:00:00Z')});
}
export async function processTenderDocument(request:TenderDocumentRequest):Promise<TenderDocumentResponse>{
  try{
    const inspection=await inspectTenderDocument(request.name,request.mime,request.bytes);
    if(request.action==='inspect')return {ok:true,inspection};
    if(request.action!=='fill'||!inspection.templateId)fail('MAPPING_UNVERIFIED');
    return {ok:true,inspection,filled:await fillVerifiedSbd1(request.bytes,request.values)};
  }catch(error){
    const allowed=['FILE_SIZE','FILE_TYPE','ARCHIVE_LIMIT','DOCUMENT_UNSAFE','DOCUMENT_INVALID','MAPPING_UNVERIFIED','SUPPLIER_VALUES'];
    const message=error instanceof Error?error.message:'';
    // Do not log parser exceptions; they may contain private document content.
    return {ok:false,code:allowed.includes(message)?message:'DOCUMENT_INVALID'};
  }
}
