# LUQI Experiential Learning Engine — Africa-first specification

Status: architecture proposal; existing simulators are preserved. Do not label an untested capability as implemented.

## Mission
Help learners across Africa move from observing scientific concepts to performing experiments, solving authentic problems, and demonstrating competence. Support school, vocational, university and workforce pathways with language-aware, low-bandwidth experiences.

## Existing foundation (source inventory, not functionality certification)
- `src/components/ExecutiveLabSuite.tsx`: links to standalone pendulum/physics, enzyme/biology, titration/chemistry, algebra/calculus and geometry labs under `public/labs`.
- `src/pages/LabSimulatorPage.tsx`: curriculum framework, language, variable, procedure, results and safety-bound interfaces. Currently includes `// @ts-nocheck`; remove only after type fixes and regression tests.
- Preserve existing lab HTML, routes, original UI, and AI/agent integrations.

## Progressive simulation levels
1. **Accessible 2D:** keyboard-friendly SVG/Canvas, labels, downloadable experiment records, low-data and reduced-motion mode.
2. **Interactive 3D:** rotate, zoom, manipulate apparatus, accurate units and constrained parameters; degrade gracefully on low-end devices.
3. **4D/time-dependent:** change parameters and observe a reproducible system evolving through time, with pause, scrub, reset, compare and replay.
4. **Applied scenario:** troubleshoot a real-world African setting (solar microgrid, water testing, agriculture, telecom networking, clinical training *simulation only*).
5. **Competency assessment:** require predictions, measurement, calculations, explanations, evidence and reflection, not only animation completion.

## Shared experiment contract
Each lab should publish versioned metadata:
- `id`, `version`, `title`, `subject`, `curriculumTags`, `gradeBands`, `languages`, `estimatedDataMb`.
- `learningOutcomes`, `prerequisites`, `safetyNotices`, `units`, `parameters`, `parameterBounds`.
- `modelAssumptions`, `numericalMethod`, `timeStep`, `errorTolerance`, `knownLimitations`.
- `steps`, `measurements`, `expectedTrends`, `assessmentRubric`, `accessibilityFallback`.

## Scientific validation gates
- Physics pendulum: compare small-angle period against analytic approximation in its valid regime; test total energy error tolerance for each integrator and time step. **RK4 does not guarantee exact energy conservation**.
- Chemistry titration: verify mass balance, charge balance, equivalence volume and pH behavior against reference cases.
- Biology enzymes: verify Michaelis–Menten limiting behavior, units and inhibition assumptions; label simplified models.
- Algebra: compare numerical derivatives and integrals to analytic reference functions.
- Geometry: validate solids, cross sections and volume calculations against known cases.
- Make numerical accuracy and simplified assumptions visible to teachers and learners.

## Assessment and learner support
- Teacher-guided, exploration, and exam-practice modes.
- AI tutor can explain and ask questions, but scored outcomes use deterministic rubric checks or human-reviewed grading where appropriate.
- Save experiments and progress only with user consent and authenticated ownership checks; avoid storing children's unnecessary personal data.
- Support translations through reviewed local-language terminology and bilingual technical glossaries.
- Export a concise experiment report including inputs, observations, graphs, methodology and results.

## Initial implementation sequence
1. Inventory each existing lab, smoke-test entry routes, and capture baseline screenshots.
2. Introduce a shared typed metadata schema and validation tests without changing existing labs.
3. Add deterministic scientific regression fixtures for each of the five labs.
4. Add reusable experiment notebook, replay, progress and assessment components.
5. Build 3D and time-dependent enhancements per lab with 2D/offline fallback.
6. Pilot with teachers and learners across devices, languages and bandwidth levels.

## Non-negotiables
Do not remove existing modules, degrade the original design, claim offline operation without offline tests, or claim full curriculum compliance without educator validation. All simulated experiments must be labeled as simulations, not substitutes for safety-critical hands-on qualification.
