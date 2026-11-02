# Legacy Gemini adapter retirement

## Scope

`api/geminiService.ts` used to construct an unmetered provider SDK client and,
when requests failed, manufacture scientific prose with static source links,
a procedural image labelled successful, a sample video/queued identifier, or
an invented transcript. Speech failure also returned a browser fallback marker.
Those results were not evidence of a completed provider operation.

The production route denylist already blocks the legacy Gemini generation
endpoints. This change adds a boundary at the service itself: all five public
methods reject with `LegacyGeminiUnavailableError`, code
`AI_LEGACY_ROUTE_DISABLED`, status `503`, and one fixed public-safe message.
The service does not inspect inputs, read credentials, import an SDK, make
network requests, log user content, retry, or return fabricated results.
Compatibility types are retained for dormant callers; they do not promise an
available feature. The error's status property does not itself configure an
HTTP handler: the existing route middleware remains the public 503 boundary.

## What is unchanged

The authenticated text pilot uses `api/services/aiPilotGateway.ts`, not this
adapter. Its existing $100/month allocation ($60 Gemini/$40 OpenAI), consent,
quotas, durable reservations and provider switches are not changed. The local
silent animation studio and browser physics tools are not provider integrations
and are unaffected. Customer payments, Omega workers, production credentials,
MySQL schema/data and backups are not modified by this patch.

There is deliberately no environment flag that can reopen this service. Any
future text, image, video, transcription or speech integration needs its own
reviewed authentication, ownership, consent, metering, approved allocation and
provider-result verification. It must return explicit failure when unavailable.

## Verification

Run the dependency-free Node tests before installing provider SDKs:

```sh
node --experimental-strip-types --test scripts/verify-legacy-gemini-boundary.mjs
```

The 29 cases exercise all five methods, invalid and hostile inputs, missing and
synthetic populated keys/activation flags, no fetch/logging, 50 concurrent
rejections, independent error instances, and a source guard against SDK,
credential or sample-output reintroduction. Test inputs are synthetic; no real
provider request, database write or customer account is involved.

The dedicated workflow repeats these checks before dependency installation and
runs strict TypeScript validation using the locked compiler. The existing web,
container and security workflows still provide integration/build evidence.
Passing this adapter's checks is not proof that every legacy route or service
has been audited, whole-repository TypeScript debt is resolved, or a paid pilot
reply has succeeded. Confirm CI and the deployed revision separately before
calling the change live. Track rollout and remaining gates in issue #202.
