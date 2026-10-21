import {describe,it,expect} from "vitest";
import {confirmed,userFacingStatus,availability,latencyPercentile} from "./reliability";
describe("LUQI reliability truth contract",()=>{
 it("does not claim success without evidence",()=>expect(confirmed({operationId:"1",status:"confirmed"})).toBe(false));
 it("confirms only verified completion",()=>expect(confirmed({operationId:"1",status:"confirmed",source:"server",verifiedAt:"2026-10-21T12:00:00Z"})).toBe(true));
 it("does not conflate pending with delivery",()=>expect(userFacingStatus({operationId:"1",status:"pending"})).toMatch(/not yet confirmed/));
 it("returns unknown for missing measurements",()=>expect(availability([])).toBeNull());
 it("computes observed success ratio and p95",()=>{const samples=Array.from({length:20},(_,i)=>({timestamp:"2026-10-21T12:00:00Z",success:i!==0,latencyMs:i+1}));expect(availability(samples)).toBe(.95);expect(latencyPercentile(samples,95)).toBe(19);});
});
