# LUQI Academy — December 2026 CCNA + ITIL Foundation (Version 5) Pilot

## Purpose
Make LUQI a primary study environment for learners preparing for professional exams, while explicitly distinguishing learning progress from verified certification readiness. Focus on explanation, transfer, practical demonstration, and delayed retrieval rather than answer memorisation.

## Verified exam scope (check official sources before publication)
- Cisco CCNA 200-301 v1.1: https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf ; official Cisco page indicates v1.1 lasts through 2027-02-02.
- PeopleCert ITIL Foundation Version 5: https://www.peoplecert.org/browse-certifications/it-governance-and-service-management/ITIL-1/itil-5-foundation-version-50-4154 ; 40 multiple-choice questions, 60 minutes, 65% pass. Do not confuse with ITIL 4.
- Use independently authored examples and licensed materials; do not copy official paid courseware, exam questions, or question dumps.

## Content blueprint
### CCNA
1. Network fundamentals (20%): device roles, cabling, TCP/UDP, IPv4/IPv6, subnetting, WLAN basics, virtualization, switching.
2. Network access (20%): VLANs, trunks, discovery, EtherChannel, spanning tree, wireless management.
3. IP connectivity (25%): routing tables, forwarding, static routing, OSPF.
4. IP services (10%): NAT, DHCP, DNS, NTP, QoS, SSH, SNMP, syslog.
5. Security fundamentals (15%): threats, access controls, ACLs, Layer 2 security, WLAN security.
6. Automation and programmability (10%): controllers, REST, JSON, automation, AI/ML networking concepts.
These domain percentages are from Cisco's v1.1 blueprint, not an independent LUQI weighting.

### ITIL Foundation Version 5
Digital products/services; value and value co-creation; outcomes, costs and risks; four dimensions; value system; guiding principles; product/service lifecycle; management practices; continual improvement; value streams. Map lessons to the latest official PeopleCert syllabus and terminology before publishing. Avoid substituting ITIL 4 objectives for v5.

## Each learning unit must have
- A plain-language explanation, why it matters, and a misconception to confront.
- A worked example and a new transfer scenario with different numbers/context.
- Retrieval questions requiring reasoning and explanations, not just recognition.
- A practical challenge: a network configuration/diagnostic task or IT service scenario.
- Feedback identifying the conceptual error and a corrective micro-lesson.
- A delayed recheck at approximately 1, 3 or 7 days based on evidence, not a guarantee of optimal spacing.
- Source, reviewer, version, and coverage metadata. Never fabricate citations.

## Better than Packet Tracer: phased technical target
1. Build a deterministic 2D topology editor with nodes, links, subnet diagnostics and explanations. Existing `src/lib/academy/masteryEngine.ts` is **only a tiny first step**: single-subnet connectivity and addressing checks; not a packet simulator.
2. Add Ethernet switching, MAC learning, ARP, VLANs, trunks, STP, and packet/event trace with testable state transitions.
3. Add IPv4 routing, longest-prefix matching, static routes, OSPF educational subset, ICMP, DHCP, NAT, ACLs and packet capture visualisation.
4. Add a Cisco-like CLI sandbox with explicit command compatibility matrix, saved configurations, fault injection and autograding. Avoid implying real Cisco IOS parity.
5. Add 3D/animated explanatory views only where they improve learning, preserving fast accessible 2D controls.
6. Validate behaviour against documented protocol examples, reference implementations and human networking instructors. Test correctness before marketing comparisons.

## December preparation approach
- Begin with a baseline assessment for each exam and practical subnetting/configuration checks.
- Divide weekly study between CCNA concept/lab work and ITIL scenario analysis; adapt by baseline and available time.
- Use weekly mixed retrieval sessions and timed original mock exams, then remediate weak topics.
- Before exam booking, confirm exact test version, schedule, exam accommodations and official requirements.
- A readiness indicator requires broad blueprint coverage, multiple unseen timed mock attempts and successful hands-on tasks; no claim of guaranteed pass.

## Security and rollout
Do not store learner responses in a shared anonymous account. Authenticate ownership, protect progress records, provide data export and deletion, and audit any AI assessment. Use no paid generation or provider API calls without explicit authorised billing. Development branch only; no merge or production deployment without tests and approval.
