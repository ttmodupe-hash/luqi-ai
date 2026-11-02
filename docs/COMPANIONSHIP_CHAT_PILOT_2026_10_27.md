# Luqi Companion — voluntary personal context inside Chat (27 October 2026)

## What this release actually adds

- The existing signed-in `/#/chat` page offers an optional **Companion conversation** style. It asks the same budgeted authenticated text provider gateway for a warmer, more conversational response, with one deliberate provider consent and Send action. No extra paid model route or automatic retry is introduced.
- Signed-in customers can optionally click **Load my saved notes** within Chat, choose one user-authored saved note message of 350 characters or fewer, review it, and separately check **Include the selected note in this one provider request**. The note is never sent on load, selection, navigation or on its own.
- Any shared note is prepended to that one consented question as user-provided background, not a system instruction. Provider context and the entire question must satisfy the unchanged 6,000-character gateway limit; the UI refuses oversize requests, never silently truncating a note.
- The share checkbox resets immediately when the request is started and when accounts or active chats change. No automatic note learning, unsanctioned data reuse, cookies, long-lived browser credential storage or new paid limits.
- The existing private-notes page remains available for manually creating, editing through further messages, exporting or deleting saved notes. Only **user-authored** note messages are selectable in Chat; it never treats stored AI messages or other account data as consent.
- The original Chat continues to work with companion style and saved notes completely disabled. Existing cost, throttling, model response validation and fail-closed behavior are unchanged.

## What this release does NOT claim

This is an opt-in **text companion pilot**, not an always-on human-like friend, therapist, unattended crisis response service, verified African-language quality, autonomous agent, automated persistent memory, or cross-device AI conversation archive. Confirmed Chat replies remain in tab memory and disappear on reload/sign-out. Private notes persist separately, and are not implicitly passed to providers. Voice and media remain in development.

This change does **not** prove physical-phone usability, repeated AI replies, provider invoice cost reconciliation, or paid-launch readiness. Publish such claims only after independent exact-deployed-commit checks and designated human pilot acceptance.

## Review checklist

1. Mirror all changed `src` and `app/src` components, client logic and styles exactly.
2. Run offline Vitest for unchanged-default chat, explicit note load, owner token use, assistant-role exclusion, input limits and error handling. No network-dependent model calls.
3. Run WebKit/Chromium browser acceptance and the existing security, MySQL and release checks.
4. After merge, verify Railway production revision and public readiness/release identity. Do not equate configuration-only readiness with a paid provider reply.
