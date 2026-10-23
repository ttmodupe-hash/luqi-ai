# Content creation and visual learning

`/#/content-studio` and the historical video/animation aliases use a real local
creation tool. The previous simulated credit purchases and provider generation
UI are replaced. No video provider, social account, voice service or payment
activation is introduced. Both frontend source trees share this implementation.

The starter project contains six editable 15-second scenes, totaling 90 seconds.
It describes working tools and their limits; it does not display fabricated
AI conversations, filing receipts, customer counts or agent results. Users can
change titles/captions/critical-thinking questions, choose landscape/portrait/
square and download a storyboard, timed subtitles and narration/podcast outline.
The narration document is a draft, not synthesized or recorded audio.

The stage projects actual 3D coordinates through a movable perspective camera.
A small-angle pendulum model uses T = 2π√(L/g); the length and Earth/Moon/Mars
gravity controls change its motion. Time scrubbing and a motion trail compare
states. “Fourth axis” explicitly means time, not a claim of a spatial 4D engine.
Prompts encourage prediction, observation, comparison, explanation and evidence.
Graphics use original LUQI vector artwork and system fonts; no asset fetch or
private account context is needed.

Video export captures the canvas locally at a target 24 fps for 90 seconds.
It chooses a supported MP4 or WebM encoder, records no microphone/audio, caps
memory at 100 MiB and offers a preview/download only after normal completion.
Editing is locked during export; Escape, cancellation, leaving the page or
hiding the tab stops/discards a partial recording. Keeping this draft requires
an explicit download; it is not stored on LUQI or in browser local storage.
Codec support and rendering performance vary; failures are reported rather than
presented as completed videos. Review/convert an exported file as necessary for
each platform's current encoding rules. A 9:16 layout alone is not acceptance.

Offline tests check timing, export completeness, physical relationships and
invalid inputs. Browser CI exercises actual canvas rendering, editing, native
export initiation/cancellation, responsive layouts and local JSON download.
A complete 90-second production export and media-container inspection are
separate acceptance evidence and must not be inferred from synthetic replies.

## Connected publishing sequence

The current tool exports for manual upload. Direct posting is not connected.
Implement each integration only with owner-approved app registration, minimum
OAuth scopes, encrypted server-side credentials, account ownership, revocation,
per-account quotas and a persistent idempotent delivery record. Never ask users
to paste social passwords into LUQI. Never report publication from a queued job
or upload receipt; verify the final platform result and preserve ambiguous
outcomes for reconciliation rather than automatically reposting.

1. YouTube: authenticated video upload, explicit selected channel, private
   preview by default and per-video audience/rights/synthetic-media review.
2. TikTok: approved `video.publish` scope, creator-info/visibility choices,
   explicit consent, upload and verified publish status. Unaudited clients have
   visibility restrictions; app approval is not bypassed by this studio.
3. Facebook: the reviewed Page video/Reels flow and Page authorization; do not
   promise unsupported personal-profile posting.
4. WhatsApp: separately scoped business messaging/media workflow, verified
   recipients/opt-in and current policy/cost review. A video download is not
   permission to message contacts or a general WhatsApp Status publishing API.

Official references checked 2026-10-23:
- https://developers.google.com/youtube/data/reference/rest/v3/videos/insert
- https://developers.tiktok.com/docs/en/content-posting-api-get-started
- https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post
- https://developers.facebook.com/documentation/video-api/guides/publishing
- https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform

Platform account authorization, developer review and acceptance are still open.
Paid video/voice services and extra infrastructure require separate budget
approval; the existing $100 Gemini/OpenAI text ceiling is not a video budget.
