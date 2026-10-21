# LUQIToons: Training-First 3D Production Architecture (Draft)

**Decision:** High-quality 3D as the primary creative target; maximum **finished** video length of **420 seconds (7 minutes)**. Preserve the existing VideoStudioPage UI, presets, language map, project data, API routes, credit system and current scene renderer. No production deployment or provider spending is authorized by this document.

## Repository audit (2026-10-21)

- Existing entry point: `src/pages/VideoStudioPage.tsx`; routes `/luqitoons`, `/video-studio` and legacy aliases in `src/App.tsx`.
- Existing tRPC implementation: `api/video.ts`, with project CRUD, cost/balance, generation, and provider pipeline `executeAnimationPipeline`.
- Current `video.generate` accepts 2–60 seconds; `calculateCost` accepts 1–300 seconds. **These are scene-level or existing single-job limits; they do not support seven-minute assembled output.**
- Presets cover STEM, solar energy, spaza shops, folklore, and geometry. Existing language codes include African languages.
- **Critical commercial security gap:** `api/video.ts` uses `publicQuery` for `topupCredits`, project modifications, job-state transitions, and `generate`, with caller-provided or default `userKey`. Treat these as untrusted until authorization and verified payments are enforced. Do not expose seven-minute paid generation through these endpoints.
- UI contains fixed/estimated provider pricing, fallback wallet balances and provider marketing claims. Verify against actual provider capabilities and live accounting before presenting as guarantees.
- Current rendering provider availability, 3D scene consistency, multilingual audio accuracy, seven-minute assembly, and refund guarantees are **not verified**.

## Architecture: scene-first, quality-gated

1. **Brief & learning design** — audience, purpose, measurable objectives, curriculum alignment, age, language, accessibility, safeguarding and factual sources.
2. **Director agent** — script, timed narration, storyboard, scene/shot list, camera directions and visual references; human review before expensive generation.
3. **Character & environment bible** — stable character IDs, consent/licensing metadata, model sheets, clothing, lighting, voices, props, scene continuity and culturally reviewed assets.
4. **Production plan** — deterministic timeline contract in `src/lib/luqitoons/productionPlan.ts`: 420-second cap, scenes <=15 seconds, <=60 scenes, no timeline gaps/overlaps. This is **planning only**, not rendering.
5. **Provider adapters** — capability checks and verified per-scene quotes; render idempotently using provider-specific constraints. Separate retries for each scene. Never imply a vendor produces native editable 3D meshes unless confirmed.
6. **Audio and subtitles** — language-appropriate voices, timing, consent for voice likeness, pronunciation and translation review, subtitle files and accessible transcripts.
7. **Assembly** — queued durable jobs, ordered scene asset manifests, verified audio sync, transitions, encoding, duration validation, output checksums, storage and downloadable final asset.
8. **Training QA** — learning-objective coverage, factual review, visual correctness, voice/subtitle quality, continuity, and human approval for safety-sensitive material. A fluent script is not proof of factual accuracy.
9. **Publish and revise** — private preview, selective scene regeneration, versioned provenance, permissioned sharing, cost/credit reconciliation and teacher assessment hooks.

## Training quality gates

- All educational productions specify at least one learning objective.
- Before generation, validate the storyboard against objectives and intended audience.
- A reviewer must sign off on safety-critical, medical, scientific, financial, or regulated training.
- Show which language tracks are machine-produced versus human-reviewed; do not claim all 22 languages have production-quality TTS.
- Every output should include an optional transcript and captions; support low-bandwidth export and a still-frame lesson alternative.
- Benchmark against competitor outputs using controlled prompts, not unsupported claims of superiority.

## Seven-minute budget

At a planning default of 10 seconds per scene, a 420-second production has **42 scenes**. This is not a promise that providers can generate all scenes in one request or that a particular price or turnaround is achievable. A cost preflight must include generation, retries, audio, storage, assembly, provider overhead and refunds; require an authenticated purchase or authorized credit reservation before starting.

## Safe rollout

**Phase A (implemented on draft branch):** pure production plan, validation, tests, documentation. Existing scene UI and rendering untouched.

**Phase B:** secure accounts, verified payments, ownership checks, job idempotency, durable queues, provider capability/quote checks, server-side rate limits and audit trail.

**Phase C:** optional storyboarding UI alongside the existing studio, human-editable scene plan and character bible; previews without billing.

**Phase D:** staged renderer integration, audio/captions, assembly, QC, failure recovery and verified billing; end-to-end tests.

**Phase E:** advanced training assessments, cultural/language review, offline exports, device performance and teacher workflow.

**Release gates:** unit and integration tests; `npm run check`, `npm test`, `npm run build`; browser accessibility; authentication and billing security review; real provider render and seven-minute assembly validation; staging review; explicit deployment approval. Existing repository-wide TypeScript errors currently prevent a clean CI gate.
