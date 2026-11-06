# Luqi homepage — distinguish a text's unnamed Cushite wife from an identification in commentary

**Reviewed 4 November 2026 (SAST)**. Scope: homepage historic-figure card only, not a blanket review of African history, a factual claim about modern racial identity, or a new Bible translation.

## Claim-specific evidence

- **Numbers 12:1** describes Moses' Cushite wife **without giving her name**. Source/verse: [Sefaria, Numbers 12:1](https://www.sefaria.org/Numbers.12.1-15); comparison of text across Bible translations: https://biblehub.com/numbers/12-1.htm (English verse).
- **Exodus 2:21** expressly names **Zipporah**, a daughter of Reuel, as the woman given to Moses in marriage. Source/verse: [USCCB NABRE Exodus 2:21](https://bible.usccb.org/bible/exodus/2), verse 21.
- Whether the two passages refer to the same woman is a matter of interpretation. They must **not be silently equated as a direct quotation**. The changed card is deliberately textual: “Moses’ unnamed Cushite wife — Numbers 12:1.” It makes no ethnicity, race, historical-population or religious truth claim about a modern person.
- Bibliographic context: [Danny Burkeman, *A Commentary on Numbers 12:1–2*, Hebrew Union College, 2009](https://library.huc.edu/pdf/theses/Burkeman%20Danny-LA-Rab-2009%20rdf.pdf), discussions of distinct-wife versus Zipporah interpretation, pp. 58–60. This thesis is secondary interpretation, **not** the underlying verse.

## What the branch changes

- `src/components/HomeHistorySections.tsx` and identical `app/src` mirror: replace false name→verse attribution; add visible text/interpretation distinction and two original passage links; improve aria label and inclusive named/unnamed wording.
- `tests/home-history-attribution.test.tsx`: source pairing, safe links, route retention, parity.
- `browser-tests/home-hybrid.spec.ts`: 320px layout, keyboard link focus, correct label, no write requests. No changes to login, guest limits, service catalog, provider inference or content review expiry.

## Required review, limitations, rollback

Biblical-history/Jewish studies reviewer should confirm correct source translation, commentary nuance, neutral historical framing and precise homepage disclosure. The USCCB Numbers 12 page returned 403 during this check; the direct Numbers text was instead supported by Sefaria and a multi-translation comparison. Original composition dates are not 2026 publication dates. No automatic source-wide freshness extension. Verify exact-head CI and mobile acceptance before any authorised release. Rollback by reviewed revert of the isolated homepage change if review rejects the wording; no force push or production rollback here.
