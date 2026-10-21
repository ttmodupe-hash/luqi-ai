import { describe,expect,it } from "vitest";
import { AFRICA_SKILL_PATHWAYS,recommendLearningPaths } from "./skillPathways";
describe("evidence-aware learning pathway guidance",()=>{
 it("provides three ordered paths with three reasons",()=>{const paths=recommendLearningPaths("cloud");expect(paths).toHaveLength(3);expect(paths[0].id).toBe("network-cloud");expect(paths.every(p=>p.reasons.length===3)).toBe(true);});
 it("does not present illustrative pathways as verified demand",()=>expect(AFRICA_SKILL_PATHWAYS.every(p=>p.evidenceStatus==="illustrative" && p.sourceUrls.length===0)).toBe(true));
 it("rejects unknown goals",()=>expect(()=>recommendLearningPaths("unknown" as never)).toThrow());
});
