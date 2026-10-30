# South Africa province map

Replaces the hand-drawn schematic with nine geographic province shapes, coastline and national cut-outs. Selecting a shape, keyboard activation, or the full-name province buttons controls the existing reviewed government-notice filter. Counts are the current curated notices with passed/withdrawn records excluded by the existing matcher; they are not live vacancy counts. Zero means no current matching record in Luqi's reviewed collection, not absence of opportunities in the province.

## Boundary provenance and attribution

- Distributor: geoBoundaries gbOpen, boundary ID `ZAF-ADM1-76434192`, boundary year represented **2020**; build December 2023.
- Original source attribution: **OCHA ROSEA; South African Municipal Demarcation Board**.
- Metadata: https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM1/
- Original source listed by the distributor: https://data.humdata.org/dataset/south-africa-admin-level-1-boundaries
- Pinned source: https://github.com/wmgeolab/geoBoundaries/blob/9469f09/releaseData/gbOpen/ZAF/ADM1/geoBoundaries-ZAF-ADM1_simplified.geojson
- Git LFS media: https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/ZAF/ADM1/geoBoundaries-ZAF-ADM1_simplified.geojson
- SHA256: `e0be7fc729e409be2a1f596271b6d0aac5f704a066cd26cfa3bf9e23b1270fe3` (matches the repository LFS pointer).
- gbOpen distribution: **CC BY 4.0**; original metadata license: **CC BY 3.0 IGO**. Attribution is visible next to the map, with source/license links. No endorsement is implied.

Adaptations: equirectangular projection centred on 29°S, fitted to an 800×620 viewBox, line simplification at 0.45 SVG units, coordinate rounding to 0.1 unit. Original naming/ISO differences (GT→GP, KZ→KZN, LI→LP and source typo “Nothern Cape”) are mapped to Luqi's existing province IDs and labels. All polygon rings, including holes, are retained with even-odd fill; all nine provinces remain separate interactive shapes. Gauteng has a leader label because its shape is small; full-name controls remain touch sized at 320px. Neighbour labels are context only, not South African provinces.

Regenerate after downloading the pinned file:
`python scripts/build-province-map.py /path/to/geoBoundaries-ZAF-ADM1_simplified.geojson`

Generated geometry is bundled locally in both frontend source trees. Loading, hovering and selecting the map require no external map tiles, geolocation permission, tracking, API key, model call or paid map service. It does not place invented exact job/business locations. Official advert locations and verification disclosures remain in the existing job cards. The boundary vintage is disclosed; this is a simplified geographic display, not surveyed/legal boundary or navigation advice.

## Optional device location (30 October 2026)

The map offers Use my location, requested only on a click with browser permission and HTTPS. A single low-power fix (10s browser timeout, 12s UI watchdog, no cached positions) is processed locally against the bundled simplified province rings. Coordinates are never transmitted, logged, persisted or shared with contacts/AI; only a province suggestion remains in component memory for explicit confirmation. The browser/OS location provider has separate processing policies. No paid geocoder or map API is added. Leaving or reloading clears the suggestion; cancel invalidates late callbacks. Hidden, stale, invalid, low-accuracy, non-South-African or boundary-adjacent fixes fall back to manual choice.

This is approximate discovery, not navigation, address verification, legal jurisdiction or a precise position marker. An accuracy radius plus 2km simplification margin rejects ambiguous fixes, including some coastal city centres. Manual choice always works. Camera remains blocked; geolocation permission policy allows only this origin, not embedded third parties. Revocation is available in browser site settings. The deployment changes no AI allocation, payment or P2P flags.

Browser location can combine satellite, Wi-Fi and cellular estimates. Luqi cannot choose GPS vs BeiDou/Galileo/GLONASS or guarantee a satellite fix. Compatibility is determined by the device/OS, not a selectable website provider.
