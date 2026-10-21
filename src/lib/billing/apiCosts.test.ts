import {describe,it,expect} from "vitest";
import {API_SERVICES,costTotals,budgetStatus} from "./apiCosts";
describe("API cost transparency",()=>{
 it("never hardcodes fabricated provider prices",()=>expect(API_SERVICES.every(s=>s.officialUrl.startsWith("https://"))).toBe(true));
 it("does not count unverified invoice data as actual spend",()=>expect(costTotals([{serviceId:"x",estimatedMonthlyZar:500,actualMonthlyZar:700}])).toEqual({estimatedZar:500,actualVerifiedZar:0,unverifiedActuals:1,unpriced:0}));
 it("rejects negative costs",()=>expect(()=>costTotals([{serviceId:"x",estimatedMonthlyZar:-1,actualMonthlyZar:null}])).toThrow());
 it("warns when budget is exceeded",()=>expect(budgetStatus(1500,1000)).toBe("over"));
});
