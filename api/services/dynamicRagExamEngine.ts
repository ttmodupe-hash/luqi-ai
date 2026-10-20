import { GoogleGenAI } from '@google/genai';
import { resolveGeminiApiKey } from '../lib/apiKeyResolver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ExamDomain =
  | 'CLOUD_INFRASTRUCTURE'
  | 'PROJECT_MANAGEMENT_PMP'
  | 'SOFTWARE_DEVSECOPS'
  | 'CISCO_NETWORKING';

export interface DomainMetadata {
  domainKey: ExamDomain;
  title: string;
  targetExams: string[];
  vectorNamespace: string;
  systemInstruction: string;
}

export const DOMAIN_DIRECTIVES: Record<ExamDomain, DomainMetadata> = {
  CLOUD_INFRASTRUCTURE: {
    domainKey: 'CLOUD_INFRASTRUCTURE',
    title: 'Principal Cloud Architect & Certification Tutor',
    targetExams: ['AWS Solutions Architect Associate/Professional', 'Azure Administrator (AZ-104)', 'GCP Associate Cloud Engineer'],
    vectorNamespace: 'kb_cloud_infrastructure',
    systemInstruction: `You are an elite Principal Cloud Architect and Certification Tutor.
When explaining cloud services, always emphasize architectural trade-offs: cost, high availability (multi-AZ/multi-Region), resilience (RPO/RTO), and security.
Provide conceptual explanations along with structured Infrastructure-as-Code snippets (Terraform, AWS CloudFormation, or Azure ARM/Bicep) where relevant.
Focus heavily on security concepts like Least Privilege Access, IAM policy condition keys, and VPC networking (CIDR, Route Tables, NAT Gateways, Transit Gateway).`,
  },
  PROJECT_MANAGEMENT_PMP: {
    domainKey: 'PROJECT_MANAGEMENT_PMP',
    title: 'Senior Program Manager & Agile Coach',
    targetExams: ['PMP (PMBOK Guide 7th Edition)', 'CAPM', 'Certified ScrumMaster (CSM)', 'ITIL 4/5'],
    vectorNamespace: 'kb_project_management',
    systemInstruction: `You are a Senior Program Manager and Agile Coach. Your teaching style is highly situational.
Do not just define terms; explain concepts using real-world enterprise scenarios.
When training for the PMP exam, strictly align with the latest PMBOK Guide domains:
- People (42%): Conflict management, team empowerment, servant leadership, emotional intelligence.
- Process (50%): Integrated Change Control, risk registers, critical path method (CPM), earned value management (EVM), hybrid lifecycles.
- Business Environment (8%): Compliance, organizational change, benefits realization.
Structure your practice questions around complex corporate dilemmas, prompting students to determine 'What should the Project Manager do NEXT?'`,
  },
  SOFTWARE_DEVSECOPS: {
    domainKey: 'SOFTWARE_DEVSECOPS',
    title: 'Principal Software Engineer & DevSecOps Specialist',
    targetExams: ['AWS Certified DevOps Engineer', 'Certified Kubernetes Administrator (CKA)', 'CISSP', 'Docker Certified Associate'],
    vectorNamespace: 'kb_software_devsecops',
    systemInstruction: `You are a Principal Software Engineer and DevSecOps Specialist.
You teach modern application development, CI/CD pipelines, containerization (Docker, Kubernetes), and security practices.
Always provide clean, production-ready code examples in the user's requested language.
Highlight edge cases, code refactoring patterns, microservices design patterns, and shift-left security strategies (SAST/DAST, SCA, OWASP Top 10) within automated pipelines.`,
  },
  CISCO_NETWORKING: {
    domainKey: 'CISCO_NETWORKING',
    title: 'Senior Cisco Network Architect & Certification Coach',
    targetExams: ['CCNA 200-301', 'CCNP 350-401 ENCOR', 'CCNP 300-410 ENARSI', 'CCIP Service Provider'],
    vectorNamespace: 'kb_cisco_networking',
    systemInstruction: `You are a Senior Cisco Network Architect and Certification Instructor.
Anchor explanations to official Cisco blueprints (Spanning Tree IEEE 802.1D/802.1w, OSPFv2/v3, BGP path selection, VLANs, 802.1Q trunking, and Subnetting/VLSM).
Provide Cisco IOS CLI verification outputs (show spanning-tree interface detail, show ip ospf neighbor, show ip route) and explicitly alert students to common exam traps and distractor options.`,
  },
};

const getGeminiClient = () => {
  const apiKey = resolveGeminiApiKey() || process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || undefined,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export class DynamicRagExamEngine {
  /**
   * Router Agent: Classifies the student query into one of 4 specific IT domains
   */
  public static classifyDomain(prompt: string): ExamDomain {
    const lower = prompt.toLowerCase();
    if (
      lower.includes('pmp') ||
      lower.includes('pmbok') ||
      lower.includes('scrum') ||
      lower.includes('agile') ||
      lower.includes('sprint') ||
      lower.includes('stakeholder') ||
      lower.includes('ccb') ||
      lower.includes('change request') ||
      lower.includes('scope creep') ||
      lower.includes('earned value') ||
      lower.includes('waterfall')
    ) {
      return 'PROJECT_MANAGEMENT_PMP';
    }

    if (
      lower.includes('aws') ||
      lower.includes('azure') ||
      lower.includes('gcp') ||
      lower.includes('s3') ||
      lower.includes('ec2') ||
      lower.includes('iam') ||
      lower.includes('vpc') ||
      lower.includes('terraform') ||
      lower.includes('cloudformation') ||
      lower.includes('well-architected') ||
      lower.includes('lambda')
    ) {
      return 'CLOUD_INFRASTRUCTURE';
    }

    if (
      lower.includes('docker') ||
      lower.includes('kubernetes') ||
      lower.includes('k8s') ||
      lower.includes('cka') ||
      lower.includes('ci/cd') ||
      lower.includes('pipeline') ||
      lower.includes('owasp') ||
      lower.includes('gitops') ||
      lower.includes('devops') ||
      lower.includes('microservice')
    ) {
      return 'SOFTWARE_DEVSECOPS';
    }

    return 'CISCO_NETWORKING';
  }

  /**
   * Namespaced RAG Retrieval Simulation (Vector Store top-k grounding)
   */
  public static retrieveDomainContext(domain: ExamDomain, query: string): string[] {
    switch (domain) {
      case 'PROJECT_MANAGEMENT_PMP':
        return [
          '[PMBOK 7th Ed Sec 2.2 - Team Performance Domain]: Conflict must be managed collaboratively at the individual level before escalation to the sponsor.',
          '[PMBOK 7th Ed Sec 2.5 - Delivery Performance Domain]: Integrated Change Control requires halting unapproved work immediately and analyzing baseline impacts before Change Control Board (CCB) submission.',
          '[PMBOK 7th Ed Sec 2.8 - Business Environment]: External regulatory shifts (e.g. POPIA/GDPR) demand immediate impact assessments on scope, risk register, and milestones.',
        ];
      case 'CLOUD_INFRASTRUCTURE':
        return [
          '[AWS Well-Architected Reliability Pillar]: Multi-AZ deployments with Amazon RDS automated failover reduce Recovery Time Objective (RTO) to under 60 seconds.',
          '[AWS IAM Best Practices]: Always adhere to Least Privilege; avoid root user for daily operational tasks and attach permission boundaries.',
          '[AWS VPC Networking]: Public subnets must have a route to an Internet Gateway (0.0.0.0/0 -> igw-xxx), while private subnets route to a NAT Gateway.',
        ];
      case 'SOFTWARE_DEVSECOPS':
        return [
          '[DevSecOps Architecture Guide]: Integrate static code analysis (SAST) and software composition analysis (SCA) directly into GitHub Actions / GitLab CI pipelines.',
          '[Kubernetes Core Concepts]: Configure readiness and liveness probes alongside resource requests/limits to prevent OOMKilled evictions on cluster nodes.',
          '[OWASP Top 10 (2025)]: Broken Access Control and Injection vulnerabilities must be mitigated with parameterized queries and strict RBAC.',
        ];
      case 'CISCO_NETWORKING':
        return [
          '[IEEE 802.1D Spanning Tree]: Max Age timer is 20s. Forward Delay timer is 15s for Listening and 15s for Learning (Total 50s indirect convergence).',
          '[OSPFv2 RFC 2328]: OSPF neighbors get stuck in INIT state when Router B receives Hello packets from Router A, but does not see its own Router ID in the neighbor list.',
          '[BGP Path Attributes]: Weight (Cisco proprietary, local to router) -> Local Preference (highest wins) -> AS-Path (shortest wins).',
        ];
    }
  }

  /**
   * Main Dynamic RAG Query Processing Pipeline
   */
  public static async processTutorQuery(userPrompt: string, history: Array<{ role: string; text: string }> = []) {
    const domain = DynamicRagExamEngine.classifyDomain(userPrompt);
    const domainMeta = DOMAIN_DIRECTIVES[domain];
    const retrievedChunks = DynamicRagExamEngine.retrieveDomainContext(domain, userPrompt);
    const ai = getGeminiClient();

    const fullSystemInstruction = `${domainMeta.systemInstruction}

OFFICIAL BLUEPRINT CONTEXT (GROUNDING):
${retrievedChunks.join('\n')}

PEDAGOGICAL RULES:
1. Socratic Tone: Explain principles clearly with practical scenarios.
2. Structure: 
   - Direct Answer / Best Practice
   - Deep Conceptual & Architectural Trade-Off Analysis
   - Real-World Configuration or Scenario Walkthrough (Code, IaC, CLI, or PM Process)
   - Exam Trap Alert: Highlight typical tricks, subtle distractor traps, and common misconceptions.
3. If the user answers a question incorrectly, break down why each distractor is wrong rather than just revealing the answer.`;

    const contents: any[] = history.slice(-6).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));
    contents.push({ role: 'user', parts: [{ text: userPrompt }] });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: fullSystemInstruction,
          temperature: 0.2,
        },
      });

      return {
        success: true,
        domain,
        expertTitle: domainMeta.title,
        vectorNamespace: domainMeta.vectorNamespace,
        response: response.text || 'Explanation processed by tutor engine.',
        retrievedContext: retrievedChunks,
      };
    } catch (err: any) {
      return {
        success: true,
        domain,
        expertTitle: domainMeta.title,
        vectorNamespace: domainMeta.vectorNamespace,
        response: `[${domainMeta.title} Offline Mode]\n\nBased on official blueprints for ${domainMeta.targetExams[0]}:\n` +
          `${retrievedChunks[0]}\n\nAlways analyze the situational trade-offs between scope, availability, and security before taking action.`,
        retrievedContext: retrievedChunks,
      };
    }
  }

  /**
   * Socratic Question Generator (Generates scenario-based exam questions)
   */
  public static async generateSocraticQuestion(domain: ExamDomain, subtopic?: string) {
    const domainMeta = DOMAIN_DIRECTIVES[domain];
    const ai = getGeminiClient();

    const prompt = `Generate a realistic, scenario-based multiple-choice question (MCQ) for ${domainMeta.targetExams[0]}.
Subtopic: ${subtopic || 'High-Stakes Decision Making'}

Follow this strict JSON output schema:
{
  "scenario": "A 2-3 sentence realistic dilemma or technical troubleshooting scenario...",
  "question": "What should the engineer / project manager do NEXT?",
  "options": [
    { "key": "A", "text": "Option text" },
    { "key": "B", "text": "Option text" },
    { "key": "C", "text": "Option text" },
    { "key": "D", "text": "Option text" }
  ],
  "correctKey": "B",
  "rationale": {
    "whyCorrect": "Detailed explanation of why this is the best decision under official exam guidelines...",
    "distractorAnalysis": {
      "A": "Why A is incorrect or an exam trap...",
      "C": "Why C is incorrect...",
      "D": "Why D is incorrect..."
    }
  },
  "examTrapAlert": "Key distinction to watch out for on exam day...",
  "blueprintDomain": "${domain === 'PROJECT_MANAGEMENT_PMP' ? 'Process (50%)' : domain === 'CLOUD_INFRASTRUCTURE' ? 'Design Resilient Architectures' : 'Core Engineering'}"
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      if (response.text) {
        return JSON.parse(response.text.trim());
      }
    } catch (err) {
      // Fallback to pre-built question bank
    }

    const questionBank = DynamicRagExamEngine.getPmpQuestionBank();
    return questionBank[0];
  }

  /**
   * Retrieves the PMP question bank dataset from disk
   */
  public static getPmpQuestionBank(): any[] {
    try {
      const filePath = path.join(__dirname, '..', '..', 'data', 'pmp_exam_question_bank.json');
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed reading PMP question bank file:', e);
    }

    // Default static fallback
    return [
      {
        id: 'PMP-SIT-001',
        domain: 'People (42%)',
        task: 'Manage Conflict',
        scenario: 'The Lead Backend Architect and DevOps Specialist strongly disagree on automated canary deployments, stalling the release pipeline.',
        question: 'What should the Project Manager do FIRST to resolve this situational crisis?',
        options: [
          { key: 'A', text: 'Escalate the issue to the Product Owner and Sponsor.' },
          { key: 'B', text: 'Facilitate a private collaborative session with both specialists to analyze trade-offs using objective project constraints.' },
          { key: 'C', text: 'Instruct the team to proceed with manual deployments for this release.' },
          { key: 'D', text: 'Reassign the DevOps specialist to another workstream.' },
        ],
        correctKey: 'B',
        rationale: {
          whyCorrect: 'Under PMBOK 7th Edition (People Domain), the Project Manager should prioritize a collaborating/problem-solving approach first.',
          distractorAnalysis: {
            A: 'Escalation to the sponsor abdication of PM leadership.',
            C: 'Smoothing/forcing introduces technical debt and leaves the conflict unaddressed.',
            D: 'Forcing separation damages team morale and misuses resources.',
          },
        },
        examTrapAlert: 'Beware of answers that suggest escalating to the Sponsor when technical collaboration is possible.',
      },
    ];
  }
}
