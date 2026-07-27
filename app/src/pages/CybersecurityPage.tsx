import React, { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Terminal,
  BookOpen,
  Bug,
  Lock,
  Key,
  FileText,
  AlertTriangle,
  CheckCircle,
  Search,
  Play,
  ChevronRight,
  Fingerprint,
  Server,
  Globe,
  Zap,
  ChevronLeft,
  Download,
  RefreshCw,
  Clock,
  Award,
  BarChart3,
  Radio,
  Crosshair,
  Lightbulb,
  Copy,
  Check,
  XCircle,
  HelpCircle,
  Unlock,
  TrendingUp,
  Activity,
  UserCheck,
  X,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Finding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  description: string;
  recommendation: string;
}

interface AssessmentResult {
  score: number;
  risk_level: string;
  findings: Finding[];
}

interface TrainingModule {
  module_id: string;
  title: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  duration_minutes: number;
  lessons_count: number;
  category: string;
  description?: string;
  progress?: number;
}

interface Lesson {
  lesson_id: string;
  title: string;
  content: string;
  key_takeaways: string[];
  quiz: QuizQuestion[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface Lab {
  lab_id: string;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  objectives: string[];
  steps: string[];
  duration_minutes: number;
}

interface Playbook {
  id: string;
  name: string;
  type: string;
  phases: PlaybookPhase[];
}

interface PlaybookPhase {
  name: string;
  steps: PlaybookStep[];
}

interface PlaybookStep {
  number: number;
  description: string;
  role: string;
  timeframe: string;
}

interface ThreatResult {
  score: number;
  classification: string;
  indicators: { type: string; value: string; threat: string }[];
  recommendations: string[];
}

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  controls: ComplianceControl[];
}

interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  status: "implemented" | "partial" | "planned" | "not_implemented";
}

interface CVEResult {
  cve_id: string;
  title: string;
  severity: string;
  cvss_score: number;
  description: string;
  published_date: string;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_ASSESSMENT: AssessmentResult = {
  score: 72,
  risk_level: "medium",
  findings: [
    {
      severity: "high",
      category: "Authentication",
      description: "No MFA enabled on admin accounts",
      recommendation: "Implement multi-factor authentication for all admin accounts",
    },
    {
      severity: "medium",
      category: "Encryption",
      description: "TLS 1.0 still supported",
      recommendation: "Disable TLS 1.0 and 1.1, enforce TLS 1.2+",
    },
    {
      severity: "low",
      category: "Logging",
      description: "Security logs not centrally aggregated",
      recommendation: "Implement centralized SIEM for log aggregation",
    },
    {
      severity: "critical",
      category: "Access Control",
      description: "Default credentials found on 3 systems",
      recommendation: "Change all default passwords immediately and enforce strong password policy",
    },
    {
      severity: "medium",
      category: "Patch Management",
      description: "12 systems missing critical security patches",
      recommendation: "Deploy critical patches within 48 hours",
    },
    {
      severity: "low",
      category: "Network Security",
      description: "Unused ports open on firewall",
      recommendation: "Close all unused ports and implement port scanning schedule",
    },
  ],
};

const MOCK_MODULES: TrainingModule[] = [
  {
    module_id: "CS-001",
    title: "Cybersecurity Fundamentals",
    level: "beginner",
    duration_minutes: 60,
    lessons_count: 5,
    category: "fundamentals",
    description: "Learn the core concepts of cybersecurity including CIA triad, threat actors, and security controls.",
    progress: 100,
  },
  {
    module_id: "CS-002",
    title: "OWASP Top 10",
    level: "intermediate",
    duration_minutes: 120,
    lessons_count: 10,
    category: "web_security",
    description: "Deep dive into the most critical web application security risks and how to mitigate them.",
    progress: 60,
  },
  {
    module_id: "CS-003",
    title: "Incident Response",
    level: "intermediate",
    duration_minutes: 75,
    lessons_count: 6,
    category: "incident_response",
    description: "Master the art of detecting, responding to, and recovering from security incidents.",
    progress: 30,
  },
  {
    module_id: "CS-004",
    title: "Network Security",
    level: "intermediate",
    duration_minutes: 90,
    lessons_count: 7,
    category: "network_security",
    description: "Secure network infrastructure with firewalls, IDS/IPS, segmentation, and monitoring.",
    progress: 0,
  },
  {
    module_id: "CS-005",
    title: "Cloud Security",
    level: "advanced",
    duration_minutes: 100,
    lessons_count: 8,
    category: "cloud_security",
    description: "Protect cloud environments with IAM, encryption, compliance, and shared responsibility.",
    progress: 0,
  },
  {
    module_id: "CS-006",
    title: "Malware Analysis",
    level: "advanced",
    duration_minutes: 150,
    lessons_count: 10,
    category: "threat_analysis",
    description: "Analyze malicious software using static and dynamic techniques in sandboxed environments.",
    progress: 0,
  },
  {
    module_id: "CS-007",
    title: "Penetration Testing",
    level: "expert",
    duration_minutes: 180,
    lessons_count: 12,
    category: "offensive_security",
    description: "Ethical hacking methodologies including reconnaissance, exploitation, and reporting.",
    progress: 0,
  },
  {
    module_id: "CS-010",
    title: "POPIA Compliance",
    level: "intermediate",
    duration_minutes: 80,
    lessons_count: 7,
    category: "compliance",
    description: "Understand South Africa's POPIA act and implement data protection compliance measures.",
    progress: 0,
  },
];

const MOCK_LESSON: Lesson = {
  lesson_id: "L1",
  title: "Understanding the Threat Landscape",
  content: `## Overview\nThe modern threat landscape is constantly evolving. Attackers range from individual hackers to organized crime syndicates and nation-state actors.\n\n## Key Threat Actors\n- **Script Kiddies**: Unskilled attackers using pre-built tools\n- **Hacktivists**: Politically or socially motivated attackers\n- **Cybercriminals**: Financially motivated organized groups\n- **Nation-State Actors**: Government-sponsored advanced persistent threats (APTs)\n- **Insider Threats**: Malicious or negligent employees\n\n## Attack Vectors\n1. Phishing and social engineering\n2. Malware and ransomware\n3. Exploiting unpatched vulnerabilities\n4. Credential stuffing and brute force\n5. Supply chain attacks\n\n## Defense Strategy\nA layered defense approach (Defense in Depth) combines multiple security controls to protect assets. No single control is sufficient.`,
  key_takeaways: [
    "Threat actors vary widely in skill level, motivation, and resources",
    "Defense in Depth is the foundational strategy for cybersecurity",
    "Human factors are often the weakest link in security chains",
    "Continuous monitoring and rapid response are essential",
  ],
  quiz: [
    {
      question: "Which threat actor type is typically the most sophisticated and well-resourced?",
      options: ["Script Kiddies", "Hacktivists", "Cybercriminals", "Nation-State Actors"],
      correct_index: 3,
      explanation: "Nation-state actors are government-sponsored groups with significant resources, advanced tools, and the patience to conduct long-term campaigns (APTs).",
    },
    {
      question: "What does 'Defense in Depth' mean?",
      options: [
        "Using a single strong firewall",
        "Layering multiple security controls",
        "Encrypting all data",
        "Hiring more security staff",
      ],
      correct_index: 1,
      explanation: "Defense in Depth is a strategy that layers multiple security controls throughout the IT environment so that if one fails, others still provide protection.",
    },
    {
      question: "Which of the following is NOT a common attack vector?",
      options: ["Phishing", "Patch management", "Ransomware", "Credential stuffing"],
      correct_index: 1,
      explanation: "Patch management is a defensive practice, not an attack vector. The other options are methods attackers use to compromise systems.",
    },
  ],
};

const MOCK_LABS: Lab[] = [
  {
    lab_id: "LAB-001",
    title: "Phishing Email Analysis",
    difficulty: "beginner",
    category: "analysis",
    description: "Analyze a suspicious email to identify phishing indicators and understand email security headers.",
    objectives: ["Identify phishing indicators", "Analyze email headers", "Report findings"],
    steps: [
      "Open the provided email sample in the analysis sandbox",
      "Examine the sender address for spoofing indicators",
      "Check email authentication headers (SPF, DKIM, DMARC)",
      "Inspect all URLs by hovering (do not click)",
      "Analyze attachments for malicious content",
      "Document all IOCs (Indicators of Compromise)",
      "Write a brief incident report",
    ],
    duration_minutes: 30,
  },
  {
    lab_id: "LAB-002",
    title: "Network Traffic Analysis",
    difficulty: "intermediate",
    category: "network",
    description: "Investigate suspicious network traffic using Wireshark to identify potential data exfiltration.",
    objectives: ["Capture network traffic", "Identify anomalies", "Detect exfiltration patterns"],
    steps: [
      "Load the provided PCAP file into Wireshark",
      "Apply display filters to isolate suspicious traffic",
      "Identify unusual DNS queries (potential DNS tunneling)",
      "Look for large outbound transfers to unknown IPs",
      "Check for beaconing patterns (regular interval communications)",
      "Extract any suspicious files from the traffic",
      "Document the attack timeline and IOCs",
    ],
    duration_minutes: 45,
  },
  {
    lab_id: "LAB-003",
    title: "Vulnerability Scanning",
    difficulty: "intermediate",
    category: "assessment",
    description: "Use OpenVAS to scan a target network and analyze the results to prioritize remediation.",
    objectives: ["Configure scan policies", "Execute vulnerability scans", "Prioritize findings"],
    steps: [
      "Set up the OpenVAS scanning environment",
      "Create a new target with the provided IP range",
      "Configure scan policy for full and fast scan",
      "Launch the scan and monitor progress",
      "Review results filtered by severity",
      "Generate a remediation report",
      "Create tickets for critical and high findings",
    ],
    duration_minutes: 60,
  },
];

const MOCK_PLAYBOOKS: Playbook[] = [
  {
    id: "PB-001",
    name: "Malware Incident Response",
    type: "malware",
    phases: [
      {
        name: "Detection",
        steps: [
          { number: 1, description: "Confirm malware detection via AV/EDR alert", role: "SOC Analyst", timeframe: "0-15 min" },
          { number: 2, description: "Isolate affected system from network", role: "SOC Analyst", timeframe: "15-30 min" },
          { number: 3, description: "Collect initial forensic artifacts", role: "Forensics", timeframe: "30-60 min" },
        ],
      },
      {
        name: "Containment",
        steps: [
          { number: 4, description: "Block known malicious IPs/domains at firewall", role: "Network Team", timeframe: "1-2 hours" },
          { number: 5, description: "Disable compromised user accounts", role: "Identity Team", timeframe: "1-2 hours" },
          { number: 6, description: "Deploy additional monitoring", role: "SOC Lead", timeframe: "2-4 hours" },
        ],
      },
      {
        name: "Eradication",
        steps: [
          { number: 7, description: "Remove malware from all affected systems", role: "IT Operations", timeframe: "4-8 hours" },
          { number: 8, description: "Patch exploited vulnerabilities", role: "IT Operations", timeframe: "8-24 hours" },
          { number: 9, description: "Reset credentials for affected accounts", role: "Identity Team", timeframe: "8-24 hours" },
        ],
      },
      {
        name: "Recovery",
        steps: [
          { number: 10, description: "Restore systems from clean backups", role: "IT Operations", timeframe: "24-48 hours" },
          { number: 11, description: "Bring systems online with enhanced monitoring", role: "SOC Lead", timeframe: "48-72 hours" },
          { number: 12, description: "Validate system integrity", role: "Forensics", timeframe: "48-72 hours" },
        ],
      },
      {
        name: "Lessons Learned",
        steps: [
          { number: 13, description: "Conduct post-incident review meeting", role: "CISO", timeframe: "1 week" },
          { number: 14, description: "Update detection rules and playbooks", role: "SOC Lead", timeframe: "1-2 weeks" },
          { number: 15, description: "Deliver executive briefing", role: "CISO", timeframe: "1 week" },
        ],
      },
    ],
  },
  {
    id: "PB-002",
    name: "Phishing Incident Response",
    type: "phishing",
    phases: [
      {
        name: "Detection",
        steps: [
          { number: 1, description: "Validate phishing report from user or system", role: "SOC Analyst", timeframe: "0-15 min" },
          { number: 2, description: "Query email gateway for similar messages", role: "SOC Analyst", timeframe: "15-30 min" },
          { number: 3, description: "Identify users who clicked or opened attachments", role: "Email Admin", timeframe: "30-60 min" },
        ],
      },
      {
        name: "Containment",
        steps: [
          { number: 4, description: "Remove phishing emails from all mailboxes", role: "Email Admin", timeframe: "1-2 hours" },
          { number: 5, description: "Block sender domain and URLs", role: "Network Team", timeframe: "1-2 hours" },
          { number: 6, description: "Force password reset for affected users", role: "Identity Team", timeframe: "2-4 hours" },
        ],
      },
      {
        name: "Eradication",
        steps: [
          { number: 7, description: "Scan affected endpoints for malware", role: "IT Operations", timeframe: "4-8 hours" },
          { number: 8, description: "Revoke any active attacker sessions", role: "Identity Team", timeframe: "4-8 hours" },
        ],
      },
      {
        name: "Recovery",
        steps: [
          { number: 9, description: "Restore affected accounts and services", role: "IT Operations", timeframe: "8-24 hours" },
          { number: 10, description: "Implement additional email security controls", role: "Email Admin", timeframe: "24-48 hours" },
        ],
      },
      {
        name: "Lessons Learned",
        steps: [
          { number: 11, description: "Update phishing awareness training", role: "Security Awareness", timeframe: "1 week" },
          { number: 12, description: "Tune email gateway detection rules", role: "SOC Lead", timeframe: "1-2 weeks" },
        ],
      },
    ],
  },
  {
    id: "PB-003",
    name: "Data Breach Response",
    type: "data_breach",
    phases: [
      {
        name: "Detection",
        steps: [
          { number: 1, description: "Verify breach indicators and scope", role: "SOC Lead", timeframe: "0-1 hour" },
          { number: 2, description: "Invoke incident response team", role: "CISO", timeframe: "1-2 hours" },
          { number: 3, description: "Engage legal and compliance team", role: "CISO", timeframe: "2-4 hours" },
        ],
      },
      {
        name: "Containment",
        steps: [
          { number: 4, description: "Isolate compromised databases/systems", role: "IT Operations", timeframe: "4-8 hours" },
          { number: 5, description: "Preserve forensic evidence", role: "Forensics", timeframe: "8-24 hours" },
          { number: 6, description: "Implement emergency access controls", role: "Identity Team", timeframe: "8-24 hours" },
        ],
      },
      {
        name: "Eradication",
        steps: [
          { number: 7, description: "Close attack vectors used for breach", role: "IT Operations", timeframe: "24-72 hours" },
          { number: 8, description: "Enhance monitoring on affected systems", role: "SOC Lead", timeframe: "24-72 hours" },
        ],
      },
      {
        name: "Recovery",
        steps: [
          { number: 9, description: "Restore services with enhanced security", role: "IT Operations", timeframe: "1-2 weeks" },
          { number: 10, description: "Notify affected parties per regulations", role: "Legal", timeframe: "As required" },
        ],
      },
      {
        name: "Lessons Learned",
        steps: [
          { number: 11, description: "Conduct comprehensive post-breach review", role: "CISO", timeframe: "2-4 weeks" },
          { number: 12, description: "Update security architecture and controls", role: "Security Architect", timeframe: "1-3 months" },
        ],
      },
    ],
  },
  {
    id: "PB-004",
    name: "Ransomware Response",
    type: "ransomware",
    phases: [
      {
        name: "Detection",
        steps: [
          { number: 1, description: "Confirm ransomware indicators (encrypted files, ransom note)", role: "SOC Analyst", timeframe: "0-15 min" },
          { number: 2, description: "Identify ransomware family and IOCs", role: "Malware Analyst", timeframe: "15-60 min" },
          { number: 3, description: "Determine scope of encryption", role: "IT Operations", timeframe: "1-2 hours" },
        ],
      },
      {
        name: "Containment",
        steps: [
          { number: 4, description: "Disconnect infected systems immediately", role: "IT Operations", timeframe: "Immediately" },
          { number: 5, description: "Block C2 communications at firewall", role: "Network Team", timeframe: "1-2 hours" },
          { number: 6, description: "Preserve ransom note for forensics", role: "Forensics", timeframe: "1-2 hours" },
        ],
      },
      {
        name: "Eradication",
        steps: [
          { number: 7, description: "Do NOT pay ransom (per policy)", role: "CISO", timeframe: "N/A" },
          { number: 8, description: "Rebuild affected systems from scratch", role: "IT Operations", timeframe: "1-5 days" },
          { number: 9, description: "Restore data from clean backups", role: "IT Operations", timeframe: "1-5 days" },
        ],
      },
      {
        name: "Recovery",
        steps: [
          { number: 10, description: "Verify backup integrity before restore", role: "IT Operations", timeframe: "1-2 days" },
          { number: 11, description: "Implement enhanced endpoint protection", role: "IT Operations", timeframe: "1 week" },
          { number: 12, description: "Conduct security assessment of restored systems", role: "Security Team", timeframe: "1-2 weeks" },
        ],
      },
      {
        name: "Lessons Learned",
        steps: [
          { number: 13, description: "Review backup and recovery procedures", role: "IT Operations", timeframe: "1-2 weeks" },
          { number: 14, description: "Improve email and endpoint security", role: "Security Team", timeframe: "2-4 weeks" },
          { number: 15, description: "Conduct ransomware awareness training", role: "Security Awareness", timeframe: "1-2 weeks" },
        ],
      },
    ],
  },
  {
    id: "PB-005",
    name: "DDoS Attack Response",
    type: "ddos",
    phases: [
      {
        name: "Detection",
        steps: [
          { number: 1, description: "Confirm DDoS attack via monitoring dashboards", role: "NOC Analyst", timeframe: "0-5 min" },
          { number: 2, description: "Identify attack type (Volumetric, Protocol, Application)", role: "NOC Analyst", timeframe: "5-15 min" },
          { number: 3, description: "Notify on-call engineering team", role: "NOC Lead", timeframe: "5-15 min" },
        ],
      },
      {
        name: "Containment",
        steps: [
          { number: 4, description: "Activate DDoS mitigation service", role: "Network Team", timeframe: "15-30 min" },
          { number: 5, description: "Implement rate limiting and traffic filtering", role: "Network Team", timeframe: "15-30 min" },
          { number: 6, description: "Scale up infrastructure if needed", role: "Cloud Team", timeframe: "30-60 min" },
        ],
      },
      {
        name: "Eradication",
        steps: [
          { number: 7, description: "Block attacking IP ranges", role: "Network Team", timeframe: "1-2 hours" },
          { number: 8, description: "Apply GEO-blocking if applicable", role: "Network Team", timeframe: "1-2 hours" },
        ],
      },
      {
        name: "Recovery",
        steps: [
          { number: 9, description: "Gradually restore normal traffic flow", role: "Network Team", timeframe: "2-4 hours" },
          { number: 10, description: "Monitor for attack resumption", role: "NOC Analyst", timeframe: "Ongoing" },
        ],
      },
      {
        name: "Lessons Learned",
        steps: [
          { number: 11, description: "Analyze attack patterns and sources", role: "Security Team", timeframe: "1-2 weeks" },
          { number: 12, description: "Strengthen DDoS mitigation capabilities", role: "Network Team", timeframe: "2-4 weeks" },
        ],
      },
    ],
  },
];

const MOCK_THREAT_RESULT: ThreatResult = {
  score: 85,
  classification: "Malicious",
  indicators: [
    { type: "IP", value: "192.168.100.55", threat: "Known C2 server - Emotet" },
    { type: "Domain", value: "evil-cdn.xyz", threat: "Phishing domain - active" },
    { type: "Hash", value: "a1b2c3d4...", threat: "Known malware - TrickBot" },
  ],
  recommendations: [
    "Block IP and domain at firewall immediately",
    "Quarantine any files matching the hash",
    "Hunt for lateral movement in your environment",
    "Force password reset for affected accounts",
  ],
};

const MOCK_COMPLIANCE_FRAMEWORKS: ComplianceFramework[] = [
  {
    id: "nist_csf",
    name: "NIST CSF",
    description: "National Institute of Standards and Technology Cybersecurity Framework",
    controls: [
      { id: "ID.AM-1", name: "Asset Inventory", description: "Physical devices and systems are inventoried", status: "implemented" },
      { id: "ID.AM-2", name: "Software Inventory", description: "Software platforms and applications are inventoried", status: "implemented" },
      { id: "PR.AC-1", name: "Identity Management", description: "Identities and credentials are managed", status: "partial" },
      { id: "PR.AC-4", name: "Access Permissions", description: "Access permissions are managed", status: "planned" },
      { id: "PR.DS-1", name: "Data-at-rest Protection", description: "Data-at-rest is protected", status: "implemented" },
      { id: "PR.DS-2", name: "Data-in-transit Protection", description: "Data-in-transit is protected", status: "implemented" },
      { id: "PR.IP-1", name: "Baseline Configurations", description: "Baseline configurations are established", status: "partial" },
      { id: "DE.AE-1", name: "Audit Logs", description: "Audit logs are collected and analyzed", status: "not_implemented" },
      { id: "RS.RP-1", name: "Response Plan", description: "Response plan is executed during incident", status: "planned" },
      { id: "RC.IM-1", name: "Recovery Planning", description: "Recovery plans incorporate lessons learned", status: "planned" },
    ],
  },
  {
    id: "iso27001",
    name: "ISO 27001",
    description: "International standard for information security management",
    controls: [
      { id: "A.5.1.1", name: "Information Security Policies", description: "Policies for information security are defined", status: "implemented" },
      { id: "A.6.1.1", name: "Information Security Roles", description: "Information security roles are defined", status: "partial" },
      { id: "A.8.1.1", name: "Asset Inventory", description: "Assets are inventoried", status: "implemented" },
      { id: "A.9.1.1", name: "Access Control Policy", description: "Access control policy is established", status: "implemented" },
      { id: "A.9.2.1", name: "User Registration", description: "User registration and de-registration process", status: "partial" },
      { id: "A.10.1.1", name: "Cryptographic Policy", description: "Policy on the use of cryptographic controls", status: "planned" },
      { id: "A.12.1.1", name: "Operating Procedures", description: "Operating procedures are documented", status: "not_implemented" },
      { id: "A.12.4.1", name: "Event Logging", description: "Event logs are generated and stored", status: "not_implemented" },
    ],
  },
  {
    id: "cis_controls",
    name: "CIS Controls",
    description: "Center for Internet Security Controls",
    controls: [
      { id: "CIS-1", name: "Inventory of Assets", description: "Actively manage all hardware assets", status: "implemented" },
      { id: "CIS-2", name: "Inventory of Software", description: "Actively manage all software assets", status: "implemented" },
      { id: "CIS-3", name: "Data Protection", description: "Continuously manage data protection", status: "partial" },
      { id: "CIS-4", name: "Secure Configuration", description: "Establish secure configurations", status: "partial" },
      { id: "CIS-5", name: "Account Management", description: "Implement account management", status: "planned" },
      { id: "CIS-6", name: "Access Control", description: "Establish access control management", status: "planned" },
      { id: "CIS-7", name: "Continuous Vulnerability Management", description: "Continuously manage vulnerabilities", status: "not_implemented" },
      { id: "CIS-8", name: "Audit Log Management", description: "Collect and analyze audit logs", status: "not_implemented" },
    ],
  },
];

const MOCK_CVE_RESULTS: CVEResult[] = [
  {
    cve_id: "CVE-2021-44228",
    title: "Log4j Remote Code Execution (Log4Shell)",
    severity: "critical",
    cvss_score: 10.0,
    description: "Apache Log4j2 JNDI features do not protect against attacker controlled LDAP and other JNDI related endpoints.",
    published_date: "2021-12-10",
  },
  {
    cve_id: "CVE-2021-45046",
    title: "Log4j Denial of Service",
    severity: "critical",
    cvss_score: 9.0,
    description: "It was found that the fix to address CVE-2021-44228 in Apache Log4j 2.15.0 was incomplete.",
    published_date: "2021-12-14",
  },
  {
    cve_id: "CVE-2023-38408",
    title: "OpenSSH Forwarded SSH-Agent RCE",
    severity: "high",
    cvss_score: 8.4,
    description: "The PKCS#11 feature in ssh-agent in OpenSSH has an insufficiently trustworthy search path.",
    published_date: "2023-07-19",
  },
  {
    cve_id: "CVE-2023-34362",
    title: "MOVEit Transfer SQL Injection",
    severity: "critical",
    cvss_score: 9.8,
    description: "A SQL injection vulnerability has been found in the MOVEit Transfer web application.",
    published_date: "2023-06-09",
  },
];

const SECURITY_TIPS = [
  { tip: "Always use multi-factor authentication (MFA) for all accounts, especially privileged ones.", category: "Authentication" },
  { tip: "Keep all software updated with the latest security patches within 48 hours of release.", category: "Patching" },
  { tip: "Never click links or open attachments in unexpected emails - verify with the sender first.", category: "Phishing" },
  { tip: "Use a password manager to generate and store unique, complex passwords for every service.", category: "Passwords" },
  { tip: "Regularly backup critical data and test your restore procedures.", category: "Backup" },
  { tip: "Enable full disk encryption on all laptops and mobile devices.", category: "Encryption" },
  { tip: "Segment your network to limit lateral movement in case of a breach.", category: "Network" },
  { tip: "Review user access permissions quarterly and remove unnecessary privileges.", category: "Access Control" },
  { tip: "Monitor logs for failed login attempts and unusual access patterns.", category: "Monitoring" },
  { tip: "Conduct regular phishing simulations to train employees on recognizing attacks.", category: "Training" },
  { tip: "Disable USB ports and removable media access where not required.", category: "Endpoint" },
  { tip: "Use HTTPS for all web services and disable legacy TLS versions.", category: "Encryption" },
];

const POPIA_GUIDELINES = [
  {
    principle: "Accountability",
    description: "The responsible party must take steps to ensure compliance with POPIA conditions.",
    obligations: ["Appoint an Information Officer", "Develop and implement data protection policies", "Ensure compliance training"],
  },
  {
    principle: "Processing Limitation",
    description: "Personal information must be processed lawfully and in a reasonable manner.",
    obligations: ["Obtain consent where required", "Only collect information for specified purposes", "Do not collect excessive data"],
  },
  {
    principle: "Purpose Specification",
    description: "Personal information must be collected for a specific, explicitly defined purpose.",
    obligations: ["Document the purpose of collection", "Notify data subjects of the purpose", "Do not use data for incompatible purposes"],
  },
  {
    principle: "Further Processing Limitation",
    description: "Further processing must be compatible with the original purpose.",
    obligations: ["Assess compatibility of new purposes", "Obtain additional consent if needed"],
  },
  {
    principle: "Information Quality",
    description: "The responsible party must ensure personal information is complete and accurate.",
    obligations: ["Take steps to ensure accuracy", "Allow data subjects to update their information", "Regularly verify data quality"],
  },
  {
    principle: "Openness",
    description: "The responsible party must maintain documentation of all processing operations.",
    obligations: ["Maintain a data processing register", "Notify data subjects about processing", "Be transparent about data practices"],
  },
  {
    principle: "Security Safeguards",
    description: "Appropriate technical and organizational measures must protect personal information.",
    obligations: ["Implement access controls", "Encrypt sensitive data", "Regular security assessments", "Breach notification procedures"],
  },
  {
    principle: "Data Subject Participation",
    description: "Data subjects have rights to access and correct their personal information.",
    obligations: ["Provide access to personal data upon request", "Allow correction of inaccurate data", "Establish a process for objections"],
  },
];

const DATA_SUBJECT_RIGHTS = [
  "Right to be informed about collection of personal information",
  "Right to access their personal information",
  "Right to correct or update personal information",
  "Right to object to processing of personal information",
  "Right to request deletion of personal information",
  "Right to object to direct marketing",
  "Right to not be subject to automated decision-making",
  "Right to complain to the Information Regulator",
  "Right to civil remedies for interference with rights",
  "Right to withdraw consent",
];

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    info: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <Badge variant="outline" className={`${colors[severity] || colors.info} font-mono text-xs uppercase`}>
      {severity}
    </Badge>
  );
};

const LevelBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors: Record<string, string> = {
    beginner: "bg-green-500/20 text-green-400 border-green-500/30",
    intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    advanced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    expert: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <Badge variant="outline" className={`${colors[level] || colors.beginner} font-mono text-xs capitalize`}>
      {level}
    </Badge>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    implemented: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    partial: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    planned: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    not_implemented: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <Badge variant="outline" className={`${colors[status] || colors.planned} font-mono text-xs capitalize`}>
      {status.replace("_", " ")}
    </Badge>
  );
};

const ScoreGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const getColor = (s: number) => {
    if (s >= 80) return "text-emerald-400";
    if (s >= 60) return "text-yellow-400";
    if (s >= 40) return "text-orange-400";
    return "text-red-400";
  };
  const getBgColor = (s: number) => {
    if (s >= 80) return "bg-emerald-500";
    if (s >= 60) return "bg-yellow-500";
    if (s >= 40) return "bg-orange-500";
    return "bg-red-500";
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#27272a" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={`${(score / 100) * 314} 314`}
            strokeLinecap="round"
            className={`${getColor(score)} transition-all duration-1000`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold font-mono ${getColor(score)}`}>{score}</span>
          <span className="text-[10px] text-zinc-500 uppercase">{label}</span>
        </div>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-2">
        <div className={`${getBgColor(score)} h-2 rounded-full transition-all duration-1000`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
};

const ThreatPulse: React.FC<{ level: "green" | "yellow" | "red" }> = ({ level }) => {
  const colors = {
    green: "bg-emerald-400 shadow-emerald-400/50",
    yellow: "bg-yellow-400 shadow-yellow-400/50",
    red: "bg-red-400 shadow-red-400/50",
  };
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[level]}`} />
        <span className={`relative inline-flex rounded-full h-3 w-3 ${colors[level]}`} />
      </span>
      <span className="text-xs text-zinc-400 font-mono uppercase">
        {level === "green" ? "Low Threat" : level === "yellow" ? "Elevated" : "Critical"}
      </span>
    </div>
  );
};

const Spinner: React.FC = () => (
  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const CybersecurityPage: React.FC = () => {
  const { get, post, loading, error } = useApi();
  const [activeTab, setActiveTab] = useState("assessment");
  const [securityTipIndex, setSecurityTipIndex] = useState(0);
  const [threatLevel, setThreatLevel] = useState<"green" | "yellow" | "red">("green");

  // Assessment state
  const [assessmentType, setAssessmentType] = useState("general");
  const [assessmentDomain, setAssessmentDomain] = useState("");
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);

  // Training state
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [trainingTab, setTrainingTab] = useState("modules");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({
    "CS-001": 100,
    "CS-002": 60,
    "CS-003": 30,
  });
  const [learningPath, setLearningPath] = useState<TrainingModule[]>([]);

  // Incident response state
  const [selectedPlaybookType, setSelectedPlaybookType] = useState("malware");
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [incidentTab, setIncidentTab] = useState("playbooks");
  const [threatIps, setThreatIps] = useState("");
  const [threatDomains, setThreatDomains] = useState("");
  const [threatHashes, setThreatHashes] = useState("");
  const [threatResult, setThreatResult] = useState<ThreatResult | null>(null);
  const [threatLoading, setThreatLoading] = useState(false);

  // Compliance state
  const [selectedFramework, setSelectedFramework] = useState("nist_csf");
  const [complianceTab, setComplianceTab] = useState("frameworks");
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>(MOCK_COMPLIANCE_FRAMEWORKS);
  const [complianceScore, setComplianceScore] = useState(0);

  // Tools state
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordResult, setPasswordResult] = useState<{ score: number; crack_time: string; suggestions: string[] } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [cveKeyword, setCveKeyword] = useState("");
  const [cveResults, setCveResults] = useState<CVEResult[]>([]);
  const [cveLoading, setCveLoading] = useState(false);
  const [policyType, setPolicyType] = useState("password");
  const [policyOrg, setPolicyOrg] = useState("");
  const [generatedPolicy, setGeneratedPolicy] = useState("");
  const [policyLoading, setPolicyLoading] = useState(false);
  const [toolsTipIndex, setToolsTipIndex] = useState(0);
  const [copiedPolicy, setCopiedPolicy] = useState(false);

  // Tip rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setSecurityTipIndex((prev) => (prev + 1) % SECURITY_TIPS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Simulate threat level changes
  useEffect(() => {
    const interval = setInterval(() => {
      const levels: ("green" | "yellow" | "red")[] = ["green", "yellow", "red"];
      setThreatLevel(levels[Math.floor(Math.random() * 3)]);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate compliance score
  useEffect(() => {
    const framework = frameworks.find((f) => f.id === selectedFramework);
    if (framework) {
      const total = framework.controls.length;
      const implemented = framework.controls.filter((c) => c.status === "implemented").length;
      const partial = framework.controls.filter((c) => c.status === "partial").length;
      setComplianceScore(Math.round(((implemented + partial * 0.5) / total) * 100));
    }
  }, [selectedFramework, frameworks]);

  // ─── API HANDLERS ─────────────────────────────────────────────────────────

  const runAssessment = async () => {
    setAssessmentLoading(true);
    try {
      const result = await post("/api/v25/cyber/assessment/run", {
        domain: assessmentDomain || undefined,
        assessment_type: assessmentType,
      });
      setAssessmentResult(result);
    } catch {
      setAssessmentResult(MOCK_ASSESSMENT);
    } finally {
      setAssessmentLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      const result = await get("/api/v25/cyber/training/modules");
      if (result && Array.isArray(result)) {
        // Merge with progress
      }
    } catch {
      // Use mock data
    }
  };

  const loadLesson = async (moduleId: string, lessonId: string) => {
    try {
      const result = await get(`/api/v25/cyber/training/lesson?module_id=${moduleId}&lesson_id=${lessonId}`);
      setSelectedLesson(result || MOCK_LESSON);
    } catch {
      setSelectedLesson(MOCK_LESSON);
    }
  };

  const submitQuiz = async () => {
    setQuizSubmitted(true);
    try {
      await post("/api/v25/cyber/training/assess", { answers: Object.values(quizAnswers) });
    } catch {
      // Client-side grading
    }
  };

  const loadPlaybook = async (type: string) => {
    try {
      const result = await get(`/api/v25/cyber/incident/playbooks?type=${type}`);
      setSelectedPlaybook(result || MOCK_PLAYBOOKS.find((p) => p.type === type) || null);
    } catch {
      setSelectedPlaybook(MOCK_PLAYBOOKS.find((p) => p.type === type) || null);
    }
  };

  const analyzeThreat = async () => {
    setThreatLoading(true);
    try {
      const result = await post("/api/v25/cyber/threat/analyze", {
        indicators: {
          ips: threatIps.split(",").map((s) => s.trim()).filter(Boolean),
          domains: threatDomains.split(",").map((s) => s.trim()).filter(Boolean),
          hashes: threatHashes.split(",").map((s) => s.trim()).filter(Boolean),
        },
      });
      setThreatResult(result);
    } catch {
      setThreatResult(MOCK_THREAT_RESULT);
    } finally {
      setThreatLoading(false);
    }
  };

  const getLearningPath = async () => {
    try {
      const result = await post("/api/v25/cyber/training/path", {
        current_level: "intermediate",
        interests: ["web_security", "incident_response"],
      });
      setLearningPath(result?.recommendations || MOCK_MODULES.slice(1, 4));
    } catch {
      setLearningPath(MOCK_MODULES.slice(1, 4));
    }
  };

  const checkPassword = async () => {
    if (!passwordInput) return;
    setPasswordLoading(true);
    try {
      const result = await post("/api/v25/cyber/password/check", { password: passwordInput });
      setPasswordResult(result);
    } catch {
      // Calculate locally
      const len = passwordInput.length;
      let score = 0;
      if (len >= 8) score += 20;
      if (len >= 12) score += 15;
      if (len >= 16) score += 10;
      if (/[A-Z]/.test(passwordInput)) score += 15;
      if (/[a-z]/.test(passwordInput)) score += 10;
      if (/[0-9]/.test(passwordInput)) score += 15;
      if (/[^A-Za-z0-9]/.test(passwordInput)) score += 15;
      const suggestions: string[] = [];
      if (len < 12) suggestions.push("Use at least 12 characters");
      if (!/[A-Z]/.test(passwordInput)) suggestions.push("Add uppercase letters");
      if (!/[a-z]/.test(passwordInput)) suggestions.push("Add lowercase letters");
      if (!/[0-9]/.test(passwordInput)) suggestions.push("Add numbers");
      if (!/[^A-Za-z0-9]/.test(passwordInput)) suggestions.push("Add special characters");
      const crackTime = score > 80 ? "Centuries" : score > 60 ? "Years" : score > 40 ? "Months" : score > 20 ? "Days" : "Seconds";
      setPasswordResult({ score, crack_time: crackTime, suggestions });
    } finally {
      setPasswordLoading(false);
    }
  };

  const searchCVE = async () => {
    setCveLoading(true);
    try {
      const result = await get(`/api/v25/cyber/cve?keyword=${cveKeyword}`);
      setCveResults(result || MOCK_CVE_RESULTS.filter((c) => c.cve_id.toLowerCase().includes(cveKeyword.toLowerCase()) || c.title.toLowerCase().includes(cveKeyword.toLowerCase())));
    } catch {
      setCveResults(MOCK_CVE_RESULTS);
    } finally {
      setCveLoading(false);
    }
  };

  const generatePolicy = async () => {
    setPolicyLoading(true);
    try {
      const result = await get(`/api/v25/cyber/policy/generate?type=${policyType}`);
      setGeneratedPolicy(result?.policy || generateMockPolicy(policyType, policyOrg));
    } catch {
      setGeneratedPolicy(generateMockPolicy(policyType, policyOrg));
    } finally {
      setPolicyLoading(false);
    }
  };

  const generateMockPolicy = (type: string, org: string) => {
    const orgName = org || "[Organization Name]";
    const policies: Record<string, string> = {
      password: `${orgName} Password Security Policy\n\n1. PURPOSE\nThis policy establishes requirements for creating, managing, and protecting passwords.\n\n2. SCOPE\nAll employees, contractors, and third-party users with access to ${orgName} systems.\n\n3. REQUIREMENTS\n- Minimum password length: 12 characters\n- Must include uppercase, lowercase, numbers, and special characters\n- Passwords expire every 90 days\n- No password reuse within last 12 cycles\n- MFA required for all privileged accounts\n- Password managers approved and encouraged\n\n4. PROHIBITIONS\n- Sharing passwords with anyone\n- Writing passwords on paper or unencrypted files\n- Using the same password for personal and work accounts\n- Using dictionary words, names, or predictable patterns\n\n5. ENFORCEMENT\nViolations may result in disciplinary action up to and including termination.`,
      acceptable_use: `${orgName} Acceptable Use Policy\n\n1. PURPOSE\nDefine acceptable use of ${orgName} information systems and resources.\n\n2. AUTHORIZED USE\n- Business-related activities\n- Limited personal use that does not interfere with work\n- Accessing approved resources only\n\n3. PROHIBITED ACTIVITIES\n- Unauthorized access to systems or data\n- Downloading pirated software\n- Visiting malicious or inappropriate websites\n- Sending harassing or discriminatory communications\n- Using company resources for unauthorized commercial purposes\n\n4. MONITORING\n${orgName} reserves the right to monitor all network traffic and system usage.\n\n5. VIOLATIONS\nViolations will result in disciplinary action and possible legal consequences.`,
      remote_access: `${orgName} Remote Access Policy\n\n1. PURPOSE\nEstablish security requirements for remote access to ${orgName} systems.\n\n2. AUTHORIZED REMOTE ACCESS\n- VPN connection required for all remote access\n- MFA mandatory for all remote sessions\n- Company-issued or approved devices only\n\n3. SECURITY REQUIREMENTS\n- Full disk encryption on all remote devices\n- Up-to-date antivirus and endpoint protection\n- Automatic screen lock after 5 minutes\n- No public Wi-Fi without VPN\n- Regular security patches and updates\n\n4. SESSION MANAGEMENT\n- Log off when not actively using systems\n- Report lost or stolen devices immediately\n- No shared accounts for remote access\n\n5. COMPLIANCE\nAnnual attestation required from all remote workers.`,
      incident_response: `${orgName} Incident Response Policy\n\n1. PURPOSE\nDefine the approach to detecting, responding to, and recovering from security incidents.\n\n2. SCOPE\nAll security incidents affecting ${orgName} information systems and data.\n\n3. RESPONSE TEAM\n- Incident Response Lead: [Name]\n- CISO: [Name]\n- Legal Counsel: [Name]\n- IT Operations: [Name]\n\n4. INCIDENT CLASSIFICATION\n- Critical: Active data breach, ransomware\n- High: Unauthorized access, malware outbreak\n- Medium: Phishing, policy violations\n- Low: Scanning, attempted intrusion\n\n5. RESPONSE PHASES\n- Detection and Analysis\n- Containment\n- Eradication\n- Recovery\n- Post-Incident Review\n\n6. REPORTING\nAll incidents must be reported within 1 hour of discovery.`,
    };
    return policies[type] || policies.password;
  };

  const copyPolicy = () => {
    navigator.clipboard.writeText(generatedPolicy);
    setCopiedPolicy(true);
    setTimeout(() => setCopiedPolicy(false), 2000);
  };

  const exportReport = () => {
    if (!assessmentResult) return;
    const report = `
SECURITY ASSESSMENT REPORT
Generated: ${new Date().toLocaleString()}
Type: ${assessmentType}
Domain: ${assessmentDomain || "N/A"}
Score: ${assessmentResult.score}/100
Risk Level: ${assessmentResult.risk_level.toUpperCase()}

FINDINGS:
${assessmentResult.findings.map((f) => `[${f.severity.toUpperCase()}] ${f.category}: ${f.description}\nRecommendation: ${f.recommendation}`).join("\n\n")}
    `.trim();
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-assessment-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleControlStatus = (frameworkId: string, controlId: string) => {
    const statuses: ComplianceControl["status"][] = ["implemented", "partial", "planned", "not_implemented"];
    setFrameworks((prev) =>
      prev.map((fw) => {
        if (fw.id !== frameworkId) return fw;
        return {
          ...fw,
          controls: fw.controls.map((ctrl) => {
            if (ctrl.id !== controlId) return ctrl;
            const idx = statuses.indexOf(ctrl.status);
            return { ...ctrl, status: statuses[(idx + 1) % statuses.length] };
          }),
        };
      })
    );
  };

  // Initial data loading
  useEffect(() => {
    loadModules();
    getLearningPath();
    loadPlaybook("malware");
  }, []);

  useEffect(() => {
    loadPlaybook(selectedPlaybookType);
  }, [selectedPlaybookType]);

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-neutral-900 text-zinc-100 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-neutral-900/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Cybersecurity Center</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Expert & Training Companion</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThreatPulse level={threatLevel} />
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <Radio className="h-3 w-3 text-emerald-400" />
              <span>Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* DAILY SECURITY TIP */}
      <div className="border-b border-zinc-800 bg-zinc-800/30">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
          <Lightbulb className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300 truncate">
              <span className="text-yellow-400 font-semibold mr-2">Security Tip:</span>
              {SECURITY_TIPS[securityTipIndex].tip}
            </p>
          </div>
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs flex-shrink-0">
            {SECURITY_TIPS[securityTipIndex].category}
          </Badge>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-800/50 border border-zinc-700/50 p-1 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="assessment" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs sm:text-sm">
              <Crosshair className="h-4 w-4 mr-1.5" />
              Assessment
            </TabsTrigger>
            <TabsTrigger value="training" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs sm:text-sm">
              <BookOpen className="h-4 w-4 mr-1.5" />
              Training Companion
            </TabsTrigger>
            <TabsTrigger value="incident" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              Incident Response
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1.5" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="tools" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs sm:text-sm">
              <Terminal className="h-4 w-4 mr-1.5" />
              Tools
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ASSESSMENT */}
          <TabsContent value="assessment" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Assessment Controls */}
              <Card className="lg:col-span-1 bg-zinc-800/50 border-zinc-700/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Crosshair className="h-4 w-4 text-emerald-400" />
                    Run Assessment
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Select assessment type and target domain
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-medium">Assessment Type</label>
                    <Select value={assessmentType} onValueChange={setAssessmentType}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="general">General Security</SelectItem>
                        <SelectItem value="web">Web Application</SelectItem>
                        <SelectItem value="network">Network Security</SelectItem>
                        <SelectItem value="cloud">Cloud Security</SelectItem>
                        <SelectItem value="mobile">Mobile Application</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-medium">Target Domain (optional)</label>
                    <Input
                      placeholder="example.com"
                      value={assessmentDomain}
                      onChange={(e) => setAssessmentDomain(e.target.value)}
                      className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                    />
                  </div>
                  <Button
                    onClick={runAssessment}
                    disabled={assessmentLoading}
                    className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                  >
                    {assessmentLoading ? <Spinner /> : <Play className="h-4 w-4 mr-2" />}
                    Run Assessment
                  </Button>
                </CardContent>
              </Card>

              {/* Assessment Result */}
              {assessmentResult && (
                <Card className="lg:col-span-2 bg-zinc-800/50 border-zinc-700/50">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-emerald-400" />
                        Assessment Results
                      </CardTitle>
                      <CardDescription className="text-xs text-zinc-500">
                        {assessmentType} assessment {assessmentDomain && `for ${assessmentDomain}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <ScoreGauge score={assessmentResult.score} label="Score" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">Risk Level:</span>
                        <SeverityBadge severity={assessmentResult.risk_level === "critical" ? "critical" : assessmentResult.risk_level === "high" ? "high" : assessmentResult.risk_level === "medium" ? "medium" : "low"} />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportReport}
                        className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Export Report
                      </Button>
                    </div>

                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {assessmentResult.findings.map((finding, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg border border-zinc-700/50 bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <SeverityBadge severity={finding.severity} />
                              <span className="text-xs text-zinc-400 font-mono">{finding.category}</span>
                            </div>
                            <p className="text-sm text-zinc-200 mb-1">{finding.description}</p>
                            <p className="text-xs text-emerald-400 flex items-start gap-1.5">
                              <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {finding.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Empty State */}
            {!assessmentResult && !assessmentLoading && (
              <div className="text-center py-16">
                <Shield className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-400 mb-2">No Assessment Run Yet</h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Select an assessment type and click "Run Assessment" to analyze your security posture.
                  Results will appear here with a detailed score and findings.
                </p>
              </div>
            )}

            {assessmentLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
                <p className="text-sm text-zinc-400">Running security assessment...</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: TRAINING COMPANION */}
          <TabsContent value="training" className="space-y-6">
            {/* Learning Path Card */}
            <Card className="bg-zinc-800/50 border-zinc-700/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Your Learning Path
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Recommended modules based on your current level and interests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 overflow-x-auto pb-2">
                  {learningPath.map((mod, i) => (
                    <div key={mod.module_id} className="flex items-center gap-4 flex-shrink-0">
                      <div
                        className="w-48 p-3 rounded-lg border border-zinc-700/50 bg-zinc-900/50 cursor-pointer hover:border-emerald-500/30 transition-colors"
                        onClick={() => { setSelectedModule(mod); setTrainingTab("modules"); }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <LevelBadge level={mod.level} />
                          <span className="text-[10px] text-zinc-500 font-mono">{mod.duration_minutes}m</span>
                        </div>
                        <p className="text-xs font-medium text-zinc-200 mb-1">{mod.title}</p>
                        <p className="text-[10px] text-zinc-500">{mod.lessons_count} lessons</p>
                      </div>
                      {i < learningPath.length - 1 && (
                        <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Progress Tracker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Completed", value: Object.values(moduleProgress).filter((v) => v === 100).length, icon: CheckCircle, color: "text-emerald-400" },
                { label: "In Progress", value: Object.values(moduleProgress).filter((v) => v > 0 && v < 100).length, icon: Activity, color: "text-yellow-400" },
                { label: "Total Modules", value: MOCK_MODULES.length, icon: BookOpen, color: "text-blue-400" },
                { label: "Level", value: "Intermediate", icon: Award, color: "text-purple-400" },
              ].map((stat) => (
                <Card key={stat.label} className="bg-zinc-800/50 border-zinc-700/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <div>
                      <p className="text-lg font-bold font-mono">{stat.value}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Training Sub-Tabs */}
            <Tabs value={trainingTab} onValueChange={setTrainingTab}>
              <TabsList className="bg-zinc-800/50 border border-zinc-700/50">
                <TabsTrigger value="modules" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs">
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  Modules
                </TabsTrigger>
                <TabsTrigger value="lesson" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs">
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Lesson
                </TabsTrigger>
                <TabsTrigger value="labs" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs">
                  <Bug className="h-3.5 w-3.5 mr-1" />
                  Practice Labs
                </TabsTrigger>
              </TabsList>

              {/* Modules Grid */}
              <TabsContent value="modules" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {MOCK_MODULES.map((mod) => (
                    <Card
                      key={mod.module_id}
                      className="bg-zinc-800/50 border-zinc-700/50 cursor-pointer hover:border-emerald-500/30 transition-all group"
                      onClick={() => {
                        setSelectedModule(mod);
                        loadLesson(mod.module_id, "L1");
                        setTrainingTab("lesson");
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <LevelBadge level={mod.level} />
                          <span className="text-[10px] text-zinc-500 font-mono">{mod.module_id}</span>
                        </div>
                        <CardTitle className="text-sm group-hover:text-emerald-400 transition-colors">
                          {mod.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-zinc-500 line-clamp-2">
                          {mod.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-4 text-xs text-zinc-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {mod.duration_minutes}m
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {mod.lessons_count} lessons
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>Progress</span>
                            <span>{moduleProgress[mod.module_id] || 0}%</span>
                          </div>
                          <Progress
                            value={moduleProgress[mod.module_id] || 0}
                            className="h-1.5 bg-zinc-700"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Lesson View */}
              <TabsContent value="lesson" className="mt-4">
                {selectedLesson ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Lesson Content */}
                    <Card className="lg:col-span-2 bg-zinc-800/50 border-zinc-700/50">
                      <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTrainingTab("modules")}
                            className="text-zinc-400 hover:text-zinc-100 -ml-2"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back
                          </Button>
                        </div>
                        <CardTitle className="text-base">{selectedLesson.title}</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                          {selectedModule?.title} - Lesson 1 of {selectedModule?.lessons_count}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="prose prose-invert prose-sm max-w-none">
                            {selectedLesson.content.split("\n").map((line, i) => {
                              if (line.startsWith("## ")) {
                                return <h3 key={i} className="text-emerald-400 text-base font-semibold mt-6 mb-3">{line.replace("## ", "")}</h3>;
                              }
                              if (line.startsWith("- **")) {
                                const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
                                if (match) {
                                  return (
                                    <div key={i} className="flex gap-2 mb-2 ml-4">
                                      <span className="text-emerald-400 font-semibold text-sm flex-shrink-0">{match[1]}:</span>
                                      <span className="text-zinc-300 text-sm">{match[2]}</span>
                                    </div>
                                  );
                                }
                              }
                              if (line.match(/^\d+\./)) {
                                return <p key={i} className="text-zinc-300 text-sm ml-4 mb-1">{line}</p>;
                              }
                              if (line.trim() === "") return <div key={i} className="h-2" />;
                              return <p key={i} className="text-zinc-300 text-sm mb-2">{line}</p>;
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Sidebar: Takeaways + Quiz */}
                    <div className="space-y-4">
                      {/* Key Takeaways */}
                      <Card className="bg-zinc-800/50 border-zinc-700/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2">
                            <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
                            Key Takeaways
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {selectedLesson.key_takeaways.map((tk, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                                <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                                {tk}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Quiz */}
                      <Card className="bg-zinc-800/50 border-zinc-700/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs font-semibold flex items-center gap-2">
                            <HelpCircle className="h-3.5 w-3.5 text-blue-400" />
                            Knowledge Check
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {selectedLesson.quiz.map((q, qi) => (
                              <div key={qi} className="space-y-2">
                                <p className="text-xs font-medium text-zinc-200">{qi + 1}. {q.question}</p>
                                <div className="space-y-1">
                                  {q.options.map((opt, oi) => {
                                    let btnClass = "border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800";
                                    if (quizSubmitted) {
                                      if (oi === q.correct_index) btnClass = "border-emerald-500 bg-emerald-500/20 text-emerald-300";
                                      else if (quizAnswers[qi] === oi) btnClass = "border-red-500 bg-red-500/20 text-red-300";
                                    } else if (quizAnswers[qi] === oi) {
                                      btnClass = "border-emerald-500 bg-emerald-500/20 text-emerald-300";
                                    }
                                    return (
                                      <button
                                        key={oi}
                                        disabled={quizSubmitted}
                                        onClick={() => setQuizAnswers((prev) => ({ ...prev, [qi]: oi }))}
                                        className={`w-full text-left text-xs px-3 py-2 rounded border transition-colors ${btnClass}`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                                {quizSubmitted && (
                                  <div className="flex items-start gap-1.5 text-[10px] text-zinc-400 bg-zinc-900/50 p-2 rounded">
                                    <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-blue-400" />
                                    {q.explanation}
                                  </div>
                                )}
                              </div>
                            ))}
                            <Button
                              onClick={quizSubmitted ? () => { setQuizSubmitted(false); setQuizAnswers({}); } : submitQuiz}
                              className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                              size="sm"
                            >
                              {quizSubmitted ? "Retry Quiz" : "Submit Answers"}
                            </Button>
                            {quizSubmitted && (
                              <div className="text-center">
                                <Badge variant="outline" className="bg-zinc-900 text-zinc-300 border-zinc-600">
                                  {selectedLesson.quiz.filter((q, i) => quizAnswers[i] === q.correct_index).length} / {selectedLesson.quiz.length} Correct
                                </Badge>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-400">Select a module to start learning</p>
                  </div>
                )}
              </TabsContent>

              {/* Practice Labs */}
              <TabsContent value="labs" className="mt-4 space-y-4">
                {MOCK_LABS.map((lab) => (
                  <Card key={lab.lab_id} className="bg-zinc-800/50 border-zinc-700/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`text-[10px] font-mono capitalize ${
                              lab.difficulty === "beginner" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                              lab.difficulty === "intermediate" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                              "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>
                              {lab.difficulty}
                            </Badge>
                            <span className="text-[10px] text-zinc-500 font-mono">{lab.lab_id}</span>
                          </div>
                          <CardTitle className="text-sm">{lab.title}</CardTitle>
                          <CardDescription className="text-xs text-zinc-500 mt-1">
                            {lab.description}
                          </CardDescription>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <span className="text-xs text-zinc-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lab.duration_minutes}m
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="objectives" className="border-zinc-700/50">
                          <AccordionTrigger className="text-xs text-zinc-300 hover:text-emerald-400">
                            <span className="flex items-center gap-2">
                              <Crosshair className="h-3.5 w-3.5" />
                              Objectives
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-1 ml-6">
                              {lab.objectives.map((obj, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                                  <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                                  {obj}
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="steps" className="border-zinc-700/50">
                          <AccordionTrigger className="text-xs text-zinc-300 hover:text-emerald-400">
                            <span className="flex items-center gap-2">
                              <Terminal className="h-3.5 w-3.5" />
                              Step-by-Step Instructions
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ol className="space-y-2 ml-6">
                              {lab.steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                                  <span className="text-emerald-400 font-mono text-[10px] mt-0.5 flex-shrink-0 w-4">{i + 1}.</span>
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* TAB 3: INCIDENT RESPONSE */}
          <TabsContent value="incident" className="space-y-6">
            <Tabs value={incidentTab} onValueChange={setIncidentTab}>
              <TabsList className="bg-zinc-800/50 border border-zinc-700/50">
                <TabsTrigger value="playbooks" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Playbooks
                </TabsTrigger>
                <TabsTrigger value="analyzer" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs">
                  <Search className="h-3.5 w-3.5 mr-1" />
                  Threat Analyzer
                </TabsTrigger>
              </TabsList>

              {/* Playbooks */}
              <TabsContent value="playbooks" className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "malware", label: "Malware", icon: Bug },
                    { value: "phishing", label: "Phishing", icon: AlertTriangle },
                    { value: "data_breach", label: "Data Breach", icon: Unlock },
                    { value: "ransomware", label: "Ransomware", icon: Lock },
                    { value: "ddos", label: "DDoS", icon: Zap },
                  ].map((pb) => (
                    <Button
                      key={pb.value}
                      variant={selectedPlaybookType === pb.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPlaybookType(pb.value)}
                      className={selectedPlaybookType === pb.value
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs"
                        : "border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs"
                      }
                    >
                      <pb.icon className="h-3.5 w-3.5 mr-1.5" />
                      {pb.label}
                    </Button>
                  ))}
                </div>

                {selectedPlaybook && (
                  <Card className="bg-zinc-800/50 border-zinc-700/50">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-emerald-400" />
                        {selectedPlaybook.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-zinc-500">
                        Phase-by-phase incident response procedures
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {selectedPlaybook.phases.map((phase) => (
                          <div key={phase.name} className="border border-zinc-700/50 rounded-lg bg-zinc-900/30">
                            <div className="px-3 py-2 border-b border-zinc-700/50 bg-zinc-800/30 rounded-t-lg">
                              <h4 className="text-xs font-semibold text-emerald-400 text-center">{phase.name}</h4>
                            </div>
                            <div className="p-3 space-y-3">
                              {phase.steps.map((step) => (
                                <div key={step.number} className="text-xs space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono flex-shrink-0">
                                      {step.number}
                                    </span>
                                    <p className="text-zinc-200 leading-tight">{step.description}</p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-6 text-[10px] text-zinc-500">
                                    <span className="flex items-center gap-1">
                                      <UserCheck className="h-2.5 w-2.5" />
                                      {step.role}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-2.5 w-2.5" />
                                      {step.timeframe}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Threat Analyzer */}
              <TabsContent value="analyzer" className="mt-4 space-y-4">
                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Search className="h-4 w-4 text-emerald-400" />
                      Threat Intelligence Analyzer
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      Enter IOCs (Indicators of Compromise) to analyze threat indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                          <Server className="h-3 w-3" />
                          IP Addresses
                        </label>
                        <Textarea
                          placeholder="192.168.1.1, 10.0.0.1"
                          value={threatIps}
                          onChange={(e) => setThreatIps(e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs placeholder:text-zinc-600 min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                          <Globe className="h-3 w-3" />
                          Domains
                        </label>
                        <Textarea
                          placeholder="evil.com, malware.xyz"
                          value={threatDomains}
                          onChange={(e) => setThreatDomains(e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs placeholder:text-zinc-600 min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                          <Fingerprint className="h-3 w-3" />
                          File Hashes
                        </label>
                        <Textarea
                          placeholder="a1b2c3d4..., e5f6789a..."
                          value={threatHashes}
                          onChange={(e) => setThreatHashes(e.target.value)}
                          className="bg-zinc-900 border-zinc-700 text-zinc-100 text-xs placeholder:text-zinc-600 min-h-[80px]"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={analyzeThreat}
                      disabled={threatLoading || (!threatIps && !threatDomains && !threatHashes)}
                      className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                    >
                      {threatLoading ? <Spinner /> : <Search className="h-4 w-4 mr-2" />}
                      Analyze Threats
                    </Button>
                  </CardContent>
                </Card>

                {threatResult && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="bg-zinc-800/50 border-zinc-700/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold">Threat Score</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center">
                        <ScoreGauge score={threatResult.score} label="Threat" />
                        <Badge
                          variant="outline"
                          className={`mt-3 font-mono text-xs ${
                            threatResult.classification === "Malicious"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : threatResult.classification === "Suspicious"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {threatResult.classification}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 bg-zinc-800/50 border-zinc-700/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold">Indicator Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {threatResult.indicators.map((ind, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded bg-zinc-900/50 border border-zinc-700/30">
                              <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-600 text-[10px] font-mono flex-shrink-0 w-16 text-center">
                                {ind.type}
                              </Badge>
                              <span className="text-xs text-zinc-200 font-mono flex-1 truncate">{ind.value}</span>
                              <span className="text-xs text-red-400 flex-shrink-0">{ind.threat}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                          <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Recommended Actions
                          </p>
                          <ul className="space-y-1">
                            {threatResult.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                                <ChevronRight className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* TAB 4: COMPLIANCE */}
          <TabsContent value="compliance" className="space-y-6">
            <Tabs value={complianceTab} onValueChange={setComplianceTab}>
              <TabsList className="bg-zinc-800/50 border border-zinc-700/50">
                <TabsTrigger value="frameworks" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Frameworks
                </TabsTrigger>
                <TabsTrigger value="popia" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs">
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  POPIA
                </TabsTrigger>
              </TabsList>

              {/* Frameworks */}
              <TabsContent value="frameworks" className="mt-4 space-y-4">
                {/* Framework Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {frameworks.map((fw) => (
                    <Card
                      key={fw.id}
                      className={`cursor-pointer transition-all ${
                        selectedFramework === fw.id
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
                      }`}
                      onClick={() => setSelectedFramework(fw.id)}
                    >
                      <CardContent className="p-4">
                        <h4 className="text-sm font-semibold text-zinc-200 mb-1">{fw.name}</h4>
                        <p className="text-[10px] text-zinc-500">{fw.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400">{fw.controls.length} controls</span>
                          <span className="text-emerald-400 text-[10px]">
                            {fw.controls.filter((c) => c.status === "implemented").length} implemented
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Compliance Score + Controls */}
                {selectedFramework && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <Card className="lg:col-span-1 bg-zinc-800/50 border-zinc-700/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-center">Compliance Score</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center">
                        <ScoreGauge score={complianceScore} label="Compliant" />
                        <div className="w-full mt-4 space-y-2">
                          {[
                            { label: "Implemented", count: frameworks.find((f) => f.id === selectedFramework)?.controls.filter((c) => c.status === "implemented").length || 0, color: "text-emerald-400" },
                            { label: "Partial", count: frameworks.find((f) => f.id === selectedFramework)?.controls.filter((c) => c.status === "partial").length || 0, color: "text-yellow-400" },
                            { label: "Planned", count: frameworks.find((f) => f.id === selectedFramework)?.controls.filter((c) => c.status === "planned").length || 0, color: "text-blue-400" },
                            { label: "Not Implemented", count: frameworks.find((f) => f.id === selectedFramework)?.controls.filter((c) => c.status === "not_implemented").length || 0, color: "text-red-400" },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">{item.label}</span>
                              <span className={`font-mono ${item.color}`}>{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-3 bg-zinc-800/50 border-zinc-700/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold">Controls</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2">
                            {frameworks.find((f) => f.id === selectedFramework)?.controls.map((ctrl) => (
                              <div
                                key={ctrl.id}
                                className="flex items-center justify-between p-2 rounded bg-zinc-900/50 border border-zinc-700/30 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                onClick={() => toggleControlStatus(selectedFramework, ctrl.id)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-zinc-500">{ctrl.id}</span>
                                    <span className="text-xs font-medium text-zinc-200">{ctrl.name}</span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 truncate">{ctrl.description}</p>
                                </div>
                                <StatusBadge status={ctrl.status} />
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* POPIA Tab */}
              <TabsContent value="popia" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="bg-zinc-800/50 border-zinc-700/50">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Shield className="h-4 w-4 text-emerald-400" />
                        POPIA Eight Conditions
                      </CardTitle>
                      <CardDescription className="text-xs text-zinc-500">
                        Protection of Personal Information Act (South Africa)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {POPIA_GUIDELINES.map((g, i) => (
                            <div key={i} className="p-3 rounded bg-zinc-900/50 border border-zinc-700/30">
                              <h4 className="text-xs font-semibold text-emerald-400 mb-1">{g.principle}</h4>
                              <p className="text-xs text-zinc-300 mb-2">{g.description}</p>
                              <ul className="space-y-1">
                                {g.obligations.map((o, j) => (
                                  <li key={j} className="flex items-start gap-2 text-[10px] text-zinc-400">
                                    <CheckCircle className="h-2.5 w-2.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                    {o}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-800/50 border-zinc-700/50">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-emerald-400" />
                        Data Subject Rights
                      </CardTitle>
                      <CardDescription className="text-xs text-zinc-500">
                        Rights of individuals under POPIA
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {DATA_SUBJECT_RIGHTS.map((right, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 rounded bg-zinc-900/50 border border-zinc-700/30">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono flex-shrink-0">
                                {i + 1}
                              </span>
                              <span className="text-xs text-zinc-300">{right}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* TAB 5: TOOLS */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Password Strength Checker */}
              <Card className="bg-zinc-800/50 border-zinc-700/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Key className="h-4 w-4 text-emerald-400" />
                    Password Strength Checker
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Analyze password strength and get improvement suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-medium">Password</label>
                    <Input
                      type="password"
                      placeholder="Enter password to check..."
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                    />
                  </div>
                  <Button
                    onClick={checkPassword}
                    disabled={passwordLoading || !passwordInput}
                    className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                  >
                    {passwordLoading ? <Spinner /> : <Search className="h-4 w-4 mr-2" />}
                    Check Strength
                  </Button>

                  {passwordResult && (
                    <div className="p-3 rounded bg-zinc-900/50 border border-zinc-700/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Score</span>
                        <span className={`text-lg font-bold font-mono ${
                          passwordResult.score >= 80 ? "text-emerald-400" :
                          passwordResult.score >= 50 ? "text-yellow-400" :
                          "text-red-400"
                        }`}>
                          {passwordResult.score}/100
                        </span>
                      </div>
                      <div className="w-full bg-zinc-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            passwordResult.score >= 80 ? "bg-emerald-500" :
                            passwordResult.score >= 50 ? "bg-yellow-500" :
                            "bg-red-500"
                          }`}
                          style={{ width: `${passwordResult.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Estimated Crack Time</span>
                        <span className="text-zinc-200 font-mono">{passwordResult.crack_time}</span>
                      </div>
                      {passwordResult.suggestions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-zinc-500 uppercase">Suggestions</p>
                          {passwordResult.suggestions.map((s, i) => (
                            <p key={i} className="text-xs text-yellow-400 flex items-start gap-1.5">
                              <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {s}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CVE Search */}
              <Card className="bg-zinc-800/50 border-zinc-700/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Bug className="h-4 w-4 text-emerald-400" />
                    CVE Database Search
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Search known vulnerabilities by keyword or CVE ID
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-medium">Keyword</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., Log4j, CVE-2021-44228..."
                        value={cveKeyword}
                        onChange={(e) => setCveKeyword(e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 flex-1"
                      />
                      <Button
                        onClick={searchCVE}
                        disabled={cveLoading}
                        className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                      >
                        {cveLoading ? <Spinner /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {cveResults.length > 0 && (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {cveResults.map((cve) => (
                          <div key={cve.cve_id} className="p-3 rounded bg-zinc-900/50 border border-zinc-700/30">
                            <div className="flex items-center gap-2 mb-1">
                              <SeverityBadge severity={cve.severity} />
                              <span className="text-[10px] font-mono text-zinc-500">{cve.cve_id}</span>
                            </div>
                            <p className="text-xs font-medium text-zinc-200">{cve.title}</p>
                            <p className="text-xs text-zinc-400 mt-1">{cve.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
                              <span>CVSS: {cve.cvss_score}</span>
                              <span>Published: {cve.published_date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Policy Generator */}
              <Card className="lg:col-span-2 bg-zinc-800/50 border-zinc-700/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    Security Policy Generator
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Generate security policy templates for your organisation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-400 font-medium">Policy Type</label>
                      <Select value={policyType} onValueChange={setPolicyType}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="password">Password Policy</SelectItem>
                          <SelectItem value="acceptable_use">Acceptable Use Policy</SelectItem>
                          <SelectItem value="remote_access">Remote Access Policy</SelectItem>
                          <SelectItem value="incident_response">Incident Response Policy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-400 font-medium">Organisation Name</label>
                      <Input
                        placeholder="Enter organisation name..."
                        value={policyOrg}
                        onChange={(e) => setPolicyOrg(e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={generatePolicy}
                    disabled={policyLoading}
                    className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                  >
                    {policyLoading ? <Spinner /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate Policy
                  </Button>

                  {generatedPolicy && (
                    <div className="relative">
                      <pre className="p-4 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 whitespace-pre-wrap overflow-auto max-h-[400px]">
                        {generatedPolicy}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyPolicy}
                        className="absolute top-2 right-2 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                      >
                        {copiedPolicy ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CybersecurityPage;