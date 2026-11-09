# LUQI digital-manager design standard

Owner direction, 9 November 2026: the product must feel futuristic, polished, useful and visually appealing without the owner repeatedly having to obtain design guidance elsewhere. A working function is not a completed user experience.

## Required design approach
- Design the user's task before the explanatory text. Make the next action obvious; use focused workspaces, meaningful selections and useful empty states rather than stacking document-like panels.
- Establish one visual language: deep forest/graphite surfaces, high-contrast warm text, restrained lime emphasis, clear geometry, generous spacing and a selective editorial heading. Colour must support hierarchy, not substitute for it. Do not assume a colour change alone is a redesign.
- Different tasks need appropriate layouts. Use a map for exploration, a timeline for progress, a workbench for practice, and an evidence inspector for sources. Do not turn every module into identical cards.
- Make actions real. Buttons must change a view, perform a permitted operation or open an identified original source. Do not use fake agent activity, simulated live metrics, animated percentages, invented success indicators or decorative controls.
- Put the essential limitation next to the decision. Keep detailed provenance and explanations accessible in disclosures instead of displaying a wall of cautionary text on first view. Do not remove original evidence to improve appearance.
- Meaningful hover/focus/selection transitions only; no infinite decoration. Honour reduced-motion and forced-colour preferences. Use native keyboard interactions, named controls, visible focus and 48px main touch targets.
- Inspect the real built screen at desktop, 390px and 320px. Readability, spacing, content density and navigation count alongside functional tests. Passing tests is not a claim of a visually reviewed screen or accessibility certification.
- Prefer local fonts and light CSS/SVG. Do not add paid AI calls, new subscriptions, tracking, unnecessary network images or repeated login prompts to deliver a visual improvement.
- Preserve working feature, privacy, data, source, storage and authorization contracts. Review and merge before deployment; never deploy merely to present an improved mock-up.

## First applied implementation
Base: main 853af20b6389b1f721347b4ce613b28107d04f8c, which contains the screenshot's civic guide. Separate from earlier open feature drafts.

The shared CivicWardGuide becomes an interactive Civic Manager with four local task selectors, a focused next-step panel, explicit original-source actions and an expandable complete seven-channel evidence library. Existing civic statements, source URLs, equal-evidence rule, non-profiling boundary and review date are preserved. No ward or representative is inferred. It also appears in the existing Civic Evidence Desk through the same shared component.

Luqi-Drive receives a cohesive scoped theme across its header, trail selection, narration controls, map controls, guide and field notebook. Map/GPS and voice logic are unchanged. FieldNotebook keeps its existing browser storage schema, text export and checksum behavior, with an intentional empty state and clearer selected-place and saved-collection presentation. Both frontend trees receive identical components and styles.

No new data feed, paid service, deployment, automatic collection or operational status is introduced. The decorative civic orbit is a static illustration, not a location or live signal. Source channel count and saved-place count derive from actual local data.

## Acceptance evidence
New tests preserve all seven official channels and original caveats, task selection, unique accessible IDs, local-only interaction and mirrored code. Existing GPS, narration, fuel and notebook tests remain required. Built-browser tests cover real navigation, task changes, native keyboard controls, reduced motion, 320px layout, functioning downloads and absence of new location/external requests. The workflow retains screenshots for actual visual inspection. Record results only after the exact candidate has run; this document does not predeclare a pass.
