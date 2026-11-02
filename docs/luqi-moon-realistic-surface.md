# Luqi Moon — realistic surface visual, kept inside Luqi

Owner screenshot feedback (2 November 2026): the original Moon was a cream-coloured geometric phase silhouette. This change replaces that *visual*, not the existing SunCalc-derived Moon calculations, with a locally rendered lunar nearside (craters and maria) by default. A NASA LRO image is available on an explicit **Show NASA Moon image** selection, not a background download.

## Original source, representation and limitations

- **Source**: NASA / Goddard Space Flight Center / Arizona State University Lunar Reconnaissance Orbiter (LRO), Wide Angle Camera (WAC), near-side color mosaic. Original authority: https://www.usgs.gov/media/images/moon-lroc-wac-nearside-mosaic ; USGS explicitly identifies this as public-domain NASA imagery.
- **Displayed derivative**: 500 px Wikimedia Commons thumbnail of the NASA LRO image: https://commons.wikimedia.org/wiki/File:Moon_nearside_LRO_color_mosaic.png . No logos or NASA endorsement is implied.
- **On-device lighting**: the existing SunCalc-derived `moonSnapshot` supplies illuminated fraction, bright-limb rotation and optional location. The visible detailed texture is a *fixed* mosaic, not a live photograph or near-real-time telescope feed. The phase mask is computed locally and remains an educational model; the rendering does not model lunar libration, local weather, eclipse shadows or detailed relief.
- **Full surface switch**: intentionally shows the full near side *regardless of today's lighting*. It is labelled as a surface-exploration view. Numeric phase facts remain current and continue to update.
- **Local by default:** the homepage initially contains no external NASA image element and makes no third-party image request. It renders locally generated lunar maria/crater shapes and local phase masking. The user can press **Show NASA Moon image** to enable the Wikimedia image and later press **Use low-data Moon** to remove it. A previously downloaded image cannot be un-downloaded, but low-data mode stops referencing it.
- **Privacy**: optional high-detail image loading, only on explicit tap, contacts Wikimedia's public image host, which can observe the normal browser image request/IP. There is no Luqi model call or user location in the image URL. All Moon mathematics and user-approved one-time coarse GPS coordinates stay in-page memory.
- **Accessibility**: labeled SVG (one image role), natural buttons with pressed state, visible source and captions, responsive 320 px layout. No autoplay, unsafe GPU shaders or WebGL requirement.
- **Security / reliability**: image URL is a fixed literal and cannot be injected by the user. No API keys or background location. The default homepage must remain local-only; the optional external image never automatically loads, and if it fails, the local surface remains visible.

## Acceptance gates

- `tests/moon-real-surface.test.tsx`: photo source, phase mask, local fallback, independent full-surface view, state switches, no model fetch, source symmetry.
- Existing `tests/moon-now.test.tsx`: calculator and location privacy, pause/resume.
- `scripts/frontend-feature-acceptance.mjs moon`: exact-build Chromium/WebKit screenshots at desktop and mobile viewports, interactions, no horizontal overflow, simulated external network failure.
- Exact-head Moon workflow, Web Build, security and dependency review, merged `main`, Railway **SUCCESS** and customer-domain release verification *all* required before calling it live.

This changes no paid inference, budget, account controls, location persistence, DNS, payments or production variables. The Moon enhancement is part of Luqi itself, not a separate KHORO login.
