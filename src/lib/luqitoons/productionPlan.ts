/**
 * LUQIToons production planning contract.
 * Planning only: does not invoke video providers, charge credits, or claim rendered output.
 */
export const MAX_FINISHED_VIDEO_SECONDS = 7 * 60;
export const MAX_PLANNED_SCENE_SECONDS = 15;
export const MAX_SCENES = 60;

export type ToonPurpose = "training" | "education" | "storytelling" | "business" | "public-awareness";
export type SceneState = "planned" | "approved" | "rendering" | "rendered" | "failed";

export interface ToonScene {
  id: string;
  sequence: number;
  startSeconds: number;
  durationSeconds: number;
  endSeconds: number;
  objective: string;
  visualDirection: string;
  narration: string;
  state: SceneState;
}
export interface ToonProductionPlan {
  schemaVersion: 1;
  title: string;
  purpose: ToonPurpose;
  targetAudience: string;
  learningObjectives: string[];
  language: string;
  visualStyle: "3d";
  targetDurationSeconds: number;
  scenes: ToonScene[];
  requiresFactualReview: boolean;
  status: "draft";
}

export interface CreateToonPlanInput {
  title: string;
  purpose: ToonPurpose;
  targetAudience: string;
  learningObjectives?: string[];
  language?: string;
  durationSeconds: number;
  sceneDurationSeconds?: number;
}

export function createToonProductionPlan(input: CreateToonPlanInput): ToonProductionPlan {
  const duration = input.durationSeconds;
  const sceneDuration = input.sceneDurationSeconds ?? 10;
  if (!Number.isSafeInteger(duration) || duration < 1 || duration > MAX_FINISHED_VIDEO_SECONDS) {
    throw new RangeError("Finished video must be between 1 and 420 seconds");
  }
  if (!Number.isSafeInteger(sceneDuration) || sceneDuration < 1 || sceneDuration > MAX_PLANNED_SCENE_SECONDS) {
    throw new RangeError("Scene duration must be between 1 and 15 seconds");
  }
  const count = Math.ceil(duration / sceneDuration);
  if (count > MAX_SCENES) throw new RangeError("Too many scenes for one production");
  const title = input.title.trim();
  const targetAudience = input.targetAudience.trim();
  const language = (input.language ?? "en").trim();
  if (!title || title.length > 255 || !targetAudience || targetAudience.length > 200 || !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(language)) {
    throw new RangeError("Invalid title, audience, or language code");
  }
  const objectives = (input.learningObjectives ?? []).map(o => o.trim());
  if (objectives.length > 12 || objectives.some(o => !o || o.length > 300)) throw new RangeError("Invalid learning objectives");
  if ((input.purpose === "training" || input.purpose === "education") && objectives.length === 0) {
    throw new RangeError("Training and education plans require learning objectives");
  }
  const scenes: ToonScene[] = Array.from({ length: count }, (_, index) => {
    const startSeconds = index * sceneDuration;
    const durationSeconds = Math.min(sceneDuration, duration - startSeconds);
    const objective = objectives.length ? objectives[Math.min(objectives.length - 1, Math.floor(index * objectives.length / count))] : input.purpose;
    return {
      id: `scene-${String(index + 1).padStart(3, "0")}`,
      sequence: index + 1,
      startSeconds,
      durationSeconds,
      endSeconds: startSeconds + durationSeconds,
      objective,
      visualDirection: "",
      narration: "",
      state: "planned",
    };
  });
  return {
    schemaVersion: 1, title, purpose: input.purpose, targetAudience, learningObjectives: objectives,
    language, visualStyle: "3d", targetDurationSeconds: duration, scenes,
    requiresFactualReview: input.purpose === "training" || input.purpose === "education" || input.purpose === "public-awareness",
    status: "draft",
  };
}

export function validateToonProductionPlan(plan: ToonProductionPlan): string[] {
  const errors: string[] = [];
  if (plan.targetDurationSeconds < 1 || plan.targetDurationSeconds > MAX_FINISHED_VIDEO_SECONDS) errors.push("Finished duration outside 7-minute limit");
  if (plan.scenes.length === 0 || plan.scenes.length > MAX_SCENES) errors.push("Invalid scene count");
  let cursor = 0;
  for (const [index, scene] of plan.scenes.entries()) {
    if (scene.sequence !== index + 1 || scene.startSeconds !== cursor) errors.push(`Scene ${index + 1} has a timeline gap or overlap`);
    if (!Number.isSafeInteger(scene.durationSeconds) || scene.durationSeconds < 1 || scene.durationSeconds > MAX_PLANNED_SCENE_SECONDS) errors.push(`Scene ${index + 1} exceeds scene limits`);
    if (scene.endSeconds !== scene.startSeconds + scene.durationSeconds) errors.push(`Scene ${index + 1} end time mismatch`);
    cursor = scene.endSeconds;
  }
  if (cursor !== plan.targetDurationSeconds) errors.push("Timeline does not match target duration");
  return errors;
}
