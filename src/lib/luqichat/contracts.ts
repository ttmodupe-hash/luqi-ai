/** LUQIChat domain contracts. No server, socket, file storage or call service is implied. */
export type ParticipantKind = "human" | "ai-companion";
export type PresenceState = "online" | "offline" | "away" | "unknown";
export type CallState = "idle" | "ringing" | "connecting" | "connected" | "ended" | "failed";
export interface Participant { id:string; displayName:string; kind:ParticipantKind; }
export interface PresenceHeartbeat { participantId:string; observedAt:string; expiresAt:string; state:"online"|"away"; }
export interface SharedAttachment { id:string; name:string; mediaType:string; byteLength:number; scanStatus:"pending"|"clean"|"blocked"; }
export interface ChatMessage { id:string; roomId:string; authorId:string; sentAt:string; body:string; attachments:SharedAttachment[]; }
export interface ChatRoom { id:string; memberIds:string[]; kind:"direct"|"group"|"study"; }
export interface CallSession { id:string; roomId:string; participantIds:string[]; kind:"audio"|"video"; state:CallState; connectedAt?:string; }
export function effectivePresence(participant:Participant,heartbeat:PresenceHeartbeat|undefined,nowMs:number):PresenceState {
 if(participant.kind==="ai-companion") return "unknown"; // AI availability is service health, never human presence.
 if(!heartbeat||heartbeat.participantId!==participant.id) return "unknown";
 const expires=Date.parse(heartbeat.expiresAt), observed=Date.parse(heartbeat.observedAt);
 if(!Number.isFinite(expires)||!Number.isFinite(observed)||observed>nowMs||expires<=nowMs||expires<=observed) return "offline";
 return heartbeat.state;
}
export function visibleCallState(session:CallSession):string {
 switch(session.state){
  case "idle":return "Call not started";
  case "ringing":return "Ringing — not connected";
  case "connecting":return "Connecting — not yet connected";
  case "connected":return session.connectedAt && Number.isFinite(Date.parse(session.connectedAt)) ? "Connected" : "Connection unverified";
  case "ended":return "Call ended";
  case "failed":return "Call failed";
 }
}
export function canShareAttachment(attachment:SharedAttachment,maxBytes=25*1024*1024):boolean {
 return attachment.scanStatus==="clean" && attachment.byteLength>0 && attachment.byteLength<=maxBytes &&
 /^(application\/pdf|text\/plain|image\/(png|jpeg)|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet))$/.test(attachment.mediaType);
}
export function mayReadRoom(room:ChatRoom,userId:string):boolean { return Boolean(userId) && room.memberIds.includes(userId); }
export function mayReadMessage(room:ChatRoom,message:ChatMessage,userId:string):boolean {return room.id===message.roomId && mayReadRoom(room,userId);}
export function describeParticipant(participant:Participant):string {return participant.kind==="ai-companion" ? `${participant.displayName} (AI companion — not a human)` : participant.displayName;}
