/** Private, explicitly invoked acceptance. Synthetic account only, never a public business. */
import mysql,{type RowDataPacket,type ResultSetHeader}from'mysql2/promise';
import{randomUUID,randomBytes}from'node:crypto';
import{businessOperatorSettings}from'./prepareBusinessStorage';
import{businessOwned,type BusinessDraft}from'../contracts/business-connect';
export const BUSINESS_ACCEPTANCE_INTENT='private-business-smoke-v1';
async function bounded(request:typeof fetch,url:string,init:RequestInit={}){
 const control=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{control.abort();reject(Error('BUSINESS_ACCEPTANCE_HTTP_FAILED'));},12000);});
 try{return await Promise.race([(async()=>{const r=await request(url,{...init,signal:control.signal,redirect:'error',credentials:'omit',cache:'no-store'});if(!r.body)throw Error('BUSINESS_ACCEPTANCE_HTTP_FAILED');const reader=r.body.getReader();let size=0;const chunks:Uint8Array[]=[];try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>128*1024)throw Error('BUSINESS_ACCEPTANCE_HTTP_FAILED');chunks.push(p.value);}}finally{void reader.cancel().catch(()=>{});reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const p of chunks){bytes.set(p,offset);offset+=p.byteLength;}return{status:r.status,body:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown};})(),timeout]);}finally{clearTimeout(timer);}
}
function requireValue(value:unknown):asserts value{if(!value)throw Error('BUSINESS_ACCEPTANCE_RESPONSE_FAILED');}
export async function acceptBusinessStorage(env:Record<string,string|undefined>,request:typeof fetch=fetch){
 if(env.LUQI_BUSINESS_ACCEPTANCE_INTENT!==BUSINESS_ACCEPTANCE_INTENT)throw Error('BUSINESS_ACCEPTANCE_SCOPE_REJECTED');
 const settings=businessOperatorSettings(env),fixture=env.GITHUB_ACTIONS==='true'&&env.LUQI_MYSQL_CI_FIXTURE==='true';
 if(!fixture&&(request!==fetch||!/^[a-f0-9]{40}$/.test(env.LUQI_EXPECTED_RELEASE_SHA??'')))throw Error('BUSINESS_ACCEPTANCE_SCOPE_REJECTED');
 const base=fixture?'https://127.0.0.1:8776':'https://app.luqi-ai.com';
 const email='luqi-business-acceptance+'+randomUUID()+'@example.invalid',name='Luqi private acceptance '+randomUUID();
 const password='Private-Smoke-'+randomBytes(24).toString('base64url')+'!';
 let root:mysql.Connection|undefined,phase='RELEASE',token:string|undefined,accountId:number|undefined,removed=false,success=false;
 try{
  if(!fixture){const release=await bounded(request,base+'/v1/release');requireValue(release.status===200&&(release.body as {commit?:unknown}).commit===env.LUQI_EXPECTED_RELEASE_SHA);}
  phase='STATUS';const status=await bounded(request,base+'/api/v1/business-connect/status');requireValue(status.status===200&&(status.body as {availability?:unknown}).availability==='ready');
  phase='ACCOUNT';root=await mysql.createConnection({...settings.operator,connectTimeout:4000});
  const[existing]=await root.execute<RowDataPacket[]>({sql:'SELECT id FROM users WHERE email=? LIMIT 1',timeout:4000},[email]);requireValue(existing.length===0);
  const signup=await bounded(request,base+'/api/v1/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,name})});
  const body=signup.body as {token?:unknown;user?:{id?:unknown;email?:unknown;name?:unknown}};
  requireValue(signup.status===201&&typeof body.token==='string'&&body.token.length<4096&&body.user?.email===email&&body.user?.name===name&&Number.isSafeInteger(body.user?.id)&&Number(body.user?.id)>0);
  token=body.token;accountId=Number(body.user!.id);
  const call=(path:string,payload?:unknown,method='POST')=>bounded(request,base+'/api/v1/business-connect'+path,{method:payload===undefined?'GET':method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
  const id=randomUUID();const draft:BusinessDraft={name:'Internal private business acceptance '+randomUUID().slice(0,8),category:'other',description:'Controlled private storage acceptance. Never submitted for publication.',services:['Private acceptance only'],province:'GP',locality:'Test locality',kind:'service_area',serviceArea:'Private acceptance only',publicAddress:'',phone:'',email:'',website:'',hours:'',pricing:'',languages:['English'],visibility:{phone:false,email:false,website:false,address:false,pricing:false}};
  phase='SAVE';const created=await call('/mine/'+id,{expectedRevision:0,draft},'PUT');requireValue(created.status===200);const first=businessOwned.parse((created.body as {profile:unknown}).profile);requireValue(first.id===id&&first.revision===1&&first.state==='draft'&&first.public===null);
  phase='READ';const mine=await call('/mine');const profiles=(mine.body as {profiles?:unknown}).profiles;requireValue(mine.status===200&&Array.isArray(profiles)&&profiles.length===1&&businessOwned.parse(profiles[0]).id===id);
  requireValue((await bounded(request,base+'/api/v1/business-connect/public/'+id)).status===404);
  phase='EDIT';const edited=await call('/mine/'+id,{expectedRevision:1,draft:{...draft,hours:'Private acceptance updated'}},'PUT');requireValue(edited.status===200&&businessOwned.parse((edited.body as {profile:unknown}).profile).revision===2);
  phase='CONFLICT';requireValue((await call('/mine/'+id,{expectedRevision:1,draft},'PUT')).status===409);
  phase='PAUSE';const paused=await call('/mine/'+id+'/pause',{expectedRevision:2});requireValue(paused.status===200&&businessOwned.parse((paused.body as {profile:unknown}).profile).revision===3);
  phase='DELETE';const deleted=await call('/mine/'+id+'/delete',{expectedRevision:3,confirmDelete:true});requireValue(deleted.status===200&&(deleted.body as {removed?:unknown}).removed===true);
  const empty=await call('/mine');requireValue(empty.status===200&&Array.isArray((empty.body as {profiles?:unknown}).profiles)&&((empty.body as {profiles:unknown[]}).profiles).length===0);
  success=true;
 }catch{throw Error('BUSINESS_ACCEPTANCE_'+phase+'_FAILED');}
 finally{
  try{if(root){const[rows]=await root.execute<RowDataPacket[]>({sql:"SELECT id FROM users WHERE email=? AND name=? AND role='user' LIMIT 1",timeout:4000},[email,name]);
   if(rows.length){requireValue(accountId===undefined||Number(rows[0].id)===accountId);const[deleted]=await root.execute<ResultSetHeader>({sql:"DELETE FROM users WHERE id=? AND email=? AND name=? AND role='user'",timeout:4000},[rows[0].id,email,name]);requireValue(deleted.affectedRows===1);}removed=true;}}
  catch{throw Error('BUSINESS_ACCEPTANCE_CLEANUP_FAILED');}
  finally{if(root)await root.end().catch(()=>root?.destroy());}
 }
 requireValue(success&&removed);
 phase='REVOCATION';try{const revoked=await bounded(request,base+'/api/v1/business-connect/mine',{headers:{Authorization:'Bearer '+token}});requireValue(revoked.status===401);}catch{throw Error('BUSINESS_ACCEPTANCE_REVOCATION_FAILED');}
 return{format:'luqi.business-private-acceptance.v1',passed:true,signup:true,privateSaveReadEditDelete:true,staleRevisionRejected:true,publicProfilesCreated:0,publicationRequested:false,syntheticAccountRemoved:true,removedAccountRejected:true,aiRequests:0};
}
