import { z } from 'zod';

/** All boxes are model-estimated rectangles, not pixel masks or verified OCR. */
export const SPATIAL_MODES = ['EXAM_3D', 'CONTRACT_SHIELD', 'SERIAL_AUDIT'] as const;
export type SpatialMode = typeof SPATIAL_MODES[number];
export const SPATIAL_CATEGORIES = [
  'SERIAL_PRIMARY', 'IMEI_REJECTED', 'CONTRACT_TERM', 'EXAM_CONCEPT', 'HARDWARE_COMPONENT',
] as const;
const coordinate = z.number().int().min(0).max(1000);
export const spatialBox = z.tuple([coordinate, coordinate, coordinate, coordinate])
  .refine(([top, left, bottom, right]) => top < bottom && left < right, 'Invalid box order');
export const spatialEntity = z.object({
  label: z.string().trim().min(1).max(90),
  category: z.enum(SPATIAL_CATEGORIES),
  box_2d: spatialBox,
  insight: z.string().trim().min(1).max(240),
}).strict();
export const spatialAnalysis = z.object({
  summary: z.string().trim().min(1).max(900),
  guidance: z.string().trim().min(1).max(1400),
  entities: z.array(spatialEntity).max(4),
  limitations: z.string().trim().min(1).max(350),
}).strict();
export type SpatialAnalysis = z.infer<typeof spatialAnalysis>;
export const spatialReply = z.object({
  status: z.literal('success'),
  analysis: spatialAnalysis,
  provider: z.enum(['gemini', 'openai']),
  provider_model: z.string().min(1).max(100),
}).strict();
export type SpatialReply = z.infer<typeof spatialReply>;

/** IMEI-like 15-digit sequences must not be echoed to a user in the result. */
export function containsImeiLikeDigits(text: string): boolean {
  return /(?:^|\D)(?:\d[ -]?){14}\d(?=\D|$)/u.test(text);
}
