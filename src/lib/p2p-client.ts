import { z } from 'zod';
import { requestConversationJson } from './conversation-request';
import { p2pCircle,p2pMessage,p2pStatus,p2pReportReceipt,type P2PMessagePacket } from '../../contracts/p2p';
export function p2pClient(token:string, request:typeof fetch=fetch) {
  async function call<T>(path:string,schema:z.ZodType<T>,body?:unknown):Promise<T> {
    const response=await requestConversationJson(request,'/api/v1/p2p'+path,{method:body===undefined?'GET':'POST',
      cache:'no-store',credentials:'omit',redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(!response.ok)throw Error(response.status===403?'This action is not permitted. Verify membership, safety status and blocks.':
      response.status===401?'Sign in again.':response.status===429?'Messaging limit reached.':
      'Messaging could not be confirmed. Refresh to check its status; a message is never resent automatically.');
    return schema.parse(response.body);
  }
  return { status:()=>call('/status',p2pStatus),
    create:(body:unknown)=>call('/circles',z.object({circle:p2pCircle}),body),
    join:(id:string,inviteToken:string)=>call('/join',z.object({requested:z.literal(true),circle:p2pCircle}),{id,inviteToken}),
    confirm:(id:string)=>call('/confirm',z.object({circle:p2pCircle}),{id}),
    messages:(id:string)=>call('/circles/'+encodeURIComponent(id)+'/messages',z.object({messages:z.array(p2pMessage).max(100)})),
    send:(packet:P2PMessagePacket)=>call('/messages',z.object({accepted:z.literal(true),messageId:z.literal(packet.messageId)}),packet),
    block:(peerId:number)=>call('/block',z.object({blocked:z.literal(true)}),{peerId}),
    report:(body:unknown)=>call('/reports',p2pReportReceipt,body),
    reports:()=>call('/moderation/reports',z.object({reports:z.array(z.object({reportId:z.string().uuid(),reason:z.string(),
      timestamp:z.string(),reporterId:z.number(),offenderId:z.number(),evidence:z.string().max(2000),
      previousSeal:z.string().length(64),sha256AuditSeal:z.string().length(64)})).max(50)})),
  };
}
