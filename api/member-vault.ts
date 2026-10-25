/** Private subscriber project vault, fail-closed and disabled by default. */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { authenticatePilotUser,PilotAuthError } from './services/pilotAuth';
import { deleteMemberProject,editMemberProject,newMemberProject,projectId,VaultError } from './services/memberVaultContract';
import { memberVaultStore } from './services/memberVaultStore';
export const memberVault=new Hono<{Variables:{userId:number}}>();
memberVault.use('*',async(c,next)=>{
  c.header('Cache-Control','no-store');
  try{c.set('userId',await authenticatePilotUser(c.req.header('authorization')));}
  catch(error){
    const unavailable=error instanceof PilotAuthError&&error.code==='AUTH_UNAVAILABLE';
    return c.json({code:unavailable?'AUTH_UNAVAILABLE':'AUTH_REQUIRED'},unavailable?503:401);
  }
  return next();
});
memberVault.use('*',bodyLimit({maxSize:8192,onError:c=>c.json({code:'INVALID_INPUT'},413)}));
memberVault.onError((error,c)=>{
  if(error instanceof VaultError){
    const status={MEMBERSHIP_REQUIRED:403,VAULT_NOT_FOUND:404,VAULT_CONFLICT:409,
      VAULT_LIMIT:429,AUTH_REQUIRED:401} as const;
    return c.json({code:error.code},status[error.code]);
  }
  return c.json({code:'MEMBER_VAULT_STORAGE_UNAVAILABLE'},503);
});
memberVault.get('/status',async c=>{
  if(Object.keys(c.req.query()).length)return c.json({code:'INVALID_INPUT'},400);
  if(process.env.LUQI_MEMBER_VAULT_ENABLED!=='true')
    return c.json({enabled:false,member:false});
  return c.json(await memberVaultStore.status(c.get('userId')));
});
memberVault.use('*',async(c,next)=>{
  if(process.env.LUQI_MEMBER_VAULT_ENABLED!=='true')
    return c.json({code:'MEMBER_VAULT_DISABLED'},503);
  return next();
});
memberVault.post('/',async c=>{
  if(Object.keys(c.req.query()).length)return c.json({code:'INVALID_INPUT'},400);
  const parsed=newMemberProject.safeParse(await c.req.json().catch(()=>null));
  if(!parsed.success)return c.json({code:'INVALID_INPUT'},400);
  return c.json({project:await memberVaultStore.create(c.get('userId'),parsed.data)},201);
});
memberVault.get('/',async c=>{
  if(Object.keys(c.req.query()).length)return c.json({code:'INVALID_INPUT'},400);
  return c.json({projects:await memberVaultStore.list(c.get('userId'))});
});
memberVault.get('/:id',async c=>{
  const id=projectId.safeParse(c.req.param('id'));
  if(!id.success||Object.keys(c.req.query()).length)return c.json({code:'INVALID_INPUT'},400);
  return c.json({project:await memberVaultStore.get(c.get('userId'),id.data)});
});
memberVault.put('/:id',async c=>{
  const id=projectId.safeParse(c.req.param('id'));
  const parsed=editMemberProject.safeParse(await c.req.json().catch(()=>null));
  if(!id.success||!parsed.success||Object.keys(c.req.query()).length)
    return c.json({code:'INVALID_INPUT'},400);
  const {expectedRevision,...draft}=parsed.data;
  return c.json({project:await memberVaultStore.update(c.get('userId'),id.data,expectedRevision,draft)});
});
memberVault.delete('/:id',async c=>{
  const id=projectId.safeParse(c.req.param('id'));
  const parsed=deleteMemberProject.safeParse(await c.req.json().catch(()=>null));
  if(!id.success||!parsed.success||Object.keys(c.req.query()).length)
    return c.json({code:'INVALID_INPUT'},400);
  const result=await memberVaultStore.remove(c.get('userId'),id.data,parsed.data.expectedRevision);
  if(!result.deleted||result.id!==id.data)throw new Error('Unconfirmed deletion outcome');
  return c.json(result);
});
memberVault.all('*',c=>c.json({code:'MEMBER_VAULT_ROUTE_NOT_FOUND'},404));
