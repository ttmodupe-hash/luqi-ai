# Continue a local Content Studio draft

The studio at `/#/content-studio` supports saving a complete six-scene storyboard and reopening it later. No LUQI account, AI provider call, upload, payment or automatic social publishing is involved in this file operation.

## Save and reopen

1. Choose **Download storyboard** before leaving. Keep the JSON file on your own device. Downloads now use `luqi.storyboard.v2`, including all six scene texts, aspect ratio, pendulum length, gravity and camera angle.
2. On a later visit, select **Open storyboard** and choose that file. The studio reads and validates it locally; it does not send the file to the server.
3. Review the proposed replacement. **Keep current storyboard** cancels without replacing current content or a completed clip. The current storyboard, script and subtitles can still be downloaded during review.
4. **Replace current storyboard** explicitly replaces the scene text/settings, resets the preview to zero and removes the previous completed clip from this page. It does not import or generate a video. Review before recording or sharing.

Existing `luqi.storyboard.v1` exports are accepted. They did not contain a camera angle; the review explains that they use the original 28-degree default. The unchanged legacy serializer remains available to existing callers. New UI downloads use v2, so older versions of the application are not claimed to import them.

## Boundaries

Files must be valid UTF-8 JSON no larger than 32 KiB, with the exact supported version/fields, six contiguous 15-second scenes, bounded text and finite simulation parameters. Unknown properties, external resource fields, unsupported claims/formats and malformed documents are refused without changing the current storyboard. Scene text is rendered as text/canvas content, not HTML. Imported gravity within the existing model's range is represented explicitly instead of silently substituted.

Reading has an eight-second deadline and explicit cancellation; unmount and stale/late completions do not apply a file. There is no automatic retry. Editing and recording are held while the replacement is reviewed. The saved file excludes account content, passwords, generated video/audio and external assets. Files are not saved automatically to browser storage or to an account. Unsaved edits are still lost on reload; download before leaving.

Tests use synthetic files and CI loopback previews only. A passing import/export browser check is not a successful 90-second native video recording, physical-device review, successful owner login, recovery drill, verified paid service delivery or merchant acceptance. Keep those separate launch holds in #202.
