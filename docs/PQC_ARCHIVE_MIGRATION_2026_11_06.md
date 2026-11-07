# PQC archive migration — implementation and release boundary

6 November 2026. **Local encrypted-record pilot implemented for release;
production cloud archive migration is not activated.** The owner requested
activation after the foundation checkpoint. The deployable scope is a browser-local
tool at `/archive` and `/vault`, separate from the Quantum & PQC learning lab.
No customer database records, tables, historical files, runtime keys, provider
flags or spending limits are changed here.

## Local pilot activation scope

The Archive vault now provides a local text-record form, separate encrypted
archive and encrypted recovery downloads, explicit saved-recovery acknowledgement,
and verified restoration from the selected saved pair. It is discoverable in the
workspace catalog and requires no new account or login. It is labelled a pilot
without independent audit or FIPS validation. This is **not** activation of the
legacy shared archive API, account synchronization or a financial ledger.

`src/features/archive/` implements the same envelope suite using Web Crypto and
the existing pinned PQC library inside a dedicated one-shot module worker. Each
new record receives fresh keys; only the decapsulation seed and trusted public
keys/digest are retained, inside the passphrase-encrypted recovery file. The
ML-DSA and ECDSA private signing keys are not exported. The passphrase never goes
to an HTTP API, browser storage or application log. PBKDF2-SHA256 with 310,000
iterations and fresh salt derives the AES-256-GCM recovery-file key. Passphrases
are exact (including whitespace), 14–128 characters; their real entropy limits
protection of the recovery file. Both downloads plus that passphrase are required.

The local envelope uses `ownerId=1` **only as a reserved file-domain marker**,
never an authenticated account ID or authorization grant. A random record UUID
and fresh per-record keys separate copies. The protected recovery file anchors the
exact current envelope digest, rejecting replacement, tampering and same-revision
forks. It must come from the user's independently retained copy; there is no
central remote revocation, audit trail or recovery service for downloaded files.

The plaintext title/text are bounded to 24,000 UTF-8 JSON bytes (title up to 120,
text up to 20,000 characters). Existing binary archives or PDFs are not imported.
Opening displays escaped plain text and never silently replaces the current draft.
Downloading restored plain text is a separate explicit action and is clearly
labelled unencrypted. Download requests do not establish that a file was actually
retained, so the UI asks users to verify both saved files before deleting originals.
Changing a draft invalidates stale downloads; cancellation, route unmount, account
change, sign-out and timeout terminate pending workers and clear relevant state.
The explicit Clear action clears tab state, not user downloads. Secret bytes are
cleared where possible; JavaScript strings/native runtime copies have no guaranteed
secure erasure. A compromised device or origin is outside this local boundary.

New tests verify real browser-API encryption, encrypted recovery custody, native
Node interoperability, exact Unicode, wrong passphrases, altered files, limits,
independent record keys, UI confirmation, cancellation/late replies and account
boundaries. Browser acceptance runs the actual worker and download/restore after
reload on desktop/mobile, including an escaped-script fixture, wrong-passphrase
and tamper rejection with all external/API requests blocked. This is synthetic
acceptance, not a physical-device, independent cryptographic audit or live
production-data restore certificate.

## Inventory established from the current repository

| Record path | Actual state | Migration consequence |
|---|---|---|
| `api/archive.ts` legacy shared access | Deliberately unavailable; no reviewed account-owned archive persistence | Keep closed until ownership, retention, durable storage and recovery are implemented |
| `/archive`, `/vault` local pilot | New standalone text-record encryption and restoration, local downloads only | No server upload, cloud-record migration, account key or ledger activation |
| `api/services/artifactVault.ts` | Legacy in-memory registry; its import writes manufactured sample files | Do not import or reinterpret these files as verified customer records |
| `api/security/cryptoLedger.ts` | Process-local SHA-256 chain; no external anchor, durable trusted key or PQ signature | Does not establish production immutability or quantum-resistant authentication |
| Optional private project vault | Owner-scoped quote/sales storage foundation, independently gated; v1 browser encryption uses passphrase-derived AES-256-GCM | Preserve exact v1 readability and existing flags; do not silently relabel or rewrite it |
| Private notes and account exports | Separate account-owned functions | Do not load, re-encrypt, upload or automatically use their content for this evaluation |
| Stokvel ledger | No active dedicated production ledger/record contract found in this inventory | A future ledger needs its own ownership, transaction and recovery design; no claim of migrated financial records |

The production Dockerfile currently uses Node 22. This change does not replace
the runtime, introduce an OpenSSL fork or install a paid cryptography service.

## Implemented foundation

`api/security/pqcArchive.ts` supplies bounded, side-effect-free record sealing and
opening. It is intentionally **unreachable from `api/boot.ts`**. Its test verifies
that boundary using the actual bundled server import graph. There is no new
HTTP route, server upload form, environment-controlled activation shortcut or
server file writer. The local pilot uses its separate browser implementation;
the native helper remains offline and serves interoperability checks.

- KEM: the existing pinned `@noble/post-quantum` **0.7.1**
  `ml_kem1024_p384` preset, ML-KEM-1024 plus P-384 using the library's specified
  current CG construction. This is a **draft hybrid**, not a final NIST hybrid
  standard. No locally invented KEM combiner or raw-ECDH adapter is used.
- Content key: HKDF-SHA384 with random 32-byte salt and a domain-separated
  SHA-384 digest of the entire canonical authenticated header as `info`.
  Hashing the header keeps `info` inside Node's 1024-byte HKDF limit while binding
  the complete KEM ciphertext, owner, record, revision, key identity and suite.
- Content encryption: native Node AES-256-GCM with fresh random 12-byte nonce,
  16-byte authentication tag and the canonical header as additional data.
- Authentication: **both** ML-DSA-87 and native ECDSA-P384/SHA384 signatures over
  the same domain-separated complete header and ciphertext. Neither signature
  alone is sufficient. Randomized ML-DSA signing remains enabled.
- Trust: public keys are supplied separately by the caller's trusted keyring.
  Envelopes cannot nominate their own trust root. Key identity is a SHA-384
  fingerprint over the exact suite and canonical public-key bundle.
- Record binding: exact owner ID, UUID, positive bounded revision and previous
  envelope digest, plus the **current committed envelope digest** required on
  read. The caller supplies these expectations from independent authoritative
  state. This also rejects validly signed but uncommitted same-revision forks.
  Reading expectations from the envelope defeats replay protection and is
  explicitly outside the contract.
- Format: one canonical JSON representation, fixed explicit suite/version and
  pinned wire sizes. Unknown fields, duplicate JSON fields, altered encodings,
  unsupported suites and silent legacy fallback fail closed. ECDSA signatures
  use fixed-width IEEE P1363 encoding and mandatory low-S normalization so the
  n-S equivalent cannot produce a second valid envelope representation.
- Limits: 1–24,000 plaintext bytes, maximum 50,000 envelope bytes, maximum
  revision 1,000,000. Oversized input is rejected before JSON decoding or expensive
  cryptographic work. The public owner ID, record ID, revision, predecessor digest
  and key fingerprint are authenticated **but not confidential metadata**.
- Rotation: active keys may write/read; retired keys may read history; revoked
  keys cannot read or write through the helper. Historical recovery still requires
  preserving the old decapsulation secret and trusted verification keys.
- Restoration: signatures and AEAD authentication must all pass before plaintext
  is returned. Each successful seal also round-trips and compares the record copy
  before returning success. Temporary shared secrets, derived keys and pending
  plaintext buffers are cleared on success/failure where JavaScript permits.

An envelope digest is a chain link, not external anchoring, legal evidence or
an immutability guarantee. In-process buffer clearing is not a secure-erasure
guarantee for JavaScript engines, native allocations, dumps or swapped memory.
Revocation is supplied by trusted caller policy; this module does not magically
revoke copies of keys already stolen by an attacker.

## Verification evidence and its limits

The offline regression suite uses independently generated synthetic keys and
records. It checks actual hybrid encryption and both signatures, cross-owner and
cross-record denial, stale replay, wrong chain head, corrupted signatures, corrupted
KEM/salt/nonce/content, and corrupted content re-signed with valid trusted keys
(to exercise AEAD separately from signatures). It also covers wrong recovery
secrets, trust-root substitution, retired/revoked keys, mismatched private/public
keys, exact legacy-byte preservation, full-size payloads, downgrade, malformed
and noncanonical input, ECDSA malleability, same-revision forks, required committed
digest anchors and server-import isolation.

Run from the repository root:

```sh
npx --no-install vitest run tests/pqc-archive.test.ts tests/archive-page.test.tsx tests/trpc-authorization.test.ts
npx --no-install tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --esModuleInterop api/security/pqcArchive.ts tests/pqc-archive.test.ts
```

These are integration/regression checks, **not** independent known-answer-vector
validation, external cryptographic review, an actual key-recovery drill, actual
legacy data migration or FIPS/CMVP validation. The library's current primary
documentation explicitly says it has not been independently audited and does not
claim constant-time execution. That prevents representing this foundation as
reviewed production protection.

## Remaining work before live records

1. Implement the account-owned durable archive store, retention/erasure policy,
   restricted DB role, transactional revision checks and a trusted current chain
   head. Do not reactivate the legacy shared registry.
2. Select the key custodian and trust-distribution path. Separate signing from
   decryption authorization; restrict private-key access, define rotation/revocation
   and preserve historical recovery material in protected backups. This module's
   ephemeral in-memory test key generator is not a production custody solution.
3. Obtain independent review of the chosen backend, protocol/draft version,
   application envelope and deployment threat model. If validated modules are a
   requirement, select and verify an appropriate actual validation certificate.
   Test pinned independent vectors/interoperability and worst-case performance.
4. Rehearse copy-first migration on an isolated representative snapshot. Persist a
   migration journal; verify old/new exact readability, backup restore, failed writes,
   process restart, interrupted/concurrent migration and anchored replay rejection.
   Never overwrite the only old copy or decrypt customer records in CI logs.
5. Complete the production-derived isolated restore, key-loss/revocation and
   incident-response drill, then release the reviewed integration through the
   existing tested/pinned deployment path. Production acceptance is required before
   claiming that archival or financial records are protected.

No additional service or budget increase is required for the foundation or local
pilot. The cost
of an external review or custody service is **not yet quoted or approved**. Present
any necessary KMS/HSM, review, storage or compute increase to the owner before
incurring it; do not silently defer work because of an assumed cost.

## Primary references reviewed

- [NIST FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) — ML-KEM.
- [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) — ML-DSA.
- [NIST SP 800-227](https://csrc.nist.gov/pubs/sp/800/227/final) — KEM recommendations.
- [Library hybrid presets and security limitations](https://github.com/paulmillr/noble-post-quantum#hybrid-x-wing-kitchensink-and-others).

Review current errata, dependencies and specifications again at production
integration; this dated inventory is not permanent security clearance.
