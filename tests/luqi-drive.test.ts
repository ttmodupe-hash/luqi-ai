import {describe,expect,it} from "vitest";
import {LUQI_DRIVE_REVIEWED_ON,LUQI_DRIVE_ROUTE_PACKS,businessDirectoryLink,driveStoryMode,geohash6,shouldSuppressRepeat} from "../src/lib/luqi-drive";

describe("Luqi-Drive public route packs",()=>{
  it("keeps reviewed source-linked packs unique and HTTPS-only",()=>{
    expect(LUQI_DRIVE_REVIEWED_ON).toBe("2 November 2026");
    expect(LUQI_DRIVE_ROUTE_PACKS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(LUQI_DRIVE_ROUTE_PACKS.map(x=>x.id)).size).toBe(LUQI_DRIVE_ROUTE_PACKS.length);
    for(const pack of LUQI_DRIVE_ROUTE_PACKS){
      expect(pack.sources.length).toBeGreaterThanOrEqual(2);
      for(const source of pack.sources){
        const url=new URL(source.url);
        expect(url.protocol).toBe("https:");
        expect(url.username).toBe("");
        expect(url.password).toBe("");
      }
      expect(pack.resourceSummary).not.toMatch(/beneath your car|live mine|guaranteed open/i);
    }
  });

  it("adapts story depth conservatively to speed",()=>{
    expect(driveStoryMode(120)).toBe("brief");
    expect(driveStoryMode(80)).toBe("brief");
    expect(driveStoryMode(79)).toBe("standard");
    expect(driveStoryMode(30)).toBe("standard");
    expect(driveStoryMode(29)).toBe("deep");
    expect(driveStoryMode(null)).toBe("standard");
    expect(driveStoryMode(-1)).toBe("standard");
  });

  it("creates a six-character privacy cell without accepting invalid coordinates",()=>{
    const cell=geohash6(-25.7479,28.2293);
    expect(cell).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]{6}$/);
    expect(geohash6(-25.7479,28.2293)).toBe(cell);
    expect(()=>geohash6(91,0)).toThrow(/INVALID_LATITUDE/);
    expect(()=>geohash6(0,181)).toThrow(/INVALID_LONGITUDE/);
  });

  it("routes support-local discovery into reviewed Business Connect filters",()=>{
    const link=businessDirectoryLink(LUQI_DRIVE_ROUTE_PACKS[0]!);
    expect(link).toContain("/businesses?");
    expect(link).toContain("province=LP");
    expect(link).toContain("q=");
  });

  it("uses a bounded local repeat cooldown",()=>{
    const now=1_000_000;
    expect(shouldSuppressRepeat(now-10_000,now)).toBe(true);
    expect(shouldSuppressRepeat(now-21*60*1000,now)).toBe(false);
    expect(shouldSuppressRepeat(undefined,now)).toBe(false);
  });
});
