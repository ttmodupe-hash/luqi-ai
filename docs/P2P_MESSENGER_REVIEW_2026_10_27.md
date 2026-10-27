# Luqi private peer messaging — implementation and release boundary

27 October 2026. Owner requested review, advancement and integration of the supplied SovereignP2PEngine and SovereignP2PMessenger. This implementation replaces the supplied demonstration rather than shipping its claims.

## What was corrected

| Supplied behaviour | Integrated behaviour |
|---|---|
| SHA-256 fingerprint labelled AES encryption; fallback returns a fake seal | Real Web Crypto AES-256-GCM; unavailable crypto fails closed; no simulation fallback |
| Readable message bodies, translations and report excerpts in localStorage | Only an authenticated encrypted device vault under `luqi_sovereign_p2p_v1`; separate passphrase with PBKDF2-SHA256 (600,000 iterations), fresh 128-bit salt and 96-bit nonces; passphrase and open keys remain in memory |
| Fictional contacts/messages and “verified” aliases | No seeded contacts/replies. Authenticated numeric account identities and actual mutual approval |
| Public topic codes act as access credentials | Public labels only. Private 256-bit invitation token, 24-hour invitation expiry, intended-account approval and out-of-band safety-code comparison |
| In-memory blocks called permanent; arbitrary caller IDs | Durable account-scoped server blocks, JWT-derived actor, peer membership checks and both-direction denial |
| Mutable public report array, collision-prone IDs and wrong previous link | UUID reports, encrypted selected evidence, append transaction with a locked durable head, canonical ordered payload, HMAC-SHA256 links and moderator-only verified-window reads |
| Browser Gemini key / unmetered provider SDK | Existing authenticated Luqi AI gateway, readiness checks, existing provider budgets/quotas, explicit excerpt disclosure and Translate click, no automatic inference or retry |
| Browser toggle claims age verification / compliance | Server-verified adult or school-cohort eligibility; unknown accounts cannot initiate messaging, and student circles accept only the identical trusted cohort |
| Absolute scam/legal/price assertions | Local, fallible risk warnings; no unverified CIPC fee, legal verdict or compliance certificate |

## Scope and honest capabilities

`/#/p2p` is lazy-loaded and linked as **🔐 P2P Circles & Chat** in desktop/mobile navigation. `/#/circles` is a fixed alias. The three named study/cooperative/trade codes and a custom-name option are present. **The first implementation supports two-person peer circles, not multi-member group chat.** A larger group protocol, membership changes, removal and key rotation need separate design/review.

A new private invitation contains a random routing token and random message-key material. The service receives only the token, stores its keyed digest, and never receives the peer encryption key. The owner approves the requesting authenticated account after comparing account identity and a SHA-256 safety code out of band. Both participants explicitly acknowledge comparison before sending or decrypting newly retrieved messages. The circle key is derived with HKDF-SHA256 bound to the circle UUID, so different circles have different encryption keys even if raw invitation material is mistakenly reused.

Messages use authenticated encryption with the message UUID, circle UUID, sender ID, recipient ID and timestamp as additional authenticated data. The server validates both participants, active accounts, role/cohort eligibility, current blocks, recipient, timestamp bounds, packet size, per-minute quota and record capacity. The store has unique message IDs and circle/nonce pairs. An identical, explicitly retried message ID is acknowledged idempotently; altered reuse is refused. The client persists an uncertain encrypted packet before submission and distinguishes service acceptance from delivery/read receipts. It never automatically resends a message. Retrieval currently uses the explicit **Refresh messages** control; this is not background live presence, push delivery, voice/video or a WebRTC implementation.

`localStorage` retains only the encrypted vault, owner digest, salt and cipher parameters. Plaintext keys, invitation material, messages, blocks and report receipts are inside that encrypted envelope. The owner digest is a namespace, not proof of anonymisation or identity. Account switching unmounts all former-account private state. Vault writes reject a stale ciphertext revision; supported browsers additionally serialize writes with Web Locks. Encryption does not protect an unlocked page against same-origin script compromise or an unlocked/stolen endpoint. Lost passphrases cannot be reset to recover locally encrypted key material. Do not promise account-wide multi-device key recovery or forward secrecy.

Scam detection runs locally on the sender's draft and decrypted received text. The encrypted delivery server cannot inspect message plaintext. A sender can modify their own client; recipient-side inspection is separate and remains fallible. A warning is neither a criminal finding nor a verified safe-message assessment.

Translation supports the six requested language choices. The selected readable message is disclosed to the existing AI provider only after the explicit consent and Translate actions. No whole conversation, invitation key, vault passphrase or report bundle is automatically attached. Machine-language quality and regional nuance, including Sepitori, are not independently certified. Inputs above the translation limit are refused without truncating the meaning silently.

Reporting shows the selected excerpt and requires explicit consent before sending it to the service. The service accepts reports only from the authenticated recipient of an existing stored message and derives the reported sender itself. Selected evidence is encrypted at rest with purpose-separated keys derived from `LUQI_P2P_REPORT_KEY`; report/block/head advancement commit together. A report is an unverified user allegation. The keyed audit links detect alteration within a checked window, including predecessor ordering, head mismatch and deletion; they are **not** an immutable external audit anchor, proof of the excerpt's truth or a legal evidence certificate. No ordinary account or browser-stored passkey grants moderation access.

The existing `/admin` view offers a distinct P2P moderation ledger sign-in and explicit load action. The server requires exactly the stored `p2p_moderator` role before returning any selected excerpts. Existing unavailable administrator/payment/autonomous controls stay unavailable. Leaving moderation or switching accounts clears its private view.

## Operational activation — currently OFF

`LUQI_P2P_ENABLED` defaults OFF. The disabled UI states that peer delivery is unavailable; it never simulates a message, peer, block confirmation or submitted abuse report. There are no production DDL, grants, account-role changes, provider/budget changes, or payment changes in this code integration.

Before production activation an authorised operator must independently:

1. Review the additive `db/migrations/p2p-circles-v1.sql`, encrypted evidence retention, deletion/export/recovery policy and encrypted backup/recovery of both data and the report master key. It creates five dedicated InnoDB tables and an empty audit-head seed; it never adopts existing private notes or historical sessions. No web startup, flag or HTTP handler runs it.
2. Approve only the five table grants declared in `db/p2pContracts.ts`; no runtime DELETE, DDL, global/database-wide grants or GRANT OPTION. Apply the isolated migration and independently verify the exact restricted identity and existing account preservation.
3. Supply the dedicated random 32-byte base64url `LUQI_P2P_REPORT_KEY` through approved secret handling, never chat, source or public CI. Review versioned key rotation/rewrapping and backup recovery before rotating a key that protects existing reports. Reusing an AI/provider key or enabling billing is unnecessary.
4. Run the runtime schema and read-only P2P preflight in the exact restricted context. Enabled startup checks transactional schema, nonce/message uniqueness, key configuration, least privilege, roles and the durable audit head before listening. Missing/malformed configuration fails closed.
5. Establish a genuine adult/cohort-verification and moderation/support process. The prototype uses operator-managed `users.role` values `p2p_adult`, `p2p_student:<trusted-cohort>` and `p2p_moderator`. It does not collect age documents, verify school enrolment or grant roles itself. Review compatibility with existing role usage; existing accounts are not relabelled. Students and unknown-age accounts must never gain adult-DM eligibility through a client input.
6. Independently review endpoint/XSS exposure, invitation leakage/revocation, account recovery, multi-tab/multi-device behaviour, reporting confidentiality, child-safety enrolment, consent, data subject requests and applicable privacy/retention obligations. No POPIA/child-safety certification is asserted.
7. Accept real iOS/Android devices and two separate real customer accounts, including offline/uncertain delivery, idempotent retry, lock/unlock, wrong passphrase, spoofed peer, stolen invite, cross-school/adult rejection, disabled accounts, malicious ciphertext, block after restart, report access, key loss and rollback. CI browser fixtures do not replace this acceptance.

Only after these gates may the operator enable peer delivery. Rollback disables `LUQI_P2P_ENABLED` and preserves encrypted vaults, messages, blocks and reports; it does not drop data or weaken authentication. No inference is required to test messaging.

## Checks

The dedicated workflow runs production graph TypeScript (`npm run check`), Web Crypto/AEAD/key/cache tests, route and consent checks, real restricted MySQL circle/block/report/rollback tests, and two-account HTTPS browser journeys in Chromium and iPhone-sized WebKit with external/provider calls denied. Test credentials and verification-role assignments exist only in the exact disposable CI fixture. Exact-head outcomes are recorded in the PR.

The repository's declared `npm run check` previously lacked a root tsconfig. Its new production-graph configuration includes the API and both frontend entrypoints; stale self-healing consumer signatures/empty-agent types and an unsupported A/B count were corrected to match their existing contracts. The legacy self-healing route-denial policy is unchanged. This check does not claim every historical standalone script is production-ready.
