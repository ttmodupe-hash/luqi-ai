/**
 * Luqi-authored CCNA self-checks mapped to Cisco's original 200-301 v1.1 topics.
 * Reviewed: 2 November 2026. No exam question bank, recording, copyrighted
 * course notes, external requests, storage, model output or official endorsement.
 */
export const CCNA_GUIDE_REVIEWED = '2 November 2026';
export const CISCO_CCNA_EXAM = 'https://www.cisco.com/site/us/en/learn/training-certifications/exams/ccna.html';
export const CISCO_CCNA_REFRESH = 'https://blogs.cisco.com/learning/stay-on-track-get-certified-before-the-ccna-refresh';
export const CISCO_CCNA_V11_CHANGES = 'https://learningcontent.cisco.com/documents/marketing/exam-topics/CCNA_1_1_release_notes.pdf';
export type CcnaGuidedLesson = {
  id: string; domain: string; topic: string; title: string; goal: string;
  workedExample: string; exercise: string;
  question: string; options: readonly [string, string, string];
  answerIndex: 0 | 1 | 2; explanation: string;
  sourceUrl: string; labPath: string; labLabel: string;
};
export const CCNA_GUIDED_LESSONS: readonly CcnaGuidedLesson[] = [
  {
    id: 'ipv4', domain: '1.0 Network Fundamentals', topic: '1.6 IPv4 addressing and subnetting',
    title: 'Turn a host address into a usable subnet',
    goal: 'Calculate a host address, mask, network ID, broadcast and usable range without guessing.',
    workedExample: '172.16.85.45/22 has mask 255.255.252.0, network 172.16.84.0, broadcast 172.16.87.255 and 1,022 traditional usable addresses.',
    exercise: 'In the VLSM planner, allocate 80, 35 and 12 hosts within 192.168.10.0/24. Identify the three correctly aligned subnets.',
    question: 'For 192.168.10.45/26, which network and broadcast addresses are correct?',
    options: ['192.168.10.0 and 192.168.10.63', '192.168.10.0 and 192.168.10.255', '192.168.10.32 and 192.168.10.63'],
    answerIndex: 0,
    explanation: '/26 leaves six host bits and a block size of 64 in the last octet. Address .45 belongs to the .0–.63 range; 62 traditional usable addresses remain.',
    sourceUrl: CISCO_CCNA_EXAM, labPath: '/cert-academy?tab=subnet&track=ccna_200_301', labLabel: 'Open subnet & VLSM lab',
  },
  {
    id: 'stp', domain: '2.0 Network Access', topic: '2.5.d Rapid PVST+ protection',
    title: 'Prevent Layer 2 switching loops',
    goal: 'Distinguish root guard, loop guard, BPDU guard and BPDU filter.',
    workedExample: 'On an edge interface configured with PortFast and BPDU Guard, an unexpected BPDU can trigger an err-disabled port, protecting the spanning-tree topology.',
    exercise: 'Sketch an access switch and identify which ports are edge hosts versus inter-switch links before selecting protections.',
    question: 'Which protective feature typically places a PortFast edge port into err-disabled state after it receives a BPDU?',
    options: ['Root Guard', 'BPDU Guard', 'Loop Guard'],
    answerIndex: 1,
    explanation: 'BPDU Guard protects edge ports from unexpected switches. Root Guard prevents a superior BPDU from influencing root placement; Loop Guard protects against lost BPDUs.',
    sourceUrl: CISCO_CCNA_V11_CHANGES, labPath: '/cert-academy?tab=terminal&track=ccna_200_301', labLabel: 'Explore the CLI practice terminal',
  },
  {
    id: 'routing', domain: '3.0 IP Connectivity', topic: 'Routing and single-area OSPFv2',
    title: 'Understand why neighbours and routes matter',
    goal: 'Tell the difference between routing decisions, adjacency and switch port state.',
    workedExample: 'Before troubleshooting advertised OSPF routes, a router operator checks neighbour adjacency. A missing neighbour is a different problem from a route metric.',
    exercise: 'Inspect a simulated topology and list the device information required to validate an OSPF adjacency.',
    question: 'Which Cisco IOS command inspects OSPFv2 neighbour state?',
    options: ['show vlan brief', 'show ip ospf neighbor', 'show ip nat translations'],
    answerIndex: 1,
    explanation: '"show ip ospf neighbor" lists known OSPF neighbours and their states. VLAN and NAT commands inspect unrelated configuration or forwarding functions.',
    sourceUrl: CISCO_CCNA_EXAM, labPath: '/cert-academy?tab=topology&track=ccna_200_301', labLabel: 'Open topology learning view',
  },
  {
    id: 'services', domain: '4.0 IP Services', topic: 'DHCP and helper addresses',
    title: 'Connect hosts to network services',
    goal: 'Recognise the purpose of DHCP relay for clients separated from a DHCP server by a router.',
    workedExample: 'A host broadcasts a DHCPDISCOVER on its LAN. A configured router interface may forward the request toward a DHCP server on another subnet.',
    exercise: 'Draw two IPv4 subnets separated by a router, then identify where a DHCP relay address belongs.',
    question: 'Which common IOS interface command directs DHCP broadcast requests to a server on another network?',
    options: ['spanning-tree portfast', 'ip helper-address', 'switchport trunk allowed vlan'],
    answerIndex: 1,
    explanation: 'The ip helper-address setting enables UDP broadcast relay, commonly used for DHCP. STP and trunk commands serve different purposes.',
    sourceUrl: CISCO_CCNA_EXAM, labPath: '/cert-academy?tab=terminal&track=ccna_200_301', labLabel: 'Explore configuration practice',
  },
  {
    id: 'security', domain: '5.0 Security Fundamentals', topic: 'Layer 2 security and DHCP snooping',
    title: 'Protect a switch against rogue DHCP services',
    goal: 'Select trusted and untrusted interfaces when introducing DHCP snooping.',
    workedExample: 'A switching policy typically trusts the interface facing the authorised DHCP service while leaving ordinary client access ports untrusted.',
    exercise: 'Identify DHCP server-facing ports and ordinary endpoint ports in a small LAN diagram, then write an allow/deny policy.',
    question: 'Which DHCP snooping placement best protects users on a switch?',
    options: ['Trust every access port', 'Trust the server-facing port and keep client ports untrusted', 'Disable all DHCP replies'],
    answerIndex: 1,
    explanation: 'Trusting the legitimate server-facing port while keeping access ports untrusted helps limit rogue DHCP replies. A real deployment must account for uplink topology.',
    sourceUrl: CISCO_CCNA_EXAM, labPath: '/cert-academy?tab=terminal&track=ccna_200_301', labLabel: 'Explore network security commands',
  },
  {
    id: 'automation', domain: '6.0 Automation & Programmability', topic: '6.4 AI and ML · 6.5 REST APIs · 6.6 Ansible/Terraform',
    title: 'Use automation and AI with technical judgement',
    goal: 'Distinguish observed network measurements, predictive models and automation tools.',
    workedExample: 'A forecast can help engineers anticipate interface saturation; only measured telemetry validates what actually happened. Ansible automates tasks; Terraform expresses infrastructure state.',
    exercise: 'Create a change proposal that includes the intended outcome, validation commands and an explicit approval point before deployment.',
    question: 'Which statement accurately distinguishes Ansible and Terraform?',
    options: ['Both are Ethernet framing protocols', 'Ansible automates configuration tasks; Terraform declaratively defines infrastructure', 'Terraform is an IPv4 subnet mask'],
    answerIndex: 1,
    explanation: 'Cisco v1.1 explicitly names Ansible and Terraform under configuration management and addresses AI/ML in network operations. Neither proves a live network event or removes change review.',
    sourceUrl: CISCO_CCNA_V11_CHANGES, labPath: '/cert-academy?tab=topology&track=ccna_200_301', labLabel: 'Review topology scenarios',
  },
] as const;
export function guidedLessonById(id: string): CcnaGuidedLesson | null {
  return CCNA_GUIDED_LESSONS.find(lesson => lesson.id === id) ?? null;
}
