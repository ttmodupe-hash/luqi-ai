# Site Migration Record — 2026-09-20

Permanent record of the move from a GitHub **user page** to a **project page**.
Nothing was deleted from history; every previous version is recoverable.

## What is live now

| Item | Location | Notes |
|---|---|---|
| Official marketing site | `docs/index.html` in THIS repo | Served by GitHub Pages (source: `main` / `docs`) at `https://luqi-ai.com` |
| Custom domain claim | `docs/CNAME` (`luqi-ai.com`) | Apex A records at Namecheap already point to GitHub Pages IPs — no DNS change needed |
| Spec documents | `docs/*.md` (9 files) | Untouched by the migration |

## Old user-site repo: `ttmodupe-hash/ttmodupe-hash.github.io`

| Item | State | Recoverable at |
|---|---|---|
| `CNAME` (luqi-ai.com) | DELETED on purpose — releases the domain to this project page | commit `daf36f7c` (file blob `b1087824`) |
| `index.html` v1 — "built for South Africa" coming-soon | replaced | file blob `ce9af2f4` |
| `index.html` v2 — "built for Africa, born in South Africa, made for the world" coming-soon | replaced | commit `daf36f7c` (file blob `639d333e`) |
| `index.html` v3 — redirect stub to luqi-ai.com | CURRENT in that repo | commit `04efa786` |
| `README.md` | untouched, no unique data | — |

Restore any old version with:
`git show <commit>:index.html` inside a clone of `ttmodupe-hash.github.io`.

## Legacy pages preserved in THIS repo (not served — do not delete without checking)

| File | What it is |
|---|---|
| `site/index.html` | Legacy v29.5.0 rich landing page (capabilities/languages/roadmap). Contains stale claims — superseded by `docs/index.html`, kept for reference. |
| `data/web_static/index.html` | v25.1.2 web app UI (chat/sessions/upload) |
| `app/index.html` | React/Vite app shell (v3.6.0) |

## Why the move

- One project, one repo: the site now lives with the code it markets.
- GitHub Pages hosting is free — the HostAfrica builder package is no longer
  needed for marketing and should not be renewed.
- Positioning per founder directive: born in South Africa, built for Africa,
  made for the world. Launch sequence: South Africa first.
