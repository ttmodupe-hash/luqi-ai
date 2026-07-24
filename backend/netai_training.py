#!/usr/bin/env python3
"""Luqi AI NetAI Training Module — Network and infrastructure training guides,
IT certification paths, networking fundamentals, cloud training, and
infrastructure automation courses.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
#  CERTIFICATION DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

CERTIFICATIONS = {
    "cisco": {
        "vendor": "Cisco",
        "certifications": [
            {"name": "CCNA", "full_name": "Cisco Certified Network Associate", "level": "Associate", "focus": "Networking fundamentals, IP connectivity, security basics", "cost": "$300", "valid_for": "3 years"},
            {"name": "CCNP Enterprise", "full_name": "Cisco Certified Network Professional", "level": "Professional", "focus": "Advanced routing, switching, troubleshooting", "cost": "$400 per exam (2 exams)", "valid_for": "3 years"},
            {"name": "CCIE Enterprise", "full_name": "Cisco Certified Internetwork Expert", "level": "Expert", "focus": "Expert-level network engineering", "cost": "$2,050 (lab)", "valid_for": "3 years"},
            {"name": "DevNet Associate", "full_name": "Cisco Certified DevNet Associate", "level": "Associate", "focus": "Network automation, Python, APIs", "cost": "$300", "valid_for": "3 years"},
        ],
    },
    "aws": {
        "vendor": "Amazon Web Services",
        "certifications": [
            {"name": "AWS Cloud Practitioner", "level": "Foundational", "focus": "Cloud concepts, AWS services, billing", "cost": "$100", "valid_for": "3 years"},
            {"name": "AWS Solutions Architect Associate", "level": "Associate", "focus": "Designing distributed systems on AWS", "cost": "$150", "valid_for": "3 years"},
            {"name": "AWS SysOps Administrator", "level": "Associate", "focus": "Deployment, management, operations on AWS", "cost": "$150", "valid_for": "3 years"},
            {"name": "AWS Solutions Architect Professional", "level": "Professional", "focus": "Complex AWS architecture design", "cost": "$300", "valid_for": "3 years"},
            {"name": "AWS Advanced Networking", "level": "Specialty", "focus": "Network architecture on AWS", "cost": "$300", "valid_for": "3 years"},
        ],
    },
    "azure": {
        "vendor": "Microsoft Azure",
        "certifications": [
            {"name": "Azure Fundamentals (AZ-900)", "level": "Foundational", "focus": "Cloud concepts, Azure services", "cost": "$99", "valid_for": "1 year (does not expire)"},
            {"name": "Azure Administrator (AZ-104)", "level": "Associate", "focus": "Implementing and managing Azure infrastructure", "cost": "$165", "valid_for": "1 year"},
            {"name": "Azure Solutions Architect (AZ-305)", "level": "Expert", "focus": "Designing Azure infrastructure", "cost": "$165", "valid_for": "1 year"},
            {"name": "Azure Network Engineer (AZ-700)", "level": "Associate", "focus": "Azure networking solutions", "cost": "$165", "valid_for": "1 year"},
        ],
    },
    "comptia": {
        "vendor": "CompTIA",
        "certifications": [
            {"name": "Network+", "level": "Associate", "focus": "Networking concepts, infrastructure, operations", "cost": "$358", "valid_for": "3 years"},
            {"name": "Security+", "level": "Associate", "focus": "Cybersecurity fundamentals", "cost": "$404", "valid_for": "3 years"},
            {"name": "Cloud+", "level": "Associate", "focus": "Cloud infrastructure and operations", "cost": "$358", "valid_for": "3 years"},
            {"name": "Linux+", "level": "Associate", "focus": "Linux administration", "cost": "$358", "valid_for": "3 years"},
        ],
    },
    "google": {
        "vendor": "Google Cloud",
        "certifications": [
            {"name": "Cloud Digital Leader", "level": "Foundational", "focus": "Cloud concepts and Google Cloud products", "cost": "$99", "valid_for": "2 years"},
            {"name": "Associate Cloud Engineer", "level": "Associate", "focus": "Deploying and managing Google Cloud resources", "cost": "$125", "valid_for": "2 years"},
            {"name": "Professional Cloud Architect", "level": "Professional", "focus": "Designing Google Cloud solutions", "cost": "$200", "valid_for": "2 years"},
            {"name": "Professional Cloud Network Engineer", "level": "Professional", "focus": "Network architecture on GCP", "cost": "$200", "valid_for": "2 years"},
        ],
    },
    "vmware": {
        "vendor": "VMware",
        "certifications": [
            {"name": "VCTA-NV", "level": "Associate", "focus": "Network virtualization basics", "cost": "$125", "valid_for": "2 years"},
            {"name": "VCP-NV", "level": "Professional", "focus": "VMware NSX installation, configuration", "cost": "$250 + course", "valid_for": "2 years"},
        ],
    },
}

# Training paths
TRAINING_PATHS = {
    "network_engineer": {
        "name": "Network Engineer",
        "description": "Design, implement, and maintain computer networks",
        "steps": [
            {"step": 1, "cert": "CompTIA Network+", "duration": "2-3 months", "cost": "$358"},
            {"step": 2, "cert": "CCNA", "duration": "3-4 months", "cost": "$300"},
            {"step": 3, "cert": "CCNP Enterprise", "duration": "6-9 months", "cost": "$800"},
            {"step": 4, "cert": "Optional: AWS/Azure Networking Specialty", "duration": "3-4 months", "cost": "$200-300"},
        ],
        "total_duration": "12-18 months",
        "total_cost": "$1,600 - $2,000",
    },
    "cloud_engineer": {
        "name": "Cloud Network Engineer",
        "description": "Design and manage cloud network infrastructure",
        "steps": [
            {"step": 1, "cert": "CCNA or Network+", "duration": "3-4 months", "cost": "$300-358"},
            {"step": 2, "cert": "AWS/Azure/GCP Associate", "duration": "3-4 months", "cost": "$125-165"},
            {"step": 3, "cert": "Cloud Networking Specialty", "duration": "3-4 months", "cost": "$200-300"},
            {"step": 4, "cert": "Kubernetes/Container Networking (CKA)", "duration": "2-3 months", "cost": "$375"},
        ],
        "total_duration": "12-15 months",
        "total_cost": "$1,000 - $1,400",
    },
    "network_security": {
        "name": "Network Security Engineer",
        "description": "Secure network infrastructure and prevent cyber attacks",
        "steps": [
            {"step": 1, "cert": "CompTIA Security+", "duration": "2-3 months", "cost": "$404"},
            {"step": 2, "cert": "CCNA", "duration": "3-4 months", "cost": "$300"},
            {"step": 3, "cert": "CCNP Security or PCNSE", "duration": "6-9 months", "cost": "$400-500"},
            {"step": 4, "cert": "CISSP (senior roles)", "duration": "4-6 months", "cost": "$749"},
        ],
        "total_duration": "15-24 months",
        "total_cost": "$1,800 - $2,500",
    },
    "devops_network": {
        "name": "DevOps Network Engineer",
        "description": "Automate network operations and infrastructure",
        "steps": [
            {"step": 1, "cert": "CCNA or Network+", "duration": "3 months", "cost": "$300"},
            {"step": 2, "cert": "Cisco DevNet Associate", "duration": "2-3 months", "cost": "$300"},
            {"step": 3, "cert": "AWS/Azure Associate", "duration": "3 months", "cost": "$125-165"},
            {"step": 4, "cert": "Terraform Associate", "duration": "1-2 months", "cost": "$70"},
            {"step": 5, "cert": "CKA or Docker", "duration": "2-3 months", "cost": "$195-375"},
        ],
        "total_duration": "12-15 months",
        "total_cost": "$1,000 - $1,400",
    },
}

# Networking fundamentals
NETWORKING_FUNDAMENTALS = {
    "osi_model": {
        "topic": "OSI Model",
        "description": "7-layer model for network communication",
        "layers": [
            {"layer": 7, "name": "Application", "function": "User interfaces, HTTP, FTP, SMTP", "devices": "Applications"},
            {"layer": 6, "name": "Presentation", "function": "Data formatting, encryption, compression", "devices": "Operating System"},
            {"layer": 5, "name": "Session", "function": "Session management, dialog control", "devices": "Operating System"},
            {"layer": 4, "name": "Transport", "function": "End-to-end delivery, TCP/UDP, ports", "devices": "Firewalls"},
            {"layer": 3, "name": "Network", "function": "Logical addressing, routing, IP", "devices": "Routers, Layer 3 Switches"},
            {"layer": 2, "name": "Data Link", "function": "Physical addressing, MAC, frames", "devices": "Switches, Bridges"},
            {"layer": 1, "name": "Physical", "function": "Bits on wire, cables, signals", "devices": "Hubs, Cables, NICs"},
        ],
    },
    "ip_addressing": {
        "topic": "IP Addressing",
        "description": "IPv4 and IPv6 addressing fundamentals",
        "ipv4_classes": [
            {"class": "A", "range": "1.0.0.0 - 126.255.255.255", "default_mask": "/8", "hosts": "16.7 million"},
            {"class": "B", "range": "128.0.0.0 - 191.255.255.255", "default_mask": "/16", "hosts": "65,534"},
            {"class": "C", "range": "192.0.0.0 - 223.255.255.255", "default_mask": "/24", "hosts": "254"},
        ],
        "private_ranges": [
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16",
        ],
        "special_addresses": [
            {"address": "127.0.0.1", "purpose": "Loopback/localhost"},
            {"address": "0.0.0.0", "purpose": "Default route/any"},
            {"address": "255.255.255.255", "purpose": "Broadcast"},
            {"address": "169.254.0.0/16", "purpose": "APIPA (auto-config)"},
        ],
    },
    "subnetting": {
        "topic": "Subnetting",
        "description": "Dividing networks into smaller segments",
        "key_concepts": [
            "Subnet mask determines network vs host portion",
            "CIDR notation: /24 = 255.255.255.0",
            "Each subnet loses 2 addresses (network and broadcast)",
            "VLSM allows different subnet sizes",
        ],
        "common_masks": [
            {"cidr": "/24", "mask": "255.255.255.0", "hosts": 254},
            {"cidr": "/25", "mask": "255.255.255.128", "hosts": 126},
            {"cidr": "/26", "mask": "255.255.255.192", "hosts": 62},
            {"cidr": "/27", "mask": "255.255.255.224", "hosts": 30},
            {"cidr": "/28", "mask": "255.255.255.240", "hosts": 14},
            {"cidr": "/29", "mask": "255.255.255.248", "hosts": 6},
            {"cidr": "/30", "mask": "255.255.255.252", "hosts": 2},
        ],
    },
    "routing_protocols": {
        "topic": "Routing Protocols",
        "description": "Protocols that determine the best path for traffic",
        "interior": [
            {"protocol": "OSPF", "type": "Link State", "metric": "Cost (bandwidth)", "use_case": "Enterprise networks", "admin_distance": 110},
            {"protocol": "EIGRP", "type": "Advanced Distance Vector", "metric": "Composite", "use_case": "Cisco environments", "admin_distance": 90},
            {"protocol": "RIP", "type": "Distance Vector", "metric": "Hop count", "use_case": "Small networks", "admin_distance": 120},
        ],
        "exterior": [
            {"protocol": "BGP", "type": "Path Vector", "metric": "Path attributes", "use_case": "Internet/ISP", "admin_distance": 20 (eBGP) / 200 (iBGP)},
        ],
    },
    "switching": {
        "topic": "Switching",
        "description": "Layer 2 network operations",
        "concepts": [
            {"concept": "MAC Address Table", "description": "Maps MAC addresses to switch ports"},
            {"concept": "VLAN", "description": "Virtual LANs segment broadcast domains"},
            {"concept": "Trunking", "description": "802.1Q carries multiple VLANs on one link"},
            {"concept": "STP", "description": "Spanning Tree Protocol prevents loops"},
            {"concept": "EtherChannel", "description": "Bundle multiple links for redundancy and bandwidth"},
            {"concept": "Inter-VLAN Routing", "description": "Requires Layer 3 device (router or L3 switch)"},
        ],
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_certifications(vendor: str = "") -> Dict[str, Any]:
    """Get IT certifications."""
    if vendor:
        if vendor.lower() in CERTIFICATIONS:
            return {"status": "success", **CERTIFICATIONS[vendor.lower()]}
        return {"status": "not_found", "available_vendors": list(CERTIFICATIONS.keys())}
    return {
        "status": "success",
        "total_vendors": len(CERTIFICATIONS),
        "vendors": [{"id": k, "name": v["vendor"], "cert_count": len(v["certifications"])} for k, v in CERTIFICATIONS.items()],
    }


def get_training_paths() -> Dict[str, Any]:
    """Get network engineering training paths."""
    return {
        "status": "success",
        "total_paths": len(TRAINING_PATHS),
        "paths": [{"id": k, "name": v["name"], "description": v["description"], "duration": v["total_duration"], "cost": v["total_cost"]} for k, v in TRAINING_PATHS.items()],
    }


def get_training_path(path_id: str) -> Dict[str, Any]:
    """Get a specific training path."""
    if path_id not in TRAINING_PATHS:
        return {"status": "not_found", "available": list(TRAINING_PATHS.keys())}
    return {"status": "success", **TRAINING_PATHS[path_id]}


def get_networking_fundamental(topic: str = "") -> Dict[str, Any]:
    """Get networking fundamentals."""
    if topic:
        if topic in NETWORKING_FUNDAMENTALS:
            return {"status": "success", **NETWORKING_FUNDAMENTALS[topic]}
        return {"status": "not_found", "available_topics": list(NETWORKING_FUNDAMENTALS.keys())}
    return {
        "status": "success",
        "total_topics": len(NETWORKING_FUNDAMENTALS),
        "topics": [{"id": k, "topic": v["topic"]} for k, v in NETWORKING_FUNDAMENTALS.items()],
    }


def compare_certifications(cert1: str, cert2: str) -> Dict[str, Any]:
    """Compare two certifications."""
    c1 = c2 = None
    for vendor in CERTIFICATIONS.values():
        for cert in vendor["certifications"]:
            if cert["name"].lower() == cert1.lower():
                c1 = cert
            if cert["name"].lower() == cert2.lower():
                c2 = cert

    if not c1 or not c2:
        return {"status": "not_found", "message": "One or both certifications not found"}

    return {
        "status": "success",
        "comparison": {
            cert1: c1,
            cert2: c2,
        },
    }


def get_study_plan(target_cert: str, hours_per_week: int = 10) -> Dict[str, Any]:
    """Generate a study plan for a certification."""
    # Find the cert
    cert_info = None
    for vendor in CERTIFICATIONS.values():
        for cert in vendor["certifications"]:
            if cert["name"].lower() == target_cert.lower():
                cert_info = cert
                break
        if cert_info:
            break

    if not cert_info:
        return {"status": "not_found", "message": f"Certification '{target_cert}' not found"}

    # Estimate study hours based on level
    hours_map = {"Foundational": 60, "Associate": 120, "Professional": 200, "Expert": 400, "Specialty": 150}
    total_hours = hours_map.get(cert_info["level"], 120)
    weeks = total_hours // hours_per_week

    return {
        "status": "success",
        "certification": cert_info["name"],
        "level": cert_info["level"],
        "study_hours_total": total_hours,
        "hours_per_week": hours_per_week,
        "estimated_weeks": weeks,
        "study_plan": [
            {"phase": "1. Foundation", "weeks": weeks // 4, "focus": "Core concepts and theory"},
            {"phase": "2. Deep Dive", "weeks": weeks // 2, "focus": "Hands-on labs and practice"},
            {"phase": "3. Review", "weeks": weeks // 4, "focus": "Practice exams and weak areas"},
            {"phase": "4. Exam", "weeks": 1, "focus": "Final review and exam"},
        ],
    }
