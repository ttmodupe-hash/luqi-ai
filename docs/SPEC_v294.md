# SPEC_v294.md — omega.py v29.3.0 -> v29.4.0 "Global Citizen"

ALL prior specs in force. Extend `/mnt/agents/output/omega.py` IN PLACE. Single file, py3.11, stdlib-only, ASCII-only source, CLI-only, zero unhandled exceptions, ALL 63 existing selftest checks pass unchanged.

## 1. Version
`VERSION = "29.4.0"`; banner `LUQI AI v29.4.0 - Unified Master Engine`.

## 2. Language mega-expansion: LANG_PACKS 15 -> exactly 100
- Keep the existing 15 packs (af, am, en, ha, nr, nso, ss, st, sw, tn, ts, ve, xh, yo, zu) and their strings BYTE-UNCHANGED (regression).
- Add 85 new packs, same 6 UI strings each (greeting, goodbye, help-header, unknown-command, remembered, forgot), ASCII-safe transliterations, each with a native/English name label and a region tag: "african" or "world".
- AFRICAN (>= 55 new): sn Shona, nd isiNdebele (Zimbabwe), rw Kinyarwanda, rn Kirundi, lg Luganda, so Somali, om Oromo, ti Tigrinya, wo Wolof, ff Fula, ig Igbo, ak Akan/Twi, ee Ewe, kr Kanuri, bm Bambara, ln Lingala, kg Kikongo, ki Kikuyu, luo Luo, ny Chewa/Nyanja, bem Bemba, to Tonga (Zambia), loz Lozi, hz Herero, naq Khoekhoegowab, ng Oshiwambo, mg Malagasy, zgh Tamazight, tzm Central Atlas Tamazight, kri Krio, pcm Nigerian Pidgin, crs Seselwa, mfe Mauritian Creole, umb Umbundu, tum Tumbuka, kea Kabuverdianu, dyo Jola-Fonyi, mni Mursi... (coder may adjust the tail to reach >= 55, prioritizing widely-spoken languages; include `spt` SePitori — Pretoria township creole, greeting "Awe!" — as a tribute pack).
- WORLD (rest to reach 100 total): ar Arabic, zh Mandarin (pinyin), hi Hindi, es Spanish, fr French, pt Portuguese, bn Bengali, ru Russian, ja Japanese (romaji), pa Punjabi, de German, ko Korean (romanized), vi Vietnamese, tr Turkish, it Italian, ta Tamil, ur Urdu, pl Polish, uk Ukrainian, nl Dutch, th Thai, el Greek, he Hebrew (translit), fa Persian, id Indonesian, ms Malay, tl Filipino, ro Romanian, hu Hungarian, cs Czech, sv Swedish, no Norwegian, da Danish, fi Finnish.
- ACCURACY MATTERS: greetings/goodbyes must be the real, commonly-used phrases (e.g. sn "Mhoro", rw "Muraho", wo "Salaam alekum", pcm "How far!", spt "Awe!", ar "As-salamu alaykum", zh "Ni hao", ja "Konnichiwa", ko "Annyeonghaseyo", hi "Namaste", he "Shalom", th "Sawasdee", vi "Xin chao", tr "Merhaba", sw "Habari"). help-header/unknown-command/remembered/forgot may be concise transliterations but must be respectful and sensible. A verifier WILL spot-check >= 15 packs — wrong strings are a FIX.
- `lang` with no/unknown code: GROUPED list — "African languages (N)" then "World languages (M)" — code + name.

## 3. New command `translate <lang-code> <text>`
- Validates code against LANG_PACKS. Routes through the existing LLM path (bridge-first, urllib fallback): prompt = translate to the target language, return translation only. Offline/no key -> graceful message naming what to set (OPENAI_API_KEY or bridge), NOT a traceback. Audit-logged. (Honest scope: translation quality comes from the user's model key; offline engine does not self-translate.)

## 4. New command `cost`
- Prints the pricing-disruption table: LUQI AI engine = free forever, stdlib, offline; BYOK calls = pay-per-use cents (generic: "fractions of a cent - a few cents per call depending on model"); typical big-AI subscriptions ~= $20/month per seat (wording: "typically around $20/month"); one line: "World-best capabilities, African-friendly price." No fabricated precision.

## 5. `why` updates (keep 6 items, sharpen wording)
- #4: mention 100 languages, African-first. #5 title becomes "Free to run, cheap to scale" with cost proof line.

## 6. Selftest >= 70 checks
New: pack count == 100; every pack has exactly 6 non-empty ASCII strings + valid region tag; spot-string assertions (zu, sw, pcm, spt "Awe!", ar, zh, ja, hi); grouped `lang` output contains both group headers; `translate zz text` unknown-code graceful; `translate sw hello` offline graceful (no key in test env); `cost` output contains "free" and "$20"; all prior 63 checks.

## 7. Site/README handled by orchestrator after verification.
