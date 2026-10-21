# OMEGA Super AI → LUQI AI Curated Knowledge Migration
**Date:** 2026-10-21
**Target:** LUQI development branch `fix/companion-audit-reliability`, PR #96. No live deployment or production database migration.

## Provenance and license
Source: [ttmodupe-hash/omega-super-ai](https://github.com/ttmodupe-hash/omega-super-ai) (main branch).

OMEGA's educational archives were copied, not recreated from model memory:

| OMEGA source | LUQI destination | Entries |
| --- | --- | ---: |
| `core/data/african_history.json` | `api/data/omega/african_history.json` | 29 |
| `core/data/heritage_archive.json` | `api/data/omega/heritage_archive.json` | 14 |
| `core/data/iks_archive.json` | `api/data/omega/iks_archive.json` | 6 |
| **Total** | | **49** |

The preserved source copyright and MIT license are in `api/data/omega/LICENSE`:
`Copyright (c) 2026 Luqi-AI Consortium`.

The catalogues are versioned educational source material, not user records. We did **not** copy OMEGA account data, payment ledgers, sessions, passwords, secrets, recorded voice, private student profiles, personal medical data, or operational sandbox credentials.

## Improved LUQI-native experience
- Validated, deterministic TypeScript catalogue service (`api/services/omegaKnowledge.ts`). Schema errors, duplicate identifiers, missing bibliography, or missing IKS safety cautions fail immediately rather than generating empty fabricated responses.
- Read-only tRPC routes `omegaKnowledge.overview`, `omegaKnowledge.list`, and `omegaKnowledge.detail` under LUQI's existing HTTP server. No separate Python server, public write endpoint, runtime external AI call, or secondary database.
- Search across category, title, summary, region and key points, with bounded user inputs, stable ranked results and pagination. History has a BCE/CE timeline option.
- One normalized user interface at `#/african-knowledge`, linked in desktop navigation, mobile navigation and footer. Every detail includes original bibliography and caveats.
- Indigenous knowledge entries retain their traditional-use history, research status, scam warnings, and cautions. They must not be transformed into diagnoses, miracle-cure promises or dosing advice.
- Heritage entries preserve scholarly notes, e.g., where manuscript enumerations are disputed, and cannot be reduced to a single allegedly universal African view.
- Direct source URLs for publications are not invented: most OMEGA references are textual citations rather than verified links.
- Public educational index data is static and bundled, so the feature has zero model-token cost for browsing. This is a reviewed snapshot, **not** self-updating content or verified live research.

## Fact-checking and ethics before external accreditation
OMEGA lists bibliographic references (frequently UNESCO, academic books, historical manuscripts and SANBI), but this migration did **not** independently verify each historical or botanical claim or link against the primary sources. Display the references as leads to verify, never as completed external audits.

An academic editorial review should test dates, terminology, contested narratives, ownership of Indigenous knowledge, living tradition community perspectives, licensing/consent for future additions, religious neutrality and health claim accuracy. The historical and heritage archives are study indexes, not final authority.

## Explicitly not transplanted
OMEGA's FastAPI auth, cryptocurrency/Stripe/payment code, Redis/memory task store, tax-filing automation, untrusted Docker lab execution, voice cloning, and "autonomous improvement" controls use incompatible assumptions or involve regulated/unsafe operations. They require separate least-privilege designs, human review, infrastructure, authorization tests and financial/legal verification before inclusion.

## Release checks
- TypeScript project check, unit tests, production build.
- 49-entry provenance / schema / search / timeline / IKS safety tests.
- Normal dependency audit and secret scan.
- No merge into `main` and no production deployment without staging approval.

This change is educational content plus bounded read-only APIs; it makes no claim that Remix Cloud Run data or private OMEGA user data was accessed.
