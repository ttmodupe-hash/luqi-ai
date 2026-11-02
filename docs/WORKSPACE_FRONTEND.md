# Workspace frontend

The public entry points (`/#/`, `/#/public`, `/#/portal`) share a responsive
workspace with a tool directory, text search and availability filters. Private
notes, the in-browser pendulum simulator and read-only service status have links.
Language, learning/media and Omega work is marked as in development.

The shared shell provides desktop/mobile navigation, a skip link and a modal
search with keyboard focus containment, Escape and focus return. Floating chat,
voice and critique controls are removed from the shell. Existing module URLs
remain reachable; this does not certify their functionality or claims.

The entry-page chat and Physics lab tutor no longer present canned answers as AI
responses or send unmetered questions. The workspace explicitly states that AI
replies, voice and payments are unavailable. The simulator's pause, resume and
parameter controls remain usable without AI. Page/PWA metadata reflects this
scope, and the alternate entry document no longer disables pinch zoom.

Service status uses validated `/v1/readiness` responses, including HTTP 503 for
degraded readiness. Both service workers bypass `/v1/`, `/health` and protected
API paths, so offline status must fail instead of showing a cached healthy result.

## Verification

- Production UI/API build and integrity gate.
- Existing 141 contract/UI tests plus eight worker cache-boundary tests.
- Fourteen Playwright checks across desktop/mobile: public aliases, unavailable
  status rendering, tool filters/empty states, no AI requests from the workspace,
  keyboard search, mobile navigation, 320px entry-page layout, private-note save
  failures/deletion/sign-out, and simulator controls with no write requests.
- Visual inspection of desktop/mobile workspace, search and simulator captures.
- CI compares shared workspace files across both frontend source trees.

Browser tests use synthetic API responses and block external origins. They do
not establish production registration, provider entitlement, scientific model
accuracy, complete accessibility compliance or a production restore drill.
No database schema/data, provider activation or billing configuration is changed.
See [outstanding work](OUTSTANDING_WORK.md) for remaining release requirements.
