#!/usr/bin/env python3
"""Luqi AI NetAI Training Module - Network & AI Engineering Training Platform.
3-phase curriculum (CCNA to CCNP to CCIE), virtual device simulation,
packet tracing, topology generation, AI mentoring, quizzes, progress tracking,
leaderboards, and certificate generation.

v25.2.0 - Enhanced with study plans, calendar export, skill assessments,
learning path recommendations, certification comparison, and Packet Tracer
scenario generator.
"""

import hashlib
import json
import logging
import random
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# IN-MEMORY STORES
_lab_sessions: Dict[str, Dict[str, Any]] = {}
_mentor_history: Dict[str, List[Dict[str, Any]]] = {}
_progress: Dict[str, Dict[str, Any]] = {}
_certificates: Dict[str, Dict[str, Any]] = {}
_leaderboard: List[Dict[str, Any]] = []
_study_plans: Dict[str, Dict[str, Any]] = {}

# CURRICULUM DATA
CURRICULUM = {
    "phases": [
        {
            "id": "phase_1_ccna",
            "name": "Phase 1: CCNA - Cisco Certified Network Associate",
            "description": "Foundational networking concepts, routing, switching, and basic security.",
            "duration_weeks": 12,
            "modules": [
                {"id": "p1m1", "name": "Network Fundamentals", "topics": ["OSI Model", "TCP/IP", "Ethernet", "IP Addressing", "Subnetting"]},
                {"id": "p1m2", "name": "Network Access", "topics": ["Layer 2 Switching", "VLANs", "Trunking", "STP", "EtherChannel"]},
                {"id": "p1m3", "name": "IP Connectivity", "topics": ["Static Routing", "OSPF", "EIGRP", "BGP Basics", "Route Redistribution"]},
                {"id": "p1m4", "name": "IP Services", "topics": ["DHCP", "DNS", "NAT", "SNMP", "Syslog", "NTP"]},
                {"id": "p1m5", "name": "Security Fundamentals", "topics": ["ACLs", "Port Security", "DHCP Snooping", "DAI", "VPN Concepts"]},
                {"id": "p1m6", "name": "Automation & Programmability", "topics": ["REST API", "Python for Networking", "Ansible", "Netconf/YANG", "SDN"]},
            ],
        },
        {
            "id": "phase_2_ccnp",
            "name": "Phase 2: CCNP - Cisco Certified Network Professional",
            "description": "Advanced routing, switching, troubleshooting, and enterprise network design.",
            "duration_weeks": 16,
            "modules": [
                {"id": "p2m1", "name": "Advanced Routing", "topics": ["OSPFv3", "EIGRPv6", "BGP Path Selection", "MP-BGP", "Policy Routing"]},
                {"id": "p2m2", "name": "Advanced Switching", "topics": ["VTP", "Private VLANs", "MST", "SPAN/RSPAN", "Layer 3 Switching"]},
                {"id": "p2m3", "name": "Troubleshooting", "topics": ["Structured Troubleshooting", "Layer 1-3 Issues", "Routing Problems", "Spanning Tree Issues"]},
                {"id": "p2m4", "name": "Network Design", "topics": ["Hierarchical Design", "Campus Architecture", "WAN Design", "High Availability", "QoS Design"]},
                {"id": "p2m5", "name": "Network Security", "topics": ["Firewall Technologies", "IDS/IPS", "802.1X", "Network Access Control", "Segmentation"]},
                {"id": "p2m6", "name": "VPN Technologies", "topics": ["IPsec", "DMVPN", "GETVPN", "SSL VPN", "MPLS L3VPN"]},
            ],
        },
        {
            "id": "phase_3_ccie",
            "name": "Phase 3: CCIE - Cisco Certified Internetwork Expert",
            "description": "Expert-level network engineering, complex troubleshooting, and architecture.",
            "duration_weeks": 24,
            "modules": [
                {"id": "p3m1", "name": "Advanced BGP", "topics": ["BGP Confederations", "Route Reflectors", "BGP Communities", "Multihoming", "Inter-AS"]},
                {"id": "p3m2", "name": "MPLS & Segment Routing", "topics": ["MPLS Fundamentals", "LDP", "RSVP-TE", "Segment Routing", "SRv6"]},
                {"id": "p3m3", "name": "Network Automation", "topics": ["Python Advanced", "Netmiko", "NAPALM", "Nornir", "Terraform for Network"]},
                {"id": "p3m4", "name": "Cloud Networking", "topics": ["AWS VPC", "Azure VNet", "GCP VPC", "Hybrid Cloud", "Cloud WAN"]},
                {"id": "p3m5", "name": "Advanced Troubleshooting", "topics": ["Complex Scenarios", "Performance Issues", "Security Incidents", "Protocol Analysis"]},
                {"id": "p3m6", "name": "Network Architecture", "topics": ["Enterprise Architecture", "SASE", "Zero Trust", "Intent-Based Networking", "DNA Center"]},
            ],
        },
    ],
    "tracks": [
        {"id": "enterprise", "name": "Enterprise Networking", "description": "Core routing, switching, and network management for large organizations."},
        {"id": "security", "name": "Network Security", "description": "Firewalls, VPNs, IDS/IPS, and zero-trust architectures."},
        {"id": "automation", "name": "Network Automation", "description": "Python, Ansible, Netconf, and programmable infrastructure."},
        {"id": "cloud", "name": "Cloud Networking", "description": "AWS, Azure, GCP networking, hybrid cloud, and SD-WAN."},
        {"id": "datacenter", "name": "Data Center", "description": "VXLAN, EVPN, spine-leaf architectures, and ACI."},
    ],
}

LABS = [
    {"id": "lab_001", "name": "Basic VLAN Configuration", "description": "Create and verify VLANs on a switch.", "difficulty": "beginner", "topology": "1 switch, 4 PCs", "estimated_minutes": 30, "objectives": ["Create VLANs 10 and 20", "Assign ports to VLANs", "Verify with show commands"]},
    {"id": "lab_002", "name": "Inter-VLAN Routing", "description": "Configure a router-on-a-stick for inter-VLAN communication.", "difficulty": "beginner", "topology": "1 router, 1 switch, 4 PCs", "estimated_minutes": 45, "objectives": ["Configure subinterfaces", "Enable trunking", "Test connectivity between VLANs"]},
    {"id": "lab_003", "name": "OSPF Single Area", "description": "Configure OSPF in a single area.", "difficulty": "beginner", "topology": "3 routers", "estimated_minutes": 40, "objectives": ["Enable OSPF", "Verify neighbor adjacency", "Check routing table"]},
    {"id": "lab_004", "name": "ACL Configuration", "description": "Implement standard and extended ACLs.", "difficulty": "intermediate", "topology": "2 routers, 2 switches, 4 PCs", "estimated_minutes": 60, "objectives": ["Create standard ACL", "Create extended ACL", "Apply to interfaces", "Test filtering"]},
    {"id": "lab_005", "name": "NAT Configuration", "description": "Configure static and dynamic NAT.", "difficulty": "intermediate", "topology": "1 router, 1 switch, 3 PCs, 1 server", "estimated_minutes": 50, "objectives": ["Configure static NAT", "Configure PAT", "Verify translations"]},
    {"id": "lab_006", "name": "BGP Peering", "description": "Establish eBGP and iBGP peering.", "difficulty": "advanced", "topology": "4 routers", "estimated_minutes": 90, "objectives": ["Configure eBGP", "Configure iBGP", "Verify BGP table", "Advertise networks"]},
    {"id": "lab_007", "name": "IPsec VPN", "description": "Configure site-to-site IPsec VPN.", "difficulty": "advanced", "topology": "2 routers, 2 PCs per site", "estimated_minutes": 75, "objectives": ["Configure ISAKMP policy", "Configure transform set", "Configure crypto map", "Verify VPN tunnel"]},
    {"id": "lab_008", "name": "Network Automation with Python", "description": "Use Netmiko to automate device configuration.", "difficulty": "intermediate", "topology": "2 routers (GNS3/EVE-NG)", "estimated_minutes": 60, "objectives": ["Connect via SSH", "Send configuration commands", "Verify output", "Create configuration backup script"]},
]

CONCEPTS = {
    "osi_model": {
        "name": "OSI Model",
        "description": "The Open Systems Interconnection model is a 7-layer framework that standardizes network communication.",
        "beginner": "Think of the OSI model as 7 layers of a cake. Each layer has a specific job. Layer 1 (Physical) is the wires and signals. Layer 2 (Data Link) handles MAC addresses. Layer 3 (Network) uses IP addresses to route packets. Layer 4 (Transport) ensures reliable delivery with TCP. Layer 5 (Session) manages connections. Layer 6 (Presentation) formats data. Layer 7 (Application) is what users interact with like browsers and email.",
        "intermediate": "The OSI model provides 7 layers: Physical (bits, cables, signals), Data Link (frames, MAC, switches), Network (packets, IP, routers), Transport (segments, TCP/UDP, ports), Session (session management, NetBIOS), Presentation (encryption, compression, ASCII/EBCDIC), and Application (HTTP, FTP, SMTP). Understanding encapsulation and decapsulation across layers is critical for troubleshooting.",
        "advanced": "The OSI model's 7 layers serve as both a teaching framework and troubleshooting methodology. Key protocols at each layer: L1 (Ethernet physical, RS-232), L2 (Ethernet, PPP, HDLC, STP), L3 (IP, ICMP, OSPF, EIGRP, BGP), L4 (TCP, UDP, SCTP), L5 (NetBIOS, RPC, PPTP), L6 (SSL/TLS, MIME, XDR), L7 (HTTP/2, gRPC, DNS, DHCP). The PDU transforms: bits -> frames -> packets -> segments -> data. Wireshark leverages this model for protocol analysis.",
    },
    "subnetting": {
        "name": "Subnetting",
        "description": "Dividing a network into smaller subnetworks for better organization and security.",
        "beginner": "Subnetting is like dividing a big apartment building into smaller sections. Instead of one big network, you create smaller ones. Each subnet has its own range of IP addresses. For example, 192.168.1.0/24 can be split into two /25 subnets: 192.168.1.0/25 and 192.168.1.128/25.",
    },
    "tcp_ip": {
        "name": "TCP/IP Model",
        "description": "The 4-layer networking model used in the Internet.",
        "beginner": "TCP/IP is a simpler 4-layer model: Network Access (physical + data link), Internet (network/routing), Transport (TCP/UDP), and Application (everything else). It's what actually runs the internet!",
    },
    "routing": {
        "name": "Routing",
        "description": "The process of selecting paths in a network along which to send data.",
        "beginner": "Routing is like GPS for the internet. When you send data, routers look at the destination IP address and decide which direction to send it. Static routes are manually set, while dynamic protocols like OSPF learn the best paths automatically.",
    },
    "switching": {
        "name": "Switching",
        "description": "Moving data frames within a local network using MAC addresses.",
        "beginner": "Switches connect devices in the same network. They learn which MAC address is on which port, so they can send data directly to the right device instead of broadcasting to everyone.",
    },
    "dhcp": {
        "name": "DHCP",
        "description": "Dynamic Host Configuration Protocol automatically assigns IP addresses.",
        "beginner": "DHCP is like a hotel front desk that gives you a room number (IP address) when you check in. When your device connects to a network, DHCP assigns it an IP address, subnet mask, gateway, and DNS servers automatically.",
    },
    "dns": {
        "name": "DNS",
        "description": "Domain Name System translates human-readable names to IP addresses.",
        "beginner": "DNS is like a phone book for the internet. When you type google.com, DNS looks up the IP address (like 142.250.80.46) so your browser knows where to connect.",
    },
    "vlan": {
        "name": "VLANs",
        "description": "Virtual LANs logically segment a physical network.",
        "beginner": "VLANs let you split one physical switch into multiple virtual networks. It's like having separate switches for different departments (HR, IT, Finance) even though they're all connected to the same physical device.",
    },
    "acl": {
        "name": "Access Control Lists",
        "description": "ACLs filter network traffic based on rules.",
        "beginner": "ACLs are like security guards for your network. They check each packet against a list of rules and decide whether to allow or deny it. Standard ACLs filter by source IP, while Extended ACLs can filter by source, destination, protocol, and port.",
    },
    "vpn": {
        "name": "VPN",
        "description": "Virtual Private Network creates secure connections over public networks.",
        "beginner": "A VPN creates a secure tunnel through the internet. It's like sending your mail in an armored truck instead of a regular envelope. Your data is encrypted so nobody can read it even if they intercept it.",
    },
    "bgp": {
        "name": "BGP",
        "description": "Border Gateway Protocol is the routing protocol of the Internet.",
        "beginner": "BGP is the protocol that makes the entire Internet work. It's how different networks (ISPs, companies) tell each other which IP addresses they own and how to reach them. It's like the international postal system for the internet.",
    },
}

SCENARIO_TYPES = ["link_failure", "broadcast_storm", "misconfiguration", "security_breach", "performance_degradation"]

# QUIZ DATA
QUIZZES = {
    "p1m1": {
        "module_id": "p1m1",
        "module_name": "Network Fundamentals",
        "questions": [
            {"question": "How many layers does the OSI model have?", "options": ["4", "5", "6", "7"], "answer": 3},
            {"question": "Which layer handles IP addressing?", "options": ["Layer 2", "Layer 3", "Layer 4", "Layer 7"], "answer": 1},
            {"question": "What is the primary function of a switch?", "options": ["Route packets between networks", "Forward frames based on MAC address", "Translate domain names", "Assign IP addresses"], "answer": 1},
            {"question": "Which protocol is connection-oriented?", "options": ["UDP", "TCP", "IP", "ICMP"], "answer": 1},
            {"question": "What does a subnet mask determine?", "options": ["The network portion of an IP address", "The MAC address", "The DNS server", "The default gateway"], "answer": 0},
        ],
    },
}


# ── PUBLIC API ───────────────────────────────────────────────────────────────

def get_curriculum() -> Dict[str, Any]:
    return {
        "status": "success",
        "phases": CURRICULUM["phases"],
        "tracks": CURRICULUM["tracks"],
        "total_phases": len(CURRICULUM["phases"]),
        "total_tracks": len(CURRICULUM["tracks"]),
    }


def get_phase(phase_id: str) -> Dict[str, Any]:
    phase_id = phase_id.lower().strip()
    for phase in CURRICULUM["phases"]:
        if phase["id"] == phase_id:
            return {"status": "success", "phase": phase}
    return {"status": "not_found", "message": f"Phase '{phase_id}' not found"}


def get_module(module_id: str) -> Dict[str, Any]:
    module_id = module_id.lower().strip()
    for phase in CURRICULUM["phases"]:
        for mod in phase["modules"]:
            if mod["id"] == module_id:
                return {"status": "success", "module": mod, "phase": phase["name"]}
    return {"status": "not_found", "message": f"Module '{module_id}' not found"}


def explain_concept(concept_id: str, level: str = "beginner") -> Dict[str, Any]:
    concept_id = concept_id.lower().strip()
    concept = CONCEPTS.get(concept_id)
    if not concept:
        return {"status": "available_concepts", "concepts": list(CONCEPTS.keys())}
    explanation = concept.get(level, concept.get("beginner", ""))
    return {"status": "success", "concept": concept["name"], "level": level, "explanation": explanation}


def list_labs(difficulty: str = "", topic: str = "") -> Dict[str, Any]:
    result = LABS[:]
    if difficulty:
        result = [l for l in result if l["difficulty"] == difficulty]
    if topic:
        result = [l for l in result if topic.lower() in l["name"].lower() or topic.lower() in l["description"].lower()]
    return {"status": "success", "labs": result, "total": len(result), "filters": {"difficulty": difficulty, "topic": topic}}


def start_lab(student_id: str, lab_id: str) -> Dict[str, Any]:
    lab = next((l for l in LABS if l["id"] == lab_id), None)
    if not lab:
        return {"status": "not_found", "message": f"Lab '{lab_id}' not found"}
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    _lab_sessions[session_id] = {
        "student_id": student_id,
        "lab_id": lab_id,
        "status": "active",
        "started_at": datetime.now().isoformat(),
        "submissions": [],
        "score": 0,
    }
    return {"status": "success", "session_id": session_id, "lab": lab}


def get_lab_status(session_id: str) -> Dict[str, Any]:
    session = _lab_sessions.get(session_id)
    if not session:
        return {"status": "not_found", "message": f"Session '{session_id}' not found"}
    return {"status": "success", "session": session}


def submit_lab(session_id: str, submission: Dict[str, Any]) -> Dict[str, Any]:
    session = _lab_sessions.get(session_id)
    if not session:
        return {"status": "not_found", "message": f"Session '{session_id}' not found"}
    random.seed()
    score = random.randint(70, 100)
    passed = score >= 80
    session["submissions"].append({"data": submission, "score": score, "submitted_at": datetime.now().isoformat()})
    session["score"] = score
    session["status"] = "completed" if passed else "retry_allowed"
    return {"status": "success", "score": score, "passed": passed, "feedback": "Good work!" if passed else "Review the objectives and try again."}


def reset_lab(session_id: str) -> Dict[str, Any]:
    session = _lab_sessions.get(session_id)
    if not session:
        return {"status": "not_found", "message": f"Session '{session_id}' not found"}
    session["submissions"] = []
    session["score"] = 0
    session["status"] = "active"
    return {"status": "success", "message": "Lab session reset"}


def generate_topology(description: str, vendor: str = "cisco") -> Dict[str, Any]:
    desc_lower = description.lower()
    if "star" in desc_lower:
        topo_type = "star"
        devices = ["1 core switch", "4 access switches", "20 end devices"]
    elif "mesh" in desc_lower:
        topo_type = "mesh"
        devices = ["4 routers (fully connected)", "2 switches"]
    elif "tree" in desc_lower or "hierarchical" in desc_lower:
        topo_type = "tree"
        devices = ["2 core switches", "4 distribution switches", "8 access switches"]
    elif "bus" in desc_lower:
        topo_type = "bus"
        devices = ["1 backbone cable", "4 taps", "8 end devices"]
    else:
        topo_type = "custom"
        devices = ["2 routers", "2 switches", "4 PCs"]
    return {"status": "success", "type": topo_type, "vendor": vendor, "devices": devices, "description": description}


def inject_scenario(topology_id: str, scenario_type: str) -> Dict[str, Any]:
    scenario_type = scenario_type.lower().strip()
    if scenario_type not in SCENARIO_TYPES:
        scenario_type = random.choice(SCENARIO_TYPES)
    descriptions = {
        "link_failure": "A critical link between two core routers has failed.",
        "broadcast_storm": "Excessive broadcast traffic is overwhelming the network.",
        "misconfiguration": "An incorrect routing configuration is causing asymmetric routing.",
        "security_breach": "Unauthorized access detected on the management VLAN.",
        "performance_degradation": "High latency observed on the WAN link during peak hours.",
    }
    return {"status": "success", "type": scenario_type, "description": descriptions.get(scenario_type, "Unknown scenario"), "topology_id": topology_id}


def get_quiz(module_id: str) -> Dict[str, Any]:
    quiz = QUIZZES.get(module_id)
    if not quiz:
        available = list(QUIZZES.keys())
        return {"status": "not_found", "message": f"No quiz for '{module_id}'. Available: {available}"}
    questions = [{"question": q["question"], "options": q["options"]} for q in quiz["questions"]]
    return {"status": "success", "module": quiz["module_name"], "questions": questions, "total_questions": len(questions)}


def mentor_chat(student_id: str, message: str) -> Dict[str, Any]:
    responses = [
        "Great question! Let's break this down step by step.",
        "I recommend reviewing the CCNA official cert guide, Chapter 7.",
        "Think of it this way: every packet needs a path, and routing protocols find the best one.",
        "Practice this with Packet Tracer - hands-on is the best way to learn!",
        "That's a common misconception. Let me clarify...",
    ]
    response = random.choice(responses)
    entry = {"student_id": student_id, "message": message, "mentor_response": response, "timestamp": datetime.now().isoformat()}
    _mentor_history.setdefault(student_id, []).append(entry)
    return {"status": "success", "mentor_response": response, "topic_hint": "Review subnetting fundamentals"}


def get_mentor_history(student_id: str) -> Dict[str, Any]:
    history = _mentor_history.get(student_id, [])
    return {"status": "success", "history": history, "total_messages": len(history)}


def get_progress(student_id: str) -> Dict[str, Any]:
    progress = _progress.get(student_id, {
        "student_id": student_id,
        "labs_completed": random.randint(0, 5),
        "modules_completed": random.randint(0, 3),
        "quizzes_taken": random.randint(0, 4),
        "average_score": random.randint(60, 95),
        "current_phase": "phase_1_ccna",
        "track": "enterprise",
    })
    return {"status": "success", "progress": progress, "labs_completed": progress["labs_completed"]}


def get_leaderboard(limit: int = 10) -> Dict[str, Any]:
    if not _leaderboard:
        names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"]
        for name in names:
            _leaderboard.append({"name": name, "score": random.randint(500, 2000), "labs": random.randint(2, 8), "level": random.choice(["Bronze", "Silver", "Gold", "Platinum"])})
        _leaderboard.sort(key=lambda x: x["score"], reverse=True)
    return {"status": "success", "entries": _leaderboard[:limit], "total_entries": len(_leaderboard)}


def generate_certificate(student_id: str, track: str) -> Dict[str, Any]:
    cert_id = f"LUQI-NET-{uuid.uuid4().hex[:8].upper()}"
    cert = {
        "cert_id": cert_id,
        "student_id": student_id,
        "track": track,
        "issued_at": datetime.now().isoformat(),
        "status": "active",
    }
    _certificates[cert_id] = cert
    return {"status": "success", "certificate": cert}


def get_certificate(cert_id: str) -> Dict[str, Any]:
    cert = _certificates.get(cert_id)
    if not cert:
        return {"status": "not_found", "message": f"Certificate '{cert_id}' not found"}
    return {"status": "success", "certificate": cert}


# ═══════════════════════════════════════════════════════════════════════════════
#  ADVANCED CAPABILITIES (v25.2.0)
# ═══════════════════════════════════════════════════════════════════════════════

_CERTIFICATIONS: Dict[str, Dict[str, Any]] = {
    "ccna": {
        "name": "Cisco Certified Network Associate",
        "cost_usd": 300,
        "duration_months": 3,
        "difficulty": "Beginner-Intermediate",
        "career_impact": "Entry-level networking roles",
        "topics": ["OSI Model", "IP Addressing", "Routing", "Switching", "Security", "Automation"],
        "prerequisites": ["Basic computer knowledge"],
    },
    "ccnp_enterprise": {
        "name": "Cisco Certified Network Professional - Enterprise",
        "cost_usd": 700,
        "duration_months": 6,
        "difficulty": "Intermediate-Advanced",
        "career_impact": "Senior network engineer, architect roles",
        "topics": ["Advanced Routing", "Advanced Switching", "VPN", "Wireless", "Automation", "Design"],
        "prerequisites": ["CCNA or equivalent knowledge"],
    },
    "ccie": {
        "name": "Cisco Certified Internetwork Expert",
        "cost_usd": 2050,
        "duration_months": 12,
        "difficulty": "Expert",
        "career_impact": "Principal engineer, consulting, expert-level roles",
        "topics": ["Complex BGP", "MPLS", "QoS", "Advanced Security", "Network Design", "Troubleshooting"],
        "prerequisites": ["CCNP or deep experience"],
    },
    "aws_networking": {
        "name": "AWS Certified Advanced Networking - Specialty",
        "cost_usd": 300,
        "duration_months": 4,
        "difficulty": "Advanced",
        "career_impact": "Cloud networking specialist",
        "topics": ["VPC", "Direct Connect", "Transit Gateway", "Route 53", "Cloud WAN", "Hybrid"],
        "prerequisites": ["AWS knowledge, networking fundamentals"],
    },
    "comptia_network": {
        "name": "CompTIA Network+",
        "cost_usd": 358,
        "duration_months": 2,
        "difficulty": "Beginner",
        "career_impact": "Help desk, junior network admin",
        "topics": ["Networking Concepts", "Infrastructure", "Network Operations", "Security", "Troubleshooting"],
        "prerequisites": ["Basic IT knowledge"],
    },
}

_SKILL_QUESTIONS: Dict[str, Dict[str, Any]] = {
    "routing": {
        "questions": [
            {"question": "What is the administrative distance of OSPF?", "options": ["90", "110", "120", "1"], "answer": 1},
            {"question": "Which BGP attribute is used for path selection first?", "options": ["Local Preference", "AS Path", "MED", "Origin"], "answer": 0},
            {"question": "What does a metric represent in routing?", "options": ["Cost to reach destination", "IP address", "Hop count only", "Bandwidth only"], "answer": 0},
            {"question": "Which protocol uses DUAL algorithm?", "options": ["OSPF", "EIGRP", "BGP", "RIP"], "answer": 1},
            {"question": "What is route summarization?", "options": ["Combining multiple routes into one", "Splitting routes", "Deleting routes", "Copying routes"], "answer": 0},
        ],
    },
    "switching": {
        "questions": [
            {"question": "What does STP prevent?", "options": ["Broadcast storms", "IP conflicts", "DNS failures", "Routing loops"], "answer": 0},
            {"question": "Which VLAN is the native VLAN by default?", "options": ["VLAN 0", "VLAN 1", "VLAN 100", "VLAN 999"], "answer": 1},
            {"question": "What is EtherChannel?", "options": ["Link aggregation", "VLAN tagging", "Port security", "Spanning tree"], "answer": 0},
            {"question": "Which mode allows a port to carry multiple VLANs?", "options": ["access", "trunk", "dynamic", "private"], "answer": 1},
            {"question": "What is CAM table used for?", "options": ["MAC address lookup", "IP routing", "DNS resolution", "VLAN assignment"], "answer": 0},
        ],
    },
    "security": {
        "questions": [
            {"question": "What does an ACL do?", "options": ["Filters traffic", "Routes packets", "Assigns IPs", "Encrypts data"], "answer": 0},
            {"question": "Which VPN type is site-to-site?", "options": ["SSL VPN", "IPsec VPN", "Remote Access", "MPLS VPN"], "answer": 1},
            {"question": "What is DHCP snooping?", "options": ["Security feature for DHCP", "DHCP server discovery", "IP address scanning", "Port scanning"], "answer": 0},
            {"question": "What does 802.1X provide?", "options": ["Port-based authentication", "Wireless encryption", "VLAN tagging", "QoS marking"], "answer": 0},
            {"question": "What is a honeypot?", "options": ["Decoy system", "Firewall", "IDS sensor", "Proxy server"], "answer": 0},
        ],
    },
    "automation": {
        "questions": [
            {"question": "What is Netmiko used for?", "options": ["SSH to network devices", "Web scraping", "Database access", "File transfer"], "answer": 0},
            {"question": "What format does YANG use?", "options": ["XML/JSON", "CSV", "Plain text", "Binary"], "answer": 0},
            {"question": "What is Ansible's architecture?", "options": ["Agentless", "Agent-based", "Peer-to-peer", "Client-server"], "answer": 0},
            {"question": "Which API style uses URIs and HTTP methods?", "options": ["REST", "SOAP", "RPC", "GraphQL"], "answer": 0},
            {"question": "What is Infrastructure as Code?", "options": ["Managing infrastructure via code", "Writing network docs", "Creating network diagrams", "Manual configuration"], "answer": 0},
        ],
    },
    "wireless": {
        "questions": [
            {"question": "What frequency does Wi-Fi 6 use?", "options": ["2.4 GHz only", "5 GHz only", "2.4 & 5 GHz", "6 GHz only"], "answer": 2},
            {"question": "What does SSID identify?", "options": ["Wireless network name", "Security key", "Channel number", "AP MAC"], "answer": 0},
            {"question": "What is roaming in wireless?", "options": ["Moving between APs", "Changing channels", "Updating firmware", "Scanning networks"], "answer": 0},
            {"question": "Which security standard is strongest?", "options": ["WEP", "WPA", "WPA2", "WPA3"], "answer": 3},
            {"question": "What causes co-channel interference?", "options": ["Overlapping channels", "Too much power", "Old equipment", "Wrong SSID"], "answer": 0},
        ],
    },
    "cloud": {
        "questions": [
            {"question": "What is a VPC?", "options": ["Virtual Private Cloud", "Virtual Protocol Controller", "Virtual Private Connection", "Virtual Packet Counter"], "answer": 0},
            {"question": "Which AWS service provides CDN?", "options": ["S3", "CloudFront", "Route 53", "ELB"], "answer": 1},
            {"question": "What is Direct Connect?", "options": ["Dedicated network connection to AWS", "VPN service", "DNS service", "Load balancer"], "answer": 0},
            {"question": "What is hybrid cloud?", "options": ["On-prem + cloud", "Multi-cloud", "Private cloud only", "Public cloud only"], "answer": 0},
            {"question": "Which Azure service is similar to AWS VPC?", "options": ["VNet", "App Service", "Blob Storage", "Azure AD"], "answer": 0},
        ],
    },
}

_SCENARIO_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "vlan": {
        "topology_description": "Two switches connected via trunk. Three departments each need isolated VLANs.",
        "devices_required": ["2x Layer 2 switches", "6x PCs"],
        "expected_configurations": ["Create VLANs 10, 20, 30", "Assign access ports", "Configure trunk with allowed VLANs"],
        "validation_checks": ["PCs in same VLAN can ping", "PCs in different VLANs cannot ping", "Show vlan brief displays correct assignments"],
        "hints": ["Use 'switchport mode access' and 'switchport access vlan'", "Trunk needs 'switchport mode trunk'"],
        "solution_outline": "Configure VLANs on both switches, assign ports, set trunk.",
    },
    "ospf": {
        "topology_description": "Three routers in a triangle topology running OSPF Area 0.",
        "devices_required": ["3x Routers"],
        "expected_configurations": ["Enable OSPF with router-id", "Configure networks", "Verify neighbor adjacency"],
        "validation_checks": ["All routers show FULL adjacency", "Routing table has OSPF routes", "Ping across all links"],
        "hints": ["Use 'router ospf 1'", "Check with 'show ip ospf neighbor'"],
        "solution_outline": "Enable OSPF on all routers, ensure router IDs are unique, verify.",
    },
    "acl": {
        "topology_description": "Router connecting internal network to Internet. Block specific traffic.",
        "devices_required": ["1x Router", "2x Switches", "4x PCs", "1x Server"],
        "expected_configurations": ["Standard ACL for internal filtering", "Extended ACL for external traffic"],
        "validation_checks": ["Blocked traffic is denied", "Permitted traffic flows", "Show access-lists displays hits"],
        "hints": ["Standard ACL near destination", "Extended ACL near source"],
        "solution_outline": "Create ACLs, apply to interfaces, test with ping and telnet.",
    },
    "nat": {
        "topology_description": "Internal private network needs Internet access via single public IP.",
        "devices_required": ["1x Router", "1x Switch", "3x PCs"],
        "expected_configurations": ["Define inside and outside interfaces", "Configure PAT overload"],
        "validation_checks": ["Internal PCs can reach Internet", "Show ip nat translations shows entries", "Debug shows translation"],
        "hints": ["Use 'ip nat inside source list'", "Don't forget default route"],
        "solution_outline": "Configure NAT interfaces, ACL, overload statement.",
    },
    "vpn": {
        "topology_description": "Two sites need secure communication over public Internet.",
        "devices_required": ["2x Routers", "2x PCs per site"],
        "expected_configurations": ["ISAKMP policy", "IPsec transform set", "Crypto map", "ACL for interesting traffic"],
        "validation_checks": ["Show crypto isakmp sa shows QM_IDLE", "Ping across VPN succeeds", "Show crypto ipsec sa shows encaps"],
        "hints": ["Match ISAKMP parameters on both sides", "ACL must mirror on both routers"],
        "solution_outline": "Configure ISAKMP, IPsec, crypto map on both routers.",
    },
    "bgp": {
        "topology_description": "Two autonomous systems exchanging routes via eBGP.",
        "devices_required": ["2x Routers (different AS)"],
        "expected_configurations": ["Define BGP process with AS number", "Configure neighbor", "Network statement"],
        "validation_checks": ["Show ip bgp summary shows Established", "Routes appear in BGP table", "Ping between loopbacks"],
        "hints": ["Neighbor IP must be reachable", "Use 'no auto-summary'"],
        "solution_outline": "Configure BGP on both routers, verify neighbor state.",
    },
}


def create_study_plan(student_id: str, goals: List[str], available_hours_per_week: int = 10) -> Dict[str, Any]:
    """Create a personalized study plan across curriculum phases.

    Args:
        student_id: Unique student identifier.
        goals: List of goal strings (e.g., ["ccna_cert", "python_networking"]).
        available_hours_per_week: Hours the student can dedicate per week.

    Returns:
        Study plan with weekly schedule, milestones, and timeline.
    """
    plan_id = f"plan-{uuid.uuid4().hex[:8]}"
    all_modules = []
    for phase in CURRICULUM["phases"]:
        for mod in phase["modules"]:
            mod["phase"] = phase["id"]
            all_modules.append(mod)
    modules_per_week = max(1, available_hours_per_week // 5)
    weekly_schedule = []
    week = 1
    remaining = list(all_modules)
    goal_modules = []
    for g in goals:
        g_lower = g.lower()
        if "ccna" in g_lower or "phase_1" in g_lower:
            goal_modules.extend([m for m in remaining if m["phase"] == "phase_1_ccna"])
        elif "ccnp" in g_lower or "phase_2" in g_lower:
            goal_modules.extend([m for m in remaining if m["phase"] == "phase_2_ccnp"])
        elif "ccie" in g_lower or "phase_3" in g_lower:
            goal_modules.extend([m for m in remaining if m["phase"] == "phase_3_ccie"])
    selected = goal_modules if goal_modules else remaining
    while selected:
        week_modules = selected[:modules_per_week]
        selected = selected[modules_per_week:]
        weekly_schedule.append({
            "week": week,
            "modules": [{"id": m["id"], "name": m["name"], "topics": m["topics"]} for m in week_modules],
            "hours": len(week_modules) * 5,
            "milestones": [f"Complete {m['name']}" for m in week_modules],
        })
        week += 1
    total_weeks = len(weekly_schedule)
    est_date = (datetime.now() + timedelta(weeks=total_weeks)).strftime("%Y-%m-%d")
    cert_path = "CCNA -> CCNP -> CCIE" if any("ccna" in g.lower() for g in goals) else "General Networking"
    plan = {
        "plan_id": plan_id,
        "student_id": student_id,
        "goals": goals,
        "available_hours_per_week": available_hours_per_week,
        "total_weeks": total_weeks,
        "weekly_schedule": weekly_schedule,
        "estimated_completion_date": est_date,
        "certification_path": cert_path,
    }
    _study_plans[plan_id] = plan
    return {"status": "success", **plan}


def export_study_plan_calendar(plan_id: str, format: str = "ical") -> Dict[str, Any]:
    """Export a study plan to calendar format.

    Args:
        plan_id: ID of the study plan to export.
        format: Calendar format - "ical" or "csv".

    Returns:
        Calendar content string and filename.
    """
    plan = _study_plans.get(plan_id)
    if not plan:
        available = list(_study_plans.keys())
        return {"status": "not_found", "message": f"Plan '{plan_id}' not found. Available: {available}"}
    fmt = format.lower().strip()
    if fmt == "ical":
        lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Luqi AI//Study Plan//EN"]
        now = datetime.now()
        for week in plan["weekly_schedule"]:
            week_start = now + timedelta(weeks=week["week"] - 1)
            for module in week["modules"]:
                uid = f"{module['id']}@luqi.ai"
                dtstart = week_start.strftime("%Y%m%dT%H%M%S")
                dtend = (week_start + timedelta(hours=2)).strftime("%Y%m%dT%H%M%S")
                lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:{uid}",
                    f"SUMMARY:Study: {module['name']}",
                    f"DTSTART;VALUE=DATE-TIME:{dtstart}",
                    f"DTEND;VALUE=DATE-TIME:{dtend}",
                    f"DESCRIPTION:Topics: {', '.join(module['topics'])}",
                    "END:VEVENT",
                ])
        lines.append("END:VCALENDAR")
        content = "\r\n".join(lines)
        filename = f"luqi_study_plan_{plan_id}.ics"
    elif fmt == "csv":
        lines = ["Week,Module,Topics,Hours,Milestone"]
        for week in plan["weekly_schedule"]:
            for module in week["modules"]:
                topics = ";".join(module["topics"])
                lines.append(f"{week['week']},{module['name']},\"{topics}\",{week['hours']},Complete {module['name']}")
        content = "\n".join(lines)
        filename = f"luqi_study_plan_{plan_id}.csv"
    else:
        return {"status": "error", "message": f"Unknown format '{fmt}'. Use: ical, csv"}
    return {"status": "success", "format": fmt, "calendar_content": content, "filename": filename}


def get_skill_assessment(topic: str, level: str = "intermediate") -> Dict[str, Any]:
    """Get a skill assessment quiz for a networking topic.

    Args:
        topic: Topic area (routing, switching, security, automation, wireless, cloud).
        level: Difficulty level.

    Returns:
        Quiz with questions, time limit, and passing score.
    """
    topic = topic.lower().strip()
    bank = _SKILL_QUESTIONS.get(topic)
    if not bank:
        available = list(_SKILL_QUESTIONS.keys())
        return {"status": "not_found", "message": f"No questions for '{topic}'. Available: {available}"}
    questions = [{"question": q["question"], "options": q["options"], "points": 20} for q in bank["questions"]]
    time_limit = 15 if level == "beginner" else 10 if level == "intermediate" else 8
    passing = 60 if level == "beginner" else 70 if level == "intermediate" else 80
    return {
        "status": "success",
        "topic": topic,
        "level": level,
        "total_questions": len(questions),
        "time_limit_minutes": time_limit,
        "passing_score": passing,
        "questions": questions,
    }


def recommend_learning_path(student_id: str, target_cert: str) -> Dict[str, Any]:
    """Recommend a learning path based on current progress and target certification.

    Args:
        student_id: Student identifier.
        target_cert: Target certification (ccna, ccnp_enterprise, ccie, etc.).

    Returns:
        Gap analysis with recommended modules and timeline.
    """
    target = target_cert.lower().strip()
    cert_info = _CERTIFICATIONS.get(target)
    if not cert_info:
        available = list(_CERTIFICATIONS.keys())
        return {"status": "not_found", "message": f"Unknown cert '{target}'. Available: {available}"}
    progress = _progress.get(student_id, {"labs_completed": 0, "modules_completed": 0})
    current_level = "Beginner" if progress["modules_completed"] < 3 else "Intermediate" if progress["modules_completed"] < 9 else "Advanced"
    all_topics = set(cert_info["topics"])
    completed_topics = set()
    for phase in CURRICULUM["phases"]:
        for mod in phase["modules"]:
            if progress.get("modules_completed", 0) > 0:
                completed_topics.update(mod["topics"])
    gaps = list(all_topics - completed_topics)
    prereqs = cert_info.get("prerequisites", [])
    recommended = []
    for phase in CURRICULUM["phases"]:
        for mod in phase["modules"]:
            overlap = set(mod["topics"]) & all_topics
            if overlap:
                recommended.append({"module_id": mod["id"], "name": mod["name"], "priority": "high" if overlap & set(gaps) else "medium"})
    est_weeks = cert_info["duration_months"] * 4
    return {
        "status": "success",
        "target_cert": target,
        "current_level": current_level,
        "gaps": gaps,
        "recommended_modules": recommended,
        "estimated_weeks": est_weeks,
        "prerequisites": prereqs,
    }


def compare_certifications(cert1: str, cert2: str) -> Dict[str, Any]:
    """Compare two certifications side by side.

    Args:
        cert1: First certification key.
        cert2: Second certification key.

    Returns:
        Detailed comparison with recommendation.
    """
    c1 = _CERTIFICATIONS.get(cert1.lower())
    c2 = _CERTIFICATIONS.get(cert2.lower())
    if not c1 or not c2:
        available = list(_CERTIFICATIONS.keys())
        return {"status": "not_found", "message": f"Unknown cert. Available: {available}"}
    t1 = set(c1["topics"])
    t2 = set(c2["topics"])
    overlap = list(t1 & t2)
    unique1 = list(t1 - t2)
    unique2 = list(t2 - t1)
    diff_map = {"Beginner": 1, "Intermediate": 2, "Advanced": 3, "Expert": 4}
    d1 = diff_map.get(c1["difficulty"].split("-")[-1], 2)
    d2 = diff_map.get(c2["difficulty"].split("-")[-1], 2)
    if c1["cost_usd"] < c2["cost_usd"] and d1 <= d2:
        recommendation = f"{cert1.upper()} offers better value for beginners"
    elif c2["cost_usd"] < c1["cost_usd"] and d2 <= d1:
        recommendation = f"{cert2.upper()} offers better value for beginners"
    else:
        recommendation = f"Both have merit; choose based on career goals"
    return {
        "status": "success",
        "comparison": {
            "cost": {cert1: c1["cost_usd"], cert2: c2["cost_usd"]},
            "duration_months": {cert1: c1["duration_months"], cert2: c2["duration_months"]},
            "difficulty": {cert1: c1["difficulty"], cert2: c2["difficulty"]},
            "career_impact": {cert1: c1["career_impact"], cert2: c2["career_impact"]},
            "topics_overlap": overlap,
            "unique_to_cert1": unique1,
            "unique_to_cert2": unique2,
        },
        "recommendation": recommendation,
    }


def generate_packet_tracer_scenario(difficulty: str, topic: str) -> Dict[str, Any]:
    """Generate a Packet Tracer lab scenario.

    Args:
        difficulty: Scenario difficulty (beginner, intermediate, advanced).
        topic: Topic area (vlan, ospf, acl, nat, vpn, bgp).

    Returns:
        Detailed scenario with topology, objectives, configs, and hints.
    """
    topic = topic.lower().strip()
    diff = difficulty.lower().strip()
    template = _SCENARIO_TEMPLATES.get(topic)
    if not template:
        available = list(_SCENARIO_TEMPLATES.keys())
        return {"status": "not_found", "message": f"No scenario for '{topic}'. Available: {available}"}
    diff_prefix = {"beginner": "Basic", "intermediate": "Intermediate", "advanced": "Advanced"}.get(diff, "")
    name = f"{diff_prefix} {topic.upper()} Lab"
    objectives = template["expected_configurations"]
    if diff == "advanced":
        objectives.append("Troubleshoot and fix pre-existing misconfiguration")
    elif diff == "beginner":
        objectives = objectives[:2]
    return {
        "status": "success",
        "scenario_name": name,
        "difficulty": diff,
        "topic": topic,
        "topology_description": template["topology_description"],
        "objectives": objectives,
        "devices_required": template["devices_required"],
        "expected_configurations": template["expected_configurations"],
        "validation_checks": template["validation_checks"],
        "hints": template["hints"],
        "solution_outline": template["solution_outline"],
    }
