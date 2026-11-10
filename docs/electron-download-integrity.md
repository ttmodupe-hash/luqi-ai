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

## Adapter option forwarding — 9 November 2026

Keep `electronDownload.unsafelyDisableChecksums` explicitly **false**. The installed electron-builder 26.15.3 adapter distinguishes legacy options from ElectronGetOptions by a small set of property names. A checksums map alone selects the legacy branch, which drops that map before calling @electron/get. The build then requests SHASUMS256.txt after downloading the archive. Explicit false selects the modern branch and forwards both the pinned map and enabled verification. No mirror, custom distribution or certificate bypass is introduced.

The additional regression calls the actual installed downloadElectronArtifactZip adapter with the package option shape and harmless local fixture bytes. It accepts the valid digest, rejects tampering and requires that every request target the archive rather than a checksum file. Both original tests and the real Linux build/smoke test remain. The forwarding behavior was checked against createDownloadOpts and buildElectronArtifactConfig in the lockfile-selected source.
