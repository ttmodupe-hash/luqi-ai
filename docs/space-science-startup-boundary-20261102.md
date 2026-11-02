# Startup boundary repair — 2 November 2026

Exact head b282bb67 remeasurement (run 41358958237, artifact 13103674265) was 497211 raw /147783 gzip bytes. The unchanged historical baseline was 529636 /155514 bytes, so the 5% compressed-size gate still failed by about 45 bytes. Do not round 4.97% up into a pass.

A subsequent candidate deferred OmegaTasksPage. This passed Startup Payload but failed Mobile Loading run 41360340588: `Core release marker left entry bundle`. The public release observer deliberately requires the real task review/retry controls alongside private-note markers in the initial bundle. Do not game that contract with dead strings or weaken the assertion.

The final repair restores the previous eager Omega import in both frontends. All actual controls and source remain where the existing observer expects them. More concise catalog descriptions preserve routes, service names, key search terms and capability limits while reducing the startup text. The original startup/performance thresholds, baselines and marker tests are completely unchanged. The science page remains lazy as originally designed.

84 local science/search Node checks pass, zero failures/skips. Standalone catalog source compression decreased by 203 bytes compared with b282; this is not a production-bundle measurement. Final exact-head CI must prove the actual startup saving, full mobile graph integrity and browser journeys before release. No measured customer-network-speed claim, source-date renewal or account/provider/config change is implied.
