# Launch Control — Tool 024

Route: `/#/launch-control` (also `/#/tool-024`). Discoverable through workspace search and Service status. This is a working release-evidence workbench, not an unrestricted cloud daemon or an ASI claim.

## Implemented behavior

- A typed, validated dependency graph supports up to 24 steps, 12 parents per step and two concurrent registered checks. Cycles, duplicate IDs, unknown dependencies and substituted system roles are rejected. Independent checks continue when another branch is blocked. Manual checkpoints require explicit owner acknowledgement.
- The only live operations are bounded same-origin GETs to the existing `/v1/release` and `/v1/health` endpoints. They omit credentials, reject redirects, require non-cacheable JSON, enforce a five-second deadline and limit responses to 4 KiB. No startup probe, AI request, arbitrary URL, DNS write, payment call or database mutation is introduced.
- Owner review is bound to a full Git commit and requires current release-identity and health evidence. Confirmation re-reads the live release each time and compares that exact revision. Changing the target or upstream evidence clears dependent review. Evidence expires after five minutes; an observation is not an uptime or whole-platform readiness guarantee.
- JSON checkpoints preserve the project, target, dependency graph and observed results. SHA-256 checks the canonical payload, not authorship, signatures or the truth of evidence. Restored results are always historical and require renewed checks and review. Exports are explicit; no automatic persistence or upload occurs. Raw mail inputs, keys, customer tokens and acknowledgement checkboxes are excluded. Files are limited to 64 KiB.
- Cancellation, account changes and unmount abort pending HTTP work and discard late replies. An account change also clears mail inputs, task context, review and activity. Activity entries reflect actual work in the current tab; they are not fabricated command output or an external SSE stream.
- The dashboard adapts to 320px, offers native labelled controls, visible keyboard focus, 48px controls and reduced-motion styles. Root and app sources remain identical. No whole-site WCAG certification is claimed.

## Email preflight

The local checker scopes supplied TXT values to their exact domain, holds duplicate SPF records, preserves existing mechanism qualifiers and inserts a new provider include before `all`. Unsafe all-pass policies, redirects, unsupported macros, malformed addresses and unreachable terms require review. Visible DNS-querying terms are a **minimum**, not a complete recursive RFC 7208 lookup count or compliance verdict. Nested includes, DNS answers, MX expansion and void lookups are not resolved.

RSA public keys are actually imported with WebCrypto as SPKI, accepting modulus sizes from 2048 to 8192 bits. Ed25519 imports require a 32-byte raw public key. This verifies local key structure, not domain ownership, DNS publication, matching private keys or a signed message. The DMARC proposal uses an explicit policy (default `none`) and invents no reporting mailbox. Existing DKIM/DMARC records are not fetched or merged, so proposals must not be blindly published.

Primary references reviewed on 9 November 2026:

- [SPF: RFC 7208](https://www.rfc-editor.org/rfc/rfc7208.html)
- [DKIM: RFC 6376](https://www.rfc-editor.org/rfc/rfc6376.html)
- [Ed25519 DKIM: RFC 8463](https://www.rfc-editor.org/rfc/rfc8463.html)
- [DMARC: RFC 9989, May 2026](https://www.rfc-editor.org/rfc/rfc9989.html), which obsoletes RFC 7489 and RFC 9091.

## Operational scope and release

Cloudflare/mail writes are labelled not connected; payment/KYC readiness is labelled not checked. There is no password, private-key, bank-document or API-token field. A future external integration needs a server-side scoped adapter, exact-action review, idempotency, integration tests and rollback before it can make changes. No MCP server, cross-project cloud credentials, CRDT sync, autonomous promotion or ML training is implied by the local typed registry.

The release uses the existing reviewed GitHub/main and Railway production pipeline. Required checks remain in force, including Chromium/WebKit, production asset delivery and existing account/privacy boundaries. The new focused suite covers graph validation, explicit gates, commit binding, cancellation, account isolation, checkpoint tampering and historical restore, HTTP contracts, SPF edge cases and real public-key imports. The browser journey downloads an actual checkpoint, inspects it, restores it without silently approving and checks local email behavior at 320px with no POSTs.

No dependency, provider flag, model, quota, billing setting or infrastructure tier is changed. No new paid service is needed. The attachment's fixed exchange rate, free-tier allowance, traffic savings and ZAR estimates are not adopted as an operating budget.

Input provenance: `Pasted text(7).txt`, SHA-256 `61f15ab9dc7626b75b6f49c4aed169bcc127a6c174b979a2b81fd21d08975c8d`. Its 15-pillar objectives remain in the master specification with explicit implementation limits.
