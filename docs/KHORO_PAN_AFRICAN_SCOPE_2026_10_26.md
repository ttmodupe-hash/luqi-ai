# KHORO — Pan-African country-context pilot (verified scope, 26 October 2026)

This release is a **small, honest foundation** for LUQI's continental vision, **not** 54-country compliance certification, a GPS locator, government integration, paid public launch, or a Pan-African payment switch.

## Structure and scope
- Five *curated national anchors*: South Africa, Kenya, Nigeria, Egypt and Cameroon. **Not** five AU Regional Economic Communities (RECs). An AU-wide view is provided without assuming anyone's country.
- The African Union recognises **eight** RECs: UMA, COMESA, CEN-SAD, EAC, ECCAS, ECOWAS, IGAD and SADC; membership can overlap. Source: https://au.int/en/recs
- Africa has 55 AU Member States, while the UN African Group has 54; do not silently collapse those different counts. Source: https://www.africanunion-un.org/memberstates
- Browser timezone is merely an **unverified hint** in a few distinct zones. **No** IP classification, browser geolocation API, street location, permanent location storage or default assumption that Johannesburg timezone means South African law.
- A country selection persists in **memory within the current browser tab** while navigating LUQI; not a government ID, citizenship, actual residence, or a legal applicability decision. Defaults to AU view; it is not sent to AI by simply selecting it.
- The existing signed-in Gemini/OpenAI text gateway accepts an optional *whitelisted, user-selected* country code only after a separate **per-request opt-in**. Main provider consent, quotas, gateway validation, no-replay transport safety, and the $100/month limit ($60 Gemini, $40 OpenAI) remain unchanged.
- Server instructions distinguish assumptions from evidence, promote a four-step analysis and Socratic question, avoid unsupported legal/financial claims and prohibit inventing payment, booking or filing success. Provider configuration is **not** proof of language competence, source retrieval or correct answers.
- React safely renders *simple* bold and italics in provider responses without HTML injection, remote images, uncontrolled links or a Markdown runtime.

## Reviewed starting points (not online government accounts)
- South Africa: https://www.bizportal.gov.za/ · https://www.sars.gov.za/ · https://www.gov.za/
- Kenya: https://www.ecitizen.go.ke/ · https://itax.kra.go.ke/KRA-Portal/ · https://www.kra.go.ke/
- Nigeria: https://www.cac.gov.ng/ · https://finance.gov.ng/ministry/federal-government-issues-transition-guidelines-for-tax-acts-2025/ · https://taxombud.gov.ng/about-us/stakeholders/ . In 2026 **Nigeria Revenue Service** succeeded FIRS; historic FIRS references are not current tax-agency names.
- Egypt: https://www.eta.gov.eg/ · https://portal.eta.gov.eg/en/home
- Cameroon: https://servicepublic.gov.cm/en/ · https://minfi.gov.cm/
- Pan-African trade: https://au.int/en/recs · https://www.thedtic.gov.za/sectors-and-services-2/1-4-2-trade-and-export/afcfta-2/ · https://papss.com/get-connected/ · https://papss.com/how-it-works/

These are static links reviewed on **2026-10-26**, not live verification of portal uptime, prices, government authorisation, legal applicability or agency/API partnerships. Follow provider page and current official legislation before deciding.

## Legal, language, AfCFTA and payment truthfulness
- The source directory lists **topics to verify**, not adjudicated country-specific legal advice, court rulings, personal filing outcomes, official grants or eligibility.
- Language labels are examples only. Native translation of legal or exam questions, 2026 exam-board requirements and official memorandum answers are **not independently accepted**. Do **not** expose a direct GEMINI key in a Vite/browser bundle or publish fake exam translations when no approved server gateway is available.
- AfCFTA preferences require the applicable partner tariff schedules, product classification, rules of origin, permits and documentary proof. "All 54 countries trade tariff-free" is false.
- PAPSS has participating banks/PSPs, supported countries/routes and settlements; no guarantee a particular user can make a transfer, avoid dollar exposure in every leg, or receive instant settlement. No LUQI payment integration or remittance is implemented.
- No auto booking, official portal submission, country-law determination, open-text live web search, AI-controlled tool execution or paid subscription entitlement is introduced.
- Use the free browser-local enquiry and critical-thinking prompts as user-controlled preparation, not fabricated provider results or government endorsements.

## Unclosed acceptance
- Physical Android and iPhone test with an actual browser: country selector, working source links, screen-reader focus, low bandwidth, safe return navigation, privacy wording.
- Human/native-speaker African-language QA and official exam-board content review by country and edition.
- Government/API partner permission, terms of service, audit trail, data-hosting/legal evaluation and independent security review before acting for users.
- Date-checked legal content with links to precise primary sections before jurisdiction-dependent recommendations; continuous updates must be a real scheduled/authorised process, not a claim of autonomous sensing.
- Individual provider invoices vs durable quota reservations; Gemini test generation does not establish OpenAI generation or actual billed-cost reconciliation.
- Physical customer/account recovery, support, production-derived restore and merchant checkout tests remain tracked in #202.

## Release discipline
All source and tests must pass exact-head CI, both frontend editions remain correctly scoped, no change to Vite secrets, and Railway `kind-spontaneity/production/web` must reach terminal **SUCCESS** for actual merged SHA with exact-release public HTTPS checks. Record new evidence rather than recycling historical green results. **Never activate payments merely by merging this work.**
