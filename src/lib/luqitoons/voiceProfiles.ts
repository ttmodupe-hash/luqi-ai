/** Voice direction metadata only. Do not claim a provider supports a locale until verified. */
export const AFRICAN_VOICE_PROFILES = [
  { id: "en-ZA", label: "South African English", language: "English", locale: "en-ZA" },
  { id: "zu-ZA", label: "isiZulu", language: "isiZulu", locale: "zu-ZA" },
  { id: "xh-ZA", label: "isiXhosa", language: "isiXhosa", locale: "xh-ZA" },
  { id: "st-ZA", label: "Sesotho", language: "Sesotho", locale: "st-ZA" },
  { id: "tn-ZA", label: "Setswana", language: "Setswana", locale: "tn-ZA" },
  { id: "sw-KE", label: "Kiswahili (Kenya)", language: "Kiswahili", locale: "sw-KE" },
  { id: "yo-NG", label: "Yoruba", language: "Yoruba", locale: "yo-NG" },
  { id: "ha-NG", label: "Hausa", language: "Hausa", locale: "ha-NG" },
] as const;

export type AfricanVoiceProfileId = typeof AFRICAN_VOICE_PROFILES[number]["id"];
export interface ToonVoiceDirection {
  profileId: AfricanVoiceProfileId;
  tone: "warm" | "confident" | "calm" | "energetic";
  speakingRate: number;
  voiceMode: "synthetic" | "consented-clone";
  consentRecordId?: string;
}
export function validateVoiceDirection(value: ToonVoiceDirection): string[] {
  const errors: string[] = [];
  if (!AFRICAN_VOICE_PROFILES.some(p => p.id === value.profileId)) errors.push("Unknown voice profile");
  if (!["warm", "confident", "calm", "energetic"].includes(value.tone)) errors.push("Unknown tone");
  if (!Number.isFinite(value.speakingRate) || value.speakingRate < 0.75 || value.speakingRate > 1.25) errors.push("Speaking rate out of range");
  if (value.voiceMode === "consented-clone" && !value.consentRecordId?.trim()) errors.push("Voice cloning requires verified speaker consent");
  if (!["synthetic", "consented-clone"].includes(value.voiceMode)) errors.push("Unknown voice mode");
  return errors;
}
