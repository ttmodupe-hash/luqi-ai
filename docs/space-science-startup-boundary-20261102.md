# Startup boundary follow-up — 2 November 2026

Exact head b282bb67 remeasurement (run 41358958237, artifact 13103674265) was 497211 raw /147783 gzip bytes. The unchanged historical baseline was 529636 /155514 bytes, so the 5% compressed-size gate still failed by about 45 bytes. Do not round 4.97% up into a pass.

Instead of weakening the threshold or repeatedly trimming tiny text fragments, load the optional OmegaTasksPage only when its existing /omega-tasks route is visited, through the existing RouteLoadBoundary. Both frontend entrypoints use React.lazy for that page. The page's code, local calculations, account gates, feature availability, routes and guest access are unchanged. Core home/account/notes imports remain as before. No query provider is added to startup.

Existing full browser tests already cover opening the practical-tools card, 320px layout, local calculators, signed-in synthetic task availability, account clearing, keyboard navigation and errors. Those tests remain required and unchanged; final exact-head bundle measurement must establish the real byte saving. Focused local science/search tests were rerun: 84 passed, no failures/skips. This is not a locally executed full current-main build or a measured customer page-load-time claim.
