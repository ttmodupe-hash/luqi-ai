import { describe, expect, it } from "vitest";
import { AFRICAN_VOICE_PROFILES, validateVoiceDirection } from "./voiceProfiles";
describe("LUQIToons African voice direction", () => {
  it("offers multiple distinct African language and locale profiles", () => {
    expect(new Set(AFRICAN_VOICE_PROFILES.map(p => p.locale)).size).toBe(AFRICAN_VOICE_PROFILES.length);
  });
  it("accepts safe synthetic voice direction", () => {
    expect(validateVoiceDirection({ profileId: "en-ZA", tone: "warm", speakingRate: 1, voiceMode: "synthetic" })).toEqual([]);
  });
  it("rejects cloning without consent record", () => {
    expect(validateVoiceDirection({ profileId: "zu-ZA", tone: "calm", speakingRate: 1, voiceMode: "consented-clone" })).toContain("Voice cloning requires verified speaker consent");
  });
  it("rejects out of range speaking rate", () => {
    expect(validateVoiceDirection({ profileId: "xh-ZA", tone: "energetic", speakingRate: 2, voiceMode: "synthetic" })).toContain("Speaking rate out of range");
  });
});
