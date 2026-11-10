import {Hono} from 'hono';
import {createHash} from 'node:crypto';
import type {RowDataPacket} from 'mysql2/promise';
import {authenticatePilotUser,PilotAuthError} from './services/pilotAuth';
import {getPersistentMySqlPool} from './queries/connection';
import {businessPreviewTemplate,BUSINESS_PREVIEW_VERSION} from './services/businessConnectPreview';
export const businessConnectPreview=new Hono();
businessConnectPreview.use('*',async(c,next)=>{
 c.header('Cache-Control','no-store');c.header('Pragma','no-cache');c.header('Vary','Authorization');c.header('X-Content-Type-Options','nosniff');
 return next();
});
businessConnectPreview.get('/',async c=>{
 if(Object.keys(c.req.query()).length)return c.json({code:'INVALID_INPUT'},400);
 let userId:number;
 try{userId=await authenticatePilotUser(c.req.header('authorization'));}
 catch(e){const down=e instanceof PilotAuthError&&e.code==='AUTH_UNAVAILABLE';return c.json({code:down?'AUTH_UNAVAILABLE':'AUTH_REQUIRED'},down?503:401);}
 const owner=(process.env.LUQI_BUSINESS_PREVIEW_OWNER_EMAIL??'').trim().toLowerCase();
 if(!owner||owner.length>254)return c.json({code:'BUSINESS_PREVIEW_UNAVAILABLE'},503);
 try{
  // Verified account + exact configured owner. No JWT email claim or client role can grant access.
  const [rows]=await getPersistentMySqlPool().execute<RowDataPacket[]>({sql:'SELECT id FROM users WHERE id=? AND LOWER(email)=? AND is_active=1 LIMIT 1',timeout:4000},[userId,owner]);
  if(rows.length!==1||Number(rows[0].id)!==userId)return c.json({code:'BUSINESS_PREVIEW_FORBIDDEN'},403);
  const html=await businessPreviewTemplate();
  // This hash is only a local storage namespace; it does not authenticate anything.
  const scope=createHash('sha256').update('luqi-private-business-preview:'+userId).digest('hex');
  return c.json({html,scope,version:BUSINESS_PREVIEW_VERSION});
 }catch{return c.json({code:'BUSINESS_PREVIEW_UNAVAILABLE'},503);}
});
businessConnectPreview.all('*',c=>c.json({code:'BUSINESS_PREVIEW_NOT_FOUND'},404));
