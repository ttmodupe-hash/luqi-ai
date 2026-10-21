import { describe, expect, it } from "vitest";
import { omegaTradesRouter } from "../omega-trades";
import { analyzeSelfReportedSkills, getTradeSkills, listTrades } from "./omegaTrades";

describe("OMEGA vocational knowledge in LUQI", () => {
  const caller = omegaTradesRouter.createCaller({
    req: new Request("https://luqi-ai.com/api/trpc/omegaTrades"),
    user: null,
  });

  it("imports the seven documented TVET/digital pathways without private OMEGA profiles", async () => {
    const trades = await caller.list();
    expect(trades).toHaveLength(7);
    expect(trades.find((p) => p.id === "solar_technician")?.skillCount).toBe(5);
    const solar = await caller.skills({ trade: "solar_technician" });
    expect(solar.skills).toContain("PV Array Design");
    expect(solar.note).toMatch(/not live job-market intelligence/i);
  });

  it("does not inflate checklist completion with duplicates or invented skills", () => {
    const result = analyzeSelfReportedSkills("software_dev", [
      "Python", "Python", "Lies about a skill", "Sql",
    ]);
    expect(result.selfReportedSkills).toBe(2);
    expect(result.checklistCompletionPercent).toBe(40);
    expect(result.assessmentStatus).toBe("self_reported_not_verified");
    expect(result.missingSkills).toContain("Docker");
  });

  it("does not issue an accreditation or competence certification", () => {
    const complete = analyzeSelfReportedSkills("data_analyst", getTradeSkills("data_analyst").skills);
    expect(complete.checklistCompletionPercent).toBe(100);
    expect(complete.assessmentStatus).toBe("self_reported_not_verified");
    expect(JSON.stringify(complete)).not.toContain("CERT-");
  });

  it("requires actual supervision for potentially dangerous practical work", () => {
    const result = analyzeSelfReportedSkills("electrician", []);
    const electrical = result.practicePlan.find((p) => p.skill === "SANS 10142 Wiring");
    expect(electrical?.exercise).toMatch(/assessor|supervision/i);
  });

  it("rejects unknown trade identifiers and overly large self-assessments", async () => {
    await expect(caller.skills({ trade: "non_existent" as any }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.gap({
      trade: "electrician",
      selectedSkills: Array(31).fill("AC Theory"),
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
