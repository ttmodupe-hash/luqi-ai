# Luqi browser installation and updates

Official entry point: https://app.luqi-ai.com/#/install. `/#/download` is an alias.
This route distributes no APK, extension or separate installer. The browser can
provide a managed web-app package or a home-screen shortcut; the phone brand
alone does not establish support. Installation remains optional.

## Warning ownership

| Observation | Response | What must be investigated |
| --- | --- | --- |
| Browser certificate, deceptive-site or connection warning | Stop; never bypass the warning | Actual origin, TLS, redirects and site reputation; do not assume the phone is at fault |
| Luqi button fails, missing manifest/icon or page error | Keep protections on; report the step | App assets, manifest, secure context and browser install event support |
| No install menu or home-screen option | Use the normal browser/bookmark if it opens without security warnings | Browser capability, in-app browser, device policy and OS version |
| Play Protect or another security tool blocks an app/package | Stop that installation; collect redacted warning and source address | Whether it came from the official browser flow, a browser-managed package or a separate download; no assumed cause |

Do not recommend “Install anyway”, unknown-source permissions, disabling Play
Protect, disabling vendor protection or installing Google services to unlock Luqi.

## Release behavior

- Online navigation uses the current site. Service workers fetch public assets
  from the network first and never cache account/API/AI responses.
- A visible, online app checks the public boot-script identity periodically,
  initially and on return, with a two-minute minimum interval and no credentials.
- A newer build produces a refresh notice. Drafts and sign-in may be lost on
  refresh, so the customer chooses when. No message, application or payment is
  automatically repeated. Offline or malformed responses never claim an update.
- An exact previously cached retired JS/CSS chunk can keep an older tab usable.
  An uncached retired chunk presents an explicit recovery path. No substitute
  filename or private-response cache is used.

## Acceptance evidence

Automated checks cover manifest/icon contracts, prompt acceptance/dismissal,
browser installation events, no-prompt fallback, the download alias, 320px
layout, update detection, hidden/offline bounds, retired assets and public-cache
privacy. Chromium mobile sizes and iPhone-sized WebKit are browser simulations,
not physical handset or vendor installer tests.

Before claiming compatibility or that a reported security warning is resolved,
record the exact release, model, OS/browser versions, official URL, install or
shortcut result, icon launch, and old-release-to-new-release refresh. Collect
redacted warnings without passwords, OTPs or member data.

| Physical test group | Evidence required | Status when this checklist was added |
| --- | --- | --- |
| Huawei without Google Mobile Services | Supported browser install/shortcut, reopen and release update | Not verified |
| Xiaomi / Redmi / Poco | Supported browser install/shortcut, reopen and release update | Not verified |
| Oppo / Realme / OnePlus / Vivo | Supported browser install/shortcut, reopen and release update | Not verified |
| Samsung / other Android | Supported browser install/shortcut, reopen and release update | Not verified |
| iPhone / iPad | Safari home-screen flow, reopen and release update | Not verified |

Issue #374 remains open until actual device/warning evidence is recorded.

Browser references checked 31 October 2026:
- https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://web.dev/learn/pwa/installation
