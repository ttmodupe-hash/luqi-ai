# Luqi Spatial Vision & 3D Lab — limited pilot

## What is actually implemented

- **On-device image preparation:** JPEG/PNG header and size checks, 1024-pixel max dimension, metadata-free Canvas JPEG re-encoding (existing Visual Tutor). Optional contrast(1.18)/brightness(1.04) pass. The UI shows approximate prepared-byte size; it does not claim a fixed bandwidth saving or improved OCR accuracy.
- **Spatial regions:** Manual rectangular selection, 0–1000 [ymin,xmin,ymax,xmax] coordinates, up to 12 user-drawn opaque masks, and local edge-gradient saliency tiles. The tiles are *unverified image-detail candidates*, not semantic object detections or pixel-level masks.
- **2.5D:** Rotatable 64×44 Canvas point cloud with brightness-derived height and tilt/spin controls. It is a synthetic luminance relief, not metric monocular depth, Gaussian splatting, mesh reconstruction, CVPR/UniGS/AIMS weights or real 3D.
- **Exam/STEM mode:** Selected-image explanation through the existing Visual Tutor Gemini endpoint, after user sign-in, preview, explicit consent and Send. Explanations may be wrong; no guarantee of full exam marks.
- **Contract review mode:** The same bounded image explanation with a caution not to invent legal findings, plus a separate deterministic fixed-nominal-rate amortization illustration. Fees, taxes, insurance, variable rates, notices, legal rights and professional advice are outside that calculator.
- **Serial audit mode:** User must crop and mask IMEI/other identifiers, review the exact outbound image and explicitly consent. Text output masks IMEI-like digit sequences. This is **not automatic IMEI detection or proof of zero IMEI transmission**; only a manually redacted crop is sent.

## AI security and cost

The lab does not contain provider API keys, browser-side SDKs, provider URLs, autonomous retries or background inference. It reuses the existing authenticated `/api/v1/visual-tutor` route, bounded JPEG validator, Gemini-only model, one durable shared budget reservation, shared per-account daily limit, provider-output validation and no-retry behavior.

One request reserves $0.10 from Luqi's existing application allowance. Reservations are not invoices or provider-side hard limits. The actual provider bill, model availability, quality and data-processing terms must be independently reviewed.

No OpenAI image endpoint is activated by this PR. A future dual-engine rollout must add a separately tested server-side OpenAI vision path with explicit user provider selection, independent provider entitlement, image-specific reservation sizing and no silent fallback after ambiguous outcomes. Never use `VITE_OPENAI_API_KEY` or `VITE_GEMINI_API_KEY` in browser code.

## Next research gates

1. Benchmark low-resolution exam photos, hardware serial labels and contracts using consented, synthetic or appropriately redacted examples. Record OCR/box precision and failure rates, not assumed percentages.
2. If semantic segmentation is required, review licence/weights and run a genuine detector or segmenter (e.g. a validated local model or isolated inference service). Do not relabel prompt-suggested boxes as pixel-accurate masks.
3. For actual monocular depth, evaluate a licensed depth model on representative mobile devices; compare compute cost, WebGPU compatibility, memory, accessibility and CPU fallback.
4. Ground NCA/CPA/SARS content in a dated, reviewed legal source registry and deterministic calculations. Do not claim legal conclusions from unverified model text.
5. Conduct independent physical-device, privacy, data-retention, provider-cost and operational acceptance before advertising production vision reliability.

The lab is a local-first educational feature; it is not a paid-launch certification or an endorsement by any researcher.
