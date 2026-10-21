import { describe, expect, it } from "vitest";
import { diagnoseSimpleLan, prioritizeStudy, sameSubnet } from "./masteryEngine";
describe("LUQI Academy concept-first learning", () => {
  it("prioritizes weak explanations and missing practical evidence", () => {
    const attempts = [
      { topicId:"subnetting", timestamp:"2026-10-20T10:00:00Z", correct:false, explanationQuality:"none" as const, practicalDemonstration:false },
      { topicId:"itil-value", timestamp:"2026-10-20T11:00:00Z", correct:true, explanationQuality:"clear" as const, practicalDemonstration:true },
    ];
    expect(prioritizeStudy(attempts)[0].topicId).toBe("subnetting");
    expect(prioritizeStudy(attempts)[0].nextReviewDays).toBe(1);
  });
  it("correctly distinguishes IPv4 subnets", () => {
    const a={id:"a",name:"A",ipv4:"192.168.1.10",maskBits:24};
    expect(sameSubnet(a,{...a,ipv4:"192.168.1.254"})).toBe(true);
    expect(sameSubnet(a,{...a,ipv4:"192.168.2.1"})).toBe(false);
  });
  it("diagnoses disconnected and mismatched LAN endpoints", () => {
    const nodes=[{id:"a",name:"A",ipv4:"10.0.0.2",maskBits:24},{id:"b",name:"B",ipv4:"10.0.1.2",maskBits:24}];
    expect(diagnoseSimpleLan(nodes,[],"a","b")).toHaveLength(2);
    expect(diagnoseSimpleLan(nodes,[{from:"a",to:"b"}],"a","b")).toHaveLength(1);
  });
});
