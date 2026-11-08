# Electron distribution integrity

The desktop build remains on the exact Electron 45.0.0 release. Its archive
SHA-256 hashes are pinned in `app/electron/package.json` under
`build.electronDownload.checksums`.

Provenance: the official Electron release API at
https://api.github.com/repos/electron/electron/releases/tags/v45.0.0
published 21 October 2026. The values are GitHub's `sha256:` asset digests for
that release, collected on 8 November 2026. All published Electron ZIP variants
are covered, including Linux, Windows, macOS and Mac App Store archives.
This is an integrity pin, not a signature or application certification.

Electron-builder 26 supports inline checksums. They remove the extra
`SHASUMS256.txt` network dependency while retaining the downloader's archive
hash validation. No mirror, custom unpacked binary, TLS override or checksum
bypass is configured. See the vendor documentation:
https://www.electron.build/v26/docs/api/app-builder-lib.interface.configuration/
and https://www.electron.build/docs/tutorials/offline-air-gapped-builds/.

A future Electron upgrade must update the exact manifest version, lockfile and
reviewed archive hashes together. An unexpected or changed archive must fail
validation. The downloader regression test uses harmless fixture bytes and
checks both a valid digest and a deliberately incorrect one; the real package
build and packaged workspace smoke test remain mandatory CI steps.
