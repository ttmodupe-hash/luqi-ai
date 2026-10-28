# Visual tutor: first image-understanding integration

The `/visual-tutor` page accepts a local JPEG/PNG, lets the user choose a rectangular
region, previews it, and sends only the re-encoded crop and explicit question to
Google Gemini after authenticated, per-request agreement. Reply language is chosen
explicitly. This is manual region selection plus a vision-language explanation;
it does not implement EntitySeg, AIMS, UniGS, automatic segmentation or 3D recovery.

## Processing and limits

- Read source dimensions before browser decode: 8 MB, 8192 pixels/side and 32 MP.
- Resize the local preview to at most 1024 pixels/side. Canvas re-encoding removes
  original EXIF and filename; transparent PNG backgrounds become white.
- Manual pointer selection and keyboard-accessible sliders; preview the precise
  crop before agreement. Fine details can be lost in the bounded preview.
- Authenticated API identity, literal boolean consent, strict request schema,
  JPEG signature/dimension checks, 350 KB image limit and 512 KB streamed body cap.
  Header checks do not certify every JPEG byte; the provider can reject corruption.
- No external image URLs, keys, model selection, account IDs or history in requests.
- Existing model `PILOT_MODELS.gemini`, low media resolution, max 512 output tokens,
  20-second provider deadline, one transport attempt, no tools, no fallback/retry.
- Existing billing/provider flags, approved monthly profiles, atomic MySQL
  reservations and shared daily account attempt counter apply. No new activation
  or budget configuration is set by this feature.
- One $0.10 conservative application reservation per attempt, retained on failure.
  The provider's bill is separate; this reservation is not a provider hard cap.
- No app photo/answer persistence. Clearing, leaving or changing identity discards
  page content; an already accepted provider request cannot be recalled/refunded.
  Provider retention/processing follows its API terms. Use nonprivate test photos.
- Account changes and cancellation invalidate pending local results. Ambiguous
  outcomes require an explicit new-request action and renewed agreement.

## Cost assessment (28 October 2026)

No new GPU service or monthly ceiling increase is needed for this initial API
integration. It shares the configured Gemini allowance with text requests.
Google lists Gemini 3.8 Flash at $0.75/1M input tokens and $3.75/1M output tokens
(including thinking) through 31 December 2026; listed prices double on 1 January
2027. At an illustrative 1500 input tokens and 512 output tokens, the list-price
calculation is about $0.00305 per request today. This is an example, not a measured
request cost, invoice or guarantee; actual usage and provider terms govern.

The application's $0.10 reservation means 100 image attempts allocate $10 from
the shared Gemini allowance regardless of lower actual charges. Review measured
usage before changing this conservative reserve or increasing monthly caps.
The repository supports exact $100 and $300 approved profiles; this change does
not select or increase either profile. OAuth platform reads withhold variable
values, so repository configuration support does not prove the live selected cap.

Official references checked:
- https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/media-resolution

## Research relationship and follow-on work

Lu Qi's work motivates useful region-focused interactions. Integrating the
published segmentation methods requires independent code/weight licence review,
dependency isolation, compute benchmarking and comparisons on representative
consented examples. The official Entity toolbox currently lists AIMS and UniGS
code as awaiting release. Do not advertise those algorithms as integrated here.

Before promoting the visual tutor beyond a limited trial, evaluate ordinary
objects, educational diagrams, blur/occlusion, multilingual replies and uncertainty
on a reviewed dataset. Unit/browser tests use synthetic fixtures; passing them
proves request/consent behavior, not visual accuracy or model entitlement.

## Validation

Targeted tests cover genuine synthetic JPEG transport through the real Gemini SDK
with mocked HTTP, one reservation, refusals/incomplete replies, failures without
fallback, identity/consent/body bounds, corrupt input, client deadlines and crop
bounds. The browser test exercises real local canvas crop/re-encoding, keyboard
selection, language, explicit send, sign-out clearing and narrow layouts with
synthetic auth/provider responses. CI runs the production build and these checks.
A live response from the deployed endpoint needs separate authorized acceptance;
no live provider request is made by automated tests.
