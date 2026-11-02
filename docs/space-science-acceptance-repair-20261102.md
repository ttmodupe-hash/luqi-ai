# Space Science release repair — 2 November 2026

Preserves current main bb6e95fce84be1a5cd50e450c5209c830d8ef1cb, including newer Motion video/audio and certification improvements. Updates the existing #393 branch, not a duplicate feature.

## Exact original failures
Chromium run 41352725483, artifact 13102556754: 394 passed, four failed. WebKit run 41352725676, artifact 13101893504: 388 passed, four failed, no skipped/flaky. Both fail exact Unit/Topic label lookups; saved DOM snapshots show the science page rendered. The prior chat claim of a React runtime exception/separate consent failure is not supported by these artifacts and is withdrawn.

An isolated real Chromium reproduction at 320px confirms nested label/select markup gives zero exact getByLabel('Unit') matches while its accessible combobox name remains Unit. Separating the text-only label from the select yields one match and successful selection. Both frontend implementations now use explicit sibling label/control pairs. Existing exact-label browser assertions remain unchanged; a DOM label-text contract and keyboard/error test were added.

Startup artifact 13101029777: candidate 497554 raw /147894 gzip JS bytes; baseline 529636 /155514. The unchanged gate requires 5% reduction in each metric; gzip reduction was only 4.90%. Concise public catalog descriptions reduce eager text without dropping any route, service, source limitation or new science discovery. Actual final combined build measurements remain a CI release gate; no threshold/baseline is changed here.

## Executed locally
84 Node checks passed (51 science +33 workspace search), zero failures/skips, against the targeted source subset. The isolated Chromium before/after label reproduction passed. These are not a full current-main build or physical-phone acceptance. Full exact-head CI and canonical live-release checks are still required. No provider calls, accounts, personal data, DNS, production variables or payment changes.
