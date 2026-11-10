# LUQI digital-manager design standard

Owner direction, 9 November 2026: the product must feel futuristic, polished, useful and visually appealing without the owner repeatedly having to obtain design guidance elsewhere. A working function is not a completed user experience.

## Design requirements
- Design the user's task before the explanatory text. Make the next action obvious. Prefer focused workspaces, meaningful selections and useful empty states to document-like panels.
- Use a coherent visual language: deep navy/graphite surfaces, high-contrast text, restrained cyan and lime accents, clear geometry and generous spacing. Follow the current Drive and Civic Atlas visual system. A colour change alone is not a redesign.
- Use the right layout for each task: map for exploration, timeline for progress, workbench for practice and evidence inspector for sources. Do not turn every module into identical cards.
- Make actions real. Buttons change a view, perform a permitted operation or open an identified original source. No fake agent activity, simulated live metrics, invented success indicators or decorative controls.
- Put essential limitations next to decisions. Keep detailed provenance and explanations accessible through disclosures instead of a first-view wall of cautions. Preserve source content and meaningful nuance.
- Use restrained hover/focus/selection transitions, not perpetual animation. Honour reduced-motion and forced-colour preferences. Native keyboard interactions, unique accessible IDs, visible focus and 48px principal touch targets are required.
- Inspect the actual built screen at desktop, 390px and 320px. Check readability, hierarchy, spacing, density, empty/error states and navigation. Passing tests alone is neither visual review nor accessibility certification.
- Prefer local fonts and lightweight CSS/SVG. Do not add paid AI calls, subscriptions, tracking, external stock assets or repeat login prompts merely to deliver a visual improvement.
- Preserve working feature, privacy, source, storage, permission and download contracts. Review before production release; a preview is not a deployment.

## First application and concurrent work reconciliation
The screenshot's shared CivicWardGuide becomes a task-led Civic Manager: four local task selectors, focused next steps, explicit source actions and a complete collapsible seven-channel evidence library. Existing source URLs, original civic cautions, equal-evidence standard, non-profiling boundary and review date are retained. No ward, representative or party preference is inferred.

During implementation main advanced from 853af20b to a9141c5, bringing separate Drive and Civic Atlas improvements. Those updates are preserved, including the new fuel planning workflow, collection reorder controls, multilingual saved-guide reader, Civic Atlas map and evidence inspector, and desktop checksum work. The earlier draft's replacement notebook and blanket Drive theme are not retained over that newer implementation. The focused Civic Manager uses the updated navy/cyan/lime style in both existing host screens. Both frontend trees remain identical for these shared files.

No new live-data feed, paid service, deployment, collection or operational status is introduced. The static civic orbit is decorative, not a location or live signal. The source-channel count derives from actual local data.

## Acceptance
Tests preserve seven exact URLs, original cautions, task selection, unique IDs, local-only interactions and mirrored production files. Existing GPS, narration, fuel, notebook and Civic Atlas tests remain required. Browser journeys cover task changes, keyboard, reduced motion, 320px layout, retained multilingual file downloads and absence of added GPS/external requests. Existing Civic Atlas and Drive planning browser journeys also run. Actual application screenshots are retained for visual inspection. Record exact-commit results separately; this document does not predeclare a pass.
