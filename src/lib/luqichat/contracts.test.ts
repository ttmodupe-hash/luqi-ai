import {describe,it,expect} from "vitest";
import {effectivePresence,visibleCallState,canShareAttachment,mayReadMessage,describeParticipant} from "./contracts";
const human={id:"a",displayName:"A",kind:"human" as const};
describe("LUQIChat honest status and access contracts",()=>{
 it("does not present stale heartbeat as online",()=>expect(effectivePresence(human,{participantId:"a",observedAt:"2026-10-20T10:00:00Z",expiresAt:"2026-10-20T10:01:00Z",state:"online"},Date.parse("2026-10-20T10:02:00Z"))).toBe("offline"));
 it("labels AI clearly",()=>expect(describeParticipant({id:"bot",displayName:"LUQI",kind:"ai-companion"})).toContain("not a human"));
 it("does not claim a call is connected without verification",()=>expect(visibleCallState({id:"1",roomId:"r",participantIds:["a"],kind:"video",state:"connected"})).toBe("Connection unverified"));
 it("blocks unscanned files",()=>expect(canShareAttachment({id:"f",name:"a.pdf",mediaType:"application/pdf",byteLength:100,scanStatus:"pending"})).toBe(false));
 it("denies nonmembers access",()=>expect(mayReadMessage({id:"r",memberIds:["a"],kind:"direct"},{id:"m",roomId:"r",authorId:"a",sentAt:"2026-10-20T10:00:00Z",body:"hello",attachments:[]},"outsider")).toBe(false));
});
