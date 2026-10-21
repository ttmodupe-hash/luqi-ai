import {describe,it,expect} from "vitest";
import {findOpportunitySources,OPPORTUNITY_SOURCES} from "./opportunitySources";
describe("Africa opportunity directory",()=>{
 it("filters education programmes",()=>expect(findOpportunitySources("education").some(s=>s.id==="mastercard")).toBe(true));
 it("does not fabricate current application status",()=>expect(OPPORTUNITY_SOURCES.every(s=>!Object.hasOwn(s,"isOpen"))).toBe(true));
 it("only lists official https sources",()=>expect(OPPORTUNITY_SOURCES.every(s=>s.url.startsWith("https://"))).toBe(true));
});
