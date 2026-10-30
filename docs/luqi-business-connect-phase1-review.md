# Luqi Business Connect — Phase 1 review implementation

Date: 30 October 2026. Implements the first-phase review objective in #360; launch gate remains #202. **Draft for review, not a production release or POPIA compliance certification.**

## What works in this branch

- Existing customer sign-in and session revocation; no second account or copied account email.
- Private owner drafts, editable business profiles, up to three categories, 15 services/products with optional prices, seven-day hours including overnight trade, service areas/delivery radius, access tags and 11 South African written-language tags.
- Province and municipality selection reuse the existing government-source directory. Selection does not verify jurisdiction, geographic boundaries or trading rights.
- Search by name/service/locality, category, service language, province and municipality; bounded 20-result pages; stable, shareable `/#/business-connect/<uuid>` pages. No auto-loaded map tiles, photos, tracking, fonts, provider calls or polling.
- Owner-authored descriptions/translations in the 11 supported written languages; local-language navigation with English detailed forms/reviewer instructions. This is **partial UI localisation**, not automatic translation. Linguistic acceptance is still required. Sign-language access can be tagged; no signed-video translation is claimed.
- Public storefront address/landmark/manual coordinates are optional. Home-based, mobile and service-area profiles cannot save an exact pin/address/landmark in the location fields. They use a locality and service area. No private precise point is retained.
- Separate, unselected-by-default permissions for storage/representation, public listing, selected contact channels, and storefront location. Owner-confirmed business name remains reviewer-private. Public projection is an allowlist; hidden name/email/phone/address cannot influence search results.
- Save → owner reviews public preview → owner sends for human review → authorised reviewer approves. Saving a previously published profile removes it from discovery and resets checks until reviewed again. Pause unpublishes immediately. Delete removes the profile, contacts, coordinates and associated reports.
- Transactional revisions prevent stale-device overwrites. A database unique key prevents concurrent duplicate claims with the same normalised trading name/province/municipality/locality. A conflict never identifies a private competing owner. Legitimate branches/name collisions can request a private duplicate/ownership review; there is no automatic merge or ownership transfer.
- Private correction, privacy, impersonation, spam and duplicate appeals. Published profiles with open reports enter the moderation queue; a report itself does not certify wrongdoing or automatically transfer ownership.
- Operational audit history records revision, action, consent booleans/version and reviewer check method. It does not retain historical profile/contact/address text. It is not a tamper-proof legal ledger.
- Bounded HTTP bodies, strict schemas, no multipart uploads, query allowlists, existing perimeter throttling, an additional bounded per-account write throttle and durable daily abuse counters across replicas. Listing/report limits are anti-abuse measures, independent of existing AI trial quotas or spending limits.

## Honest verification labels

| Indicator | Who can set it / what it means |
| --- | --- |
| Owner approved | Owner explicitly consented to public details and sent this revision for review. This is an assertion of authority, not independent identity proof. |
| Contact unverified / confirmed by Luqi | Defaults unverified. Only a configured reviewer with a current admin account can record direct business-contact confirmation. Account login does not verify a business phone/email. |
| Location unverified | Manual coordinates or owner wording never set a verification tier. |
| Service area reviewed by Luqi | Reviewer attests to independent business contact concerning the declared service area. Does not verify an exact point. |
| Storefront point reviewed by Luqi | Reviewer attests to a site visit for an owner-approved public storefront pin. No home point accepted. |
| External map listing not checked | Always `not_checked` in Phase 1. No Google/Apple/Bing/OSM receipt or approval is fabricated. |

Moderators must satisfy **both** `users.role='admin'` and an explicit account ID in `LUQI_BUSINESS_REVIEWER_IDS`. Tokens are still authenticated/revocation-checked through the existing customer auth service. A reviewer cannot approve their own listing; role/allowlist/account revocation is checked on each action. No new admin login/master-key endpoint is introduced.

`draft → pending → published`; rejection returns `rejected`. Owners can edit/pause/delete. A suspended listing stays suspended after edits and cannot be resubmitted until a reviewer releases it to draft. Approvals are bound to an exact revision; edits reset verification. No user-submitted verification/provider fields are accepted.

## Rollout and migration review

Both flags are absent/false by default:

| Configuration | Effect |
| --- | --- |
| `LUQI_BUSINESS_CONNECT_ENABLED=false` | All listing/storage routes return unavailable without accessing new tables. Only minimal feature status is available. No new runtime schema/grants required. |
| Enabled true, `LUQI_BUSINESS_CONNECT_PUBLIC_ENABLED=false` | Existing authenticated customers can review/test the directory and owners can draft/manage profiles. There is no anonymous directory. **Use an isolated review environment with synthetic accounts.** |
| Both flags true | Anonymous reads of moderated, owner-consented published profiles become possible. Owner/reviewer operations still require authenticated credentials. This change requires the owner's separate public-release approval. |

The API at `/api/v1/business-connect` is mounted in the canonical Hono boot. Frontend routes are lazy and are not added to production navigation. Core chat/auth/checkout/AI budget/monitors are unchanged. App-tree copies remain byte-identical for the new/shared frontend files.

`db/migrations/20261030_business_connect.sql` adds exactly four InnoDB tables: profiles, audit, reports and daily limits. It creates no data and contains no ALTER, DROP, GRANT, base-table changes or startup migration. It is deliberately absent from bootstrap and the existing hash-pinned release migration utility. MySQL DDL auto-commits; a partial apply must be inspected, not treated as rolled back. `IF NOT EXISTS` is repeatable, **not** proof an existing table has the right definition.

Review sequence (not executed against production):

1. Inspect the SQL and conditional `BUSINESS_RUNTIME_TABLES`/`BUSINESS_RUNTIME_GRANTS` contracts. Confirm foreign keys to unsigned `users.id`, unique dedupe key, owner/discovery indexes, UTF-8 text and delete/cascade behaviour. On an existing installation compare actual DDL, foreign keys and indexes; runtime preflight verifies the required types/uniques and SELECT access, not every CHECK/nonunique index.
2. Run the dedicated GitHub workflow against its hardcoded disposable **MySQL 8.4 loopback fixture**. It applies the migration twice, exercises the actual routes/auth/store, duplicate races, edit conflicts, public projection, moderator/account revocation, reports, hard deletion and retention. No Railway database, credentials or production rows are used.
3. For a separately authorised staging environment, rehearse backup and restore; use a separate operator identity to apply the reviewed four-table migration while flags remain off. Never give the web identity DDL or global privileges. Existing runtime-user provisioning intentionally refuses optional-feature provisioning.
4. Add only table-scoped permissions from `BUSINESS_RUNTIME_GRANTS`: profiles/reports/limits SELECT/INSERT/UPDATE/DELETE, audit SELECT/INSERT/DELETE (DELETE only for retention). Run the existing read-only schema/role preflight with the feature enabled; inspect foreign keys and supporting indexes as well. The web runtime never applies migration/grants.
5. Enable only the private preview in staging; configure at least two distinct synthetic owner/reviewer accounts so no self-review is necessary. Reviewer role plus allowlist must be explicitly provisioned through existing account administration by an authorised operator. Do not elevate real customers for a test.
6. Complete language, narrow-screen, keyboard/screen-reader, physical-device, moderation, retention and privacy review. Re-run core authentication/chat/build checks and link evidence to #202. Review low-data behaviour on constrained connectivity; the prototype has no offline account/directory cache.
7. Request separate approval for public feature activation. This PR must stay unmerged/unpublished until reviewed; no deployment, flag change, production DDL or spend increase is included in this task.

Rollback for a later authorised rollout: disable the **public** flag first to close anonymous discovery, then the feature flag if necessary. Keep additive tables for review/owner support and retention; do not DROP tables, revert data or broaden grants as an automatic rollback. Previously shared/cached third-party copies cannot be guaranteed retractable.

## Retention and privacy gate

The notice is available at `/#/business-connect/privacy` in the enabled preview. Owners can inspect/edit current data, pause public access and delete a profile; history is owner-scoped. Private report details are visible only to configured reviewers. No customer lead records, national ID scans, bank details, password/OTP collection or third-party submissions exist.

| Data | Proposed/enforced live-data retention when maintenance runs |
| --- | --- |
| Current published profile | Until owner deletion, pause/edit or moderation; review freshness/reconfirmation policy must be agreed before launch. |
| Draft/paused/pending/rejected/suspended profiles | Delete after 180 days without an update. |
| Deleted profile + related reports | Immediate transactionally committed deletion. |
| Minimal operational audit/account reference | At most 90 days; no historical profile/contact/location snapshots. Account deletion nulls actor references. |
| Reports | 30 days after resolution, otherwise 90 days from creation. |
| Daily account abuse counters | Two days. |

The reviewer-only `POST /moderation/retention` endpoint requires an explicit JSON confirmation and deletes bounded batches; it is exercised only with synthetic fixtures. **There is no production scheduler in this PR.** Before activation an authorised operator must schedule and monitor enough bounded batches, define retention failure alerts and backup expiry, and confirm deletion/restore handling. No promise is made that backups already meet an unverified policy. A suspended backlog is not an excuse to retain personal data indefinitely.

Free-text fields cannot reliably detect every private address/ID or every impersonation. Owners are warned; reviewers must check all text and translations. Public-facing trading names, service descriptions, locality, hours and access/language tags are explicitly covered by public consent. Proposed hardcoded periods and translated copy need Information Officer/privacy and linguistic review before public use. Avoid any claim that this code alone establishes POPIA compliance.

## Deliberately not claimed

- No photos or evidence uploads: rejected by strict JSON contracts/body/content-type limits. Approve private, expiring object storage and image/EXIF/content processing before introducing them.
- No GPS collection, map SDK/tiles, paid geocoding, nearest-distance ranking or municipal boundary verification.
- No legal CIPC registration, municipal licence issuance, external map submission/verification, guaranteed map rankings, paid upgrade checkout, delegated staff, ownership transfer/automatic merge or Pan-African legal rollout.
- No automatic AI translation or inference. Current provider/guest allocations and authorised spend are unchanged.

These are subsequent review items, not hidden fallbacks or fabricated integrations. See the Phase 2 plan below.

## Phase 2 — owner-controlled location evidence and map assistance

1. **Separate GPS consent.** A deliberate “Propose my storefront location” action requests one device fix only after opt-in. Record precision, timestamp and source, and make manual entry equally usable. No watchPosition/background tracking. Add a narrowly scoped Permissions-Policy only after review (current production denies geolocation). Never silently enable it globally.
2. **Preview before saving.** Show an accessible draggable pin, text coordinates, locality, landmark, road access and optional entrance point. Use a reviewed mapping/geocoding source whose terms and costs are understood; obtain separate approval before any paid call. Requesting a fix is not consent to public display or external sharing. Discard unsaved evidence. Home/mobile providers retain service-area-only public profiles.
3. **Evidence and human check.** Treat the device fix as a proposal. Check owner authority, independent business contact, signage/entrance evidence if appropriate, duplicate candidates and disputes. GPS precision is uncertainty, not proof of address/trading authority. Add expiring private uploads only after storage/security approval, strip location metadata from public photos and record reviewer method, time and a bounded evidence reference. Revoke stale checks on relocation.
4. **Provider-specific preparation.** Owner chooses Google, Apple, Bing or an individual OSM contribution. Luqi can prepare a preview/export of only separately approved fields and open official owner-led guidance. Keep account ownership with the business. Do not request passwords/OTP, create a Google-owned claim under Luqi's account or submit anything without owner approval.
5. **Honest provider workflow.** Separate records per provider and revision: `draft`, `owner_approved`, `submitted`, `review_pending`, `approved_visible`, `rejected`, `not_eligible`, `unknown`, `withdrawal_requested`. A prepared export is not “submitted”; submission requires a receipt/reference from an authorised workflow; “approved_visible” requires independent provider evidence with URL/time. Owner assertions and an open Maps directions URL never set this state. Allow correction, closure/relocation and withdrawal without claiming the provider immediately acted.
6. **Automation only after approval.** Google Business Profile API access requires Google's approval and applicable eligibility prerequisites; later delegated API work needs merchant OAuth/authorised manager access with revocation and minimal scopes. No universal GPS update or guaranteed syndication exists. Apple/Bing have independent eligibility, regional availability, account and review processes. OSM imports need licence review and community consultation under its import guidelines. Address/road corrections use authorised provider/municipal channels.
7. **Affordability.** The free Luqi listing is useful without an external map profile or paid website. Any later website/PWA/application assistance has its own optional scope, transparent service fee, support/refund terms and merchant readiness. Do not charge as though Google itself requires a listing fee, guarantee placement or alter existing AI budgets to fund map calls.

| Luqi can provide directly after review | Independent decision / additional authority needed |
| --- | --- |
| Owned directory, service-area page, search, consent/edit/removal and navigation to an approved public point | Legal company registration or municipal trading/licensing decisions |
| Optional owner GPS proposal and documented Luqi contact/location review | Provider verification, map publication, ranking and eligibility |
| Provider-specific field checklist, owner-approved export and official guidance | Google API project approval and merchant authority/OAuth; provider receipt and approval |
| Correction/withdrawal preparation and evidence tracking | External provider's action, public-data propagation and road/address authority |

## Original references checked 30 October 2026

- Google eligibility/ownership: https://support.google.com/business/answer/13763036
- Google accurate representation/service-area rules: https://support.google.com/business/answer/3038177
- Google third-party consent, ownership and transparent service fees: https://support.google.com/business/answer/7353941
- Google API prerequisites (including current API approval criteria): https://developers.google.com/my-business/content/prereqs
- Apple Business support/region availability: https://business.apple.com/support
- Bing listing guidance: https://support.microsoft.com/en-us/bing/add-and-manage-your-business-listing
- OSM import/community review: https://wiki.openstreetmap.org/wiki/Import/Guidelines
- South African Information Regulator/Information Officer responsibilities: https://inforegulator.org.za/popia/
- Existing municipal sources remain in `src/lib/municipal-economy.ts`; CIPC distinction and provider specification remain in #360.

Validation results are recorded in the PR. The first-phase branch is not evidence of staging/production deployment or real customer/device acceptance.
