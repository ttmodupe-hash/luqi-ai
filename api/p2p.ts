import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { authenticatePilotUser, PilotAuthError } from './services/pilotAuth';
import { SovereignP2PEngine as engine, p2pEnabled, P2PError } from './services/sovereignP2P';
import { p2pId, p2pCategory, p2pMessage, p2pReportInput } from '../contracts/p2p';
export const p2p = new Hono<{ Variables:{ userId:number } }>();
p2p.use('*', async (c,next) => {
  c.header('Cache-Control','no-store'); c.header('Pragma','no-cache');
  try { c.set('userId',await authenticatePilotUser(c.req.header('authorization'))); }
  catch (error) { const unavailable = error instanceof PilotAuthError && error.code === 'AUTH_UNAVAILABLE';
    return c.json({ code:unavailable?'AUTH_UNAVAILABLE':'AUTH_REQUIRED' },unavailable?503:401); }
  if (Object.keys(c.req.query()).length) return c.json({ code:'INVALID_INPUT' },400);
  return next();
});
p2p.use('*',bodyLimit({ maxSize:18000,onError:c=>c.json({ code:'P2P_BODY_TOO_LARGE' },413) }));
p2p.onError((error,c) => {
  const code = error instanceof P2PError ? error.code : 'P2P_UNAVAILABLE';
  const status = code==='P2P_DENIED'?403:code==='P2P_NOT_FOUND'?404:code==='P2P_CONFLICT'?409:code==='P2P_LIMIT'?429:503;
  return c.json({ code },status);
});
p2p.get('/status',async c => p2pEnabled() ? c.json(await engine.status(c.get('userId')))
  : c.json({ enabled:false,userId:c.get('userId'),eligibility:'verification_needed',circles:[],blockedPeers:[] }));
p2p.use('*',async(c,next)=> {
  if (!p2pEnabled()) return c.json({ code:'P2P_DISABLED' },503);
  if (c.req.method !== 'GET' && c.req.header('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
    return c.json({ code:'INVALID_INPUT' },400);
  return next();
});
const create = z.object({ id:p2pId,name:z.string().trim().min(1).max(100),category:p2pCategory,
  inviteToken:z.string().regex(/^[A-Za-z0-9_-]{43}$/),studentLock:z.boolean() }).strict();
p2p.post('/circles',async c => { const input=create.safeParse(await c.req.json().catch(()=>null));
  if(!input.success) return c.json({code:'INVALID_INPUT'},400); return c.json(await engine.create(c.get('userId'),input.data),201); });
p2p.post('/join',async c => { const input=z.object({ id:p2pId,inviteToken:create.shape.inviteToken }).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success) return c.json({code:'INVALID_INPUT'},400); return c.json(await engine.join(c.get('userId'),input.data.id,input.data.inviteToken)); });
p2p.post('/confirm',async c=> { const input=z.object({id:p2pId}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({code:'INVALID_INPUT'},400);return c.json(await engine.confirm(c.get('userId'),input.data.id)); });
p2p.get('/circles/:id/messages',async c=> {const id=p2pId.safeParse(c.req.param('id'));
  if(!id.success)return c.json({code:'INVALID_INPUT'},400);return c.json(await engine.messages(c.get('userId'),id.data)); });
p2p.post('/messages',async c=>{const input=p2pMessage.safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({code:'INVALID_INPUT'},400);if(input.data.senderId!==c.get('userId'))return c.json({code:'P2P_DENIED'},403);return c.json(await engine.send(c.get('userId'),input.data),201);});
p2p.post('/block',async c=>{const input=z.object({peerId:z.number().int().positive().safe()}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({code:'INVALID_INPUT'},400);return c.json(await engine.blockUser(c.get('userId'),input.data.peerId));});
p2p.post('/reports',async c=>{const input=p2pReportInput.safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({code:'INVALID_INPUT'},400);return c.json(await engine.reportAbuseAndBlock(c.get('userId'),input.data),201);});
p2p.get('/moderation/reports',async c=>c.json(await engine.reports(c.get('userId'))));
p2p.all('*',c=>c.json({code:'P2P_ROUTE_NOT_FOUND'},404));
