/** Shared browser-only education contract. Never import server runtimes into the UI. */
export type GradeTier = "PRE_SCHOOL" | "PRIMARY" | "HIGH_SCHOOL" | "HIGHER_LEARNING";

export interface EducationalModuleRecord {
  id: string;
  conceptHash: string;
  conceptName: string;
  targetGradeTier: GradeTier;
  compiledFrontend: string;
  optimizationsCount: number;
  failureLog?: string | null;
  timestamp: string;
  description?: string;
  initialValue?: number;
  min?: number;
  max?: number;
  unit?: string;
}
