/** Issuer-checked certification pathways (1 Nov 2026). No vendor content is reproduced.
 * Each track links directly to original awarding-body exam and training pages.
 * The internal track IDs remain stable for existing Luqi learner progress.
 */
export const CERT_REVIEWED_ON = '1 November 2026';
export const LUQI_PRACTICE_GOAL = 80;
export const CERT_PATHWAYS = {
  ccna_200_301: {
    title: 'Cisco CCNA', code: '200-301 CCNA v1.1',
    issuer: 'Cisco', duration: '120-minute exam',
    status: 'Current version through 2 February 2027; v2.0 starts 3 February 2027',
    examUrl: 'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/enterprise/ccna/index.html',
    learningUrl: 'https://u.cisco.com/certifications/ccna',
    topics: ['Network fundamentals', 'Network access and switching', 'IP connectivity and routing',
      'IP services', 'Security fundamentals', 'Automation, APIs and AI-aware network operations'],
    examFacts: 'One Cisco CCNA 200-301 exam; 120 minutes. Current v1.1 testing ends 2 February 2027.',
  },
  ccnp_encor: {
    title: 'Cisco CCNP Enterprise · ENCOR', code: '350-401 ENCOR v1.2',
    issuer: 'Cisco', duration: '120-minute core exam',
    status: 'Current Cisco ENCOR training supports v1.2',
    examUrl: 'https://www.cisco.com/site/us/en/learn/training-certifications/exams/encor.html',
    learningUrl: 'https://www.cisco.com/site/us/en/learn/training-certifications/training/courses/encor.html',
    topics: ['Dual-stack enterprise networks', 'Layer 2 switching and OSPF',
      'Security and network services', 'Automation, assurance and network programmability',
      'SD-Access and SD-WAN architectures'],
    examFacts: '350-401 ENCOR is the core exam for CCNP Enterprise; a concentration exam is also required for CCNP Enterprise certification.',
  },
  ccip_sp: {
    title: 'Cisco Service Provider Advanced Routing', code: '300-510 SPRI v1.1',
    issuer: 'Cisco', duration: '90-minute concentration exam',
    status: 'Current SPRI learning path; the former CCIP designation retired in October 2012',
    examUrl: 'https://www.cisco.com/site/us/en/learn/training-certifications/exams/spri.html',
    learningUrl: 'https://www.cisco.com/site/us/en/learn/training-certifications/training/courses/spri.html',
    topics: ['Service provider routing protocols', 'BGP policy', 'MPLS and label switching',
      'Segment routing', 'Troubleshooting advanced routing'],
    examFacts: '300-510 SPRI is a CCNP Service Provider concentration exam and earns an Advanced Routing Implementation Specialist credential when passed.',
  },
  itil_ai_v5: {
    title: 'ITIL AI Governance · Version 5', code: 'ITIL AI Governance V5',
    issuer: 'PeopleCert', duration: '90-minute open-book exam',
    status: 'PeopleCert lists a 40-question exam with a 70% minimum passing score',
    examUrl: 'https://www.peoplecert.org/browse-certifications/it-governance-and-service-management/ITIL-1/itil-ai-governance-version-5-4234',
    learningUrl: 'https://www.peoplecert.org/browse-certifications/it-governance-and-service-management/ITIL-1/itil-ai-governance-version-5-4234',
    topics: ['Responsible AI governance', 'Service outcomes and organisational context',
      'AI risk and operational oversight', 'Human approval and accountability',
      'Monitoring, feedback and improvement'],
    examFacts: 'PeopleCert publishes 40 multiple-choice questions, 90 minutes, open-book and a 70% official minimum.',
  },
} as const;
export type CertificationTrack = keyof typeof CERT_PATHWAYS;
export function issuerPathwayFor(value: string) {
  return Object.prototype.hasOwnProperty.call(CERT_PATHWAYS,value)
    ? CERT_PATHWAYS[value as CertificationTrack] : null;
}
