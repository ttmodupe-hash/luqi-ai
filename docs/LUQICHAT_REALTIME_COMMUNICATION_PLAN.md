# LUQIChat: real-time human communication and AI study companion

## Delivery status
This document and the TypeScript contracts are a development foundation only. **Messaging, online status, calling, file uploads, and AI chat are not made live by these files.** Do not render functional-looking buttons or online badges without verified backend connections.

## User experience
- Contacts: opt-in discovery, friends/classmates, invitations, block/report; only show online when an authenticated, unexpired presence heartbeat is observed. Hidden/invisible status supported; unknown must not be presented as offline with certainty.
- Human chat: authenticated 1:1 and groups, message delivery receipts distinct from read receipts, server-authoritative timestamps, offline delivery and reconnect reconciliation.
- Study rooms: shared CCNA/ITIL/cloud/AI practice, lesson references, annotated files, session agendas, learner moderation.
- Calls: consent-based voice/video with explicit ringing, connecting, connected, reconnecting and failed states; device permission checks; WebRTC signaling, STUN/TURN, authenticated room admission, connection verification; TURN operating costs and network testing. Never fake an active call.
- Attachments: server-side size/type checks, malware scanning, authenticated access with short-lived download URLs, retention limits, access revocation, no public bucket; files and charts can be shared only to authorized room members.
- LUQI Companion: a distinctly labeled AI participant; isolated private tutor chat, retrieval-grounded course help with citations and uncertainty; cannot impersonate a human, pretend to have opened a file, joined a call, or checked a user's exam results. Do not send user content to AI without clear consent and data-handling disclosure.
- Safety: block/report, abuse rate limits, spam prevention, harassment and xenophobia moderation, minor protections and safe defaults; do not expose location or contact details without consent.
- Privacy: data minimisation, deletion/export, consent to recording, POPIA considerations and local applicable laws. E2EE must not be claimed until independently implemented and audited.

## Proposed service boundary
1. Identity and authorization: trusted session -> user ID; per-room membership and role checks on every read/write/subscription/upload/call join.
2. Real-time gateway: authenticated WebSocket/SSE channel with heartbeats, TTL, bounded fan-out, presence visibility and reconnect.
3. Persistent messaging: transactional message store, idempotent client IDs, pagination, per-room membership, delivery status.
4. Calling: WebRTC signaling and TURN credentials with short TTL; only connected after confirmed media/session connection.
5. Attachments: private object storage, quarantine + scan + authorization, signed downloads.
6. AI study service: distinct AI role, approved context and privacy policy, clear errors when unavailable.
7. Operational readiness: migrations, monitoring, abuse dashboards, load tests, TURN reliability, accessibility and mobile network testing.

## Rollout gates
- Gate A: audit existing LUQIChat routes, authentication, user records and hosting. Reuse rather than duplicate.
- Gate B: real authenticated 1:1 messages and server-derived presence, automated access-control tests.
- Gate C: group study rooms, document uploads and moderation.
- Gate D: voice/video calls with verified real media, TURN, permission and network tests.
- Gate E: clearly labeled AI companion study sessions and evaluation against incorrect/misleading responses.
- Gate F: staging QA, security review, cost approval, user acceptance; production merge/deploy only on explicit authorization.

## Never mislead
A client-side sample or optimistic UI is not proof of delivery. Do not claim user online from static mock data, call connected from a local button, file uploaded before a confirmed server response, or AI answer verified without evidence. Disclose outages, incomplete capabilities and uncertainty.
