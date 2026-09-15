# LUQI 1.0.0 UNIFICATION PLAN (memory anchor - 2026-09-15)
STATUS: 3-engine integration NOT yet executed. This file is the durable plan; the repo is the memory.
LOCKED DECISIONS (Gate 1): one backend = FastAPI/Postgres engine | one database = Postgres | version = LUQI 1.0.0 at merge | domain = luqi-ai.com
GATE 2 (open): v5.36.0 push on omega-super-ai (base64 script from the 2026-09-15 session). On confirmation: Phase 0 begins.
TARGET TREE: luqi-ai/ = engine/ (from omega-super-ai) + web/ (React app from app/) + cli/ (omega.py + .omega_parts) + modules/luscious/ + site/ + legacy/ (v25 monolith, trpc-backend, v29 platform) + docs/
SIX LINEAGES (verified 2026-09-15): A) omega.py v29.12.1 CLI - 172 checks, G0 green | B) v25 python monolith - legacy, archive | C) React app - LIVE on Railway | D) LUQI Online web platform - built, unverified deploy | E) Luscious booking - 10% non-refundable deposit is server-side law | F) Global Village Streamlit - superseded; capability table harvested into roadmap
PHASES: 0 structure (shim Railway deploy + omega loader paths) | 1 engine moves in | 2 web switches brains | 3 identity unification (1.0.0) | 4 offline doctrine completes
ISSUE QUEUE: 16 items (legacy ports 1-5, lost-delta rebuilds 6-9, capability skills 10-14, Reflexion critique 16) via the repo issue templates
GUARDRAILS: no stubs | no fabrication | CI is the gate | new capabilities queue into this plan until the merge is real in the tree | never claim integration done until the tree shows it