import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getBlueprint, listBlueprints, listSubjects, listGradeLevels } from "./services/labs/blueprints";
import { runCalculations, checkSafety, clampVariables } from "./services/labs/engine";
import { getFramework, listAfricanFrameworks, listAllFrameworks } from "./services/labs/curriculum";
import { translate, translateLabContent, translateUI, listSupportedLanguages, getLanguageForFramework, type SupportedLanguage } from "./services/labs/i18n";

export const labsRouter = createRouter({
  listBlueprints: publicQuery
    .input(z.object({ subject: z.string().optional(), grade: z.string().optional(), framework: z.string().optional() }).optional())
    .query(({ input }) => listBlueprints(input)),
  getBlueprint: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => getBlueprint(input.slug)),
  listSubjects: publicQuery.query(() => listSubjects()),
  listGradeLevels: publicQuery.query(() => listGradeLevels()),
  getFramework: publicQuery
    .input(z.object({ key: z.string() }))
    .query(({ input }) => getFramework(input.key)),
  listAfricanFrameworks: publicQuery.query(() => listAfricanFrameworks()),
  listAllFrameworks: publicQuery.query(() => listAllFrameworks()),
  runSimulation: publicQuery
    .input(z.object({ slug: z.string(), variables: z.record(z.string(), z.number()) }))
    .mutation(({ input }) => {
      const bp = getBlueprint(input.slug);
      if (!bp) throw new Error("Blueprint not found");
      const clamped = clampVariables(input.variables, bp.variables);
      const results = runCalculations(bp.formulas, clamped);
      const safety = checkSafety({ ...clamped, ...Object.fromEntries(results.map((r) => [r.name, r.value])) }, bp.safetyBounds);
      return { blueprintSlug: bp.slug, title: bp.title, variables: clamped, results, safety };
    }),
  explain: publicQuery
    .input(z.object({ slug: z.string(), variables: z.record(z.string(), z.number()), question: z.string().optional() }))
    .mutation(async ({ input }) => {
      const bp = getBlueprint(input.slug);
      if (!bp) throw new Error("Blueprint not found");
      const clamped = clampVariables(input.variables, bp.variables);
      const results = runCalculations(bp.formulas, clamped);
      const varSummary = Object.entries(clamped).map(([k, v]) => `${k}=${v}`).join(", ");
      const resultSummary = results.map((r) => `${r.name}=${r.value.toFixed(4)}${r.unit}`).join(", ");
      const prompt = `${bp.aiTutorPrompt}\n\nCurrent simulation state: ${varSummary}\nCalculated results: ${resultSummary}\n${input.question ? `\nStudent question: ${input.question}` : ""}`;
      return { prompt, blueprintTitle: bp.title, variables: clamped, results };
    }),
  translate: publicQuery
    .input(z.object({ key: z.string(), lang: z.string() }))
    .query(({ input }) => translate(input.key, input.lang as SupportedLanguage)),
  translateUI: publicQuery
    .input(z.object({ keys: z.array(z.string()), lang: z.string() }))
    .query(({ input }) => translateUI(input.keys, input.lang as SupportedLanguage)),
  translateBlueprint: publicQuery
    .input(z.object({ slug: z.string(), lang: z.string() }))
    .query(({ input }) => translateLabContent(input.slug, input.lang as SupportedLanguage)),
  listLanguages: publicQuery.query(() => listSupportedLanguages()),
  getFrameworkLanguages: publicQuery
    .input(z.object({ frameworkKey: z.string() }))
    .query(({ input }) => getLanguageForFramework(input.frameworkKey)),
});
