# Business Connect inside the Luqi app

The owner-approved visual prototype is available at `/#/business-connect/preview` in the existing Luqi workspace. Real account-backed business profiles and the public directory retain their existing routes and publication controls. The original Sites publication remains private.

## Access and privacy

The preview is not in public assets. `GET /api/v1/business-connect-preview` first authenticates the existing Luqi bearer session, then verifies the active database account against `LUQI_BUSINESS_PREVIEW_OWNER_EMAIL`. Missing configuration, failed authentication, another account, database failure or asset failure returns no preview content. The endpoint makes no mutations, assigns no reviewer role and needs no new table. Private responses use no-store and Vary: Authorization. Error output contains no database details or configured email.

The server bundles the seven reviewed prototype resources from `private/business-connect/` after authorization. The browser renders them in an opaque-origin iframe without `allow-same-origin`, and never passes the Luqi bearer token into that document. The sandbox allows client-side form events so local drafts work in Chromium as well as WebKit. Its CSP still blocks upstream scripts, connections, network form submissions and object content; camera, microphone, geolocation and payments are disabled. Fixed fragment links scroll within the preview. Explicit research links may open a separate tab. Exports require a user action and may include business contact details.

A bounded storage bridge preserves the prototype's device-only drafts. Writes require the precise frame window, opaque origin, per-mount nonce, exact message shape, valid state and a 256 KB UTF-8 cap. The server-provided storage namespace is purpose-specific and does not authenticate access. No account email or bearer token is persisted in that namespace. All entries are escaped before interpolation into the frame. Storage failure switches the frame to an explicitly labelled in-memory fallback. Logout or account change unmounts the frame, removes its message listener and invalidates late responses. Device data is not encrypted; the preview's export and erase controls remain available.

## Scope

Website/app briefs are drafts, not orders or quotations. Couriers, reviewer decisions, delivery transitions, ratings and moderation examples are demonstrations. No real courier is verified, dispatched, rated or contacted. No private residential coordinates, identity documents, paid map service, inference call or payment activation is introduced. The existing real-business publication API remains separate.

## Checks and recovery

Targeted tests cover guest and non-owner denial, exact server-side identity checks, missing configuration and storage failure, message replay/shape/size rejection, script-closing markup in local data, the actual bundled template, logout races, iframe isolation and preserved existing owner/profile flows. Production build and existing CI run before merge. The production domain and release SHA must match the merged revision before announcing deployment. No physical-device, verified-courier or real-business acceptance is claimed.

Revert the change through the normal reviewed deployment path to remove the app preview. The previous app ignores the new scoped local data, so rollback does not erase drafts. Removing `LUQI_BUSINESS_PREVIEW_OWNER_EMAIL` closes server access without changing publication roles or the original private Site. There is no automatic migration from the Sites origin to the Luqi app's device storage.
