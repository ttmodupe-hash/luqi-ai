# Luqi Moon — realistic surface visual, kept inside Luqi

Owner screenshot feedback (2 November 2026): the original Moon was a cream-coloured geometric phase silhouette. This change replaces that *visual*, not the existing SunCalc-derived Moon calculations, with a lunar near-side mosaic and a detailed crater fallback.

## Original source, representation and limitations

- **Source**: NASA / Goddard Space Flight Center / Arizona State University Lunar Reconnaissance Orbiter (LRO), Wide Angle Camera (WAC), near-side color mosaic. Original authority: https://www.usgs.gov/media/images/moon-lroc-wac-nearside-mosaic ; USGS explicitly identifies this as public-domain NASA imagery.
- **Displayed derivative**: 512 px Wikimedia Commons thumbnail of the NASA LRO image: https://commons.wikimedia.org/wiki/File:Moon_nearside_LRO_color_mosaic.png . No logos or NASA endorsement is implied.
- **On-device lighting**: the existing SunCalc-derived `moonSnapshot` supplies illuminated fraction, bright-limb rotation and optional location. The visible detailed texture is a *fixed* mosaic, not a live photograph or near-real-time telescope feed. The phase mask is computed locally and remains an educational model; the rendering does not model lunar libration, local weather, eclipse shadows or detailed relief.
- **Full surface switch**: intentionally shows the full near side *regardless of today's lighting*. It is labelled as a surface-exploration view. Numeric phase facts remain current and continue to update.
- **No image network required mode**: selecting “Use low-data Moon” removes the Wikimedia image from the DOM and keeps locally generated near-side maria/crater shapes and phase masking. The prior downloaded photo cannot be retroactively un-downloaded, but the mode stops referencing it.
- **Privacy**: high-detail image loading contacts Wikimedia's public image host, which can observe the normal browser image request/IP. There is no Luqi model call or user location in the image URL. All Moon mathematics and user-approved one-time coarse GPS coordinates stay in-page memory.
- **Accessibility**: labeled SVG (one image role), natural buttons with pressed state, visible source and captions, responsive 320 px layout. No autoplay, unsafe GPU shaders or WebGL requirement.
- **Security**: image URL is a fixed literal. No user-supplied URLs, script injection, cross-origin API keys or background location. If the network image fails, the local surface always remains visible.

## Acceptance gates

- `tests/moon-real-surface.test.tsx`: photo source, phase mask, local fallback, independent full-surface view, state switches, no model fetch, source symmetry.
- Existing `tests/moon-now.test.tsx`: calculator and location privacy, pause/resume.
- `scripts/frontend-feature-acceptance.mjs moon`: exact-build Chromium/WebKit screenshots at desktop and mobile viewports, interactions, no horizontal overflow, simulated external network failure.
- Exact-head Moon workflow, Web Build, security and dependency review, merged `main`, Railway **SUCCESS** and customer-domain release verification *all* required before calling it live.

This changes no paid inference, budget, account controls, location persistence, DNS, payments or production variables. The Moon enhancement is part of Luqi itself, not a separate KHORO login.
