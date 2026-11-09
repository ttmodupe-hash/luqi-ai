/** Local, deliberately bounded preflight; no DNS resolution or publication. */
export const EMAIL_STANDARDS = [
  {name:'SPF · RFC 7208',url:'https://www.rfc-editor.org/rfc/rfc7208.html'},
  {name:'DKIM · RFC 6376',url:'https://www.rfc-editor.org/rfc/rfc6376.html'},
  {name:'Ed25519 DKIM · RFC 8463',url:'https://www.rfc-editor.org/rfc/rfc8463.html'},
  {name:'DMARC · RFC 9989 (2026)',url:'https://www.rfc-editor.org/rfc/rfc9989.html'},
] as const;
export interface EmailInput { domain:string; records:{name:string;content:string}[]; includeDomain:string; selector:string; keyType:'rsa'|'ed25519'; publicKey:string; policy:'none'|'quarantine'|'reject' }
export interface EmailPreflight {domain:string;beforeSpf:string|null;afterSpf:string|null;spfAction:'create'|'update'|'no-change'|'held';minimumDnsTerms:number;unresolved:string[];issues:string[];warnings:string[];dkimRecord:{name:string;content:string}|null;dmarcRecord:{name:string;content:string}|null;keyBits:number|null}
export function dnsName(input:string, underscored=false):string|null {
  if(typeof input!=='string')return null;const value=input.trim().replace(/\.$/,'').toLowerCase();
  if(value.length>253||!value.includes('.')||/[^a-z0-9_.-]/.test(value))return null;
  const valid=underscored?/^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/:/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  return value.split('.').every(label=>valid.test(label))?value:null;
}
function validIp(value:string, family:4|6):boolean {
  const pieces=value.split('/');if(pieces.length>2)return false;
  if(pieces.length===2&&(!/^\d{1,3}$/.test(pieces[1])||Number(pieces[1])>(family===4?32:128)))return false;
  if(family===4)return pieces[0].split('.').length===4&&pieces[0].split('.').every(part=>/^(?:0|[1-9]\d{0,2})$/.test(part)&&Number(part)<=255);
  if(!/^[a-f0-9:.]+$/i.test(pieces[0])||!pieces[0].includes(':'))return false;
  try{return new URL('http://['+pieces[0]+']/').hostname.startsWith('[');}catch{return false;}
}

export async function emailPreflight(input:EmailInput):Promise<EmailPreflight> {
  const domain=dnsName(input.domain);
  const result:EmailPreflight={domain:domain??'',beforeSpf:null,afterSpf:null,spfAction:'held',minimumDnsTerms:0,unresolved:[],issues:[],warnings:[],dkimRecord:null,dmarcRecord:null,keyBits:null};
  const fail=(message:string)=>result.issues.push(message);
  if(!domain){fail('Enter a valid ASCII or punycode domain name.');return result;}
  if(!Array.isArray(input.records)||input.records.length>20||input.records.some(record=>typeof record.name!=='string'||typeof record.content!=='string'||record.content.length>4096||/[\r\n\0]/.test(record.content))){fail('Use at most 20 single-line TXT values, each at most 4096 characters.');return result;}
  if(input.records.some(record=>!dnsName(record.name))){fail('Each supplied TXT value needs its exact domain owner.');return result;}
  if(input.records.some(record=>/^"/.test(record.content.trim())&&/v=spf1/i.test(record.content))){fail('Paste the complete SPF value without zone-file quotes or split TXT chunks.');return result;}
  const records=input.records.filter(record=>dnsName(record.name)===domain&&/^v=spf1(?:\s|$)/i.test(record.content.trim()));
  if(records.length>1)fail('Multiple SPF records exist in the supplied values for this domain. Resolve them before proposing an update.');
  const provider=dnsName(input.includeDomain,true);
  if(!provider)fail('Enter the include domain confirmed by your mail provider.');
  const original=records[0]?.content.trim()??'v=spf1 ~all';result.beforeSpf=records[0]?.content.trim()??null;
  const tokens=original.split(/\s+/).slice(1);
  if(tokens.length>80)fail('SPF record exceeds this preflight’s 80-term limit.');
  const terms=tokens.map(token=>({token,body:token.replace(/^[+?~-]/,'').toLowerCase()}));
  let allIndex=-1, hasInclude=false;
  const unresolved=new Set<string>();
  for(let i=0;i<terms.length&&i<81;i++){
    const {token,body}=terms[i];
    if(body.includes('=')&&/^[+?~-]/.test(token))fail('SPF modifiers cannot have mechanism qualifiers.');
    if(body==='all'){
      if(allIndex!==-1)fail('More than one all mechanism needs manual review.');allIndex=i;
      if(token[0]==='+'||token.toLowerCase()==='all')fail('An all-pass SPF policy needs explicit security review; no replacement is generated.');
      continue;
    }
    if(allIndex!==-1&&!body.startsWith('exp='))fail('A mechanism after all is unreachable. Review the supplied policy first.');
    if(body.startsWith('include:')){
      result.minimumDnsTerms++;const target=dnsName(body.slice(8),true);
      if(!target)fail('An include domain is invalid or uses unsupported macros.');else unresolved.add(target);
      if(target===provider&&(!/^[?~-]/.test(token)))hasInclude=true;
    }else if(body.startsWith('ip4:')||body.startsWith('ip6:')){
      if(!validIp(body.slice(4),body.startsWith('ip4:')?4:6))fail('An IP mechanism has an invalid address or prefix.');
    }else if(/^(a|mx|ptr)(?=[:/]|$)/.test(body)||body.startsWith('exists:')){
      result.minimumDnsTerms++;unresolved.add(body);
      // Complex domain-specs, macro expansion and MX/void limits need DNS evaluation.
      if(/[%{}]/.test(body))fail('SPF macros require a full DNS-aware evaluator.');
      if(body.startsWith('exists:')){if(!dnsName(body.slice(7),true))fail('An exists domain is invalid or unsupported.');}
      else {
        const match=body.match(/^(a|mx|ptr)(?::([^/]+))?(?:\/(\d{1,3}))?(?:\/\/(\d{1,3}))?$/);
        if(!match||(match[2]&&!dnsName(match[2],true))||(match[3]&&Number(match[3])>32)||(match[4]&&Number(match[4])>128)||(match[1]==='ptr'&&(match[3]||match[4])))fail('A DNS mechanism has an invalid domain or prefix.');
      }
      if(body.startsWith('ptr'))result.warnings.push('The supplied ptr mechanism needs careful provider review.');
    }else if(body.startsWith('redirect=')){
      result.minimumDnsTerms++;unresolved.add(body.slice(9));fail('This policy uses redirect. A provider must review its delegation before a merged record is generated.');
    }else if(body.startsWith('exp=')){
      if(!dnsName(body.slice(4),true)||terms.filter(item=>item.body.startsWith('exp=')).length>1)fail('An explanation modifier is invalid or duplicated.');
      result.warnings.push('The exp domain is not evaluated by this local preflight.');
    }
    else fail('An SPF term is unsupported by this bounded preflight: '+token.slice(0,60));
  }
  if(provider&&!hasInclude){result.minimumDnsTerms++;unresolved.add(provider);}
  result.unresolved=[...unresolved];
  if(result.minimumDnsTerms>10)fail('The visible DNS-querying terms already exceed ten. Nested lookups can add more.');
  if(result.unresolved.length)result.warnings.push('Nested includes, DNS answers, MX expansion and void lookups are unverified. This is a minimum count, not an RFC compliance verdict.');
  if(!result.issues.length&&provider){
    const next=[...tokens];if(!hasInclude)next.splice(allIndex<0?next.length:allIndex,0,'include:'+provider);
    if(allIndex<0){next.push('~all');result.warnings.push('No all mechanism was supplied. The proposal adds a soft-fail terminator for owner review.');}
    result.afterSpf='v=spf1 '+next.join(' ');
    result.spfAction=!records.length?'create':hasInclude?'no-change':'update';
  }
  if(typeof input.selector!=='string'||!/^[a-z0-9][a-z0-9_-]{0,62}$/i.test(input.selector)||`${input.selector}._domainkey.${domain}`.length>253)fail('Use a valid DKIM selector of up to 63 characters.');
  else if(!['rsa','ed25519'].includes(input.keyType))fail('Choose a supported public-key type.');
  else if(!input.publicKey.trim())fail('Add the mail provider’s public DKIM key to check its structure.');
  else {
    try{
      if(input.publicKey.length>8192||/PRIVATE KEY|PASSWORD|API[_ -]?KEY/i.test(input.publicKey))throw new Error('Private input');
      const encoded=input.publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g,'');
      if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)||!encoded)throw new Error('Invalid encoding');
      const bytes=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
      if(input.keyType==='ed25519'){
        if(bytes.length!==32)throw new Error('Invalid key length');
        await crypto.subtle.importKey('raw',bytes,'Ed25519',false,['verify']);result.keyBits=256;
      }else{
        const key=await crypto.subtle.importKey('spki',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
        const bits=(key.algorithm as RsaHashedKeyAlgorithm).modulusLength;if(bits<2048||bits>8192)throw new Error('Unsupported RSA size');result.keyBits=bits;
      }
      result.dkimRecord={name:`${input.selector}._domainkey.${domain}`,content:`v=DKIM1; k=${input.keyType}; p=${encoded}`};
      result.warnings.push('Public-key structure was checked locally. Domain control, DNS publication, matching private keys and signed mail were not verified.');
    }catch{fail('DKIM key structure could not be verified. Use the provider’s base64 public key: RSA SPKI (2048+ bits), or a 32-byte Ed25519 key. Never enter private keys.');}
  }
  if(['none','quarantine','reject'].includes(input.policy)){
    result.dmarcRecord={name:`_dmarc.${domain}`,content:`v=DMARC1; p=${input.policy}; adkim=r; aspf=r`};
    if(input.policy!=='none')result.warnings.push('Enforcement can affect legitimate mail. Confirm every sending service and alignment before publishing this policy.');
  }else fail('Choose a valid DMARC policy.');
  result.warnings.push('Records are proposals from your supplied values. No DNS query, mail send, Cloudflare write or payment/KYC action took place.');
  return result;
}
