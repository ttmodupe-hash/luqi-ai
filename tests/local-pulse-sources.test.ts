import {describe,expect,it} from "vitest";
import {filterPulseSources,PULSE_RECHECK_BY,PULSE_REVIEWED_ON,PULSE_SOURCES,pulseQuestion} from "../src/lib/local-pulse-sources";

describe("Local Pulse original publisher directory",()=>{
 it("links only to the specifically reviewed original publishers, with no rebroadcast URLs or live-availability claims",()=>{
   const hosts = new Set(["www.primediaplus.com","www.sabc.co.za","www.sabcnews.com","www.ewn.co.za","www.kaya959.co.za"]);
   expect(PULSE_REVIEWED_ON).toBe("30 October 2026");
   expect(new Date(PULSE_RECHECK_BY+"T23:59:59+02:00").getTime()).toBeGreaterThan(Date.parse("2026-10-30"));
   expect(PULSE_SOURCES.length).toBeGreaterThanOrEqual(6);
   expect(new Set(PULSE_SOURCES.map(x=>x.id)).size).toBe(PULSE_SOURCES.length);
   for(const x of PULSE_SOURCES){
     const u=new URL(x.url);
     expect(u.protocol).toBe("https:");
     expect(hosts.has(u.hostname)).toBe(true);
     expect(u.username).toBe("");
     expect(u.password).toBe("");
     expect(u.search).toBe("");
     expect(x.name.length).toBeGreaterThan(2);
     expect(x.publisher.length).toBeGreaterThan(2);
     expect(x.description).not.toMatch(/stream is live|breaking right now|today's headline/i);
   }
 });
 it("filters only reviewed province-specific entries plus national sources",()=>{
   const gp=filterPulseSources("GP","talk","");
   expect(gp.some(x=>x.id==="702")).toBe(true);
   expect(gp.some(x=>x.id==="capetalk")).toBe(false);
   const wc=filterPulseSources("WC","talk","");
   expect(wc.some(x=>x.id==="capetalk")).toBe(true);
   expect(wc.some(x=>x.id==="702")).toBe(false);
   const other=filterPulseSources("other","all","");
   expect(other.length).toBeGreaterThan(0);
   expect(other.every(x=>x.region==="ZA")).toBe(true);
   expect(filterPulseSources("all","news","EWN").map(x=>x.id)).toEqual(["ewn"]);
 });
 it("prepares a source-first question, without inventing news or sending a request",()=>{
   const q=pulseQuestion("ewn","Municipal water, electricity and service changes","isiZulu","GP");
   expect(q).toContain("https://www.ewn.co.za/latest");
   expect(q).toContain("Gauteng");
   expect(q).toContain("isiZulu");
   expect(q).toMatch(/distinguish verified facts from presenters'/i);
   expect(q).toMatch(/do not assume an incident or opportunity exists/i);
 });
});
