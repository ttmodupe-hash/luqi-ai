/** Luqi spatial pilot: strict, bounded *suggested* image regions.
 * These are NOT segmentation masks, calibrated confidence or verified facts.
 */
import { z } from 'zod';

export const SPATIAL_MODES = ['EXAM_3D', 'CONTRACT_SHIELD', 'SERIAL_AUDIT'] as const;
export const spatialMode = z.enum(SPATIAL_MODES);
export type SpatialMode = z.infer<typeof spatialMode>;
export const spatialProvider = z.enum(['gemini', 'openai']);
export type SpatialProvider = z.infer<typeof spatialProvider>;
export const spatialRegionCategory = z.enum(['EXAM_CONCEPT', 'CONTRACT_TERM', 'HARDWARE_COMPONENT']);
export const normalizedBox = z.tuple([
  z.number().int().min(0).max(1000), z.number().int().min(0).max(1000),
  z.number().int().min(0).max(1000), z.number().int().min(0).max(1000),
]).refine(([y0, x0, y1, x1]) => y1 > y0 && x1 > x0, 'Invalid region coordinates');
export type NormalizedBox = z.infer<typeof normalizedBox>;

export const spatialRegion = z.object({
  label: z.string().trim().min(1).max(80),
  category: spatialRegionCategory,
  box_2d: normalizedBox,
  insight: z.string().trim().min(1).max(250),
}).strict();
export type SpatialRegion = z.infer<typeof spatialRegion>;

export const spatialAnalysis = z.object({
  sceneType: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(1400),
  regions: z.array(spatialRegion).max(4),
  limitations: z.array(z.string().trim().min(1).max(200)).max(4),
  nextStep: z.string().trim().min(1).max(300),
}).strict();
export type SpatialAnalysis = z.infer<typeof spatialAnalysis>;

export function parseSpatialAnalysis(value: unknown, mode: SpatialMode): SpatialAnalysis {
  if (mode === 'SERIAL_AUDIT') throw new Error('Serial audit must remain on-device');
  const parsed = spatialAnalysis.parse(value);
  const allowed = mode === 'CONTRACT_SHIELD'
    ? new Set(['CONTRACT_TERM'])
    : new Set(['EXAM_CONCEPT', 'HARDWARE_COMPONENT']);
  if (parsed.regions.some(region => !allowed.has(region.category))) throw new Error('Unexpected region category');
  return parsed;
}

/** A local string check, not optical recognition or a definitive IMEI classifier. */
export function possibleImei(value: string): boolean {
  return /^\d{15}$/.test(value.replace(/[\s-]/g, ''));
}
