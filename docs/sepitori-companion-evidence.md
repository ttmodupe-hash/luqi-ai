# Sepitori in Luqi — evidence-bound, opt-in companion design

Status: candidate for human-language and engineering review. KHORO is integrated inside Luqi, never a second account.

## Primary/scholarly sources (checked 3 Nov 2026, Africa/Johannesburg)

- Thabo Ditsele & Charles C. Mann, *Language contact in African urban settings: The case of Sepitori in Tshwane*, South African Journal of African Languages 34(2), 2014, pp.159–165, https://doi.org/10.1080/02572117.2014.997052 — abstract describes a non-standard mixed lingua franca used in Tshwane. Does **not** independently validate modern phrase-by-phrase translations.
- Valencia K. Wagner, Thabo Ditsele & Mary M. Makgato, *Influence of Sepitori on standard Setswana of its home language learners at three Tshwane townships*, Literator 41(1), 2020, original open-access HTML https://literator.org.za/index.php/literator/article/view/1653/3163 — abstract and linguistic-background section describe contact among Setswana, Northern Sotho, English and Afrikaans, with community variation; **not** a single official standard.
- Thabo Ditsele, *Assessing Social Media Submissions Presented as Sepitori on #LearnPitori*, Arusha Working Papers in African Linguistics 2, 2019, original paper https://arushalinguistics.org/publications/Ditsele_AWPAL_2019.pdf — abstract reports blurred lines with tsotsitaal; social-media snippets are insufficient to canonise a term.
- 2025 specialist study *The Discursive Strategies in the Spoken Narratives of Multilingual Sepitori and Sesotho Speakers*, Languages 10(5) 89, https://www.mdpi.com/2226-471X/10/5/89 — section 1.2 identifies Sepitori as neither standardised nor official.

## What the code actually does

- Adds Sepitori as **experimental community variety**, distinct from South Africa's 11 official spoken language choices. This is a style preference, not an ISO/BCP-47 translation or validated TTS voice.
- Shows user-supplied colloquial greetings **Heita** and **Ola dah** as locally authored Luqi examples. They are not attributed to academic studies or claimed as exclusively Sepitori.
- The choice is explicit. Saying 'Heita' does not infer home language, race, location or consent. A standalone 'No Sepitori', 'English only', or 'I don't want to talk in Sepitori' switches to English without a model call; equally, 'Speak Sepitori' opts in. A multi-sentence question is never intercepted or silently dropped.
- Existing UI preference is saved locally under Luqi's existing `luqi_language` setting only after user action. No new fingerprinting, collection, new guest cap or provider call. A user may opt out at any time with one button. Sign-in is not needed to browse the style controls.
- Existing signed-in, consent-gated, budgeted text gateway receives only the selected language preference on **explicit Send**. Output quality is unverified; no new training or autonomous language-learning service exists. Private notes stay opt-in per request; history remains governed by existing controls.
- A user who wishes to suggest wording may **choose** the existing `/contact` route for future qualified human review. No passive private-chat collection, new training dataset, or silent upload exists.

## Next quality gates

1. Qualified Tshwane Sepitori speakers review at least two wording variants, common greetings, respectful forms and negative commands; record exact examples/corrections and feedback consent. Do not treat the author's phrasing as validated.
2. Review at least 20 opt-in/opt-out, language-switch and false-positive utterances across desktop/320px Android/iPhone-sized browsers, including screen-reader accessibility. The included deterministic tests are fixtures, not a native-speaker rating.
3. Confirm no auto-inference from name/region/ethnicity, no unrequested network calls, no changed AI budget/guest allowance and no automatic publication. Release only after exact-head CI and mobile review; rollback removes opt-in feature and preserves prior English default.
