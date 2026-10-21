import {describe,it,expect} from "vitest";
import {buildFundingReadiness,fundingCompletion} from "./fundingReadiness";
describe("funding application readiness",()=>{
 it("adds mining compliance without pretending to issue permits",()=>{const r=buildFundingReadiness({type:"cooperative",sector:"mining",country:"South Africa",purpose:"exploration"});expect(r.items.some(i=>i.id==="mineral-rights")).toBe(true);expect(r.items.some(i=>i.id==="governance")).toBe(true);expect(r.warnings.join(" ")).toMatch(/does not authorise/);});
 it("requires applicant consent",()=>expect(buildFundingReadiness({type:"individual",sector:"technology",country:"Kenya",purpose:"training"}).items.some(i=>i.id==="consent")).toBe(true));
 it("counts only documented items",()=>{const r=buildFundingReadiness({type:"individual",sector:"energy",country:"Ghana",purpose:"equipment"});expect(fundingCompletion(r,new Set(["identity","invented"])).done).toBe(1);});
});
