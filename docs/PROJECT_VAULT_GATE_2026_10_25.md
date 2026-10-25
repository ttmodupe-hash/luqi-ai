# LUQI project vault — opt-in encrypted project sync foundation

Date: 25 October 2026 · Design/engineering candidate, NOT a launched product.

## Intended subscriber benefit
A repeat-use customer should be able to create quote and sales projects on one
device and safely reopen them on another after sign-in, using an independently
chosen project passphrase. The existing local quotation, margin and follow-up
board remain free, and there is NO active paid plan. Subscribers should receive
real additional value before LUQI collects recurring fees.

## Scope developed in this candidate
- Browser AES-256-GCM encryption via Web Crypto. Key derived with
  PBKDF2-HMAC-SHA256 (310,000 iterations) and fresh 16-byte random salt per
  project; 12-byte random AES-GCM nonce per encryption. Additional authenticated
  data binds the ciphertext to a specific project UUID, type and versioned
  envelope. This is a reviewed **candidate**, not an independent crypto audit.
- Strictly validated quotation or sales files only. LUQI's backend receives
  an envelope of salt, nonce and ciphertext, **not the user's passphrase or
  plaintext quote**. The browser helper never writes keys to disk, storage
  or cookies and does not make HTTP requests.
- A read-only metadata index and project GET/PUT/remove routes in the Hono
  Node app, using the existing password-bound JWT + persistent active-account
  validation. No caller-selected owner IDs, arbitrary file types, share links,
  public admin, consumer checkout or paid AI endpoints.
- All writes use MySQL InnoDB transactions, locking the current active user
  and composite (owner_id, project_uuid) key. An optimistic exact revision is
  mandatory to prevent silent overwrites from stale devices. A missing
  acknowledgement is an **unconfirmed** write, never a signal to retry with
  a new ID. No account owns more than 20 records under the initial pilot
  contract; this is a capacity limit, NOT a billable tier.
- The vault table is added only by a separate explicit migration. Existing
  MySQL startup and private grant audit require it **only when**
  LUQI_PROJECT_VAULT_ENABLED=true. The operator's new-user creation path
  cannot be invoked with vault opt-in. No production deployment may
  silently create, alter or purge business data.
- Project deletion requires an exact owner, version and confirmation. The
  active ciphertext record disappears after a confirmed transaction; backup
  and off-device copies persist according to their separate policy.

## Important security and privacy limitations
- Project *type*, IDs, timestamps and ownership metadata are visible to storage
  operators. The ciphertext is encrypted in the browser, but a compromised
  user device or weak project passphrase can expose its contents.
- The passphrase is distinct from the LUQI account password. If forgotten,
  the server cannot decrypt or recover the project. Account password reset
  does not unlock it. This has to be plainly accepted by pilot users.
- Backups retain ciphertext until expiration. No whole-account export,
  automatic restore of a project, account deletion cascade or passphrase
  recovery is certified by this code. Review key handling and UX before use.
- No dashboard currently exposes the vault. The existing account and local
  project tools continue without change. DO NOT market cross-device sync as
  delivered until the login/encryption/restore UX, production migration,
  independent security review and a designated real-user test have passed.
- No payment/merchant integration, membership entitlement, provider budget
  change or paid plan has been created. Proposed R49/R99 prices remain only
  research hypotheses.

## Release and operator approval
The temporary GitHub Actions job uses ONLY a hardcoded, disposable
127.0.0.1 MySQL 8.4 database, synthetic accounts and the exact CI flag.
Tests cover locked writes/quota, cross-account ownership, revision conflict,
DB failure rollback, revoked tokens, missing schema, malformed envelopes
and client AES-GCM round trips.

Safe production engineering merge requires exact-head CI, review and known
rollback. Product activation requires an approved, production-derived
**isolated** recovery rehearsal (never press Restore on a running production
volume), private support and recovery operator, independent crypto/privacy
review, feature-specific restricted grants and a small consenting acceptance
cohort. Only after those gates should account-bound entitlements and
merchant-hosted checkout be considered. See #202 and #133.


## Strict browser transport layer staged (25 October 2026)

The additional mirrored TypeScript client is a **pre-activation** API interface,
not a visible cloud-sync feature or membership. It requires an existing
in-memory LUQI JWT, uses only same-origin /api/v1/projects with no-store,
omitted browser credentials, no redirects, a bounded response size, fixed
15-second deadlines, and no automatic retries. Its type validators refuse
extra fields, unsupported data types, mismatched UUIDs, stale revisions,
unconfirmed saves/removals and any fabricated subscriptionActive=true status.

The interface supports explicit status, metadata list, encrypted record GET,
version-bound create/update and confirmed removal. It deliberately does not
accept account identifiers, arbitrary endpoints, plaintext projects,
passphrases or merchant/AI calls. Passphrases and project encryption are owned
by the separate tested browser-only Web Crypto helper, not HTTP transport.

There is still **no supported customer save-to-cloud UI** or subscription
entitlement. The server feature flag remains OFF, and no vault migration,
private database grant, production project write, merchant checkout or
provider request was performed. The eventual customer UX must independently
prove sign-in/revocation, wrong-key handling, explicit user consent,
passphrase-loss warning, optimistic stale-device conflict, safe recovery
and deletion, and real-device acceptance before any activation.
