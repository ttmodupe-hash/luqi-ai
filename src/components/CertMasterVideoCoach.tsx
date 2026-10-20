import React, { useState, useEffect, useRef } from 'react';

export interface VideoScene {
  sceneNumber: number;
  title: string;
  durationSec: number;
  narrationScript: string;
  cliCommandOutput: string;
  visualState: {
    activePortState: 'BLOCKING' | 'LISTENING' | 'LEARNING' | 'FORWARDING';
    bpduFlowing: boolean;
    macTableLearning: boolean;
    userDataForwarding: boolean;
    macEntries: string[];
    highlightNote: string;
  };
}

export interface TechnicalWalkthroughPayload {
  directAnswerHeadline: string;
  deepEngineeringExplanation: string;
  ciscoIosVerification: string;
  scenes: VideoScene[];
}

// Pre-built High-Precision 4-Scene Video Walkthrough for IEEE 802.1D STP (Instant Zero-Latency Load)
export const DEFAULT_STP_VIDEO_WALKTHROUGH: TechnicalWalkthroughPayload = {
  directAnswerHeadline: 'Correct Answer: The LEARNING State (IEEE 802.1D Spanning Tree Protocol)',
  deepEngineeringExplanation:
    'In standard IEEE 802.1D STP, a switch port transitions through 4 active states to prevent Layer 2 broadcast storms: Blocking (20s Max Age) -> Listening (15s Forward Delay) -> Learning (15s Forward Delay) -> Forwarding. During the LEARNING state, the port processes incoming BPDUs, inspects source MAC addresses on incoming frames to populate the CAM (MAC Address) table, and STILL BLOCKS (drops) user data frames from being forwarded so loops cannot form while the topology converges.',
  ciscoIosVerification: `Switch# show spanning-tree interface GigabitEthernet0/1 detail
 Port 1 (GigabitEthernet0/1) of VLAN0001 is learning
   Port path cost 4, Port priority 128, Port Identifier 128.1.
   Designated root has priority 32769, address 001c.0e82.4a00
   Timers: message age 0, forward delay 11, hold 0
   BPDU: sent 14, received 89`,
  scenes: [
    {
      sceneNumber: 1,
      title: 'State 1: BLOCKING (20s Max Age Timer)',
      durationSec: 6,
      narrationScript:
        'Scene 1: Blocking State. When a redundant switch link comes up, IEEE 802.1D places the non-designated port into Blocking. It only listens to incoming BPDUs from the Root Bridge. Zero MAC learning and zero user frames are forwarded.',
      cliCommandOutput: 'Gi0/1  Altn BLK  4  128.1  P2p  (BPDUs RX Only | CAM: Empty | User Traffic: DROPPED)',
      visualState: {
        activePortState: 'BLOCKING',
        bpduFlowing: true,
        macTableLearning: false,
        userDataForwarding: false,
        macEntries: [],
        highlightNote: 'Discards user frames & does NOT learn MACs. Listens for BPDUs only.'
      }
    },
    {
      sceneNumber: 2,
      title: 'State 2: LISTENING (15s Forward Delay)',
      durationSec: 6,
      narrationScript:
        'Scene 2: Listening State. After selecting the Root Bridge, the port enters Listening for 15 seconds. It actively sends and receives BPDUs to elect Designated and Root ports, but still refuses to learn MAC addresses or forward user frames.',
      cliCommandOutput: 'Gi0/1  Desg LIS  4  128.1  P2p  (BPDUs TX/RX | CAM: Empty | User Traffic: DROPPED)',
      visualState: {
        activePortState: 'LISTENING',
        bpduFlowing: true,
        macTableLearning: false,
        userDataForwarding: false,
        macEntries: [],
        highlightNote: 'Participates in STP election (TX/RX BPDUs), still NO MAC learning & NO user forwarding.'
      }
    },
    {
      sceneNumber: 3,
      title: 'State 3: LEARNING (15s Forward Delay) — THE EXACT EXAM ANSWER',
      durationSec: 8,
      narrationScript:
        'Scene 3: Learning State! Eita Engineer, watch closely: this is the exact answer to your question. The port processes BPDUs AND reads source MAC addresses from frames to pre-populate the CAM table, reducing flooding later—while STILL blocking user data frames from being forwarded!',
      cliCommandOutput: 'Gi0/1  Desg LRN  4  128.1  P2p  (BPDUs TX/RX | CAM: Populating! | User Traffic: BLOCKED)',
      visualState: {
        activePortState: 'LEARNING',
        bpduFlowing: true,
        macTableLearning: true,
        userDataForwarding: false,
        macEntries: ['VLAN 1 | 0050.7966.6801 | Gi0/1 (Dynamic)', 'VLAN 1 | 0050.7966.6802 | Gi0/1 (Dynamic)'],
        highlightNote: '✅ EXAM TARGET: Processes BPDUs + Learns MAC Addresses + Does NOT Forward User Data Frames!'
      }
    },
    {
      sceneNumber: 4,
      title: 'State 4: FORWARDING (Converged Operational State)',
      durationSec: 6,
      narrationScript:
        'Scene 4: Forwarding State. Once the 15-second Learning timer expires, the port enters Forwarding. Now BPDUs, MAC address learning, and full bidirectional user data frame forwarding are all 100% active.',
      cliCommandOutput: 'Gi0/1  Desg FWD  4  128.1  P2p  (BPDUs TX/RX | CAM: Active | User Traffic: FORWARDING)',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: true,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: [
          'VLAN 1 | 0050.7966.6801 | Gi0/1 (Dynamic)',
          'VLAN 1 | 0050.7966.6802 | Gi0/1 (Dynamic)',
          'VLAN 1 | 0050.7966.6899 | Gi0/2 (Dynamic)'
        ],
        highlightNote: 'Full convergence reached: BPDUs + MAC Learning + User Data Frame Forwarding.'
      }
    }
  ]
};

// Pre-built High-Precision Walkthrough for BGP Path Selection Mnemonic
const BGP_VIDEO_WALKTHROUGH: TechnicalWalkthroughPayload = {
  directAnswerHeadline: 'BGP Path Selection: "We Love Oranges As Oranges Mean Pure Refreshment"',
  deepEngineeringExplanation:
    'In Border Gateway Protocol (BGP), Cisco routers evaluate path attributes sequentially. Weight (highest wins, 0-65535, Cisco proprietary) is checked first, followed by Local Preference (highest wins, AS-wide), Locally Originated (network/aggregate > redistribute), AS-Path (shortest), Origin (IGP < EGP < Incomplete), MED (lowest), eBGP over iBGP, lowest IGP metric to next-hop, and lowest BGP Router ID.',
  ciscoIosVerification: `Router# show ip bgp 10.100.0.0/16
BGP routing table entry for 10.100.0.0/16, version 42
Paths: (2 available, best #2, table default)
  Advertised to update-groups: 1
  65001 65002
    192.168.12.1 from 192.168.12.1 (10.1.1.1)
      Origin IGP, metric 10, localpref 200, weight 0, valid, internal
  65003
    192.168.23.2 from 192.168.23.2 (10.2.2.2)
      Origin IGP, metric 50, localpref 100, weight 32768, valid, internal, best`,
  scenes: [
    {
      sceneNumber: 1,
      title: 'Step 1: WEIGHT (Cisco Local Attribute)',
      durationSec: 6,
      narrationScript:
        'Step 1: Weight attribute check. Cisco routers always evaluate Weight first. Higher weight wins immediately. Since path B has weight 32768 versus path A with 0, path B wins without even looking at Local Preference.',
      cliCommandOutput: 'Path B: Weight 32768 (WINNER) vs Path A: Weight 0',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: false,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['Prefix: 10.100.0.0/16 -> Next-Hop 192.168.23.2 (Weight 32768)'],
        highlightNote: 'Weight is evaluated FIRST before Local Preference on all Cisco IOS platforms.'
      }
    },
    {
      sceneNumber: 2,
      title: 'Step 2: LOCAL_PREF (AS-Wide Metric)',
      durationSec: 6,
      narrationScript:
        'Step 2: Local Preference. Disseminated throughout the autonomous system via iBGP. Default is 100, higher wins. It sets outbound routing policy for the entire company network.',
      cliCommandOutput: 'BGP Path Selection: Local_Pref evaluated if Weights are equal.',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: false,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['Local_Pref: 200 beats default 100 across AS boundaries'],
        highlightNote: 'Local Preference is propagated within the AS; never sent across eBGP peers.'
      }
    },
    {
      sceneNumber: 3,
      title: 'Step 3: AS_PATH & ORIGIN CODE',
      durationSec: 6,
      narrationScript:
        'Step 3: Shortest AS-Path length wins. If tied, origin code is checked: IGP is preferred over EGP, which is preferred over Incomplete.',
      cliCommandOutput: 'AS-Path: 65003 (len 1) preferred over 65001 65002 (len 2)',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: false,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['AS_PATH length: Shorter path wins if weight & local_pref tie'],
        highlightNote: 'AS-Path prepending can artificially lengthen a path to influence inbound traffic.'
      }
    },
    {
      sceneNumber: 4,
      title: 'Step 4: MED, eBGP > iBGP & TIE-BREAKERS',
      durationSec: 6,
      narrationScript:
        'Step 4: MED (lower wins, non-transitive metric), then eBGP paths over iBGP, lowest IGP cost to next-hop, and finally lowest BGP Router ID.',
      cliCommandOutput: 'Final Tie-Breakers: Lowest MED -> eBGP over iBGP -> Lowest Router-ID',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: false,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['Converged BGP Routing Table: Best path installed in FIB/CEF'],
        highlightNote: 'Complete mnemonic: We Love Oranges As Oranges Mean Pure Refreshment.'
      }
    }
  ]
};

// Pre-built High-Precision Walkthrough for ITIL 5 & ISO 42001
const ITIL_VIDEO_WALKTHROUGH: TechnicalWalkthroughPayload = {
  directAnswerHeadline: 'ITIL 5 AI Governance vs ISO 42001 & EU AI Act',
  deepEngineeringExplanation:
    'ITIL 5 extends service value chains to autonomous generative pipelines. Under ISO/IEC 42001 (Artificial Intelligence Management System) and EU AI Act classification: Unacceptable risk systems are banned; High risk pipelines (critical infrastructure, credit, telecommunications) require mandatory asynchronous human authorization gates (70% autonomous / 30% human-gated boundary); Limited risk requires explicit user transparency.',
  ciscoIosVerification: `GovAudit# show ai-governance compliance detail
 Pipeline: MultiModel-KHORO-Core-v29
 Standard: ISO/IEC 42001:2023 & ITIL v5 SVS
 Human-in-the-Loop Threshold: Enforced on all mutations >= R50.00 ZAR or Route Modifications
 Telemetry Logging: WORM-compliant tamper-proof hash ledger active
 Status: 100% Compliant across High-Risk classification boundaries`,
  scenes: [
    {
      sceneNumber: 1,
      title: 'Phase 1: SERVICE VALUE CHAIN & RISK AUDIT',
      durationSec: 6,
      narrationScript:
        'Phase 1: ITIL 5 Service Value Chain. Before deploying generative models, audit data provenance, bias risks, and classification under the EU AI Act.',
      cliCommandOutput: 'ITIL 5 SVS: Plan -> Improve -> Engage -> Design & Transition',
      visualState: {
        activePortState: 'LISTENING',
        bpduFlowing: true,
        macTableLearning: false,
        userDataForwarding: false,
        macEntries: ['Risk Tier: High Risk Infrastructure Pipeline'],
        highlightNote: 'Mandatory ISO 42001 impact assessment prior to autonomous release.'
      }
    },
    {
      sceneNumber: 2,
      title: 'Phase 2: 70/30 HUMAN-IN-THE-LOOP (HITL) GATE',
      durationSec: 8,
      narrationScript:
        'Phase 2: The 70/30 Sovereign Boundary. AI execution handles 70% of telemetry and automated preparation, but halts at the 70% threshold. Critical mutations require out-of-band human cryptographic PIN authorization.',
      cliCommandOutput: 'STATUS: AWAITING_HUMAN_30_PERCENT_PIN (Execution Halted at 70% Boundary)',
      visualState: {
        activePortState: 'LEARNING',
        bpduFlowing: true,
        macTableLearning: true,
        userDataForwarding: false,
        macEntries: ['Human Auth Gateway: PayFast / MTN MoMo Out-of-Band Handset'],
        highlightNote: 'AI cannot execute irreversible operational mutations without human sign-off.'
      }
    },
    {
      sceneNumber: 3,
      title: 'Phase 3: CONTINUOUS WORM TELEMETRY LOGGING',
      durationSec: 6,
      narrationScript:
        'Phase 3: Flight Recorder and WORM logging. Write-Once-Read-Many tamper-proof audit trails record prompt tokens, model latency, and cost calculations for regulatory compliance.',
      cliCommandOutput: 'Ledger: SHA-256 State Anchored | SARS Tax Compliance Active',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: true,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['Audit Trail: Hash-chained operational telemetry stream'],
        highlightNote: 'Meets ISO/IEC 42001 transparency & traceability mandates.'
      }
    },
    {
      sceneNumber: 4,
      title: 'Phase 4: PRODUCTION VERIFICATION & DRIFT DETECTION',
      durationSec: 6,
      narrationScript:
        'Phase 4: Continual Service Improvement. Monitor real-time hallucination rates, API degradation, and circuit breakers for automated failover to local sovereign engines.',
      cliCommandOutput: 'System Health: 100% Operational | FinOps Margin Guard Active',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: true,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['ITIL 5 Governance: Full lifecycle compliance achieved'],
        highlightNote: 'Autonomous operations with human accountability safeguards.'
      }
    }
  ]
};

// Pre-built High-Precision Walkthrough for OSPF DR/BDR
const OSPF_VIDEO_WALKTHROUGH: TechnicalWalkthroughPayload = {
  directAnswerHeadline: 'OSPF DR/BDR Election on Broadcast Multi-Access Segments',
  deepEngineeringExplanation:
    'On multi-access networks (Ethernet), OSPF elects a Designated Router (DR) and Backup Designated Router (BDR) to avoid an n*(n-1)/2 adjacency explosion. Routers only form FULL adjacencies with the DR and BDR (using multicast 224.0.0.6 to DR/BDR, and 224.0.0.5 to all OSPF routers). The election is non-preemptive and selects highest interface priority (default 1; priority 0 is ineligible), tie-broken by highest Router ID.',
  ciscoIosVerification: `Router# show ip ospf neighbor
Neighbor ID     Pri   State           Dead Time   Address         Interface
10.255.255.1      1   FULL/DR         00:00:35    192.168.1.1     GigabitEthernet0/0
10.255.255.2      1   FULL/BDR        00:00:38    192.168.1.2     GigabitEthernet0/0
10.255.255.3      1   2WAY/DROTHER    00:00:31    192.168.1.3     GigabitEthernet0/0`,
  scenes: [
    {
      sceneNumber: 1,
      title: 'Step 1: OSPF HELLO & 2-WAY STATE',
      durationSec: 6,
      narrationScript:
        'Step 1: OSPF routers send Hello packets to 224.0.0.5 every 10 seconds. Once routers see their own Router ID in neighbor hello packets, they transition to 2-WAY state and prepare for DR election.',
      cliCommandOutput: 'Gi0/0  Hello Sent -> Multicast 224.0.0.5 | Dead Timer: 40s',
      visualState: {
        activePortState: 'LISTENING',
        bpduFlowing: true,
        macTableLearning: false,
        userDataForwarding: false,
        macEntries: ['OSPF Hello: Priority 1 | DeadTimer 40 | HelloTimer 10'],
        highlightNote: 'Routers verify subnet mask, hello/dead timers, and area ID match.'
      }
    },
    {
      sceneNumber: 2,
      title: 'Step 2: PRIORITY & ROUTER-ID EVALUATION',
      durationSec: 6,
      narrationScript:
        'Step 2: Priority evaluation. Highest interface priority wins. A priority of 0 means the router can never become DR or BDR. If priorities tie, highest 32-bit Router ID breaks the tie.',
      cliCommandOutput: 'Election: Pri 1 vs Pri 1 -> Tie-breaker: Highest Router-ID (10.255.255.1)',
      visualState: {
        activePortState: 'LEARNING',
        bpduFlowing: true,
        macTableLearning: true,
        userDataForwarding: false,
        macEntries: ['DR Elected: Router-ID 10.255.255.1 (Highest ID)'],
        highlightNote: 'Non-preemptive: An existing DR remains DR even if a higher ID router boots later.'
      }
    },
    {
      sceneNumber: 3,
      title: 'Step 3: MULTICAST COMMUNICATION (224.0.0.6 vs 224.0.0.5)',
      durationSec: 7,
      narrationScript:
        'Step 3: Multicast traffic division. DROTHER routers send Link State Updates to 224.0.0.6 (AllDRouters). The DR and BDR listen on 224.0.0.6 and flood updates to all routers on 224.0.0.5.',
      cliCommandOutput: 'LSU: DROTHER -> 224.0.0.6 (DR/BDR) | DR Floods -> 224.0.0.5 (All OSPF)',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: true,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['Multicast 224.0.0.6: DR/BDR Only | 224.0.0.5: All OSPF Routers'],
        highlightNote: 'Reduces link-state exchange overhead from n*(n-1)/2 to 2*(n-2).'
      }
    },
    {
      sceneNumber: 4,
      title: 'Step 4: FULL ADJACENCY CONVERGENCE',
      durationSec: 6,
      narrationScript:
        'Step 4: Full convergence. DROTHER routers remain in 2WAY state with each other, and reach FULL adjacency only with the DR and BDR.',
      cliCommandOutput: 'State: FULL/DR & FULL/BDR | DROTHER-DROTHER: 2WAY',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: true,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['OSPF Database Synchronized: Type-1 & Type-2 LSAs Flooded'],
        highlightNote: 'Identical Router IDs on the same link will fail to form adjacency.'
      }
    }
  ]
};

// Pre-built High-Precision Walkthrough for /27 VLSM Subnetting
const SUBNETTING_VIDEO_WALKTHROUGH: TechnicalWalkthroughPayload = {
  directAnswerHeadline: 'VLSM /27 Subnetting Step-by-Step Magic Number Calculation',
  deepEngineeringExplanation:
    'A /27 subnet mask borrows 3 bits from the 4th octet (128 + 64 + 32 = 224). Subnet mask: 255.255.255.224. Magic Number formula: Block Size = 256 - 224 = 32. Subnets increment in blocks of 32 (.0, .32, .64, .96, .128, .160, .192, .224). Usable host formula: 2^(32-27) - 2 = 2^5 - 2 = 30 usable IP addresses per subnet. Wildcard mask: 255.255.255.255 - 255.255.255.224 = 0.0.0.31.',
  ciscoIosVerification: `Router(config)# interface GigabitEthernet0/0/1
Router(config-if)# ip address 192.168.10.33 255.255.255.224
Router(config-if)# no shutdown
Router# show ip interface GigabitEthernet0/0/1
  Internet address is 192.168.10.33/27
  Broadcast address is 192.168.10.63
  Address determined by setup command
  MTU is 1500 bytes`,
  scenes: [
    {
      sceneNumber: 1,
      title: 'Step 1: BORROWED BITS & SUBNET MASK',
      durationSec: 6,
      narrationScript:
        'Step 1: Prefix /27 means 27 network bits and 5 host bits. 27 - 24 = 3 borrowed bits in the fourth octet: 128 + 64 + 32 = 224. Subnet mask is 255.255.255.224.',
      cliCommandOutput: 'Binary 4th Octet: 1 1 1 0 0 0 0 0 = 224 (Mask: 255.255.255.224)',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: false,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['Prefix: /27 | Network Bits: 27 | Host Bits: 5'],
        highlightNote: 'Mask: 255.255.255.224 | Wildcard: 0.0.0.31'
      }
    },
    {
      sceneNumber: 2,
      title: 'Step 2: MAGIC NUMBER (BLOCK SIZE) CALCULATION',
      durationSec: 6,
      narrationScript:
        'Step 2: Find the Magic Number! Subtract the interesting octet value from 256: 256 minus 224 equals 32. This means subnets increment by 32 in the fourth octet.',
      cliCommandOutput: 'Magic Number: 256 - 224 = 32 (Subnet Block Increments)',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: false,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['Subnets: .0, .32, .64, .96, .128, .160, .192, .224'],
        highlightNote: 'Block size is always determined by the lowest-order network bit (32).'
      }
    },
    {
      sceneNumber: 3,
      title: 'Step 3: USABLE HOST IP RANGE',
      durationSec: 7,
      narrationScript:
        'Step 3: Host range formula. 2 to the power of 5 minus 2 equals 30 usable hosts. For the .32 subnet: Network is .32, first usable is .33, last usable is .62, and broadcast is .63.',
      cliCommandOutput: 'Subnet .32/27: Usable IPs .33 through .62 | Broadcast .63',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: false,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['Usable Range: 192.168.10.33 - 192.168.10.62 (30 Hosts)'],
        highlightNote: '2 host addresses are reserved: Network ID (.32) and Broadcast (.63).'
      }
    },
    {
      sceneNumber: 4,
      title: 'Step 4: CISCO IOS INTERFACE CONFIGURATION',
      durationSec: 6,
      narrationScript:
        'Step 4: Cisco IOS configuration. Assign the first host IP to the GigabitEthernet interface and bring up the link with no shutdown.',
      cliCommandOutput: 'interface Gi0/0/1 -> ip address 192.168.10.33 255.255.255.224 -> no shut',
      visualState: {
        activePortState: 'FORWARDING',
        bpduFlowing: false,
        macTableLearning: true,
        userDataForwarding: true,
        macEntries: ['Gi0/0/1: 192.168.10.33/27 is UP, line protocol is UP'],
        highlightNote: 'Quick check: Always verify with show ip interface brief.'
      }
    }
  ]
};

export const CertMasterVideoCoach: React.FC = () => {
  const [questionInput, setQuestionInput] = useState<string>(
    'In standard IEEE 802.1D Spanning Tree Protocol, which port state is responsible for processing BPDUs, learning MAC addresses from frames, but NOT forwarding user data frames?'
  );
  const [walkthrough, setWalkthrough] = useState<TechnicalWalkthroughPayload>(DEFAULT_STP_VIDEO_WALKTHROUGH);
  const [currentSceneIdx, setCurrentSceneIdx] = useState<number>(2); // Default to Scene 3 (LEARNING)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentScene = walkthrough.scenes[currentSceneIdx] || walkthrough.scenes[0];

  // Speak scene narration using South African English / local voice synthesis
  const speakSceneNarration = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const saVoice = voices.find(v => v.lang.includes('en-ZA') || v.lang.includes('af-ZA') || v.lang.includes('zu-ZA'));
    if (saVoice) utter.voice = saVoice;
    utter.rate = 1.02;
    window.speechSynthesis.speak(utter);
  };

  // Auto-advance scenes when playing video walkthrough
  useEffect(() => {
    if (!isPlaying) return;
    speakSceneNarration(currentScene.narrationScript);

    const timer = setTimeout(() => {
      if (currentSceneIdx < walkthrough.scenes.length - 1) {
        setCurrentSceneIdx(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, currentScene.durationSec * 1000);

    return () => clearTimeout(timer);
  }, [isPlaying, currentSceneIdx, walkthrough]);

  // Real-Time 60FPS HTML5 Canvas Packet & Port-State Video Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameTick = 0;
    let animId: number;

    const renderLoop = () => {
      frameTick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background Dark Engineering Grid
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Root Bridge (Left) & Access Switch (Right)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillRect(40, 80, 140, 75);
      ctx.strokeRect(40, 80, 140, 75);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('SW1 (Root Bridge)', 52, 108);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px monospace';
      ctx.fillText('Prio: 32769 | Gi0/1', 52, 128);

      // Access Switch (Right)
      const stateColor =
        currentScene.visualState.activePortState === 'LEARNING'
          ? '#f59e0b'
          : currentScene.visualState.activePortState === 'FORWARDING'
          ? '#10b981'
          : '#f43f5e';

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = stateColor;
      ctx.lineWidth = 3;
      ctx.fillRect(460, 80, 165, 75);
      ctx.strokeRect(460, 80, 165, 75);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('SW2 (Target Port)', 475, 108);
      ctx.fillStyle = stateColor;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`STATE: ${currentScene.visualState.activePortState}`, 475, 130);

      // Trunk Link Line
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(180, 118);
      ctx.lineTo(460, 118);
      ctx.stroke();

      // Animated BPDU Packets (Cyan)
      if (currentScene.visualState.bpduFlowing) {
        const bpduX = 185 + ((frameTick * 3) % 265);
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(bpduX, 104, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#67e8f9';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('BPDU (OK)', bpduX - 22, 90);
      }

      // Animated User Data Frame & MAC Inspection
      const userFrameX = 185 + ((frameTick * 2.2) % 265);
      if (currentScene.visualState.userDataForwarding) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(userFrameX, 128, 22, 12);
        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('DATA FRAME -> FWD', userFrameX - 20, 154);
      } else {
        // Travels to port, gets MAC inspected if LEARNING, then dropped at boundary
        const clampedX = Math.min(userFrameX, 435);
        ctx.fillStyle = currentScene.visualState.macTableLearning ? '#f59e0b' : '#f43f5e';
        ctx.fillRect(clampedX, 128, 22, 12);
        ctx.font = 'bold 9px monospace';
        ctx.fillText(
          currentScene.visualState.macTableLearning
            ? 'SRC MAC LEARNED -> FRAME DROPPED 🛑'
            : 'USER DATA BLOCKED 🛑',
          clampedX - 45,
          154
        );
      }

      // Draw Live CAM / MAC Address Table Box at Bottom
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = currentScene.visualState.macTableLearning ? '#10b981' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.fillRect(40, 175, 585, 70);
      ctx.strokeRect(40, 175, 585, 70);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        `CAM (MAC ADDRESS) TABLE STATUS: ${
          currentScene.visualState.macTableLearning ? '🟢 ACTIVELY LEARNING SOURCE MACs' : '🔴 NOT LEARNING'
        }`,
        55,
        193
      );

      if (currentScene.visualState.macEntries.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText('No MAC addresses learned in this state.', 55, 215);
      } else {
        currentScene.visualState.macEntries.forEach((entry, idx) => {
          ctx.fillStyle = '#34d399';
          ctx.font = '10px monospace';
          ctx.fillText(entry, 55, 212 + idx * 15);
        });
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [currentScene]);

  // Dynamically generate a new 4-scene Video Walkthrough & Deep Answer for ANY Cisco/ITIL question
  const handleAskAndGenerateVideo = async (customQuery?: string) => {
    const query = (customQuery ?? questionInput).trim();
    if (!query || isGenerating) return;
    setQuestionInput(query);
    setIsGenerating(true);
    setIsPlaying(false);

    // Instant match for curated high-yield questions
    const qLower = query.toLowerCase();
    if (
      qLower.includes('spanning') ||
      qLower.includes('stp') ||
      qLower.includes('802.1d') ||
      qLower.includes('which port state')
    ) {
      setWalkthrough(DEFAULT_STP_VIDEO_WALKTHROUGH);
      setCurrentSceneIdx(2);
      setIsGenerating(false);
      setIsPlaying(true);
      return;
    }

    if (qLower.includes('bgp') || qLower.includes('mnemonic') || qLower.includes('path selection')) {
      setWalkthrough(BGP_VIDEO_WALKTHROUGH);
      setCurrentSceneIdx(0);
      setIsGenerating(false);
      setIsPlaying(true);
      return;
    }

    if (qLower.includes('iso 42001') || qLower.includes('itil') || qLower.includes('eu ai act')) {
      setWalkthrough(ITIL_VIDEO_WALKTHROUGH);
      setCurrentSceneIdx(0);
      setIsGenerating(false);
      setIsPlaying(true);
      return;
    }

    if (qLower.includes('ospf') || qLower.includes('dr/bdr') || qLower.includes('broadcast')) {
      setWalkthrough(OSPF_VIDEO_WALKTHROUGH);
      setCurrentSceneIdx(0);
      setIsGenerating(false);
      setIsPlaying(true);
      return;
    }

    if (qLower.includes('subnetting') || qLower.includes('/27') || qLower.includes('vlsm')) {
      setWalkthrough(SUBNETTING_VIDEO_WALKTHROUGH);
      setCurrentSceneIdx(0);
      setIsGenerating(false);
      setIsPlaying(true);
      return;
    }

    // Dynamic AI Generator via Server-Side Gemini Proxy
    try {
      const prompt = `
        You are Luqi-AI Senior Cisco CCNA/CCNP/CCIP & ITIL v5 Proctor.
        The engineer asked: "${query}"
        Generate a 100% factually accurate, RFC/IEEE-verified explanation AND a 4-scene interactive video walkthrough JSON object matching this exact schema:
        {
          "directAnswerHeadline": "Exact direct answer to the question",
          "deepEngineeringExplanation": "Detailed, zero-fluff technical breakdown",
          "ciscoIosVerification": "Realistic Cisco IOS CLI verification output (e.g., show spanning-tree, show ip bgp, show ip ospf interface)",
          "scenes": [
            {
              "sceneNumber": 1,
              "title": "Scene title",
              "durationSec": 6,
              "narrationScript": "Spoken audio script explaining this step clearly",
              "cliCommandOutput": "Single-line CLI state summary",
              "visualState": {
                "activePortState": "BLOCKING" | "LISTENING" | "LEARNING" | "FORWARDING",
                "bpduFlowing": true,
                "macTableLearning": false,
                "userDataForwarding": false,
                "macEntries": ["VLAN 1 | 0050.7966.6801 | Gi0/1"],
                "highlightNote": "Key takeaway for this scene"
              }
            }
          ]
        }
        Return ONLY valid JSON.
      `;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'gemini-3.8-flash',
          systemInstruction: 'You are an elite Cisco and ITIL exam proctor. Output strictly valid JSON.',
        }),
      });

      const json = await res.json();
      if (json.status === 'success' && json.data?.text) {
        let raw = json.data.text.trim();
        if (raw.startsWith('```json')) raw = raw.slice(7);
        if (raw.startsWith('```')) raw = raw.slice(3);
        if (raw.endsWith('```')) raw = raw.slice(0, -3);
        const parsed: TechnicalWalkthroughPayload = JSON.parse(raw.trim());

        if (parsed.scenes && parsed.scenes.length > 0) {
          setWalkthrough(parsed);
          setCurrentSceneIdx(0);
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.warn('[CertMasterVideoCoach] Dynamic generator fallback:', err);
      // Keep high-precision STP walkthrough as trusted baseline
      setWalkthrough(DEFAULT_STP_VIDEO_WALKTHROUGH);
      setCurrentSceneIdx(2);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl text-slate-100 max-w-5xl mx-auto space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
            🎬 CertMaster Live Video Walkthrough & RFC Proctor
          </span>
          <h3 className="text-lg font-extrabold text-white mt-2">{walkthrough.directAnswerHeadline}</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsPlaying(!isPlaying);
              if (!isPlaying) speakSceneNarration(currentScene.narrationScript);
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs transition"
          >
            {isPlaying ? '⏸ Pause Video Walkthrough' : '▶ Play Full Video Walkthrough'}
          </button>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-mono border ${
              voiceEnabled ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            {voiceEnabled ? '🔊 Voice Proctor: ON' : '🔈 Voice Proctor: Muted'}
          </button>
        </div>
      </div>

      {/* Interactive Animated Video Canvas + Scene Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <canvas
            ref={canvasRef}
            width={660}
            height={260}
            className="w-full rounded-xl border border-slate-800 bg-slate-950"
          />

          {/* Video Caption & Narration Subtitle Box */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <p className="text-xs font-bold text-amber-400">{currentScene.title}</p>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{currentScene.narrationScript}</p>
            <p className="text-[11px] font-mono text-emerald-400 mt-2">{currentScene.visualState.highlightNote}</p>
          </div>
        </div>

        {/* 4-Scene Video Timeline & State Comparison Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Video Scene Timeline (Click Any Step)
            </h4>
            <div className="space-y-2">
              {walkthrough.scenes.map((scene, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentSceneIdx(idx);
                    speakSceneNarration(scene.narrationScript);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition ${
                    currentSceneIdx === idx
                      ? 'bg-amber-500/15 border-amber-500/50 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{scene.title}</span>
                    <span className="text-[10px] font-mono">{scene.durationSec}s</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* IEEE 802.1D Truth Table */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono space-y-1">
            <p className="text-slate-400 font-bold mb-1">IEEE 802.1D Port State Matrix:</p>
            <p className="text-rose-400">Blocking  : BPDU=RX | MAC=No  | Data=No</p>
            <p className="text-rose-300">Listening : BPDU=Yes| MAC=No  | Data=No</p>
            <p className="text-amber-400 font-bold">Learning  : BPDU=Yes| MAC=YES | Data=NO 👈</p>
            <p className="text-emerald-400">Forwarding: BPDU=Yes| MAC=Yes | Data=Yes</p>
          </div>
        </div>
      </div>

      {/* Deep Engineering Breakdown + Cisco IOS CLI Output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl text-xs space-y-2">
          <h4 className="font-bold text-cyan-400 uppercase tracking-wider">🧠 Deep RFC / IEEE Engineering Breakdown</h4>
          <p className="text-slate-200 leading-relaxed">{walkthrough.deepEngineeringExplanation}</p>
        </div>
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono space-y-2">
          <h4 className="font-bold text-emerald-400 uppercase tracking-wider">💻 Cisco IOS CLI Verification</h4>
          <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">{walkthrough.ciscoIosVerification}</pre>
        </div>
      </div>

      {/* Ask Any Question & Generate Custom Video Walkthrough */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex flex-wrap gap-2">
          {[
            'In standard IEEE 802.1D Spanning Tree Protocol, which port state learns MACs without forwarding frames?',
            'Explain BGP Path Selection Mnemonic (Weight, Local_Pref, Originate, AS_Path, Origin, MED)',
            'Compare ISO 42001 vs EU AI Act in ITIL 5 Governance',
            'How does OSPF DR/BDR election work on Broadcast Multi-Access segments?',
            'Walk through a /27 VLSM subnetting calculation step-by-step'
          ].map((preset, i) => (
            <button
              key={i}
              onClick={() => handleAskAndGenerateVideo(preset)}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl transition"
            >
              🎬 {preset}
            </button>
          ))}
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            handleAskAndGenerateVideo();
          }}
          className="flex gap-2 bg-slate-900 border border-slate-700 rounded-2xl p-2"
        >
          <input
            type="text"
            value={questionInput}
            onChange={e => setQuestionInput(e.target.value)}
            placeholder="Ask any CCNA, CCNP, CCIP, or ITIL 5 question to generate a live video walkthrough..."
            className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isGenerating}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-5 py-2 rounded-xl text-xs transition disabled:opacity-50"
          >
            {isGenerating ? 'Compiling Video...' : '🎬 Generate Video Walkthrough'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CertMasterVideoCoach;
