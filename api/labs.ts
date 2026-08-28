import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  getBlueprint,
  listBlueprints,
  listSubjects,
  listGradeLevels,
} from "./services/labs/blueprints";
import {
  runCalculations,
  checkSafety,
  clampVariables,
} from "./services/labs/engine";
import {
  getFramework,
  listAfricanFrameworks,
  listAllFrameworks,
} from "./services/labs/curriculum";
import {
  translate,
  translateLabContent,
  translateUI,
  listSupportedLanguages,
  getLanguageForFramework,
  type SupportedLanguage,
} from "./services/labs/i18n";

export const labsRouter = createRouter({
  /** List available lab blueprints with optional filters */
  listBlueprints: publicQuery
    .input(
      z.object({
        subject: z.string().optional(),
        difficulty: z.string().optional(),
        gradeLevel: z.string().optional(),
      })
    )
    .query(({ input }) => {
      return listBlueprints(input);
    }),

  /** Get a single blueprint by slug */
  getBlueprint: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      return getBlueprint(input.slug);
    }),

  /** List available subjects */
  listSubjects: publicQuery.query(() => {
    return listSubjects();
  }),

  /** List available grade levels */
  listGradeLevels: publicQuery.query(() => {
    return listGradeLevels();
  }),

  /** Run a simulation with current variable values */
  runSimulation: publicQuery
    .input(
      z.object({
        slug: z.string(),
        variables: z.record(z.string(), z.number()),
      })
    )
    .mutation(({ input }) => {
      const bp = getBlueprint(input.slug);
      if (!bp) throw new Error("Blueprint not found");

      // Clamp variables to safe ranges
      const clamped = clampVariables(input.variables, bp.variables);

      // Run calculations
      const results = runCalculations(bp.formulas, clamped);

      // Check safety bounds
      const safety = checkSafety(
        { ...clamped, ...Object.fromEntries(results.map((r) => [r.name, r.value])) },
        bp.safetyBounds
      );

      return {
        blueprintSlug: bp.slug,
        title: bp.title,
        variables: clamped,
        results,
        safety,
      };
    }),

  /** Get AI tutor explanation for current simulation state */
  explain: publicQuery
    .input(
      z.object({
        slug: z.string(),
        variables: z.record(z.string(), z.number()),
        question: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const bp = getBlueprint(input.slug);
      if (!bp) throw new Error("Blueprint not found");

      const clamped = clampVariables(input.variables, bp.variables);
      const results = runCalculations(bp.formulas, clamped);

      // Build context for AI
      const varSummary = Object.entries(clamped)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      const resultSummary = results
        .map((r) => `${r.name}=${r.value.toFixed(4)}${r.unit}`)
        .join(", ");

      const prompt = `${bp.aiTutorPrompt}\n\nCurrent simulation state: ${varSummary}\nCalculated results: ${resultSummary}\n${input.question ? `\nStudent question: ${input.question}` : ""}`;

      return {
        prompt,
        blueprintTitle: bp.title,
        variables: clamped,
        results,
      };
    }),

  /** List all curriculum frameworks */
  listFrameworks: publicQuery.query(() => {
    return listAllFrameworks();
  }),

  /** Get a specific framework */
  getFramework: publicQuery
    .input(z.object({ key: z.string() }))
    .query(({ input }) => {
      return getFramework(input.key);
    }),

  /** List supported languages */
  listLanguages: publicQuery.query(() => {
    return listSupportedLanguages();
  }),

  /** Get languages for a framework */
  getFrameworkLanguages: publicQuery
    .input(z.object({ frameworkKey: z.string() }))
    .query(({ input }) => {
      return getLanguageForFramework(input.frameworkKey);
    }),

  /** Translate a specific key */
  translate: publicQuery
    .input(z.object({ key: z.string(), lang: z.string() }))
    .query(({ input }) => {
      return translate(input.key, input.lang as SupportedLanguage);
    }),

  /** Batch translate multiple UI keys */
  translateUI: publicQuery
    .input(z.object({ keys: z.array(z.string()), lang: z.string() }))
    .query(({ input }) => {
      return translateUI(input.keys, input.lang as SupportedLanguage);
    }),

  /** Translate a full blueprint into target language */
  translateBlueprint: publicQuery
    .input(z.object({ slug: z.string(), lang: z.string() }))
    .query(({ input }) => {
      const bp = getBlueprint(input.slug);
      if (!bp) return null;
      return translateLabContent(bp, input.lang as SupportedLanguage);
    }),
});
