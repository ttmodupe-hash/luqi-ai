import {Hono} from 'hono';
import {bodyLimit} from 'hono/body-limit';
import {z} from 'zod';
import {authenticatePilotUser,PilotAuthError} from './services/pilotAuth';
import {BusinessError,businessConnectStore as store} from './services/businessConnectStore';
import {businessId,businessSave,businessRevision,businessSubmit,businessDecision,businessReport,businessProvince,BUSINESS_CATEGORIES} from '../contracts/business-connect';
export const businessConnect=new Hono<{Variables:{userId:number}}>();
businessConnect.use('*',async(c,next)=>{c.header('Cache-Control','no-store');c.header('Pragma','no-cache');c.header('X-Content-Type-Options','nosniff');return next();});
businessConnect.use('*',bodyLimit({maxSize:16*1024,onError:c=>c.json({code:'BUSINESS_BODY_TOO_LARGE'},413)}));
businessConnect.onError((e,c)=>{
 if(e instanceof BusinessError){const statuses={BUSINESS_NOT_FOUND:404,BUSINESS_CONFLICT:409,BUSINESS_LIMIT:429,BUSINESS_FORBIDDEN:403,BUSINESS_DUPLICATE:409,BUSINESS_CONSENT_REQUIRED:400,BUSINESS_REVIEW_UNAVAILABLE:503} as const;return c.json({code:e.code},statuses[e.code]);}
 return c.json({code:'BUSINESS_STORAGE_UNAVAILABLE'},503);
});
const enabled=()=>process.env.LUQI_BUSINESS_CONNECT_ENABLED==='true';
businessConnect.get('/status',async c=>{
 if(Object.keys(c.req.query()).length)return c.json({code:'INVALID_INPUT'},400);
 if(!enabled())return c.json({availability:'setup_required',ownerLimit:10});
 return c.json(await store.ready());
});
// Public APIs never return drafts, ownership, account IDs, reports or audit data.
businessConnect.get('/public',async c=>{
 if(!enabled())return c.json({code:'BUSINESS_NOT_ACTIVE'},503);
 const parsed=z.object({province:businessProvince.optional(),category:z.enum(BUSINESS_CATEGORIES).optional(),q:z.string().trim().max(80).optional(),after:businessId.optional()}).strict().safeParse(c.req.query());
 if(!parsed.success)return c.json({code:'INVALID_INPUT'},400);
 return c.json(await store.list(parsed.data));
});
businessConnect.get('/public/:id',async c=>{
 if(!enabled())return c.json({code:'BUSINESS_NOT_ACTIVE'},503);
 const id=businessId.safeParse(c.req.param('id'));if(!id.success||Object.keys(c.req.query()).length)return c.json({code:'INVALID_INPUT'},400);
 return c.json(await store.public(id.data));
});
businessConnect.use('*',async(c,next)=>{
 try{c.set('userId',await authenticatePilotUser(c.req.header('authorization')));}
 catch(e){const unavailable=e instanceof PilotAuthError&&e.code==='AUTH_UNAVAILABLE';return c.json({code:unavailable?'AUTH_UNAVAILABLE':'AUTH_REQUIRED'},unavailable?503:401);}
 if(!enabled())return c.json({code:'BUSINESS_NOT_ACTIVE'},503);
 return next();
});
businessConnect.use('*',async(c,next)=>{
 if(Object.keys(c.req.query()).length)return c.json({code:'INVALID_INPUT'},400);
 if(c.req.method!=='GET'&&c.req.header('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return c.json({code:'INVALID_INPUT'},400);
 return next();
});
businessConnect.get('/mine',async c=>c.json(await store.mine(c.get('userId'))));
businessConnect.put('/mine/:id',async c=>{
 const id=businessId.safeParse(c.req.param('id')),input=businessSave.safeParse(await c.req.json().catch(()=>null));
 if(!id.success||!input.success)return c.json({code:'INVALID_INPUT'},400);
 return c.json(await store.save(c.get('userId'),id.data,input.data.expectedRevision,input.data.draft));
});
for(const action of ['submit','pause','delete'] as const)businessConnect.post('/mine/:id/'+action,async c=>{
 const schema=action==='submit'?businessSubmit:action==='delete'?businessRevision.extend({confirmDelete:z.literal(true)}).strict():businessRevision;
 const id=businessId.safeParse(c.req.param('id')),input=schema.safeParse(await c.req.json().catch(()=>null));
 if(!id.success||!input.success)return c.json({code:'INVALID_INPUT'},400);
 return c.json(await store.change(c.get('userId'),id.data,input.data.expectedRevision,action));
});
businessConnect.get('/mine/:id/history',async c=>{
 const id=businessId.safeParse(c.req.param('id'));if(!id.success)return c.json({code:'INVALID_INPUT'},400);
 return c.json(await store.history(c.get('userId'),id.data));
});
businessConnect.post('/public/:id/report',async c=>{
 const id=businessId.safeParse(c.req.param('id')),input=businessReport.safeParse(await c.req.json().catch(()=>null));
 if(!id.success||!input.success)return c.json({code:'INVALID_INPUT'},400);
 return c.json(await store.report(c.get('userId'),id.data,input.data));
});
businessConnect.get('/review',async c=>c.json(await store.reviewQueue(c.get('userId'))));
businessConnect.post('/review/:id',async c=>{
 const id=businessId.safeParse(c.req.param('id')),input=businessDecision.safeParse(await c.req.json().catch(()=>null));
 if(!id.success||!input.success||input.data.action==='approve'&&input.data.reason!=='none')return c.json({code:'INVALID_INPUT'},400);
 return c.json(await store.decide(c.get('userId'),id.data,input.data));
});
businessConnect.all('*',c=>c.json({code:'BUSINESS_ROUTE_NOT_FOUND'},404));
