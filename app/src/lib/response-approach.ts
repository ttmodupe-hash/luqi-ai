/** Bounded answer preferences, never model, tool, credential or spending overrides. */
export const RESPONSE_APPROACH_IDS = ['auto', 'teach', 'plan', 'compare', 'review', 'draft'] as const;
export type ResponseApproach = typeof RESPONSE_APPROACH_IDS[number];
export const RESPONSE_APPROACHES: readonly { id: ResponseApproach; label: string; description: string }[] = [
  { id: 'auto', label: 'Let Luqi choose', description: 'A direct answer shaped around your question and the context you choose to share.' },
  { id: 'teach', label: 'Teach me', description: 'Build understanding with key steps, a worked example and a short practice question.' },
  { id: 'plan', label: 'Make a plan', description: 'Turn your goal and constraints into practical steps, dependencies and a useful first action.' },
  { id: 'compare', label: 'Compare options', description: 'Compare the choices against your priorities, with assumptions and trade-offs made clear.' },
  { id: 'review', label: 'Review my work', description: 'Check the work you provide, explain specific corrections and identify what still needs verification.' },
  { id: 'draft', label: 'Draft or rewrite', description: 'Produce a usable draft in your chosen language and tone, with placeholders for missing facts.' },
];
export function isResponseApproach(value: unknown): value is ResponseApproach {
  return typeof value === 'string' && RESPONSE_APPROACH_IDS.some(id => id === value);
}
export function responseApproachLabel(value: ResponseApproach): string {
  return RESPONSE_APPROACHES.find(item => item.id === value)!.label;
}
