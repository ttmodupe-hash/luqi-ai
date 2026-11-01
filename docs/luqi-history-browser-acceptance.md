# Focused history browser acceptance

The 33 Node and eight DOM tests remain unchanged. The extended dedicated workflow additionally builds the actual frontend and tests all seven history topics, all four evidence views, wrong/correct quiz feedback, reset and closing the study in Chromium and WebKit at 1366px, 390px and 320px.

The test serves only locally built assets on 127.0.0.1. API reads receive a synthetic unavailable response; every write and every external request is blocked before transport. No account, paid AI, real location or production service is used. Unexpected write attempts fail the acceptance run. Screenshots and a report containing the exact tested GitHub revision are retained, including on failure when evidence exists.

This supplements, rather than replaces, the existing full-build and release safeguards. Actual results and screenshots must be inspected before claiming success. Browser emulation is not physical-phone acceptance or independent academic review. Lesson text, source edition, historical framing and the owner's approved corrections are unchanged.

## Current-base release handoff — 2 November 2026

The previous 27 passing workflows tested head `2d19e7b580b426453d9480797dab2eeaeae6a40f` through synthetic merge `b6225c7529580d157537c4f4a3be5b60e9c5291f`, against main `df1365c45576ea5c525ca5a8954e74cd0b10bfc2`. Main has since advanced to `b3b03d43c67ba68da78f0b293892e83281408d73`. Those previous passes remain historical evidence, not proof of the newer combination. This documentation update triggers fresh PR acceptance without changing the approved lesson or lowering any test requirement. Record the new synthetic merge parents, inspect its results and confirm the base still matches main before release.

The Moon PR #389 also adds `scripts/frontend-feature-acceptance.mjs`. Preserve both history and Moon journeys when reconciling that shared file; an add/add conflict is not permission to discard either suite. The current history module does not replace the Moon, Contacts rail, account-bound guide handoff or newer Motion Studio/network tools.

Administrative release safeguards remain a separate operator prerequisite: the connected GitHub app lacks branch-protection administration (403), main is reported unprotected, and the Railway source configuration still reports `checkSuites: false`. Do not interpret review-ready status, an owner implementation approval, or passing tests as confirmation those controls were enabled. No production merge, service change, paid inference or customer-account access is performed by this documentation change.
