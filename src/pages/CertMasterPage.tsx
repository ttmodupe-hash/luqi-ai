// =====================================================================
// CERTMASTER ACADEMY — ITIL® AI Governance (v5), CCNA, CCNP & CCIP
// Interactive Exam Engine, Hands-On Cisco IOS Terminal & Subnet Labs
// =====================================================================

import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router";
import {
  Shield,
  Network,
  Terminal,
  Calculator,
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Send,
  HelpCircle,
  Layers,
  Cpu,
  Clock,
  Award,
  Zap,
  RefreshCw,
  Search,
  ExternalLink,
  Sliders,
  Check,
  Bookmark,
  Shuffle,
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import CertMasterVideoCoach from "@/components/CertMasterVideoCoach";

// ── TYPES ────────────────────────────────────────────────────────────

type TrackId = "itil_ai_v5" | "ccna_200_301" | "ccnp_encor" | "ccip_sp";

interface Question {
  id: string;
  trackId: TrackId;
  domain: string;
  question: string;
  options: { key: string; text: string }[];
  correctKey: string;
  explanation: string;
  trapWarning: string;
  reference: string;
}

interface Flashcard {
  id: string;
  trackId: TrackId;
  domain: string;
  front: string;
  back: string;
  mnemonic?: string;
  keyRule: string;
}

interface LabScenario {
  id: string;
  title: string;
  trackId: TrackId;
  objective: string;
  steps: string[];
  initialCommands: string[];
  solutionKeywords: string[];
  topologyHint: string;
}

// ── COMPREHENSIVE QUESTION BANK ──────────────────────────────────────

const QUESTION_BANK: Question[] = [
  // ITIL 5 AI GOVERNANCE
  {
    id: "itil-1",
    trackId: "itil_ai_v5",
    domain: "AI Service Value System",
    question: "Under ITIL® 5 AI Governance, which Guiding Principle is most critically violated when an enterprise immediately deploys a multi-billion parameter foundation model before auditing its existing knowledge pipeline and data cleanliness?",
    options: [
      { key: "A", text: "Think and work holistically" },
      { key: "B", text: "Start where you are" },
      { key: "C", text: "Keep it simple and practical" },
      { key: "D", text: "Progress iteratively with feedback" }
    ],
    correctKey: "B",
    explanation: "'Start where you are' mandates that an organization assess, understand, and leverage existing services, data provenance, and process baselines before attempting wholesale transformation or deploying uncalibrated foundation models.",
    trapWarning: "While 'Keep it simple' sounds plausible, the specific failure to evaluate current data pipelines and baseline systems directly breaches 'Start where you are'.",
    reference: "ITIL 5 AI Governance Framework — Section 3.2: Guiding Principles in Cognitive Systems"
  },
  {
    id: "itil-2",
    trackId: "itil_ai_v5",
    domain: "AI Risk & ISO 42001",
    question: "According to ISO/IEC 42001 and EU AI Act risk tiers integrated into ITIL 5, an AI system used to autonomously control high-voltage electrical grid routing without human intervention is classified as:",
    options: [
      { key: "A", text: "Minimal Risk" },
      { key: "B", text: "Limited / Transparency Risk" },
      { key: "C", text: "High Risk (Critical Infrastructure)" },
      { key: "D", text: "Unacceptable Risk (Prohibited)" }
    ],
    correctKey: "C",
    explanation: "AI management in critical physical infrastructure (energy grids, transport, water networks) falls directly into the High-Risk category under EU AI Act and ISO 42001 Annex A. It requires mandatory conformity assessments, continuous event logging, and human oversight gates.",
    trapWarning: "Critical infrastructure is NOT automatically 'Unacceptable/Prohibited' (which is reserved for social scoring and biometric cognitive manipulation); rather it is strictly regulated as 'High Risk'.",
    reference: "ISO/IEC 42001:2023 Clause 6.1 & EU AI Act Annex III"
  },
  {
    id: "itil-3",
    trackId: "itil_ai_v5",
    domain: "AI Ethics & Lifecycle",
    question: "When an LLM agent begins making erroneous predictions due to changes in consumer terminology and seasonal purchasing patterns after 6 months in production, ITIL 5 MLOps classifies this degradation specifically as:",
    options: [
      { key: "A", text: "Algorithmic Inversion" },
      { key: "B", text: "Data Drift (Input Covariate Shift)" },
      { key: "C", text: "Adversarial Prompt Poisoning" },
      { key: "D", text: "Shadow AI Drift" }
    ],
    correctKey: "B",
    explanation: "Data Drift (Covariate Shift) occurs when the statistical distribution of real-world input variables changes over time relative to the distribution on which the model was trained, while Concept Drift refers to changes in the relationship between input features and target labels.",
    trapWarning: "Do not confuse Data Drift (input distribution change) with Model Hallucination or security-related Prompt Poisoning.",
    reference: "ITIL 5 Continuous AI Assurance & MLOps Lifecycle"
  },
  {
    id: "itil-4",
    trackId: "itil_ai_v5",
    domain: "Human-in-the-Loop Architecture",
    question: "What is the primary role of a 'Human-in-the-Loop' (HITL) gate in an ITIL 5 compliant autonomous operational pipeline?",
    options: [
      { key: "A", text: "Manually re-typing prompt tokens into LLM interfaces" },
      { key: "B", text: "Serving as a mandatory approval checkpoint before high-impact, irreversible actions are executed" },
      { key: "C", text: "Reviewing every single internal SQL select query generated by an agent" },
      { key: "D", text: "Rewriting model weights directly in the neural network layers" }
    ],
    correctKey: "B",
    explanation: "HITL gates decouple autonomous reasoning from irreversible write actions. Agents can autonomously draft code or propose transactions, but the execution node must hold for cryptographic human sign-off.",
    trapWarning: "Reviewing low-level read queries would destroy scalability; HITL specifically guards irreversible, high-impact state transitions.",
    reference: "NIST AI RMF & ITIL 5 Change Enablement for Agentic Systems"
  },

  // CISCO CCNA (200-301)
  {
    id: "ccna-1",
    trackId: "ccna_200_301",
    domain: "Network Fundamentals & Subnetting",
    question: "What is the broadcast address and number of usable hosts for the subnet containing the host IP address 172.16.85.45/22?",
    options: [
      { key: "A", text: "Broadcast: 172.16.87.255, Usable Hosts: 1022" },
      { key: "B", text: "Broadcast: 172.16.85.255, Usable Hosts: 254" },
      { key: "C", text: "Broadcast: 172.16.88.255, Usable Hosts: 1024" },
      { key: "D", text: "Broadcast: 172.16.95.255, Usable Hosts: 2046" }
    ],
    correctKey: "A",
    explanation: "/22 has 22 mask bits = 255.255.252.0. The interesting octet is 3rd octet. Block size = 256 - 252 = 4. 85 / 4 = 21 with remainder 1, so the subnet starts at 172.16.84.0. The next subnet is 172.16.88.0. Therefore, broadcast is 172.16.87.255. Host bits = 32 - 22 = 10 bits. Usable hosts = 2^10 - 2 = 1022.",
    trapWarning: "Never forget to subtract 2 for the network and broadcast addresses when asked for usable hosts!",
    reference: "RFC 1878 & CCNA 200-301 Exam Topic 1.4: IPv4 Subnetting"
  },
  {
    id: "ccna-2",
    trackId: "ccna_200_301",
    domain: "Network Access & STP",
    question: "In standard IEEE 802.1D Spanning Tree Protocol, which port state is responsible for processing BPDUs, learning MAC addresses from frames, but NOT forwarding user data frames?",
    options: [
      { key: "A", text: "Blocking" },
      { key: "B", text: "Listening" },
      { key: "C", text: "Learning" },
      { key: "D", text: "Forwarding" }
    ],
    correctKey: "C",
    explanation: "In 802.1D STP: Blocking drops all frames; Listening processes BPDUs only (does not populate MAC table); Learning populates the switch MAC table from incoming source addresses but does not forward frames yet; Forwarding both learns and forwards frames.",
    trapWarning: "Listening state does NOT learn MAC addresses; only Learning state builds the CAM/MAC table.",
    reference: "IEEE 802.1D STP State Machine & CCNA Exam Topic 2.5"
  },
  {
    id: "ccna-3",
    trackId: "ccna_200_301",
    domain: "IP Connectivity & OSPF",
    question: "When two Cisco routers running OSPFv2 on an Ethernet broadcast multi-access link are configured with the same Router ID, what occurs?",
    options: [
      { key: "A", text: "The router with the highest IP address automatically increments its Router ID by 1" },
      { key: "B", text: "An OSPF neighbor adjacency will NOT form and the router logs duplicate Router-ID syslog errors" },
      { key: "C", text: "Both routers become Designated Routers (DR) simultaneously" },
      { key: "D", text: "EIGRP takes over routing failover automatically" }
    ],
    correctKey: "B",
    explanation: "OSPF strictly requires unique 32-bit Router IDs within the autonomous system. If two neighbors have identical Router IDs on the same segment, they will ignore each other's Hello packets or detect the collision, preventing the 2-WAY and FULL adjacency states.",
    trapWarning: "Routers never automatically increment their own Router ID; it must be manually corrected or derived from another active loopback/physical interface.",
    reference: "RFC 2328 OSPF Version 2 & CCNA Exam Topic 3.4"
  },

  // CISCO CCNP (350-401 ENCOR & ENARSI)
  {
    id: "ccnp-1",
    trackId: "ccnp_encor",
    domain: "Advanced BGP Mechanics",
    question: "A Cisco router receives two identical prefixes via BGP from different peers. Prefix A has Weight 0, Local Preference 200, AS-Path '65001 65002', and MED 10. Prefix B has Weight 32768, Local Preference 100, AS-Path '65003', and MED 50. Which route is installed in the BGP table as the best path and why?",
    options: [
      { key: "A", text: "Prefix A, because Local Preference (200) takes precedence over all other attributes" },
      { key: "B", text: "Prefix B, because Cisco Weight (32768) is evaluated FIRST before Local Preference" },
      { key: "C", text: "Prefix B, because its AS-Path is shorter (length 1 vs 2)" },
      { key: "D", text: "Prefix A, because MED 10 is lower than MED 50" }
    ],
    correctKey: "B",
    explanation: "In the Cisco BGP Best Path Selection algorithm, Weight (0-65535, Cisco proprietary) is the very first attribute checked. Highest Weight wins. Since Prefix B has Weight 32768 and Prefix A has 0, Prefix B is chosen immediately, without even evaluating Local Preference.",
    trapWarning: "Standard RFC 4271 BGP begins with Local Preference, but Cisco routers ALWAYS check Cisco Weight first!",
    reference: "Cisco BGP Best Path Algorithm & CCNP ENCOR 350-401 Topic 3.2"
  },
  {
    id: "ccnp-2",
    trackId: "ccnp_encor",
    domain: "OSPF LSA Types & Redistribution",
    question: "Which OSPF LSA type is generated by an ASBR to advertise external routes redistributed from BGP or static routes into normal OSPF areas, and what is its flooding scope?",
    options: [
      { key: "A", text: "Type 3 Summary LSA, flooded within the local area only" },
      { key: "B", text: "Type 4 ASBR Summary LSA, flooded by the ABR" },
      { key: "C", text: "Type 5 External LSA, flooded throughout the entire OSPF AS (except stub areas)" },
      { key: "D", text: "Type 7 NSSA LSA, flooded across Area 0 only" }
    ],
    correctKey: "C",
    explanation: "Type 5 LSAs (External LSAs) are originated by Autonomous System Boundary Routers (ASBRs) to inject external redistributed routes. They are flooded throughout the entire OSPF autonomous system, except stub and totally stubby areas. (Type 4 LSAs tell other areas how to reach the ASBR).",
    trapWarning: "Type 4 does NOT contain the external routes; Type 4 only advertises the path to the ASBR itself. Type 5 contains the actual external routes.",
    reference: "RFC 2328 & CCNP 300-410 ENARSI Advanced Routing"
  },

  // CISCO CCIP / SERVICE PROVIDER
  {
    id: "ccip-1",
    trackId: "ccip_sp",
    domain: "MPLS Architecture & LDP",
    question: "In an MPLS network, what is the role of Penultimate Hop Popping (PHP) using reserved Label 3 (Implicit Null)?",
    options: [
      { key: "A", text: "It encrypts the payload before delivering to customer premises equipment" },
      { key: "B", text: "It relieves the egress Provider Edge (PE) router from performing two lookups (label lookup + IP lookup)" },
      { key: "C", text: "It forces the core router to calculate BGP MED across autonomous systems" },
      { key: "D", text: "It prevents loops between OSPF and EIGRP redistribution points" }
    ],
    correctKey: "B",
    explanation: "PHP allows the second-to-last (penultimate) router in the LSP to pop the top MPLS label before handing the packet to the egress PE router. This spares the egress PE router from having to do both an LFIB label lookup and a subsequent FIB/IP lookup, boosting forwarding throughput.",
    trapWarning: "Label 0 is Explicit Null (retains QoS bits), whereas Label 3 is Implicit Null (triggers PHP).",
    reference: "RFC 3031 & Cisco Service Provider IP Routing (CCIP/SPRI)"
  },
  {
    id: "ccip-2",
    trackId: "ccip_sp",
    domain: "MPLS Layer 3 VPNs",
    question: "In MPLS Layer 3 VPNs, what is the fundamental difference between a Route Distinguisher (RD) and a Route Target (RT)?",
    options: [
      { key: "A", text: "RD determines BGP local preference, while RT determines OSPF cost" },
      { key: "B", text: "RD makes overlapping customer IPv4 prefixes globally unique (creating a VPNv4 address), while RT controls route import/export policy into VRFs via BGP extended communities" },
      { key: "C", text: "RD is 16 bytes while RT is always 4 bytes" },
      { key: "D", text: "RD is used in LDP while RT is used only in RSVP-TE" }
    ],
    correctKey: "B",
    explanation: "Route Distinguisher (8-byte prefix) prepends customer IPv4 routes (e.g. 10.1.1.0/24) to create a unique 96-bit VPNv4 address so multiple customers can use overlapping 10.0.0.0/8 spaces. Route Targets (BGP Extended Communities) define topology policy: which VRFs import or export those VPNv4 prefixes.",
    trapWarning: "Do not confuse the uniqueness role of RD with the policy/import-export role of RT!",
    reference: "RFC 4364: BGP/MPLS IP Virtual Private Networks (VPNs)"
  }
];

// ── FLASHCARDS (LEITNER SPACED REPETITION) ───────────────────────────

const FLASHCARDS: Flashcard[] = [
  {
    id: "fc-1",
    trackId: "ccnp_encor",
    domain: "BGP Path Selection",
    front: "What is the order of attributes in the Cisco BGP Best Path Selection Algorithm?",
    back: "1. Weight (Highest, Cisco only)\n2. Local Preference (Highest, 100 default)\n3. Locally Originated (network/redistributed)\n4. AS-Path (Shortest)\n5. Origin (IGP < EGP < Incomplete)\n6. MED (Lowest)\n7. eBGP over iBGP\n8. Lowest IGP metric to Next-Hop\n9. Lowest Router ID",
    mnemonic: "We Love Oranges As Oranges Mean Pure Refreshment",
    keyRule: "Weight is local only; Local Pref goes across iBGP; MED is non-transitive across external AS."
  },
  {
    id: "fc-2",
    trackId: "ccna_200_301",
    domain: "Subnetting Math",
    front: "How do you calculate the Subnet Block Size for any IPv4 CIDR mask in seconds?",
    back: "Subtract the 'interesting octet' mask value from 256!\nExamples:\n/26 = 255.255.255.192 -> 256 - 192 = 64 block size.\n/28 = 255.255.255.240 -> 256 - 240 = 16 block size.\n/20 = 255.255.240.0 -> 256 - 240 = 16 in 3rd octet.",
    mnemonic: "The 256 Magic Formula",
    keyRule: "Multiples of the block size are your subnet network IDs (.0, .64, .128, .192)."
  },
  {
    id: "fc-3",
    trackId: "itil_ai_v5",
    domain: "ITIL 5 AI Guiding Principles",
    front: "List the 7 ITIL 5 Guiding Principles applied to Generative & Autonomous AI.",
    back: "1. Focus on value (outcome > token vanity)\n2. Start where you are (audit data pipelines first)\n3. Progress iteratively with feedback (RLHF/evals)\n4. Collaborate and promote visibility (transparency)\n5. Think and work holistically (ethics + infra + SLAs)\n6. Keep it simple and practical (avoid over-agentification)\n7. Optimize and automate (guardrails & observability)",
    mnemonic: "V-A-I-C-H-S-A (Value, As-is, Iterate, Collaborate, Holistic, Simple, Automate)",
    keyRule: "Never build autonomous write-access without an asynchronous Human-in-the-Loop gate."
  },
  {
    id: "fc-4",
    trackId: "ccna_200_301",
    domain: "Administrative Distance",
    front: "What are the default Administrative Distances (AD) for major Cisco routing protocols?",
    back: "Connected: 0\nStatic: 1\neBGP: 20\nEIGRP (Internal): 90\nOSPF: 110\nIS-IS: 115\nRIP: 120\niBGP: 200\nUnknown: 255 (Unreachable)",
    mnemonic: "Can Some Brave Elephants Open Ice Rivers In Africa?",
    keyRule: "Lower Administrative Distance always wins when multiple protocols advertise the same prefix length."
  },
  {
    id: "fc-5",
    trackId: "ccip_sp",
    domain: "MPLS & VPNs",
    front: "Compare MPLS Label 0 vs Label 3 (Implicit Null / PHP).",
    back: "Label 0 = Explicit Null: Informs penultimate router to keep label with value 0 so egress PE can inspect EXP/QoS bits.\nLabel 3 = Implicit Null: Informs penultimate router to pop label (PHP), sending raw IP/inner label to egress PE.",
    keyRule: "PHP eliminates dual-lookup latency at the egress provider edge router."
  },
  {
    id: "fc-6",
    trackId: "itil_ai_v5",
    domain: "ISO 42001 & AI Risk",
    front: "What are the 4 EU AI Act & ISO 42001 risk classification tiers?",
    back: "1. Unacceptable: Cognitive behavioral distortion, biometric social scoring (BANNED)\n2. High-Risk: Critical infrastructure, medical diagnostics, legal, HR filtering (Strict audits & human oversight)\n3. Limited/Transparency: Chatbots, deepfakes (Must disclose AI nature)\n4. Minimal: Spam filters, AI spell check",
    keyRule: "ITIL 5 requires high-risk systems to implement continuous telemetry and audit logs."
  }
];

// ── LAB SCENARIOS ────────────────────────────────────────────────────

const LAB_SCENARIOS: LabScenario[] = [
  {
    id: "lab-ospf",
    title: "Lab 1: Configure Point-to-Point OSPFv2 Adjacency",
    trackId: "ccna_200_301",
    objective: "Configure OSPF process 1 on GigabitEthernet0/0 with network 10.1.10.0/24 in Area 0 and verify neighbor state.",
    steps: [
      "Enter privileged mode with 'enable'",
      "Enter global configuration mode with 'configure terminal'",
      "Configure OSPF: 'router ospf 1'",
      "Add network: 'network 10.1.10.0 0.0.0.255 area 0'",
      "Exit and verify adjacency: 'show ip ospf neighbor'"
    ],
    initialCommands: [
      "enable",
      "configure terminal",
      "router ospf 1",
      "network 10.1.10.0 0.0.0.255 area 0",
      "exit",
      "show ip ospf neighbor"
    ],
    solutionKeywords: ["ospf 1", "network 10.1.10.0", "area 0", "full/bdr"],
    topologyHint: "R1 (Gi0/0: 10.1.10.1/24) <── Area 0 ──> R2 (Gi0/0: 10.1.10.2/24)"
  },
  {
    id: "lab-bgp",
    title: "Lab 2: BGP Peering & Next-Hop-Self on iBGP",
    trackId: "ccnp_encor",
    objective: "Configure BGP AS 65001 with neighbor 10.1.10.2 and fix the iBGP next-hop unreachable dilemma using next-hop-self.",
    steps: [
      "Enter config mode: 'conf t'",
      "Enter BGP: 'router bgp 65001'",
      "Peer with iBGP neighbor: 'neighbor 10.1.10.2 remote-as 65001'",
      "Enable next-hop-self: 'neighbor 10.1.10.2 next-hop-self'",
      "Verify BGP table: 'show ip bgp summary'"
    ],
    initialCommands: [
      "enable",
      "conf t",
      "router bgp 65001",
      "neighbor 10.1.10.2 remote-as 65001",
      "neighbor 10.1.10.2 next-hop-self",
      "end",
      "show ip bgp summary"
    ],
    solutionKeywords: ["bgp 65001", "remote-as 65001", "next-hop-self"],
    topologyHint: "Edge BGP Gateway R1 (AS 65001) <── iBGP ──> Internal Core R2 (AS 65001)"
  },
  {
    id: "lab-itil-governance",
    title: "Lab 3: ITIL 5 AI Governance Gate & Risk Matrix Audit",
    trackId: "itil_ai_v5",
    objective: "Audit an autonomous routing agent deploying dynamic BGP path policies. Apply ISO 42001 risk controls and verify Human-in-the-Loop gating.",
    steps: [
      "Classify model impact: High-Risk (Critical Network Infrastructure)",
      "Set drift detection threshold: Jensen-Shannon divergence < 0.05",
      "Activate cryptographic Human-in-the-Loop approval gate for route withdrawals",
      "Verify audit trail conformity with ISO/IEC 42001 Clause 9.1"
    ],
    initialCommands: [
      "show ip route",
      "show ip bgp summary"
    ],
    solutionKeywords: ["iso 42001", "hitl", "high-risk", "data drift"],
    topologyHint: "Autonomous AI Orchestrator ──[HITL Gate]──> Carrier Route Controller"
  }
];

export default function CertMasterPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"exam" | "terminal" | "subnet" | "flashcards" | "coach" | "topology">("exam");
  const [selectedTrack, setSelectedTrack] = useState<TrackId>("ccna_200_301");

  // Sync tabs and tracks with URL parameters and paths
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const trackParam = params.get("track");

    if (tabParam && ["exam", "terminal", "subnet", "flashcards", "coach", "topology"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    if (trackParam && ["itil_ai_v5", "ccna_200_301", "ccnp_encor", "ccip_sp"].includes(trackParam)) {
      setSelectedTrack(trackParam as any);
    }

    if (location.pathname === "/itil-ai") {
      setSelectedTrack("itil_ai_v5");
      setActiveTab("exam");
    } else if (location.pathname === "/ccna") {
      setSelectedTrack("ccna_200_301");
      setActiveTab("exam");
    } else if (location.pathname === "/ccnp") {
      setSelectedTrack("ccnp_encor");
      setActiveTab("exam");
    } else if (location.pathname === "/networking-lab") {
      setActiveTab("terminal");
    }
  }, [location.pathname, location.search]);

  // Listen for direct tab navigation from Global Command Palette
  useEffect(() => {
    const handleCustomNav = (e: any) => {
      const detail = e.detail;
      if (detail?.tabKey === "tab" && detail?.tabValue) {
        setActiveTab(detail.tabValue);
      }
      if (detail?.tabKey === "track" && detail?.tabValue) {
        setSelectedTrack(detail.tabValue);
      }
    };
    window.addEventListener("luqi:navigate-tab", handleCustomNav);
    return () => window.removeEventListener("luqi:navigate-tab", handleCustomNav);
  }, []);

  // ── EXAM STATE ──
  const [examMode, setExamMode] = useState<"practice" | "timed">("practice");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<string[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return QUESTION_BANK.filter((q) => q.trackId === selectedTrack);
  }, [selectedTrack]);

  const activeQuestion = filteredQuestions[currentQIndex] || filteredQuestions[0];

  // Timer effect for timed exam
  useEffect(() => {
    let interval: any = null;
    if (examMode === "timed" && isTimerRunning && timeLeftSec > 0 && !examFinished) {
      interval = setInterval(() => {
        setTimeLeftSec((prev) => {
          if (prev <= 1) {
            setExamFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [examMode, isTimerRunning, timeLeftSec, examFinished]);

  // Start / Reset Exam
  const handleStartExam = (mode: "practice" | "timed") => {
    setExamMode(mode);
    setCurrentQIndex(0);
    setSelectedAnswers({});
    setShowExplanation(mode === "practice");
    setExamFinished(false);
    setTimeLeftSec(mode === "timed" ? 30 * 60 : 0);
    setIsTimerRunning(mode === "timed");
  };

  const handleSelectAnswer = (key: string) => {
    if (examFinished) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: key
    }));
    if (examMode === "practice") {
      setShowExplanation(true);
    }
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedQuestions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Exam Score calculation
  const scoreStats = useMemo(() => {
    let correct = 0;
    filteredQuestions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctKey) correct++;
    });
    const total = filteredQuestions.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = selectedTrack === "itil_ai_v5" ? percentage >= 75 : percentage >= 82.5;
    return { correct, total, percentage, passed };
  }, [filteredQuestions, selectedAnswers, selectedTrack]);

  // ── CISCO IOS TERMINAL STATE ──
  const [cliInput, setCliInput] = useState("");
  const [cliHistory, setCliHistory] = useState<{ command: string; output: string; prompt: string }[]>([
    {
      command: "show version",
      output: `Cisco IOS Software, C8000 Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 17.09.04a
Technical Support: http://www.cisco.com/techsupport
Compiled Thu 12-Oct-26 14:15 by prod_builder
Luqi-AI NetGov Hardware Architecture with Hardware Crypto Accelerator.
System image file is "bootflash:c8000v-universalk9.17.09.04a.SPA.bin"`,
      prompt: "Router>"
    }
  ]);
  const [cliMode, setCliMode] = useState<string>("user");
  const [cliPrompt, setCliPrompt] = useState<string>("Router>");
  const [activeLabScenario, setActiveLabScenario] = useState<LabScenario>(LAB_SCENARIOS[0]);
  const cliScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cliScrollRef.current) {
      cliScrollRef.current.scrollTop = cliScrollRef.current.scrollHeight;
    }
  }, [cliHistory]);

  const handleExecuteCli = async (cmdToRun?: string) => {
    const command = (cmdToRun !== undefined ? cmdToRun : cliInput).trim();
    if (!command) return;

    try {
      const res = await fetch("/api/v1/cert-academy/cli-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          mode: cliMode,
          prompt: cliPrompt
        })
      });
      const data = await res.json();

      setCliHistory((prev) => [
        ...prev,
        {
          command,
          output: data.output,
          prompt: cliPrompt
        }
      ]);
      setCliMode(data.nextMode);
      setCliPrompt(data.prompt);
      setCliInput("");
    } catch (e) {
      // Offline local evaluation
      let out = "";
      let nextM = cliMode;
      let nextP = cliPrompt;
      if (command.toLowerCase() === "enable" || command.toLowerCase() === "en") {
        nextM = "privileged";
        nextP = "Router#";
      } else if (command.toLowerCase() === "conf t" || command.toLowerCase() === "configure terminal") {
        nextM = "config";
        nextP = "Router(config)#";
        out = "Enter configuration commands, one per line. End with CNTL/Z.";
      } else if (command.toLowerCase() === "exit") {
        nextM = "privileged";
        nextP = "Router#";
      } else {
        out = `% Executed: ${command}`;
      }
      setCliHistory((prev) => [...prev, { command, output: out, prompt: cliPrompt }]);
      setCliMode(nextM);
      setCliPrompt(nextP);
      setCliInput("");
    }
  };

  // ── SUBNETTING CALCULATOR STATE ──
  const [subnetIp, setSubnetIp] = useState("192.168.10.45");
  const [subnetCidr, setSubnetCidr] = useState(26);
  const [drillAnswer, setDrillAnswer] = useState("");
  const [drillFeedback, setDrillFeedback] = useState<string | null>(null);

  const subnetCalculations = useMemo(() => {
    try {
      const parts = subnetIp.split(".").map((p) => parseInt(p, 10));
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        return null;
      }
      const ipNum = ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
      const maskNum = subnetCidr === 0 ? 0 : (~0 << (32 - subnetCidr)) >>> 0;
      const wildcardNum = (~maskNum) >>> 0;
      const netNum = (ipNum & maskNum) >>> 0;
      const bcastNum = (netNum | wildcardNum) >>> 0;

      const toIpStr = (n: number) => [
        (n >>> 24) & 255,
        (n >>> 16) & 255,
        (n >>> 8) & 255,
        n & 255
      ].join(".");

      const totalHosts = Math.pow(2, 32 - subnetCidr);
      const usableHosts = subnetCidr >= 31 ? 0 : totalHosts - 2;
      const firstUsable = subnetCidr >= 31 ? "N/A" : toIpStr(netNum + 1);
      const lastUsable = subnetCidr >= 31 ? "N/A" : toIpStr(bcastNum - 1);

      // Binary string
      const binaryIp = parts.map((p) => p.toString(2).padStart(8, "0")).join(".");
      const maskParts = [(maskNum >>> 24) & 255, (maskNum >>> 16) & 255, (maskNum >>> 8) & 255, maskNum & 255];
      const binaryMask = maskParts.map((p) => p.toString(2).padStart(8, "0")).join(".");

      return {
        networkAddress: toIpStr(netNum),
        broadcastAddress: toIpStr(bcastNum),
        subnetMask: toIpStr(maskNum),
        wildcardMask: toIpStr(wildcardNum),
        firstUsable,
        lastUsable,
        totalHosts,
        usableHosts,
        binaryIp,
        binaryMask
      };
    } catch {
      return null;
    }
  }, [subnetIp, subnetCidr]);

  // ── FLASHCARD STATE (LEITNER BOXES) ──
  const [fcIndex, setFcIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [boxState, setBoxState] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("luqi_certmaster_leitner");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const activeFlashcard = FLASHCARDS[fcIndex] || FLASHCARDS[0];

  const handleLeitnerAdvance = (fcId: string, success: boolean) => {
    const curBox = boxState[fcId] || 1;
    const nextBox = success ? Math.min(curBox + 1, 3) : 1;
    const updated = { ...boxState, [fcId]: nextBox };
    setBoxState(updated);
    try {
      localStorage.setItem("luqi_certmaster_leitner", JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage sync failed", e);
    }
    setIsFlipped(false);
    setFcIndex((prev) => (prev + 1) % FLASHCARDS.length);
  };

  // ── AI EXAM COACH STATE ──
  const [coachQuery, setCoachQuery] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachMessages, setCoachMessages] = useState<{ role: "user" | "coach"; text: string }[]>([
    {
      role: "coach",
      text: `Hello, Engineer! I am your Senior Exam Proctor for ITIL® AI Governance (v5), Cisco CCNA (200-301), and CCNP/CCIP Enterprise & Service Provider.\n\nAsk me anything: BGP path attributes, OSPF LSA types, Subnetting magic numbers, ISO 42001 compliance criteria, or test questions!`
    }
  ]);

  const handleSendCoach = async (promptText?: string) => {
    const textToSend = promptText || coachQuery;
    if (!textToSend.trim() || coachLoading) return;

    setCoachMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setCoachQuery("");
    setCoachLoading(true);

    try {
      const res = await fetch("/api/v1/cert-academy/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          track: selectedTrack,
          context: `Active tab is ${activeTab}, current question is ${activeQuestion?.question}`
        })
      });
      const data = await res.json();
      setCoachMessages((prev) => [
        ...prev,
        { role: "coach", text: data.answer || "No response received from proctor." }
      ]);
    } catch (e: any) {
      setCoachMessages((prev) => [
        ...prev,
        {
          role: "coach",
          text: `Offline Proctor Note: BGP Path selection uses "We Love Oranges As Oranges Mean Pure Refreshment" (Weight, Local Pref, Locally Originated, AS-Path, Origin, MED, eBGP > iBGP, lowest IGP, lowest Router ID). For ITIL 5, remember ISO/IEC 42001 and mandatory Human-in-the-Loop gating on high-risk pipelines.`
        }
      ]);
    } finally {
      setCoachLoading(false);
    }
  };

  // ── TOPOLOGY PACKET ANIMATION ──
  const [packetState, setPacketState] = useState<string | null>(null);
  const [packetLog, setPacketLog] = useState<string[]>([]);

  const handleInjectPacket = (type: "icmp" | "bgp" | "ospf") => {
    setPacketState(type);
    const time = new Date().toLocaleTimeString();
    if (type === "icmp") {
      setPacketLog((prev) => [
        `[${time}] ICMP Echo Request injected: PC1 (10.1.10.50) -> Server (172.16.1.100) via R1/R2. TTL=64, Seq=1.`,
        `[${time}] ICMP Echo Reply received: 0% loss, RTT = 1.8ms (STP Forwarding active).`,
        ...prev
      ]);
    } else if (type === "bgp") {
      setPacketLog((prev) => [
        `[${time}] BGP UPDATE packet: AS 65001 advertised prefix 10.1.0.0/16 with Next-Hop-Self.`,
        `[${time}] Peer R2 accepted prefix. Route added to BGP RIB with Local-Pref=100.`,
        ...prev
      ]);
    } else if (type === "ospf") {
      setPacketLog((prev) => [
        `[${time}] OSPFv2 Hello packet transmitted on multicast 224.0.0.5 (Area 0).`,
        `[${time}] Adjacency State changed from 2-WAY to FULL with DR (2.2.2.2).`,
        ...prev
      ]);
    }
    setTimeout(() => setPacketState(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center font-bold text-white shadow-md shadow-orange-500/20"
            >
              L
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  CertMaster Academy
                </h1>
                <Badge variant="default" className="text-[10px] px-2 py-0">
                  ITIL® 5 + CISCO CORE
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Advanced AI Governance, CCNA, CCNP & CCIP Hands-On Training
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/african-radar"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition flex items-center gap-1 font-medium"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> Radar
            </Link>
            <Link
              to="/lab-simulator"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition flex items-center gap-1 font-medium"
            >
              Physics Lab
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hub Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Track Selection Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: "itil_ai_v5" as TrackId,
              title: "ITIL® AI Governance (v5)",
              code: "ITIL-AI-V5",
              tag: "AI Ethics & ISO 42001",
              icon: Shield,
              color: "text-purple-400 border-purple-500/30 bg-purple-500/10"
            },
            {
              id: "ccna_200_301" as TrackId,
              title: "Cisco CCNA (200-301)",
              code: "200-301 CCNA",
              tag: "Routing, Switching & VLSM",
              icon: Network,
              color: "text-blue-400 border-blue-500/30 bg-blue-500/10"
            },
            {
              id: "ccnp_encor" as TrackId,
              title: "Cisco CCNP Enterprise",
              code: "350-401 ENCOR",
              tag: "BGP, Advanced OSPF & QoS",
              icon: Cpu,
              color: "text-amber-400 border-amber-500/30 bg-amber-500/10"
            },
            {
              id: "ccip_sp" as TrackId,
              title: "Cisco CCIP / Service Provider",
              code: "300-510 SPRI",
              tag: "MPLS, LDP & Carrier VPNs",
              icon: Layers,
              color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
            }
          ].map((track) => {
            const Icon = track.icon;
            const isSelected = selectedTrack === track.id;
            return (
              <button
                key={track.id}
                onClick={() => {
                  setSelectedTrack(track.id);
                  setCurrentQIndex(0);
                  setSelectedAnswers({});
                  setShowExplanation(false);
                  setExamFinished(false);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg border ${track.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {track.code}
                  </Badge>
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-semibold text-slate-100">{track.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{track.tag}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          {[
            { id: "exam", label: "Exam Simulator", icon: Award },
            { id: "terminal", label: "Cisco IOS CLI Sandbox", icon: Terminal },
            { id: "topology", label: "Interactive Packet Tracer", icon: Network },
            { id: "subnet", label: "Subnetting & VLSM Engine", icon: Calculator },
            { id: "flashcards", label: "Spaced Flashcards", icon: BookOpen },
            { id: "coach", label: "AI Exam Coach", icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: EXAM SIMULATOR */}
        {activeTab === "exam" && (
          <div className="space-y-6">
            {/* Exam Mode Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant={examMode === "practice" ? "default" : "outline"}
                  onClick={() => handleStartExam("practice")}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  Practice Mode (Instant Feedback)
                </Button>
                <Button
                  size="sm"
                  variant={examMode === "timed" ? "default" : "outline"}
                  onClick={() => handleStartExam("timed")}
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Timed Mock Exam (Exam Clock)
                </Button>
              </div>

              {examMode === "timed" && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm font-bold">
                    <Clock className="w-4 h-4 animate-pulse" />
                    {Math.floor(timeLeftSec / 60)}:
                    {(timeLeftSec % 60).toString().padStart(2, "0")}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setExamFinished(true)}
                  >
                    Finish Exam
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>
                  Question {currentQIndex + 1} of {filteredQuestions.length}
                </span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-amber-400 font-medium">
                  {Object.keys(selectedAnswers).length} Answered
                </span>
              </div>
            </div>

            {/* Exam Body or Results Screen */}
            {!examFinished ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Question Area */}
                <div className="lg:col-span-8 space-y-4">
                  <Card className="border-slate-800 bg-slate-900/70 shadow-lg">
                    <CardHeader className="pb-3 border-b border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                          {activeQuestion.domain}
                        </Badge>
                        <button
                          onClick={() => toggleBookmark(activeQuestion.id)}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition cursor-pointer ${
                            bookmarkedQuestions.includes(activeQuestion.id)
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "text-slate-400 hover:text-slate-200 bg-slate-800/60"
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          {bookmarkedQuestions.includes(activeQuestion.id) ? "Flagged" : "Flag for Review"}
                        </button>
                      </div>
                      <CardTitle className="text-base sm:text-lg font-semibold text-slate-100 mt-2 leading-relaxed">
                        {activeQuestion.question}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-3">
                      {activeQuestion.options.map((opt) => {
                        const isChosen = selectedAnswers[activeQuestion.id] === opt.key;
                        const isCorrect = opt.key === activeQuestion.correctKey;
                        let optionStyle = "border-slate-800 bg-slate-950/60 hover:bg-slate-800/50 hover:border-slate-700";

                        if (isChosen) {
                          optionStyle = "border-amber-500 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/30";
                        }
                        if (showExplanation) {
                          if (isCorrect) {
                            optionStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40";
                          } else if (isChosen && !isCorrect) {
                            optionStyle = "border-red-500 bg-red-500/15 text-red-200 ring-1 ring-red-500/40";
                          }
                        }

                        return (
                          <div
                            key={opt.key}
                            onClick={() => handleSelectAnswer(opt.key)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${optionStyle}`}
                          >
                            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0 mt-0.5">
                              {opt.key}
                            </span>
                            <span className="text-sm text-slate-200 leading-normal">{opt.text}</span>
                            {showExplanation && isCorrect && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto shrink-0" />
                            )}
                            {showExplanation && isChosen && !isCorrect && (
                              <XCircle className="w-5 h-5 text-red-400 ml-auto shrink-0" />
                            )}
                          </div>
                        );
                      })}

                      {/* Explanation Drawer (Practice mode or revealed) */}
                      {showExplanation && (
                        <div className="mt-6 p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                            <CheckCircle2 className="w-4 h-4" /> Official Examination Analysis & Solution
                          </div>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            {activeQuestion.explanation}
                          </p>

                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                                Exam Trap to Avoid:
                              </span>
                              <p className="text-xs text-amber-200/90 mt-0.5">
                                {activeQuestion.trapWarning}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span>Reference: {activeQuestion.reference}</span>
                            <button
                              onClick={() => {
                                handleSendCoach(`Can you elaborate deeply on this question: "${activeQuestion.question}"?`);
                                setActiveTab("coach");
                              }}
                              className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" /> Ask AI Proctor to explain more
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Question Navigation Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentQIndex === 0}
                          onClick={() => {
                            setCurrentQIndex((p) => p - 1);
                            setShowExplanation(examMode === "practice" && !!selectedAnswers[filteredQuestions[currentQIndex - 1]?.id]);
                          }}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>

                        <div className="flex items-center gap-2">
                          {examMode === "practice" && !showExplanation && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setShowExplanation(true)}
                            >
                              Reveal Explanation
                            </Button>
                          )}

                          {currentQIndex < filteredQuestions.length - 1 ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setCurrentQIndex((p) => p + 1);
                                setShowExplanation(examMode === "practice" && !!selectedAnswers[filteredQuestions[currentQIndex + 1]?.id]);
                              }}
                            >
                              Next <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500"
                              onClick={() => setExamFinished(true)}
                            >
                              Submit Exam <Award className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Question Navigator Drawer */}
                <div className="lg:col-span-4 space-y-4">
                  <Card className="border-slate-800 bg-slate-900/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>Question Navigator</span>
                        <Badge variant="outline" className="text-xs">
                          {filteredQuestions.length} Questions
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-5 gap-2">
                        {filteredQuestions.map((q, idx) => {
                          const isAnswered = !!selectedAnswers[q.id];
                          const isCurrent = idx === currentQIndex;
                          const isFlagged = bookmarkedQuestions.includes(q.id);

                          return (
                            <button
                              key={q.id}
                              onClick={() => {
                                setCurrentQIndex(idx);
                                setShowExplanation(examMode === "practice" && isAnswered);
                              }}
                              className={`h-9 rounded-lg text-xs font-bold transition flex items-center justify-center relative cursor-pointer ${
                                isCurrent
                                  ? "bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400"
                                  : isAnswered
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              {idx + 1}
                              {isFlagged && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-3 border-t border-slate-800 text-xs space-y-1.5 text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                          <span>Answered</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded bg-amber-500" />
                          <span>Current Question</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded bg-slate-800" />
                          <span>Unanswered</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1 mr-0.5" />
                          <span>Flagged for Review</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              /* EXAM SCORECARD & REPORT */
              <Card className="border-slate-800 bg-slate-900/90 shadow-2xl">
                <CardHeader className="text-center pb-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
                    <Award className={`w-8 h-8 ${scoreStats.passed ? "text-emerald-400" : "text-amber-400"}`} />
                  </div>
                  <CardTitle className="text-2xl font-bold">
                    {scoreStats.passed ? "EXAM PASSED!" : "EXAM REVIEW REQUIRED"}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-400">
                    Comprehensive Diagnostic Scorecard for {selectedTrack.toUpperCase().replace(/_/g, " ")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 max-w-xl mx-auto pt-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-2xl font-extrabold text-amber-400">{scoreStats.percentage}%</div>
                      <div className="text-xs text-slate-400 mt-1">Score Achieved</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-2xl font-extrabold text-slate-100">
                        {scoreStats.correct} / {scoreStats.total}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Correct Answers</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-2xl font-extrabold text-slate-300">
                        {selectedTrack === "itil_ai_v5" ? "75%" : "82.5%"}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Passing Threshold</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Proctor Evaluation & Next Steps:
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {scoreStats.passed
                        ? "Exceptional performance! Your comprehension of core protocols, state machines, and governance constraints exceeds the certification benchmark."
                        : "Review required on missed domains. Use the Spaced Repetition Flashcards and Hands-On Cisco CLI sandbox to drill command syntax and RFC protocol tie-breakers."}
                    </p>
                  </div>

                  <div className="flex justify-center gap-3">
                    <Button onClick={() => handleStartExam("practice")}>
                      <RotateCcw className="w-4 h-4 mr-2" /> Retake in Practice Mode
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("flashcards")}>
                      <BookOpen className="w-4 h-4 mr-2" /> Drill Weak Topics in Flashcards
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* TAB 2: CISCO IOS CLI TERMINAL SANDBOX */}
        {activeTab === "terminal" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Guided Scenario Selector */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="border-slate-800 bg-slate-900/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      Guided Hands-On Labs
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Select an official scenario to configure and test in the live emulator.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {LAB_SCENARIOS.map((lab) => (
                      <div
                        key={lab.id}
                        onClick={() => setActiveLabScenario(lab)}
                        className={`p-3 rounded-xl border transition cursor-pointer ${
                          activeLabScenario.id === lab.id
                            ? "bg-amber-500/10 border-amber-500 text-amber-200 ring-1 ring-amber-500/20"
                            : "bg-slate-950/60 border-slate-800 hover:bg-slate-800 text-slate-300"
                        }`}
                      >
                        <h4 className="text-xs font-bold">{lab.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {lab.objective}
                        </p>
                      </div>
                    ))}

                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        Topology Context:
                      </span>
                      <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-emerald-400 border border-slate-800">
                        {activeLabScenario.topologyHint}
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        Quick Command Snippets:
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {activeLabScenario.initialCommands.map((cmd, i) => (
                          <button
                            key={i}
                            onClick={() => handleExecuteCli(cmd)}
                            className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 font-mono text-amber-300 transition cursor-pointer"
                          >
                            {cmd}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Realistic Monospace IOS Terminal */}
              <div className="lg:col-span-8">
                <Card className="border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col h-[560px]">
                  {/* Terminal Header */}
                  <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-slate-300 font-semibold ml-2">
                        cisco-c8000v-console [ttyS0 9600 8N1]
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                      IOS-XE 17.09
                    </Badge>
                  </div>

                  {/* Terminal Output Stream */}
                  <div
                    ref={cliScrollRef}
                    className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-200 space-y-2 selection:bg-amber-500 selection:text-slate-950"
                  >
                    {cliHistory.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="text-amber-400 flex items-center gap-1.5">
                          <span className="text-slate-500">{item.prompt}</span>
                          <span className="text-slate-100 font-semibold">{item.command}</span>
                        </div>
                        {item.output && (
                          <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed text-[11.5px]">
                            {item.output}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Terminal Input Bar */}
                  <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 font-mono text-xs">
                    <span className="text-amber-400 font-bold shrink-0">{cliPrompt}</span>
                    <input
                      type="text"
                      value={cliInput}
                      onChange={(e) => setCliInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleExecuteCli();
                      }}
                      placeholder="Type Cisco command (e.g. show ip route, conf t, ping 10.1.10.2)..."
                      className="flex-1 bg-transparent text-slate-100 outline-none font-mono placeholder:text-slate-600 text-xs"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleExecuteCli()}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INTERACTIVE TOPOLOGY & PACKET TRACER */}
        {activeTab === "topology" && (
          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Network className="w-4 h-4 text-amber-400" />
                    Multi-Area OSPF & BGP Enterprise Spine-Leaf Topology
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Live visual state machine & packet flow simulator. Inject packets to inspect header transitions.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInjectPacket("icmp")}
                    disabled={!!packetState}
                  >
                    Inject ICMP Echo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInjectPacket("bgp")}
                    disabled={!!packetState}
                  >
                    Send BGP UPDATE
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInjectPacket("ospf")}
                    disabled={!!packetState}
                  >
                    OSPF Hello Multicast
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* SVG Visual Canvas */}
                <div className="w-full h-80 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 800 300">
                    {/* Connection Lines */}
                    <line x1="120" y1="150" x2="260" y2="150" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="260" y1="150" x2="400" y2="80" stroke="#3b82f6" strokeWidth="3" />
                    <line x1="260" y1="150" x2="400" y2="220" stroke="#3b82f6" strokeWidth="3" />
                    <line x1="400" y1="80" x2="540" y2="150" stroke="#10b981" strokeWidth="3" />
                    <line x1="400" y1="220" x2="540" y2="150" stroke="#10b981" strokeWidth="3" />
                    <line x1="540" y1="150" x2="680" y2="150" stroke="#f59e0b" strokeWidth="3" />

                    {/* Nodes */}
                    {/* PC1 Host */}
                    <g transform="translate(120, 150)">
                      <circle r="22" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                      <text textAnchor="middle" dy="4" fill="#f8fafc" fontSize="10" fontWeight="bold">PC1</text>
                      <text textAnchor="middle" dy="36" fill="#94a3b8" fontSize="9">10.1.10.50</text>
                    </g>

                    {/* SW1 Access Switch */}
                    <g transform="translate(260, 150)">
                      <rect x="-24" y="-18" width="48" height="36" rx="6" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                      <text textAnchor="middle" dy="4" fill="#38bdf8" fontSize="10" fontWeight="bold">SW1</text>
                      <text textAnchor="middle" dy="32" fill="#94a3b8" fontSize="9">VLAN 10</text>
                    </g>

                    {/* R1 Edge Router */}
                    <g transform="translate(400, 80)">
                      <circle r="24" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                      <text textAnchor="middle" dy="4" fill="#fbbf24" fontSize="11" fontWeight="bold">R1-EDGE</text>
                      <text textAnchor="middle" dy="38" fill="#94a3b8" fontSize="9">AS 65001</text>
                    </g>

                    {/* R2 Core Router */}
                    <g transform="translate(400, 220)">
                      <circle r="24" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                      <text textAnchor="middle" dy="4" fill="#fbbf24" fontSize="11" fontWeight="bold">R2-CORE</text>
                      <text textAnchor="middle" dy="38" fill="#94a3b8" fontSize="9">OSPF Area 0</text>
                    </g>

                    {/* R3 Service Provider Gateway */}
                    <g transform="translate(540, 150)">
                      <circle r="24" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
                      <text textAnchor="middle" dy="4" fill="#34d399" fontSize="11" fontWeight="bold">PE-GW</text>
                      <text textAnchor="middle" dy="38" fill="#94a3b8" fontSize="9">MPLS / LDP</text>
                    </g>

                    {/* Server Farm / AI Model */}
                    <g transform="translate(680, 150)">
                      <rect x="-26" y="-20" width="52" height="40" rx="8" fill="#1e293b" stroke="#a855f7" strokeWidth="2" />
                      <text textAnchor="middle" dy="4" fill="#c084fc" fontSize="10" fontWeight="bold">AI MLOps</text>
                      <text textAnchor="middle" dy="34" fill="#94a3b8" fontSize="9">172.16.1.100</text>
                    </g>

                    {/* Animated Packet Pulse */}
                    {packetState && (
                      <circle r="8" fill="#f59e0b" stroke="#ffffff" strokeWidth="2">
                        <animateMotion
                          path="M 120,150 L 260,150 L 400,80 L 540,150 L 680,150"
                          dur="2.2s"
                          repeatCount="1"
                        />
                      </circle>
                    )}
                  </svg>
                </div>

                {/* Packet Flight Log */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                    Live Telemetry Event Log
                  </h4>
                  <div className="space-y-1 font-mono text-xs text-slate-300 max-h-32 overflow-y-auto">
                    {packetLog.length === 0 ? (
                      <div className="text-slate-500 italic">No packets injected yet. Click an action button above.</div>
                    ) : (
                      packetLog.map((log, i) => <div key={i}>{log}</div>)
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 4: SUBNETTING & VLSM ENGINE */}
        {activeTab === "subnet" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Calculator Inputs & Output */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border-slate-800 bg-slate-900/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-amber-400" />
                      IPv4 CIDR & VLSM Bit Calculator
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Real-time bit manipulation, host ranges, broadcast calculation, and wildcard masks.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-300">IPv4 Address</label>
                        <input
                          type="text"
                          value={subnetIp}
                          onChange={(e) => setSubnetIp(e.target.value)}
                          className="w-full mt-1.5 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-amber-300 outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-300">
                          <span>Prefix Mask: /{subnetCidr}</span>
                          <span className="text-amber-400 font-mono">
                            {subnetCalculations?.subnetMask || ""}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="30"
                          value={subnetCidr}
                          onChange={(e) => setSubnetCidr(parseInt(e.target.value, 10))}
                          className="w-full mt-3 accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {subnetCalculations && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Network ID</span>
                          <p className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                            {subnetCalculations.networkAddress}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Broadcast ID</span>
                          <p className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                            {subnetCalculations.broadcastAddress}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Usable Hosts</span>
                          <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                            {subnetCalculations.usableHosts.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">First Usable</span>
                          <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                            {subnetCalculations.firstUsable}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Last Usable</span>
                          <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                            {subnetCalculations.lastUsable}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Wildcard Mask</span>
                          <p className="text-xs font-mono font-bold text-purple-400 mt-0.5">
                            {subnetCalculations.wildcardMask}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Binary Inspector */}
                    {subnetCalculations && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          Binary Bit Representation (Network vs Host Partition)
                        </span>
                        <div className="font-mono text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>IP Binary:</span>
                            <span className="text-amber-300">{subnetCalculations.binaryIp}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Mask Binary:</span>
                            <span className="text-emerald-300">{subnetCalculations.binaryMask}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Rapid-Fire Speed Drills */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border-slate-800 bg-slate-900/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Rapid-Fire CCNA Subnetting Drills
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Master exam-speed mental math with instant verification.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="text-xs text-slate-400">Target Question:</div>
                      <div className="text-sm font-mono font-bold text-amber-300">
                        What is the broadcast address for 172.16.50.99/26?
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={drillAnswer}
                          onChange={(e) => setDrillAnswer(e.target.value)}
                          placeholder="e.g. 172.16.50.127"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100 outline-none"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (drillAnswer.trim() === "172.16.50.127") {
                              setDrillFeedback("CORRECT! /26 block size is 64. Range is .64 - .127. Broadcast is .127.");
                            } else {
                              setDrillFeedback("INCORRECT. Block size = 256 - 192 = 64. 99 falls between 64 and 127. Broadcast = 172.16.50.127.");
                            }
                          }}
                        >
                          Check
                        </Button>
                      </div>

                      {drillFeedback && (
                        <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                          drillFeedback.startsWith("CORRECT")
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                            : "bg-red-500/10 text-red-300 border border-red-500/30"
                        }`}>
                          {drillFeedback}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <div className="font-bold text-slate-300">Quick Mental Math Rule:</div>
                      <p>
                        Always subtract the interesting octet from 256 to find your block size. Then find the multiple immediately following your host IP to determine the next subnet!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FLASHCARDS (SPACED REPETITION) */}
        {activeTab === "flashcards" && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Leitner Progress Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Box 1 (Daily Learn)</span>
                <p className="text-lg font-bold text-amber-400 mt-0.5">
                  {Object.values(boxState).filter((b) => b === 1).length} Cards
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Box 2 (Review)</span>
                <p className="text-lg font-bold text-blue-400 mt-0.5">
                  {Object.values(boxState).filter((b) => b === 2).length} Cards
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Box 3 (Mastered)</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  {Object.values(boxState).filter((b) => b === 3).length} Cards
                </p>
              </div>
            </div>

            {/* Flashcard Component */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full min-h-[320px] p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-2xl flex flex-col justify-between cursor-pointer transition-all hover:border-amber-500/40 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                  {activeFlashcard.domain}
                </Badge>
                <span className="text-xs text-slate-500">
                  Card {fcIndex + 1} of {FLASHCARDS.length} &bull; Click to Flip
                </span>
              </div>

              <div className="py-8 text-center space-y-4">
                {!isFlipped ? (
                  <h3 className="text-lg sm:text-xl font-bold text-slate-100 leading-relaxed">
                    {activeFlashcard.front}
                  </h3>
                ) : (
                  <div className="space-y-4 text-left">
                    <pre className="text-sm font-sans text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {activeFlashcard.back}
                    </pre>
                    {activeFlashcard.mnemonic && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-semibold">
                        Mnemonic: {activeFlashcard.mnemonic}
                      </div>
                    )}
                    <div className="text-xs text-emerald-400 font-medium">
                      Key Exam Rule: {activeFlashcard.keyRule}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-slate-500 italic">
                {isFlipped ? "Did you recall this correctly?" : "Click card or press Space to reveal answer"}
              </div>
            </div>

            {/* Leitner Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-red-500/30 text-red-300 hover:bg-red-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLeitnerAdvance(activeFlashcard.id, false);
                }}
              >
                <XCircle className="w-4 h-4 mr-2" /> Need Practice (Box 1)
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLeitnerAdvance(activeFlashcard.id, true);
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mastered (Advance Box)
              </Button>
            </div>
          </div>
        )}

        {/* TAB 6: AI EXAM COACH & LIVE VIDEO WALKTHROUGH */}
        {activeTab === "coach" && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Live 60FPS Video Walkthrough & Packet Animation Player */}
            <CertMasterVideoCoach />

            {/* Conversational Exam Proctor & RFC Terminal */}
            <Card className="border-slate-800 bg-slate-900/80 shadow-2xl flex flex-col h-[500px]">
              <CardHeader className="pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">
                        Intelligent AI Certification Coach & Proctor
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Ask deep questions about ITIL 5, Cisco IOS, BGP tie-breakers, or RFC standards.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono text-amber-400">
                    Track: {selectedTrack.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>

              {/* Chat Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {coachMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "coach" && (
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-1">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-4 rounded-xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-amber-600 text-white font-medium ml-12"
                          : "bg-slate-950 border border-slate-800 text-slate-200 shadow-md mr-12"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {coachLoading && (
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-mono animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" /> Proctor is synthesizing RFC and ITIL guidance...
                  </div>
                )}
              </div>

              {/* Preset Chips */}
              <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 flex flex-wrap gap-1.5">
                {[
                  "Explain BGP Path Selection Mnemonic",
                  "Compare ISO 42001 vs EU AI Act in ITIL 5",
                  "How does OSPF DR/BDR election work?",
                  "Walk through a /27 subnetting calculation"
                ].map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendCoach(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={coachQuery}
                  onChange={(e) => setCoachQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendCoach();
                  }}
                  placeholder="Ask a technical or certification question..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 outline-none focus:border-amber-500"
                />
                <Button size="sm" onClick={() => handleSendCoach()} disabled={coachLoading}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
