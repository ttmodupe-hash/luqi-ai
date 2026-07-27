#!/usr/bin/env python3
"""
Cybersecurity Engine — Comprehensive Security Expert & Training Companion.

A full-featured cybersecurity module providing:
    - Security assessments (web, network, cloud, mobile)
    - Educational vulnerability scanning with built-in CVE knowledge base
    - Structured training modules with lessons, quizzes, and learning paths
    - Incident response playbooks for common threat scenarios
    - Compliance framework mapping (NIST CSF, ISO 27001, CIS Controls, POPIA)
    - Password strength analysis and security policy generation

All methods return dictionaries with consistent keys for easy integration.
Data is persisted to JSON files under data/cybersecurity/.

Author: Omega AI
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import string
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class CybersecurityEngine:
    """Comprehensive cybersecurity expert system and training companion.

    Provides security assessments, vulnerability scanning (educational),
    training modules, incident response playbooks, compliance frameworks,
    password analysis, and security policy generation.

    Attributes:
        DATA_DIR (Path): Directory for JSON persistence.
        cve_database (List[Dict]): Built-in CVE knowledge base.
        training_modules (List[Dict]): Available training modules.
        incident_playbooks (List[Dict]): Incident response playbooks.
        compliance_frameworks (List[Dict]): Supported compliance frameworks.
        practice_labs (List[Dict]): Hands-on practice lab scenarios.
    """

    DATA_DIR: Path = Path(__file__).parent / "data" / "cybersecurity"

    # ------------------------------------------------------------------
    # Construction & persistence helpers
    # ------------------------------------------------------------------

    def __init__(self) -> None:
        """Initialise the engine, create data directory, and seed all data."""
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)

        # --- CVE knowledge base (populated in __init__) ---
        self.cve_database: List[Dict[str, Any]] = self._seed_cve_database()

        # --- Training modules ---
        self.training_modules: List[Dict[str, Any]] = self._seed_training_modules()

        # --- Incident response playbooks ---
        self.incident_playbooks: List[Dict[str, Any]] = self._seed_incident_playbooks()

        # --- Compliance frameworks ---
        self.compliance_frameworks: List[Dict[str, Any]] = self._seed_compliance_frameworks()

        # --- Practice labs ---
        self.practice_labs: List[Dict[str, Any]] = self._seed_practice_labs()

        # --- Cached assessment state ---
        self._assessment_cache: Dict[str, Any] = {}

    # ------------------------------------------------------------------
    # Internal seed helpers
    # ------------------------------------------------------------------

    def _seed_cve_database(self) -> List[Dict[str, Any]]:
        """Seed the built-in CVE knowledge base with real-world vulnerabilities.

        Returns:
            List of CVE dictionaries.
        """
        return [
            {
                "cve_id": "CVE-2021-44228",
                "title": "Log4Shell — Apache Log4j Remote Code Execution",
                "description": "A critical vulnerability in Apache Log4j 2 that allows remote code execution via JNDI injection in log messages. Attackers can execute arbitrary code by sending specially crafted strings to any application using a vulnerable Log4j version.",
                "severity": "critical",
                "cvss_score": 10.0,
                "affected_products": ["Apache Log4j 2.0-beta9 through 2.14.1"],
                "patched_versions": ["Apache Log4j 2.15.0+ (2.17.1 fully recommended)"],
                "remediation": "Upgrade Log4j to 2.17.1 or later. If patching is not immediately possible, set system property log4j2.formatMsgNoLookups to true or remove the JndiLookup class from the classpath.",
            },
            {
                "cve_id": "CVE-2023-38408",
                "title": "OpenSSH Forwarded SSH-Agent Remote Code Execution",
                "description": "A vulnerability in OpenSSH's ssh-agent that allows remote code execution when PKCS#11 providers are forwarded via SSH-agent. An attacker with access to a remote server can execute arbitrary code on the client machine.",
                "severity": "critical",
                "cvss_score": 9.8,
                "affected_products": ["OpenSSH 8.9 through 9.3p1"],
                "patched_versions": ["OpenSSH 9.3p2 or later"],
                "remediation": "Update OpenSSH to version 9.3p2 or later. As a workaround, avoid forwarding ssh-agent to untrusted servers.",
            },
            {
                "cve_id": "CVE-2023-34362",
                "title": "MOVEit Transfer SQL Injection (Cl0p Ransomware)",
                "description": "A SQL injection vulnerability in Progress MOVEit Transfer that allows unauthenticated attackers to gain unauthorised access to the database. Widely exploited by the Cl0p ransomware group for mass data theft.",
                "severity": "critical",
                "cvss_score": 9.8,
                "affected_products": ["MOVEit Transfer before 2023.0.4, 2022.1.8, 2022.0.8, 2021.0.10"],
                "patched_versions": ["MOVEit Transfer 2023.0.4, 2022.1.8, 2022.0.8, 2021.0.10"],
                "remediation": "Apply the vendor patch immediately. Check for indicators of compromise (IOCs) and review all transfer logs for unauthorised access.",
            },
            {
                "cve_id": "CVE-2023-29357",
                "title": "Microsoft SharePoint Server Privilege Escalation",
                "description": "A vulnerability in Microsoft SharePoint Server that allows an unauthenticated attacker to gain administrator privileges by bypassing authentication through JWT token manipulation.",
                "severity": "critical",
                "cvss_score": 9.8,
                "affected_products": ["Microsoft SharePoint Server 2019, Subscription Edition"],
                "patched_versions": ["June 2023 cumulative security updates"],
                "remediation": "Apply the latest Microsoft security updates. Enable multi-factor authentication for all administrative accounts.",
            },
            {
                "cve_id": "CVE-2023-27997",
                "title": "Fortinet FortiOS SSL-VPN Heap Overflow",
                "description": "A heap-based buffer overflow in FortiOS SSL-VPN that allows remote unauthenticated attackers to execute arbitrary code or commands via specially crafted requests.",
                "severity": "critical",
                "cvss_score": 9.2,
                "affected_products": ["FortiOS 6.0, 6.2, 6.4, 7.0, 7.2; FortiProxy 2.0, 7.0, 7.2"],
                "patched_versions": ["FortiOS 7.2.5+, 7.0.12+, 6.4.13+, 6.2.15+, 6.0.17+"],
                "remediation": "Upgrade to the latest patched FortiOS version immediately. Disable SSL-VPN if not required.",
            },
            {
                "cve_id": "CVE-2023-22515",
                "title": "Atlassian Confluence Data Center Authentication Bypass",
                "description": "A critical authentication bypass vulnerability in Atlassian Confluence Data Center and Server that allows unauthenticated attackers to create administrative accounts and gain full control.",
                "severity": "critical",
                "cvss_score": 9.8,
                "affected_products": ["Confluence Data Center and Server 8.0.0 through 8.5.1"],
                "patched_versions": ["Confluence 8.5.2, 8.4.5, 8.3.4, 8.2.4, 8.1.5, 8.0.5"],
                "remediation": "Upgrade to the latest patched version immediately. Check for unauthorised administrator accounts and review access logs.",
            },
            {
                "cve_id": "CVE-2023-36884",
                "title": "Microsoft Office and Windows HTML Remote Code Execution",
                "description": "A remote code execution vulnerability in Microsoft Office and Windows that allows attackers to execute arbitrary code by tricking users into opening malicious Office documents.",
                "severity": "high",
                "cvss_score": 8.8,
                "affected_products": ["Microsoft Office 2019, 2021, Office 365; Windows 10, 11"],
                "patched_versions": ["July 2023 cumulative security updates"],
                "remediation": "Apply Microsoft security updates. Enable Protected View for Office documents. Block ActiveX controls in Internet Explorer mode.",
            },
            {
                "cve_id": "CVE-2023-23397",
                "title": "Microsoft Outlook NTLM Relay (Critical)",
                "description": "A critical privilege escalation vulnerability in Microsoft Outlook that allows attackers to steal NTLM credentials and authenticate as the victim without any user interaction by sending a malicious meeting request.",
                "severity": "critical",
                "cvss_score": 9.8,
                "affected_products": ["Microsoft Outlook 2013, 2016, 2019, 2021, Office 365"],
                "patched_versions": ["March 2023 cumulative security updates"],
                "remediation": "Apply the March 2023 security updates. Add users to the Protected Users group. Block outbound NTLM authentication.",
            },
            {
                "cve_id": "CVE-2022-22965",
                "title": "Spring4Shell — Spring Framework RCE",
                "description": "A remote code execution vulnerability in the Spring Framework that allows attackers to execute arbitrary code on the server via data binding when running on Tomcat with JDK 9+. Affects applications using Spring MVC or Spring WebFlux.",
                "severity": "critical",
                "cvss_score": 9.8,
                "affected_products": ["Spring Framework 5.3.x before 5.3.18, 5.2.x before 5.2.20"],
                "patched_versions": ["Spring Framework 5.3.18+, 5.2.20+"],
                "remediation": "Upgrade Spring Framework to the patched versions. If running on Tomcat, upgrade Tomcat as well. Review application logs for exploitation attempts.",
            },
            {
                "cve_id": "CVE-2022-26134",
                "title": "Atlassian Confluence OGNL Injection RCE",
                "description": "An OGNL (Object-Graph Navigation Language) injection vulnerability in Atlassian Confluence that allows unauthenticated remote code execution. An attacker can execute arbitrary code on the server by sending a crafted request.",
                "severity": "critical",
                "cvss_score": 9.8,
                "affected_products": ["Confluence Server and Data Center 1.3.0 through 7.18.0"],
                "patched_versions": ["Confluence 7.18.1, 7.17.3, 7.16.5, 7.15.3, 7.4.17"],
                "remediation": "Upgrade Confluence immediately. If patching is delayed, restrict Confluence access to trusted networks only.",
            },
            {
                "cve_id": "CVE-2021-45046",
                "title": "Log4j Denial of Service / Information Leakage",
                "description": "A follow-up to Log4Shell (CVE-2021-44228) where the initial fix in 2.15.0 was incomplete. Under certain circumstances, attackers could still perform remote code execution or cause denial of service via JNDI lookups.",
                "severity": "critical",
                "cvss_score": 9.0,
                "affected_products": ["Apache Log4j 2.15.0 (initial fix was incomplete)"],
                "patched_versions": ["Apache Log4j 2.16.0+ (2.17.1 recommended)"],
                "remediation": "Upgrade Log4j to 2.17.1 or later. Do not rely solely on the 2.15.0 fix.",
            },
            {
                "cve_id": "CVE-2023-0669",
                "title": "GoAnywhere MFT Remote Code Execution",
                "description": "A remote code execution vulnerability in Fortra GoAnywhere Managed File Transfer (MFT) that allows unauthenticated attackers to execute arbitrary code on the server. The vulnerability is in the License Servlet response handling.",
                "severity": "critical",
                "cvss_score": 9.8,
                "affected_products": ["GoAnywhere MFT before 7.1.2"],
                "patched_versions": ["GoAnywhere MFT 7.1.2+"],
                "remediation": "Upgrade GoAnywhere MFT to 7.1.2 or later. Check for unauthorised administrative accounts and review system logs.",
            },
            {
                "cve_id": "CVE-2023-21716",
                "title": "Microsoft Word Remote Code Execution (RTF)",
                "description": "A remote code execution vulnerability in Microsoft Word that allows attackers to execute arbitrary code when a victim opens a malicious RTF (Rich Text Format) document. The vulnerability is in the Microsoft Office Graphics component.",
                "severity": "high",
                "cvss_score": 8.8,
                "affected_products": ["Microsoft Office 2013, 2016, 2019, 2021, Office 365"],
                "patched_versions": ["February 2023 cumulative security updates"],
                "remediation": "Apply Microsoft security updates. Disable opening of RTF files in Word if not required.",
            },
            {
                "cve_id": "CVE-2023-20873",
                "title": "Spring Boot Remote Code Execution (DevTools)",
                "description": "A remote code execution vulnerability in Spring Boot when the DevTools package is present in production deployments. Attackers can exploit the insecure deserialization of trusted packages.",
                "severity": "high",
                "cvss_score": 8.1,
                "affected_products": ["Spring Boot 2.7.x, 3.0.x with spring-boot-devtools"],
                "patched_versions": ["Spring Boot 2.7.11, 3.0.6"],
                "remediation": "Remove spring-boot-devtools from production builds. Upgrade to patched versions if devtools are required.",
            },
            {
                "cve_id": "CVE-2023-44487",
                "title": "HTTP/2 Rapid Reset DDoS Attack",
                "description": "A vulnerability in the HTTP/2 protocol that allows distributed denial of service (DDoS) attacks through rapid stream resets. Attackers can overwhelm servers with significantly less bandwidth than traditional DDoS attacks.",
                "severity": "high",
                "cvss_score": 7.5,
                "affected_products": ["All HTTP/2 implementations (nginx, Apache, IIS, Cloudflare, etc.)"],
                "patched_versions": ["Vendor-specific patches — update all HTTP/2 server software"],
                "remediation": "Update all HTTP/2 server software to latest versions. Implement rate limiting and connection limits. Consider using a DDoS protection service.",
            },
            {
                "cve_id": "CVE-2023-4911",
                "title": "Looney Tunables — glibc ld.so Local Privilege Escalation",
                "description": "A buffer overflow vulnerability in the GNU C Library dynamic loader (ld.so) that allows local privilege escalation. An attacker can gain root privileges by manipulating the GLIBC_TUNABLES environment variable.",
                "severity": "high",
                "cvss_score": 7.8,
                "affected_products": ["glibc 2.34, 2.35, 2.36, 2.37"],
                "patched_versions": ["glibc 2.38+ with patch, vendor backports"],
                "remediation": "Apply the glibc security patch from your Linux distribution. Monitor for suspicious environment variable manipulation.",
            },
            {
                "cve_id": "CVE-2023-0264",
                "title": "Linux Kernel Privilege Escalation (KernelCAT)",
                "description": "A use-after-free vulnerability in the Linux kernel's memory management subsystem that allows local attackers to escalate privileges to root. The vulnerability is in the kernel's handling of certain memory pages.",
                "severity": "high",
                "cvss_score": 7.8,
                "affected_products": ["Linux kernel 5.15.x, 6.0.x, 6.1.x before 6.1.12"],
                "patched_versions": ["Linux kernel 6.1.12+, 6.0.19+, 5.15.94+"],
                "remediation": "Update the Linux kernel to the patched version. Apply the latest distribution security updates.",
            },
            {
                "cve_id": "CVE-2023-38434",
                "title": "Ivanti EPMM (MobileIron) Authentication Bypass",
                "description": "An authentication bypass vulnerability in Ivanti Endpoint Manager Mobile (EPMM, formerly MobileIron) that allows unauthenticated attackers to access restricted functionality and potentially execute arbitrary code.",
                "severity": "critical",
                "cvss_score": 9.8,
                "affected_products": ["Ivanti EPMM before 11.10, 11.9.1"],
                "patched_versions": ["Ivanti EPMM 11.10, 11.9.1"],
                "remediation": "Upgrade to Ivanti EPMM 11.10 or 11.9.1 immediately. Rotate all API keys and administrative credentials.",
            },
            {
                "cve_id": "CVE-2023-20198",
                "title": "Cisco IOS XE Web UI Privilege Escalation",
                "description": "A critical vulnerability in the Cisco IOS XE Web UI that allows remote, unauthenticated attackers to create an account with privilege level 15 (administrator) access, leading to full device compromise.",
                "severity": "critical",
                "cvss_score": 10.0,
                "affected_products": ["Cisco IOS XE with Web UI enabled"],
                "patched_versions": ["Cisco IOS XE 17.9.4a, 17.9.3a, 17.6.6a"],
                "remediation": "Apply Cisco's security patch immediately. Disable the Web UI if not required. Monitor for unauthorised accounts.",
            },
            {
                "cve_id": "CVE-2023-42887",
                "title": "Apple iOS/macOS Kernel Privilege Escalation",
                "description": "A kernel vulnerability in Apple operating systems that allows a local attacker to escalate privileges. The issue is in the kernel's handling of certain system calls, potentially leading to arbitrary code execution with kernel privileges.",
                "severity": "high",
                "cvss_score": 7.8,
                "affected_products": ["iOS 16.x, iPadOS 16.x, macOS Ventura 13.x, watchOS 9.x"],
                "patched_versions": ["iOS 16.7.2, iPadOS 16.7.2, macOS Ventura 13.6.1, watchOS 9.6.3"],
                "remediation": "Update all Apple devices to the latest patched OS versions. Apply security updates promptly.",
            },
            {
                "cve_id": "CVE-2023-36584",
                "title": "Microsoft Windows Mark of the Web Bypass",
                "description": "A security feature bypass vulnerability in Microsoft Windows that allows attackers to bypass the Mark of the Web (MOTW) security warning. This enables malicious files downloaded from the internet to execute without triggering SmartScreen warnings.",
                "severity": "medium",
                "cvss_score": 6.5,
                "affected_products": ["Windows 10, Windows 11, Windows Server 2019, 2022"],
                "patched_versions": ["October 2023 cumulative security updates"],
                "remediation": "Apply the latest Windows security updates. Train users to verify file sources even when no warning appears.",
            },
            {
                "cve_id": "CVE-2023-29336",
                "title": "Microsoft Windows Win32k Privilege Escalation",
                "description": "A privilege escalation vulnerability in the Windows Win32k subsystem that allows authenticated local attackers to gain SYSTEM privileges. The vulnerability is due to improper handling of objects in memory.",
                "severity": "high",
                "cvss_score": 7.8,
                "affected_products": ["Windows 10, Windows 11, Windows Server 2019, 2022"],
                "patched_versions": ["May 2023 cumulative security updates"],
                "remediation": "Apply the latest Windows security updates. Implement principle of least privilege for user accounts.",
            },
        ]

    def _seed_training_modules(self) -> List[Dict[str, Any]]:
        """Seed the training module library.

        Returns:
            List of training module dictionaries.
        """
        modules = [
            {
                "module_id": "SEC-101",
                "title": "Cybersecurity Fundamentals",
                "description": "An introduction to core cybersecurity concepts including the CIA triad, threat actors, attack vectors, and fundamental defensive strategies. Essential for anyone starting their cybersecurity journey.",
                "category": "fundamentals",
                "level": "beginner",
                "duration_minutes": 60,
                "lessons_count": 5,
                "topics": ["CIA Triad", "Threat Actors", "Attack Vectors", "Defence in Depth", "Security Controls"],
            },
            {
                "module_id": "SEC-102",
                "title": "Network Security & Firewalls",
                "description": "Learn the fundamentals of network security including TCP/IP security, firewalls, IDS/IPS, VPNs, and network segmentation. Covers both theory and practical configuration guidance.",
                "category": "network_security",
                "level": "beginner",
                "duration_minutes": 90,
                "lessons_count": 6,
                "topics": ["TCP/IP Security", "Firewalls", "IDS/IPS", "VPN Technologies", "Network Segmentation", "Port Scanning"],
            },
            {
                "module_id": "SEC-201",
                "title": "Web Application Security (OWASP Top 10)",
                "description": "Deep dive into the OWASP Top 10 web application security risks. Learn how to identify, exploit, and remediate vulnerabilities including injection, XSS, broken authentication, and insecure deserialisation.",
                "category": "web_security",
                "level": "intermediate",
                "duration_minutes": 120,
                "lessons_count": 10,
                "topics": ["Injection", "Broken Authentication", "Sensitive Data Exposure", "XXE", "Broken Access Control", "Security Misconfiguration", "XSS", "Insecure Deserialisation", "Known Vulnerabilities", "Insufficient Logging"],
            },
            {
                "module_id": "SEC-103",
                "title": "Social Engineering & Phishing Defence",
                "description": "Understand social engineering tactics used by attackers and learn how to defend against phishing, pretexting, baiting, and other psychological manipulation techniques. Includes real-world case studies.",
                "category": "fundamentals",
                "level": "beginner",
                "duration_minutes": 45,
                "lessons_count": 4,
                "topics": ["Types of Social Engineering", "Phishing Techniques", "Red Flags", "Reporting Procedures", "Security Awareness"],
            },
            {
                "module_id": "SEC-202",
                "title": "Incident Response Fundamentals",
                "description": "Learn the structured approach to handling security incidents. Covers the incident response lifecycle: preparation, detection & analysis, containment, eradication, recovery, and post-incident activities.",
                "category": "incident_response",
                "level": "intermediate",
                "duration_minutes": 75,
                "lessons_count": 6,
                "topics": ["NIST Incident Response Lifecycle", "Preparation", "Detection & Analysis", "Containment Strategies", "Eradication & Recovery", "Post-Incident Activity"],
            },
            {
                "module_id": "SEC-203",
                "title": "Cloud Security Essentials",
                "description": "Essential cloud security concepts for AWS, Azure, and GCP. Covers shared responsibility model, identity and access management, data protection, network security, and compliance in cloud environments.",
                "category": "cloud_security",
                "level": "intermediate",
                "duration_minutes": 90,
                "lessons_count": 7,
                "topics": ["Shared Responsibility Model", "IAM Best Practices", "Data Encryption", "Network Security", "Container Security", "Cloud Monitoring", "Compliance in Cloud"],
            },
            {
                "module_id": "SEC-204",
                "title": "Cryptography & Encryption",
                "description": "Understand cryptographic principles including symmetric and asymmetric encryption, hashing, digital signatures, PKI, TLS/SSL, and modern cryptographic protocols. Covers both theoretical foundations and practical applications.",
                "category": "advanced",
                "level": "intermediate",
                "duration_minutes": 100,
                "lessons_count": 8,
                "topics": ["Cryptographic Principles", "Symmetric Encryption", "Asymmetric Encryption", "Hashing", "Digital Signatures", "PKI", "TLS/SSL", "Quantum Cryptography"],
            },
            {
                "module_id": "SEC-301",
                "title": "Malware Analysis Basics",
                "description": "Introduction to malware analysis techniques including static analysis, dynamic analysis, and reverse engineering. Learn to identify malware types, extract IOCs, and understand attacker techniques.",
                "category": "advanced",
                "level": "advanced",
                "duration_minutes": 150,
                "lessons_count": 10,
                "topics": ["Malware Types", "Static Analysis", "Dynamic Analysis", "Reverse Engineering", "Memory Forensics", "IOC Extraction", "Sandboxes", "YARA Rules", "Behavioural Analysis", "Report Writing"],
            },
            {
                "module_id": "SEC-302",
                "title": "Penetration Testing Methodology",
                "description": "Comprehensive penetration testing methodology following PTES and OWASP standards. Covers reconnaissance, scanning, exploitation, post-exploitation, and reporting. Emphasises legal and ethical considerations.",
                "category": "advanced",
                "level": "advanced",
                "duration_minutes": 180,
                "lessons_count": 12,
                "topics": ["PTES Framework", "Legal & Ethics", "Reconnaissance", "Scanning & Enumeration", "Vulnerability Analysis", "Exploitation", "Post-Exploitation", "Lateral Movement", "Privilege Escalation", "Reporting", "Remediation", "Red Teaming"],
            },
            {
                "module_id": "SEC-205",
                "title": "POPIA Compliance for South African Organizations",
                "description": "Comprehensive guide to South Africa's Protection of Personal Information Act (POPIA). Learn about the eight conditions for lawful processing, data subject rights, information officer responsibilities, and compliance strategies.",
                "category": "compliance",
                "level": "intermediate",
                "duration_minutes": 80,
                "lessons_count": 7,
                "topics": ["POPIA Overview", "Eight Conditions", "Data Subject Rights", "Information Officer", "Compliance Roadmap", "PAIA & POPIA", "Enforcement & Penalties"],
            },
            {
                "module_id": "SEC-303",
                "title": "Zero Trust Architecture",
                "description": "Deep dive into Zero Trust security architecture principles. Learn to design and implement a Zero Trust model based on NIST SP 800-207, including identity verification, micro-segmentation, and continuous monitoring.",
                "category": "network_security",
                "level": "advanced",
                "duration_minutes": 120,
                "lessons_count": 8,
                "topics": ["Zero Trust Principles", "NIST SP 800-207", "Identity Verification", "Micro-Segmentation", "Least Privilege Access", "Continuous Monitoring", "Device Trust", "Implementation Roadmap"],
            },
            {
                "module_id": "SEC-206",
                "title": "Security Operations Center (SOC) Fundamentals",
                "description": "Introduction to SOC operations including SIEM deployment, alert triage, threat hunting, and incident escalation. Learn how modern SOCs function and the tools and processes that drive effective security operations.",
                "category": "network_security",
                "level": "intermediate",
                "duration_minutes": 100,
                "lessons_count": 8,
                "topics": ["SOC Roles & Responsibilities", "SIEM Fundamentals", "Alert Triage", "Threat Hunting", "Incident Escalation", "Playbook Development", "Metrics & KPIs", "SOAR Integration"],
            },
            {
                "module_id": "SEC-304",
                "title": "Advanced Persistent Threat (APT) Detection",
                "description": "Advanced techniques for detecting and responding to sophisticated APT campaigns. Covers threat intelligence, behavioural analytics, lateral movement detection, and attribution methodologies.",
                "category": "advanced",
                "level": "expert",
                "duration_minutes": 140,
                "lessons_count": 9,
                "topics": ["APT Lifecycle", "Threat Intelligence", "Behavioural Analytics", "Lateral Movement Detection", "Memory Forensics", "Network Traffic Analysis", "Attribution", "Hunting Hypotheses", "Advanced IOCs"],
            },
            {
                "module_id": "SEC-207",
                "title": "Secure Software Development (DevSecOps)",
                "description": "Integrating security into the software development lifecycle. Covers SAST, DAST, SCA, secure coding practices, container security, and CI/CD pipeline security. Aligns with OWASP SAMM and BSIMM.",
                "category": "web_security",
                "level": "intermediate",
                "duration_minutes": 110,
                "lessons_count": 8,
                "topics": ["DevSecOps Principles", "SAST/DAST/SCA", "Secure Coding", "Container Security", "CI/CD Security", "Secrets Management", "Vulnerability Management", "Security Champions"],
            },
        ]

        # Attach lesson content to each module
        self._attach_lessons(modules)
        return modules

    def _attach_lessons(self, modules: List[Dict[str, Any]]) -> None:
        """Attach detailed lesson content and quiz questions to training modules."""
        for module in modules:
            module["lessons"] = self._generate_lessons_for_module(module)

    def _generate_lessons_for_module(self, module: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate lesson content for a specific module.

        Args:
            module: The training module dictionary.

        Returns:
            List of lesson dictionaries with content and quizzes.
        """
        lessons: List[Dict[str, Any]] = []
        for idx, topic in enumerate(module["topics"]):
            lesson_id = f"{module['module_id']}-L{idx + 1:02d}"
            lessons.append({
                "lesson_id": lesson_id,
                "title": topic,
                "content": f"## {topic}\n\n"
                           f"This lesson covers **{topic}** as part of the "
                           f"{module['title']} module.\n\n"
                           f"### Learning Objectives\n"
                           f"- Understand the core concepts of {topic}\n"
                           f"- Identify key components and mechanisms\n"
                           f"- Apply best practices in real-world scenarios\n"
                           f"- Recognise common pitfalls and misconfigurations\n\n"
                           f"### Key Concepts\n"
                           f"{topic} is a fundamental area of study within "
                           f"{module['category'].replace('_', ' ')}. Mastery of this "
                           f"topic is essential for progressing to more advanced subjects.\n\n"
                           f"### Practical Application\n"
                           f"Consider the following scenario: An organisation is assessing "
                           f"its security posture in relation to {topic}. What controls, "
                           f"processes, and technologies should be implemented to ensure "
                           f"comprehensive protection?\n\n"
                           f"### Review Questions\n"
                           f"Test your understanding with the quiz questions below.",
                "key_takeaways": [
                    f"Understand the fundamentals of {topic}",
                    f"Identify risks and threats related to {topic}",
                    f"Apply defensive controls and countermeasures",
                    f"Integrate {topic} into an overall security strategy",
                ],
                "quiz_questions": [
                    {
                        "question": f"What is the primary purpose of {topic} in a security context?",
                        "options": [
                            "To increase system performance",
                            "To protect assets and reduce risk",
                            "To replace manual processes",
                            "To comply with marketing requirements",
                        ],
                        "correct": 1,
                        "explanation": f"The primary purpose of {topic} is to protect organisational assets and reduce security risk.",
                    },
                    {
                        "question": f"Which of the following best describes a common misconfiguration related to {topic}?",
                        "options": [
                            "Using strong encryption",
                            "Default credentials or excessive permissions",
                            "Regular patch management",
                            "Multi-factor authentication",
                        ],
                        "correct": 1,
                        "explanation": "Default credentials and excessive permissions are common misconfigurations that increase attack surface.",
                    },
                ],
            })
        return lessons

    def _seed_incident_playbooks(self) -> List[Dict[str, Any]]:
        """Seed the incident response playbook library.

        Returns:
            List of incident playbook dictionaries.
        """
        return [
            {
                "playbook_id": "IR-MALWARE-001",
                "type": "malware",
                "title": "Malware Outbreak Response",
                "severity": "high",
                "phases": [
                    {
                        "name": "Detection & Identification",
                        "steps": [
                            {"order": 1, "action": "Confirm malware detection via antivirus, EDR, or user report", "responsible": "SOC Analyst", "timeframe": "0-15 min"},
                            {"order": 2, "action": "Collect initial IOCs: file hashes, filenames, registry keys", "responsible": "SOC Analyst", "timeframe": "15-30 min"},
                            {"order": 3, "action": "Classify malware type (ransomware, trojan, worm, etc.)", "responsible": "Malware Analyst", "timeframe": "30-60 min"},
                        ],
                    },
                    {
                        "name": "Containment",
                        "steps": [
                            {"order": 4, "action": "Isolate affected systems from the network", "responsible": "IT Operations", "timeframe": "Immediate"},
                            {"order": 5, "action": "Block known IOCs at firewall, proxy, and DNS levels", "responsible": "Network Team", "timeframe": "0-30 min"},
                            {"order": 6, "action": "Disable affected user accounts if compromised", "responsible": "Identity Team", "timeframe": "0-30 min"},
                        ],
                    },
                    {
                        "name": "Eradication",
                        "steps": [
                            {"order": 7, "action": "Terminate malicious processes and delete malware files", "responsible": "IT Operations", "timeframe": "1-2 hours"},
                            {"order": 8, "action": "Apply antivirus/EDR remediation and verify cleanliness", "responsible": "Security Team", "timeframe": "2-4 hours"},
                            {"order": 9, "action": "Patch vulnerabilities exploited by the malware", "responsible": "IT Operations", "timeframe": "4-24 hours"},
                        ],
                    },
                    {
                        "name": "Recovery",
                        "steps": [
                            {"order": 10, "action": "Restore affected systems from clean backups", "responsible": "IT Operations", "timeframe": "4-48 hours"},
                            {"order": 11, "action": "Verify system integrity before reconnection", "responsible": "Security Team", "timeframe": "Per system"},
                            {"order": 12, "action": "Monitor reconnected systems for recurrence", "responsible": "SOC Analyst", "timeframe": "72 hours"},
                        ],
                    },
                    {
                        "name": "Post-Incident Activity",
                        "steps": [
                            {"order": 13, "action": "Document full incident timeline and actions taken", "responsible": "Incident Lead", "timeframe": "24-48 hours"},
                            {"order": 14, "action": "Conduct lessons-learned session", "responsible": "Incident Lead", "timeframe": "1 week"},
                            {"order": 15, "action": "Update security controls based on findings", "responsible": "Security Team", "timeframe": "2 weeks"},
                        ],
                    },
                ],
            },
            {
                "playbook_id": "IR-PHISH-001",
                "type": "phishing",
                "title": "Phishing Incident Response",
                "severity": "medium",
                "phases": [
                    {
                        "name": "Detection & Reporting",
                        "steps": [
                            {"order": 1, "action": "Receive phishing report via security mailbox or user report", "responsible": "SOC Analyst", "timeframe": "0-15 min"},
                            {"order": 2, "action": "Analyse email headers, URLs, and attachments", "responsible": "SOC Analyst", "timeframe": "15-30 min"},
                            {"order": 3, "action": "Determine if any users clicked links or opened attachments", "responsible": "SOC Analyst", "timeframe": "30-60 min"},
                        ],
                    },
                    {
                        "name": "Containment",
                        "steps": [
                            {"order": 4, "action": "Remove phishing emails from all mailboxes", "responsible": "Email Admin", "timeframe": "0-30 min"},
                            {"order": 5, "action": "Block sender domain/IP and malicious URLs", "responsible": "Network Team", "timeframe": "0-30 min"},
                            {"order": 6, "action": "Reset credentials for affected users", "responsible": "Identity Team", "timeframe": "0-1 hour"},
                        ],
                    },
                    {
                        "name": "Investigation",
                        "steps": [
                            {"order": 7, "action": "Check proxy and DNS logs for callbacks to C2 domains", "responsible": "SOC Analyst", "timeframe": "1-2 hours"},
                            {"order": 8, "action": "Scan affected endpoints for malware or indicators of compromise", "responsible": "Security Team", "timeframe": "2-4 hours"},
                            {"order": 9, "action": "Review mailbox rules and forwarding configurations", "responsible": "Email Admin", "timeframe": "1-2 hours"},
                        ],
                    },
                    {
                        "name": "Recovery & Hardening",
                        "steps": [
                            {"order": 10, "action": "Re-enable affected accounts after verification", "responsible": "Identity Team", "timeframe": "Per account"},
                            {"order": 11, "action": "Update email filtering rules and phishing detection", "responsible": "Email Admin", "timeframe": "1-2 hours"},
                            {"order": 12, "action": "Notify affected users with guidance", "responsible": "Communications", "timeframe": "Same day"},
                        ],
                    },
                    {
                        "name": "Post-Incident",
                        "steps": [
                            {"order": 13, "action": "Update phishing awareness training materials", "responsible": "Security Awareness", "timeframe": "1 week"},
                            {"order": 14, "action": "Report phishing to relevant authorities (e.g., phishing@gov.za in SA)", "responsible": "SOC Analyst", "timeframe": "24 hours"},
                        ],
                    },
                ],
            },
            {
                "playbook_id": "IR-BREACH-001",
                "type": "data_breach",
                "title": "Data Breach Response",
                "severity": "critical",
                "phases": [
                    {
                        "name": "Discovery & Assessment",
                        "steps": [
                            {"order": 1, "action": "Verify the breach through log analysis and forensic evidence", "responsible": "Security Team", "timeframe": "0-2 hours"},
                            {"order": 2, "action": "Determine scope: what data, how many records, which systems", "responsible": "Incident Lead", "timeframe": "2-4 hours"},
                            {"order": 3, "action": "Classify data sensitivity (PII, financial, health, IP)", "responsible": "Data Protection Officer", "timeframe": "4-8 hours"},
                        ],
                    },
                    {
                        "name": "Containment",
                        "steps": [
                            {"order": 4, "action": "Stop ongoing data exfiltration immediately", "responsible": "Network Team", "timeframe": "Immediate"},
                            {"order": 5, "action": "Revoke compromised accounts and rotate credentials", "responsible": "Identity Team", "timeframe": "0-2 hours"},
                            {"order": 6, "action": "Preserve forensic evidence before remediation", "responsible": "Forensics Team", "timeframe": "2-6 hours"},
                        ],
                    },
                    {
                        "name": "Notification",
                        "steps": [
                            {"order": 7, "action": "Assess legal and regulatory notification obligations (POPIA, GDPR)", "responsible": "Legal / DPO", "timeframe": "24-48 hours"},
                            {"order": 8, "action": "Notify affected data subjects within required timeframe", "responsible": "Legal / DPO", "timeframe": "Per regulation"},
                            {"order": 9, "action": "Notify Information Regulator (SA) if required under POPIA", "responsible": "Information Officer", "timeframe": "As soon as reasonably possible"},
                        ],
                    },
                    {
                        "name": "Remediation",
                        "steps": [
                            {"order": 10, "action": "Patch the vulnerability that enabled the breach", "responsible": "IT Operations", "timeframe": "24-72 hours"},
                            {"order": 11, "action": "Implement additional access controls and monitoring", "responsible": "Security Team", "timeframe": "1-2 weeks"},
                            {"order": 12, "action": "Conduct full security audit of affected systems", "responsible": "Security Team", "timeframe": "1-2 weeks"},
                        ],
                    },
                    {
                        "name": "Post-Incident",
                        "steps": [
                            {"order": 13, "action": "Document full incident report", "responsible": "Incident Lead", "timeframe": "1-2 weeks"},
                            {"order": 14, "action": "Review and update data handling policies", "responsible": "DPO", "timeframe": "2-4 weeks"},
                            {"order": 15, "action": "Assess need for credit monitoring or identity protection services", "responsible": "Legal", "timeframe": "Per case"},
                        ],
                    },
                ],
            },
            {
                "playbook_id": "IR-RANSOM-001",
                "type": "ransomware",
                "title": "Ransomware Attack Response",
                "severity": "critical",
                "phases": [
                    {
                        "name": "Detection & Triage",
                        "steps": [
                            {"order": 1, "action": "Confirm ransomware detection: encrypted files, ransom note, file extensions", "responsible": "SOC Analyst", "timeframe": "0-15 min"},
                            {"order": 2, "action": "Identify ransomware variant from ransom note or file extension", "responsible": "Malware Analyst", "timeframe": "15-30 min"},
                            {"order": 3, "action": "Assess spread: how many systems are affected", "responsible": "SOC Analyst", "timeframe": "30-60 min"},
                        ],
                    },
                    {
                        "name": "Containment",
                        "steps": [
                            {"order": 4, "action": "Immediately disconnect affected systems from the network", "responsible": "IT Operations", "timeframe": "Immediate"},
                            {"order": 5, "action": "Disable VPN and remote access temporarily", "responsible": "Network Team", "timeframe": "0-30 min"},
                            {"order": 6, "action": "Preserve the ransom note for potential forensic analysis", "responsible": "Forensics Team", "timeframe": "0-1 hour"},
                        ],
                    },
                    {
                        "name": "Eradication",
                        "steps": [
                            {"order": 7, "action": "DO NOT PAY THE RANSOM — contact law enforcement first", "responsible": "Incident Lead", "timeframe": "Immediate"},
                            {"order": 8, "action": "Identify and remove ransomware binaries from all systems", "responsible": "IT Operations", "timeframe": "2-8 hours"},
                            {"order": 9, "action": "Close the initial access vector (patch, reconfigure, or remove)", "responsible": "Security Team", "timeframe": "4-24 hours"},
                        ],
                    },
                    {
                        "name": "Recovery",
                        "steps": [
                            {"order": 10, "action": "Restore from clean, verified backups only", "responsible": "IT Operations", "timeframe": "4-72 hours"},
                            {"order": 11, "action": "Verify backup integrity before restoration", "responsible": "Backup Admin", "timeframe": "Per system"},
                            {"order": 12, "action": "Prioritise critical systems for early restoration", "responsible": "IT Operations", "timeframe": "Immediate"},
                        ],
                    },
                    {
                        "name": "Post-Incident",
                        "steps": [
                            {"order": 13, "action": "Report incident to law enforcement and relevant authorities", "responsible": "Legal", "timeframe": "24 hours"},
                            {"order": 14, "action": "Conduct root cause analysis", "responsible": "Security Team", "timeframe": "1 week"},
                            {"order": 15, "action": "Implement enhanced backup and segmentation strategies", "responsible": "IT Operations", "timeframe": "2-4 weeks"},
                        ],
                    },
                ],
            },
            {
                "playbook_id": "IR-DDOS-001",
                "type": "ddos",
                "title": "DDoS Attack Response",
                "severity": "high",
                "phases": [
                    {
                        "name": "Detection",
                        "steps": [
                            {"order": 1, "action": "Confirm DDoS attack via traffic monitoring and baseline comparison", "responsible": "SOC Analyst", "timeframe": "0-15 min"},
                            {"order": 2, "action": "Identify attack type: volumetric, protocol, or application layer", "responsible": "Network Team", "timeframe": "15-30 min"},
                            {"order": 3, "action": "Determine target: specific service, IP, or infrastructure", "responsible": "Network Team", "timeframe": "15-30 min"},
                        ],
                    },
                    {
                        "name": "Mitigation",
                        "steps": [
                            {"order": 4, "action": "Activate DDoS mitigation service (e.g., Cloudflare, AWS Shield)", "responsible": "Network Team", "timeframe": "0-30 min"},
                            {"order": 5, "action": "Implement rate limiting and traffic filtering at perimeter", "responsible": "Network Team", "timeframe": "0-30 min"},
                            {"order": 6, "action": "Scale infrastructure if using cloud auto-scaling", "responsible": "Cloud Team", "timeframe": "0-30 min"},
                        ],
                    },
                    {
                        "name": "Monitoring",
                        "steps": [
                            {"order": 7, "action": "Monitor traffic patterns for attack evolution", "responsible": "SOC Analyst", "timeframe": "Continuous"},
                            {"order": 8, "action": "Adjust mitigation rules as attack characteristics change", "responsible": "Network Team", "timeframe": "As needed"},
                            {"order": 9, "action": "Communicate with ISP or upstream provider for large attacks", "responsible": "Network Team", "timeframe": "0-1 hour"},
                        ],
                    },
                    {
                        "name": "Recovery",
                        "steps": [
                            {"order": 10, "action": "Confirm attack has subsided and traffic is normal", "responsible": "SOC Analyst", "timeframe": "During/after"},
                            {"order": 11, "action": "Gradually remove emergency mitigation measures", "responsible": "Network Team", "timeframe": "Post-attack"},
                            {"order": 12, "action": "Verify all services are functioning normally", "responsible": "IT Operations", "timeframe": "1-2 hours"},
                        ],
                    },
                    {
                        "name": "Post-Incident",
                        "steps": [
                            {"order": 13, "action": "Document attack characteristics and timeline", "responsible": "Incident Lead", "timeframe": "24 hours"},
                            {"order": 14, "action": "Review DDoS mitigation effectiveness", "responsible": "Security Team", "timeframe": "1 week"},
                            {"order": 15, "action": "Update DDoS response plan with lessons learned", "responsible": "Security Team", "timeframe": "2 weeks"},
                        ],
                    },
                ],
            },
        ]

    def _seed_compliance_frameworks(self) -> List[Dict[str, Any]]:
        """Seed the compliance framework library.

        Returns:
            List of compliance framework dictionaries.
        """
        return [
            {
                "id": "NIST-CSF",
                "name": "NIST Cybersecurity Framework",
                "description": "The NIST Cybersecurity Framework (CSF) provides a policy framework of computer security guidance for how private sector organisations in the United States can assess and improve their ability to prevent, detect, and respond to cyber attacks.",
                "origin": "United States — National Institute of Standards and Technology",
                "controls_count": 108,
                "version": "2.0",
            },
            {
                "id": "ISO-27001",
                "name": "ISO/IEC 27001:2022",
                "description": "ISO/IEC 27001 is an international standard on how to manage information security. It provides a systematic approach to managing sensitive company information so that it remains secure through a set of policies, procedures, and technical controls.",
                "origin": "International — International Organization for Standardization",
                "controls_count": 93,
                "version": "2022",
            },
            {
                "id": "CIS-Controls",
                "name": "CIS Controls v8",
                "description": "The CIS Controls are a prioritised set of actions that collectively form a defence-in-depth set of best practices that mitigate the most common attacks against systems and networks. They are developed by the Center for Internet Security.",
                "origin": "United States — Center for Internet Security",
                "controls_count": 153,
                "version": "8.1",
            },
            {
                "id": "POPIA",
                "name": "POPIA — Protection of Personal Information Act",
                "description": "South Africa's comprehensive data protection law that regulates the processing of personal information. It establishes eight conditions for lawful processing and grants data subjects specific rights regarding their personal information.",
                "origin": "South Africa — Parliament of South Africa",
                "controls_count": 8,
                "version": "2020",
            },
            {
                "id": "NIST-800-53",
                "name": "NIST SP 800-53",
                "description": "NIST Special Publication 800-53 provides a comprehensive set of security and privacy controls for federal information systems and organisations. It is widely adopted beyond government use.",
                "origin": "United States — National Institute of Standards and Technology",
                "controls_count": 1061,
                "version": "Rev. 5",
            },
            {
                "id": "PCI-DSS",
                "name": "PCI DSS v4.0",
                "description": "The Payment Card Industry Data Security Standard (PCI DSS) is an information security standard for organisations that handle branded credit cards. It defines controls to protect cardholder data.",
                "origin": "International — PCI Security Standards Council",
                "controls_count": 78,
                "version": "4.0",
            },
        ]

    def _seed_practice_labs(self) -> List[Dict[str, Any]]:
        """Seed the hands-on practice lab scenarios.

        Returns:
            List of practice lab dictionaries.
        """
        return [
            {
                "lab_id": "LAB-001",
                "title": "Analyse a Phishing Email",
                "description": "Learn to identify and analyse phishing emails by examining headers, URLs, attachments, and social engineering techniques. This lab uses real-world examples (sanitised) to build practical detection skills.",
                "difficulty": "beginner",
                "category": "fundamentals",
                "steps": [
                    "Receive a suspicious email in the lab mailbox",
                    "Examine email headers for spoofing indicators (SPF, DKIM, DMARC)",
                    "Analyse embedded URLs using URL expansion and sandbox tools",
                    "Inspect attachments for macros or malicious payloads",
                    "Document findings and classify the email threat level",
                    "Write a brief incident report with recommended actions",
                ],
                "objectives": [
                    "Identify common phishing indicators",
                    "Read and interpret email headers",
                    "Safely analyse suspicious URLs and attachments",
                    "Document findings in a structured format",
                ],
            },
            {
                "lab_id": "LAB-002",
                "title": "Wireshark Traffic Analysis",
                "description": "Analyse network traffic captures using Wireshark to identify suspicious activity, malware communications, and protocol anomalies. Learn to filter, decode, and interpret packet captures for security investigations.",
                "difficulty": "intermediate",
                "category": "network_security",
                "steps": [
                    "Open the provided PCAP file in Wireshark",
                    "Apply display filters to isolate specific traffic types",
                    "Identify suspicious DNS queries and C2 beaconing patterns",
                    "Extract files transferred over HTTP/FTP",
                    "Follow TCP streams to reconstruct conversations",
                    "Generate an IOC list from observed malicious traffic",
                ],
                "objectives": [
                    "Master Wireshark filtering and navigation",
                    "Identify C2 communication patterns",
                    "Extract artefacts from packet captures",
                    "Create IOCs for threat intelligence",
                ],
            },
            {
                "lab_id": "LAB-003",
                "title": "DVWA Vulnerability Assessment",
                "description": "Perform a security assessment on Damn Vulnerable Web Application (DVWA) to identify and exploit common web vulnerabilities. Learn responsible disclosure and remediation techniques in a safe environment.",
                "difficulty": "intermediate",
                "category": "web_security",
                "steps": [
                    "Set up DVWA in a controlled lab environment",
                    "Perform reconnaissance and map the application",
                    "Test for SQL injection vulnerabilities (manual and automated)",
                    "Identify and exploit XSS vulnerabilities",
                    "Test for broken authentication and session management",
                    "Document all findings with severity ratings and remediation steps",
                ],
                "objectives": [
                    "Understand common web application vulnerabilities",
                    "Perform manual security testing",
                    "Use basic exploitation techniques responsibly",
                    "Write a professional vulnerability assessment report",
                ],
            },
            {
                "lab_id": "LAB-004",
                "title": "Incident Response: Contain a Malware Outbreak",
                "description": "Simulate a malware outbreak scenario and execute the full incident response lifecycle. Practice detection, containment, eradication, and recovery in a realistic SOC environment.",
                "difficulty": "advanced",
                "category": "incident_response",
                "steps": [
                    "Receive an alert from the SIEM indicating suspicious endpoint activity",
                    "Correlate alerts and confirm malware infection",
                    "Isolate affected endpoints from the network",
                ],
            },
            {
                "lab_id": "LAB-005",
                "title": "Configure a Firewall Ruleset",
                "description": "Design and implement a secure firewall ruleset for a corporate network segment. Learn to balance security requirements with business needs while following the principle of least privilege.",
                "difficulty": "intermediate",
                "category": "network_security",
                "steps": [
                    "Review the network topology and business requirements",
                    "Define security zones and trust boundaries",
                    "Create default-deny rules for each zone",
                    "Add explicit allow rules for required services",
                    "Implement logging rules for denied traffic",
                    "Test ruleset with simulated traffic and validate",
                    "Document the ruleset with justifications for each rule",
                ],
                "objectives": [
                    "Design a defence-in-depth network architecture",
                    "Apply the principle of least privilege to firewall rules",
                    "Implement effective logging and monitoring",
                    "Balance security with business requirements",
                ],
            },
        ]

    def _save_json(self, filename: str, data: Any) -> None:
        """Persist data to a JSON file in the data directory.

        Args:
            filename: Name of the JSON file (without path).
            data: Data structure to serialise.
        """
        filepath = self.DATA_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _load_json(self, filename: str, default: Any = None) -> Any:
        """Load data from a JSON file in the data directory.

        Args:
            filename: Name of the JSON file (without path).
            default: Value to return if file does not exist.

        Returns:
            Deserialised data or default value.
        """
        filepath = self.DATA_DIR / filename
        if not filepath.exists():
            return default
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)


    # =================================================================
    # 1. SECURITY ASSESSMENT
    # =================================================================

    def get_assessment_categories(self) -> dict:
        """List all available security assessment categories.

        Returns:
            Dictionary with a ``categories`` key containing a list of
            assessment category dictionaries.  Each entry has
            ``id``, ``name``, ``description``, and ``checks_count``.
        """
        categories = [
            {
                "id": "general",
                "name": "General Security Assessment",
                "description": "A broad evaluation of organisational security posture covering governance, risk management, asset management, and basic technical controls.",
                "checks_count": 25,
            },
            {
                "id": "web_app",
                "name": "Web Application Security Assessment",
                "description": "Focused evaluation of web application security against OWASP Top 10, covering authentication, authorisation, input validation, session management, and secure configuration.",
                "checks_count": 35,
            },
            {
                "id": "network",
                "name": "Network Security Assessment",
                "description": "Comprehensive network security review including perimeter defences, segmentation, firewall rules, VPN security, wireless security, and network monitoring.",
                "checks_count": 30,
            },
            {
                "id": "cloud",
                "name": "Cloud Security Assessment",
                "description": "Evaluation of cloud environment security across AWS, Azure, and GCP. Covers IAM, data protection, network security, logging, and compliance configurations.",
                "checks_count": 28,
            },
            {
                "id": "mobile",
                "name": "Mobile Application Security Assessment",
                "description": "Security review of mobile applications on iOS and Android platforms. Covers data storage, communication, authentication, code quality, and platform-specific risks.",
                "checks_count": 22,
            },
        ]
        self._save_json("assessment_categories.json", categories)
        return {"categories": categories}

    def run_security_assessment(self, domain: str = None, assessment_type: str = "general") -> dict:
        """Run a comprehensive security assessment.

        The assessment simulates a structured evaluation based on the
        requested type and generates realistic findings with
        recommendations.

        Args:
            domain: Optional target domain or scope for the assessment.
            assessment_type: One of ``general``, ``web_app``, ``network``,
                ``cloud``, ``mobile``.

        Returns:
            Dictionary with ``assessment_id``, ``type``, ``score`` (0-100),
            ``findings`` (list of severity/category/description/recommendation
            dicts), and ``risk_level``.
        """
        assessment_id = f"SA-{uuid.uuid4().hex[:8].upper()}"

        # Determine base score and number of findings based on type
        type_config = {
            "general": {"base_score": 72, "finding_count": 8, "checks": 25},
            "web_app": {"base_score": 65, "finding_count": 10, "checks": 35},
            "network": {"base_score": 68, "finding_count": 9, "checks": 30},
            "cloud": {"base_score": 70, "finding_count": 9, "checks": 28},
            "mobile": {"base_score": 74, "finding_count": 7, "checks": 22},
        }

        config = type_config.get(assessment_type, type_config["general"])
        base_score = config["base_score"]

        # Generate realistic findings
        findings = self._generate_assessment_findings(assessment_type, config["finding_count"])

        # Calculate actual score based on findings
        severity_weights = {"critical": -12, "high": -7, "medium": -3, "low": -1, "info": 0}
        score = base_score
        for finding in findings:
            score += severity_weights.get(finding["severity"], 0)
        score = max(0, min(100, score))

        # Determine risk level
        if score >= 80:
            risk_level = "low"
        elif score >= 60:
            risk_level = "medium"
        elif score >= 40:
            risk_level = "high"
        else:
            risk_level = "critical"

        result = {
            "assessment_id": assessment_id,
            "type": assessment_type,
            "domain": domain or "unspecified",
            "score": score,
            "findings": findings,
            "risk_level": risk_level,
            "timestamp": datetime.now().isoformat(),
            "checks_performed": config["checks"],
        }

        self._save_json(f"assessment_{assessment_id}.json", result)
        self._assessment_cache[assessment_id] = result
        return result

    def _generate_assessment_findings(self, assessment_type: str, count: int) -> List[Dict[str, str]]:
        """Generate realistic assessment findings for a given type.

        Args:
            assessment_type: The type of assessment being performed.
            count: Number of findings to generate.

        Returns:
            List of finding dictionaries.
        """
        finding_templates = {
            "general": [
                {"severity": "high", "category": "Patch Management", "description": "Critical security patches have not been applied within 30 days of release. 23% of systems are missing important updates.", "recommendation": "Implement an automated patch management solution with a maximum 14-day SLA for critical patches."},
                {"severity": "medium", "category": "Access Control", "description": "Role-based access control (RBAC) is not fully implemented. Shared accounts exist in 4 departments.", "recommendation": "Eliminate shared accounts and implement RBAC with regular access reviews every 90 days."},
                {"severity": "medium", "category": "Logging & Monitoring", "description": "Security event logs are not centrally collected and analysed. Log retention policy is inconsistent.", "recommendation": "Deploy a SIEM solution with centralised log collection, real-time alerting, and a minimum 12-month retention policy."},
                {"severity": "low", "category": "Security Awareness", "description": "Security awareness training is conducted annually but lacks phishing simulation exercises.", "recommendation": "Add quarterly phishing simulations and targeted training for users who fail."},
                {"severity": "high", "category": "Backup & Recovery", "description": "Backup restoration procedures have not been tested in the past 6 months. Offsite backup encryption status is unverified.", "recommendation": "Conduct monthly backup restoration tests and verify encryption of all offsite backups."},
                {"severity": "medium", "category": "Asset Management", "description": "IT asset inventory is incomplete. Approximately 15% of endpoints are not tracked in the CMDB.", "recommendation": "Implement automated asset discovery and ensure all endpoints are registered in the CMDB within 24 hours of deployment."},
                {"severity": "low", "category": "Incident Response", "description": "The incident response plan was last updated 18 months ago and does not reflect current infrastructure.", "recommendation": "Update the incident response plan annually and conduct tabletop exercises at least twice per year."},
                {"severity": "medium", "category": "Third-Party Risk", "description": "Vendor security assessments are not performed for all third-party service providers.", "recommendation": "Implement a vendor risk management programme with security questionnaires and annual reassessments."},
                {"severity": "critical", "category": "Multi-Factor Authentication", "description": "MFA is not enforced for all administrative accounts and VPN access.", "recommendation": "Enforce MFA for all users, prioritising administrative accounts, VPN, and remote access immediately."},
                {"severity": "high", "category": "Data Classification", "description": "Sensitive data is not classified, and DLP controls are not implemented.", "recommendation": "Implement a data classification scheme and deploy DLP controls for email, endpoints, and cloud storage."},
            ],
            "web_app": [
                {"severity": "critical", "category": "Injection", "description": "SQL injection vulnerability identified in the search and login functions. Parameterised queries are not used.", "recommendation": "Implement parameterised queries (prepared statements) for all database interactions. Use an ORM framework."},
                {"severity": "high", "category": "Authentication", "description": "Brute-force protection is absent. Account lockout policies are not enforced. Weak password policy allows common passwords.", "recommendation": "Implement account lockout after 5 failed attempts, CAPTCHA, and enforce a strong password policy."},
                {"severity": "high", "category": "Sensitive Data Exposure", "description": "Application transmits sensitive data over unencrypted channels. TLS 1.0 and 1.1 are still supported.", "recommendation": "Disable TLS 1.0/1.1, enforce TLS 1.2 minimum, and implement HSTS headers. Encrypt sensitive data at rest."},
                {"severity": "medium", "category": "XSS", "description": "Reflected and stored XSS vulnerabilities exist in user input fields. Output encoding is not consistently applied.", "recommendation": "Implement context-aware output encoding for all dynamic content and a Content Security Policy (CSP)."},
                {"severity": "medium", "category": "Access Control", "description": "Insecure direct object references (IDOR) allow users to access other users' data by manipulating URL parameters.", "recommendation": "Implement server-side authorisation checks for every request. Use indirect reference maps."},
                {"severity": "high", "category": "Security Misconfiguration", "description": "Debug mode is enabled in production, exposing stack traces and sensitive configuration information.", "recommendation": "Disable debug mode in production. Implement proper error handling that returns generic messages to users."},
                {"severity": "medium", "category": "CSRF", "description": "Cross-Site Request Forgery protections are missing on state-changing operations.", "recommendation": "Implement CSRF tokens for all state-changing requests and validate the Origin/Referer headers."},
                {"severity": "low", "category": "Logging", "description": "Security events are not logged. Failed authentication attempts and suspicious activity go unrecorded.", "recommendation": "Implement comprehensive security logging for authentication events, access control failures, and input validation errors."},
                {"severity": "high", "category": "Session Management", "description": "Session tokens are predictable and do not expire after logout. Sessions lack invalidation on the server side.", "recommendation": "Use cryptographically random session tokens, implement server-side session invalidation, and enforce idle timeout."},
                {"severity": "medium", "category": "Dependency Management", "description": "Multiple outdated JavaScript libraries with known vulnerabilities are included (jQuery 1.x, Bootstrap 3.x).", "recommendation": "Update all third-party dependencies to their latest secure versions. Implement automated dependency scanning in CI/CD."},
            ],
            "network": [
                {"severity": "high", "category": "Network Segmentation", "description": "Flat network architecture with no segmentation between critical systems and general user devices.", "recommendation": "Implement network segmentation with VLANs and micro-segmentation for critical assets. Deploy east-west traffic inspection."},
                {"severity": "medium", "category": "Firewall Rules", "description": "Firewall rules contain overly permissive entries. Several 'any-any' allow rules exist without documented justification.", "recommendation": "Review and tighten firewall rules. Remove or restrict 'any-any' rules. Implement a rule review process every 90 days."},
                {"severity": "critical", "category": "Remote Access", "description": "VPN concentrator is exposed to the internet with a known vulnerable firmware version.", "recommendation": "Update VPN firmware immediately. Enforce MFA for all VPN connections. Restrict VPN access by IP where possible."},
                {"severity": "medium", "category": "Wireless Security", "description": "Legacy WPA2-PSK wireless network uses a shared password that has not been changed in 2 years.", "recommendation": "Migrate to WPA2-Enterprise or WPA3 with individual user credentials. Change PSKs quarterly if PSK must be used."},
                {"severity": "high", "category": "Network Monitoring", "description": "No network intrusion detection/prevention system (IDS/IPS) is deployed. Suspicious traffic patterns go unnoticed.", "recommendation": "Deploy network-based IDS/IPS at critical network boundaries. Implement NetFlow analysis for anomaly detection."},
                {"severity": "medium", "category": "DNS Security", "description": "DNS traffic is not filtered or monitored. DNS tunneling and cache poisoning protections are absent.", "recommendation": "Deploy DNS filtering and monitoring. Implement DNSSEC. Monitor for anomalous DNS query volumes and patterns."},
                {"severity": "low", "category": "Network Documentation", "description": "Network topology documentation is outdated and does not reflect recent infrastructure changes.", "recommendation": "Update network documentation and implement a change management process to keep documentation current."},
                {"severity": "high", "category": "Port Exposure", "description": "Multiple unnecessary services are exposed on internet-facing systems (SMB, RDP, Telnet).", "recommendation": "Close all unnecessary ports. Restrict RDP access via VPN only. Disable SMBv1 and legacy protocols."},
                {"severity": "medium", "category": "DDoS Protection", "description": "No DDoS mitigation service or rate limiting is in place for public-facing services.", "recommendation": "Deploy a DDoS mitigation service. Implement rate limiting at the application and network perimeter."},
            ],
            "cloud": [
                {"severity": "critical", "category": "IAM", "description": "Overly permissive IAM policies allow wildcard (*) permissions. Root account credentials are used for daily operations.", "recommendation": "Apply least-privilege IAM policies. Eliminate root account usage. Use IAM roles and temporary credentials."},
                {"severity": "high", "category": "Data Encryption", "description": "S3 buckets and databases lack encryption at rest. Key management is not centralised or audited.", "recommendation": "Enable encryption at rest for all storage and databases. Use a centralised KMS with key rotation."},
                {"severity": "medium", "category": "Logging", "description": "CloudTrail or equivalent audit logging is not enabled for all regions and services.", "recommendation": "Enable comprehensive audit logging across all regions and services. Integrate logs into a SIEM."},
                {"severity": "high", "category": "Storage Security", "description": "Multiple S3 buckets are publicly accessible or have overly permissive bucket policies.", "recommendation": "Audit all storage buckets. Remove public access. Implement bucket policies with least privilege. Enable Block Public Access."},
                {"severity": "medium", "category": "Network Security", "description": "Cloud security groups have overly permissive ingress rules. Default VPC configurations are used.", "recommendation": "Review and tighten security group rules. Use private subnets for internal resources. Deploy a cloud-native firewall."},
                {"severity": "medium", "category": "Container Security", "description": "Container images are not scanned for vulnerabilities. Containers run as root without resource limits.", "recommendation": "Implement container image scanning in CI/CD. Enforce non-root user execution. Apply resource limits and security contexts."},
                {"severity": "low", "category": "Tagging & Governance", "description": "Cloud resources lack consistent tagging. Cost and security governance policies are not enforced.", "recommendation": "Implement mandatory tagging policies. Use policy-as-code (e.g., AWS SCPs, Azure Policy) to enforce governance."},
                {"severity": "high", "category": "Secrets Management", "description": "API keys and credentials are hardcoded in application code and stored in plaintext configuration files.", "recommendation": "Use a secrets manager (e.g., AWS Secrets Manager, Azure Key Vault). Rotate credentials automatically. Never hardcode secrets."},
                {"severity": "medium", "category": "Backup & DR", "description": "Cloud backup strategies are not tested. Cross-region replication is not enabled for critical data.", "recommendation": "Enable cross-region replication for critical data. Test recovery procedures monthly. Implement automated backup verification."},
            ],
            "mobile": [
                {"severity": "high", "category": "Data Storage", "description": "Sensitive data (PII, tokens) is stored unencrypted in local storage (SharedPreferences, UserDefaults, SQLite).", "recommendation": "Encrypt all sensitive data at rest using platform-provided secure storage (Keychain, Keystore)."},
                {"severity": "medium", "category": "Communication", "description": "App does not validate server certificates. Self-signed certificates are accepted. Certificate pinning is not implemented.", "recommendation": "Implement certificate pinning and proper certificate validation. Reject all invalid or self-signed certificates."},
                {"severity": "medium", "category": "Authentication", "description": "Biometric authentication is optional and can be bypassed. Session tokens have excessive expiration times.", "recommendation": "Require biometric authentication for sensitive actions. Implement short session timeouts with secure refresh tokens."},
                {"severity": "low", "category": "Code Quality", "description": "The app is distributed without obfuscation or anti-tampering protections. Debug symbols are present.", "recommendation": "Enable code obfuscation (ProGuard/R8 for Android). Strip debug symbols. Implement runtime tampering detection."},
                {"severity": "high", "category": "Root/Jailbreak Detection", "description": "No root or jailbreak detection is implemented. The app runs normally on compromised devices.", "recommendation": "Implement root/jailbreak detection and prevent app execution on compromised devices."},
                {"severity": "medium", "category": "Deep Linking", "description": "Deep links are not validated, allowing potential exploitation for unauthorised actions within the app.", "recommendation": "Validate all deep link parameters. Require user confirmation for sensitive actions triggered via deep links."},
                {"severity": "low", "category": "Screenshot Prevention", "description": "The app does not prevent screenshots in sensitive areas, potentially exposing sensitive data.", "recommendation": "Enable FLAG_SECURE (Android) and UITextField secureTextEntry with screen capture prevention (iOS) for sensitive screens."},
            ],
        }

        templates = finding_templates.get(assessment_type, finding_templates["general"])
        # Cycle through templates if we need more than available
        findings = []
        for i in range(count):
            template = templates[i % len(templates)]
            findings.append({
                "severity": template["severity"],
                "category": template["category"],
                "description": template["description"],
                "recommendation": template["recommendation"],
            })
        return findings


    # =================================================================
    # 2. VULNERABILITY SCANNER (EDUCATIONAL)
    # =================================================================

    def get_cve_database(self, keyword: str = None, severity: str = None) -> dict:
        """Search the built-in CVE knowledge base.

        Args:
            keyword: Optional keyword to filter CVEs by title or
                description (case-insensitive).
            severity: Optional severity filter (``critical``, ``high``,
                ``medium``, ``low``).

        Returns:
            Dictionary with a ``cves`` key containing a list of matching
            CVE dictionaries.
        """
        cves = self.cve_database

        if keyword:
            keyword_lower = keyword.lower()
            cves = [
                cve for cve in cves
                if keyword_lower in cve["title"].lower()
                or keyword_lower in cve["description"].lower()
                or keyword_lower in cve["cve_id"].lower()
            ]

        if severity:
            severity_lower = severity.lower()
            cves = [cve for cve in cves if cve["severity"] == severity_lower]

        self._save_json("cve_search_results.json", {
            "keyword": keyword,
            "severity": severity,
            "results_count": len(cves),
            "timestamp": datetime.now().isoformat(),
        })
        return {"cves": cves}

    def scan_vulnerabilities(self, target_type: str = "web_app", tech_stack: list = None) -> dict:
        """Perform an educational vulnerability scan.

        Identifies common CVEs that may affect the given technology
        stack.  This is a **simulated/educational** scanner and does
        not perform any actual network or host probing.

        Args:
            target_type: One of ``web_app``, ``api``, ``database``,
                ``cloud``, ``mobile``.
            tech_stack: Optional list of technology names (e.g.
                ``['Apache Log4j', 'Spring Boot', 'Microsoft Office']``).

        Returns:
            Dictionary with ``scan_id``, ``target``, ``vulnerabilities``,
            and severity counts.
        """
        scan_id = f"VS-{uuid.uuid4().hex[:8].upper()}"
        tech_stack = tech_stack or []

        # Map technologies to relevant CVEs
        tech_cve_map = {
            "log4j": ["CVE-2021-44228", "CVE-2021-45046"],
            "apache": ["CVE-2021-44228", "CVE-2021-45046"],
            "spring": ["CVE-2022-22965", "CVE-2023-20873"],
            "microsoft": ["CVE-2023-36884", "CVE-2023-21716", "CVE-2023-29336", "CVE-2023-36584"],
            "office": ["CVE-2023-36884", "CVE-2023-21716"],
            "outlook": ["CVE-2023-23397"],
            "confluence": ["CVE-2023-22515", "CVE-2022-26134"],
            "atlassian": ["CVE-2023-22515", "CVE-2022-26134"],
            "fortinet": ["CVE-2023-27997"],
            "fortios": ["CVE-2023-27997"],
            "fortiproxy": ["CVE-2023-27997"],
            "cisco": ["CVE-2023-20198"],
            "ios xe": ["CVE-2023-20198"],
            "goanywhere": ["CVE-2023-0669"],
            "moveit": ["CVE-2023-34362"],
            "sharepoint": ["CVE-2023-29357"],
            "openssh": ["CVE-2023-38408"],
            "ssh": ["CVE-2023-38408"],
            "glibc": ["CVE-2023-4911"],
            "linux": ["CVE-2023-0264", "CVE-2023-4911"],
            "kernel": ["CVE-2023-0264"],
            "ivanti": ["CVE-2023-38434"],
            "mobileiron": ["CVE-2023-38434"],
            "apple": ["CVE-2023-42887"],
            "ios": ["CVE-2023-42887"],
            "macos": ["CVE-2023-42887"],
            "http/2": ["CVE-2023-44487"],
            "nginx": ["CVE-2023-44487"],
        }

        matched_cve_ids: set = set()

        # Match against tech stack
        for tech in tech_stack:
            tech_lower = tech.lower()
            for key, cve_ids in tech_cve_map.items():
                if key in tech_lower:
                    matched_cve_ids.update(cve_ids)

        # If no tech stack or no matches, provide relevant defaults based on target_type
        if not matched_cve_ids:
            type_defaults = {
                "web_app": ["CVE-2021-44228", "CVE-2022-22965", "CVE-2023-22515", "CVE-2022-26134", "CVE-2023-20873"],
                "api": ["CVE-2021-44228", "CVE-2022-22965", "CVE-2023-44487", "CVE-2023-20873"],
                "database": ["CVE-2021-44228", "CVE-2023-34362"],
                "cloud": ["CVE-2023-20198", "CVE-2023-38408", "CVE-2023-44487"],
                "mobile": ["CVE-2023-42887", "CVE-2023-38434"],
            }
            matched_cve_ids.update(type_defaults.get(target_type, type_defaults["web_app"]))

        # Build vulnerability list from matched CVEs
        vulnerabilities = []
        cve_lookup = {cve["cve_id"]: cve for cve in self.cve_database}
        for cve_id in matched_cve_ids:
            if cve_id in cve_lookup:
                vuln = {
                    "cve_id": cve_id,
                    "severity": cve_lookup[cve_id]["severity"],
                    "title": cve_lookup[cve_id]["title"],
                    "description": cve_lookup[cve_id]["description"],
                    "remediation": cve_lookup[cve_id]["remediation"],
                    "cvss_score": cve_lookup[cve_id]["cvss_score"],
                    "affected_products": cve_lookup[cve_id]["affected_products"],
                }
                vulnerabilities.append(vuln)

        # Sort by CVSS score descending
        vulnerabilities.sort(key=lambda x: x["cvss_score"], reverse=True)

        # Count severities
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for v in vulnerabilities:
            severity_counts[v["severity"]] = severity_counts.get(v["severity"], 0) + 1

        result = {
            "scan_id": scan_id,
            "target": target_type,
            "tech_stack": tech_stack,
            "vulnerabilities": vulnerabilities,
            "critical_count": severity_counts["critical"],
            "high_count": severity_counts["high"],
            "medium_count": severity_counts["medium"],
            "low_count": severity_counts["low"],
            "total": len(vulnerabilities),
            "timestamp": datetime.now().isoformat(),
        }

        self._save_json(f"scan_{scan_id}.json", result)
        return result

    # =================================================================
    # 3. SECURITY TRAINING COMPANION
    # =================================================================

    def get_training_modules(self, category: str = None, level: str = None) -> dict:
        """Get cybersecurity training modules.

        Args:
            category: Optional filter by category
                (``fundamentals``, ``network_security``, ``web_security``,
                ``cloud_security``, ``incident_response``, ``compliance``,
                ``advanced``).
            level: Optional filter by difficulty
                (``beginner``, ``intermediate``, ``advanced``, ``expert``).

        Returns:
            Dictionary with a ``modules`` key containing a list of
            matching module summaries.
        """
        modules = self.training_modules

        if category:
            modules = [m for m in modules if m["category"] == category]
        if level:
            modules = [m for m in modules if m["level"] == level]

        # Return summaries (without full lesson content to keep response concise)
        module_summaries = [
            {
                "module_id": m["module_id"],
                "title": m["title"],
                "description": m["description"],
                "category": m["category"],
                "level": m["level"],
                "duration_minutes": m["duration_minutes"],
                "lessons_count": m["lessons_count"],
                "topics": m["topics"],
            }
            for m in modules
        ]

        self._save_json("training_modules.json", module_summaries)
        return {"modules": module_summaries}

    def get_lesson(self, module_id: str, lesson_id: str) -> dict:
        """Get a specific lesson's content and quiz questions.

        Args:
            module_id: The module identifier (e.g. ``SEC-101``).
            lesson_id: The lesson identifier (e.g. ``SEC-101-L01``).

        Returns:
            Dictionary with lesson content, key takeaways, and quiz
            questions.  Returns a ``not_found`` response if the lesson
            does not exist.
        """
        for module in self.training_modules:
            if module["module_id"] == module_id:
                for lesson in module.get("lessons", []):
                    if lesson["lesson_id"] == lesson_id:
                        return {
                            "lesson_id": lesson["lesson_id"],
                            "title": lesson["title"],
                            "module_id": module_id,
                            "module_title": module["title"],
                            "content": lesson["content"],
                            "key_takeaways": lesson["key_takeaways"],
                            "quiz_questions": lesson["quiz_questions"],
                        }
                return {
                    "error": "Lesson not found",
                    "module_id": module_id,
                    "lesson_id": lesson_id,
                    "available_lessons": [l["lesson_id"] for l in module.get("lessons", [])],
                }

        return {
            "error": "Module not found",
            "module_id": module_id,
            "available_modules": [m["module_id"] for m in self.training_modules],
        }

    def assess_knowledge(self, answers: list) -> dict:
        """Grade a cybersecurity knowledge assessment.

        Each answer in the ``answers`` list should be a dictionary with
        ``question`` (str), ``your_answer`` (int — index of selected
        option), and ``correct`` (int — index of correct option).

        Args:
            answers: List of answer dictionaries.

        Returns:
            Dictionary with ``score``, ``total``, ``percentage``,
            ``passed``, and a per-question ``breakdown``.
        """
        if not answers:
            return {
                "score": 0,
                "total": 0,
                "percentage": 0.0,
                "passed": False,
                "breakdown": [],
            }

        breakdown = []
        correct_count = 0

        for ans in answers:
            is_correct = ans.get("your_answer") == ans.get("correct")
            if is_correct:
                correct_count += 1

            breakdown.append({
                "question": ans.get("question", "Unknown"),
                "correct": is_correct,
                "your_answer": ans.get("your_answer"),
                "correct_answer": ans.get("correct"),
                "explanation": ans.get("explanation", "No explanation provided."),
            })

        total = len(answers)
        percentage = round((correct_count / total) * 100, 1)
        passed = percentage >= 70

        result = {
            "score": correct_count,
            "total": total,
            "percentage": percentage,
            "passed": passed,
            "breakdown": breakdown,
            "grade": self._calculate_grade(percentage),
            "timestamp": datetime.now().isoformat(),
        }

        self._save_json(f"assessment_{uuid.uuid4().hex[:8]}.json", result)
        return result

    def _calculate_grade(self, percentage: float) -> str:
        """Convert a percentage to a letter grade.

        Args:
            percentage: Score percentage (0-100).

        Returns:
            Letter grade string.
        """
        if percentage >= 90:
            return "A"
        elif percentage >= 80:
            return "B"
        elif percentage >= 70:
            return "C"
        elif percentage >= 60:
            return "D"
        else:
            return "F"

    def generate_learning_path(self, current_level: str = "beginner", interests: list = None) -> dict:
        """Generate a personalised cybersecurity learning path.

        Args:
            current_level: The learner's current level
                (``beginner``, ``intermediate``, ``advanced``, ``expert``).
            interests: Optional list of interest areas
                (e.g. ``['web_security', 'incident_response']``).

        Returns:
            Dictionary with ``path_id``, ``level``, ``modules``,
            ``estimated_hours``, and ``certification_goal``.
        """
        path_id = f"LP-{uuid.uuid4().hex[:8].upper()}"
        interests = interests or []

        # Define learning path progression
        level_progression = {
            "beginner": ["beginner", "intermediate"],
            "intermediate": ["intermediate", "advanced"],
            "advanced": ["advanced", "expert"],
            "expert": ["expert", "advanced"],
        }

        target_levels = level_progression.get(current_level, ["beginner", "intermediate"])

        # Filter modules by level
        eligible_modules = [
            m for m in self.training_modules
            if m["level"] in target_levels
        ]

        # Sort by interests first, then by level
        if interests:
            interest_lower = [i.lower() for i in interests]
            eligible_modules.sort(
                key=lambda m: (
                    0 if any(i in m["category"].lower() for i in interest_lower) else 1,
                    ["beginner", "intermediate", "advanced", "expert"].index(m["level"]),
                )
            )
        else:
            eligible_modules.sort(
                key=lambda m: ["beginner", "intermediate", "advanced", "expert"].index(m["level"])
            )

        # Select top modules
        selected_modules = eligible_modules[:8]

        path_modules = []
        for m in selected_modules:
            reason = f"Recommended for {m['level']} level learners"
            if interests and any(i.lower() in m["category"].lower() for i in interests):
                reason = f"Aligned with your interest in {m['category'].replace('_', ' ')}"
            path_modules.append({
                "module_id": m["module_id"],
                "title": m["title"],
                "level": m["level"],
                "duration_minutes": m["duration_minutes"],
                "reason": reason,
            })

        estimated_hours = sum(m["duration_minutes"] for m in path_modules) // 60

        # Suggest certification goal based on level
        cert_goals = {
            "beginner": "CompTIA Security+",
            "intermediate": "CISSP or OSCP",
            "advanced": "OSCE3 or GXPN",
            "expert": "GSE or custom research path",
        }

        result = {
            "path_id": path_id,
            "level": current_level,
            "interests": interests,
            "modules": path_modules,
            "estimated_hours": estimated_hours,
            "certification_goal": cert_goals.get(current_level, "CompTIA Security+"),
            "generated_at": datetime.now().isoformat(),
        }

        self._save_json(f"learning_path_{path_id}.json", result)
        return result

    def get_practice_labs(self, category: str = None) -> dict:
        """Get hands-on practice lab scenarios.

        Args:
            category: Optional filter by category
                (e.g. ``fundamentals``, ``network_security``,
                ``web_security``, ``incident_response``).

        Returns:
            Dictionary with a ``labs`` key containing a list of
            matching lab dictionaries.
        """
        labs = self.practice_labs
        if category:
            labs = [lab for lab in labs if lab["category"] == category]
        return {"labs": labs}


    # =================================================================
    # 4. INCIDENT RESPONSE
    # =================================================================

    def get_incident_playbooks(self, incident_type: str = None) -> dict:
        """Get incident response playbooks.

        Args:
            incident_type: Optional filter by incident type
                (``malware``, ``phishing``, ``data_breach``, ``ddos``,
                ``insider_threat``, ``ransomware``).

        Returns:
            Dictionary with a ``playbooks`` key containing a list of
            matching playbook dictionaries, each with phases and steps.
        """
        playbooks = self.incident_playbooks
        if incident_type:
            playbooks = [p for p in playbooks if p["type"] == incident_type]
        return {"playbooks": playbooks}

    def analyze_threat(self, indicators: dict) -> dict:
        """Analyse threat indicators (IOCs) and provide a threat assessment.

        This method performs a **simulated** analysis of the provided
        indicators against a built-in threat intelligence knowledge base.

        Args:
            indicators: Dictionary with keys ``ips``, ``domains``,
                ``hashes``, and ``emails``, each containing a list of
                indicator strings.

        Returns:
            Dictionary with ``threat_score`` (0-100), ``classification``,
            ``recommended_actions``, ``related_threats``, and
            ``confidence``.
        """
        indicators = indicators or {}
        ips = indicators.get("ips", [])
        domains = indicators.get("domains", [])
        hashes = indicators.get("hashes", [])
        emails = indicators.get("emails", [])

        total_indicators = len(ips) + len(domains) + len(hashes) + len(emails)

        if total_indicators == 0:
            return {
                "threat_score": 0,
                "classification": "no_indicators",
                "recommended_actions": ["Provide indicators for analysis"],
                "related_threats": [],
                "confidence": "none",
                "timestamp": datetime.now().isoformat(),
            }

        # Known malicious patterns (simulated threat intel)
        known_threats = {
            "192.0.2.100": {"threat": "Emotet C2", "score": 95},
            "192.0.2.200": {"threat": "TrickBot Infrastructure", "score": 92},
            "203.0.113.50": {"threat": "QakBot Distribution", "score": 88},
            "evil-domain.com": {"threat": "Phishing Campaign", "score": 90},
            "malware-c2.xyz": {"threat": "Generic C2", "score": 85},
            "phishing-example.net": {"threat": "Credential Harvesting", "score": 87},
            "a1b2c3d4e5f6": {"threat": "Emotet Payload", "score": 96},
            "f6e5d4c3b2a1": {"threat": "Ransomware Sample", "score": 98},
        }

        matched_threats = []
        threat_score = 0

        # Check each indicator type
        for ip in ips:
            if ip in known_threats:
                matched_threats.append({"indicator": ip, "type": "ip", **known_threats[ip]})
                threat_score = max(threat_score, known_threats[ip]["score"])

        for domain in domains:
            domain_lower = domain.lower()
            if domain_lower in known_threats:
                matched_threats.append({"indicator": domain, "type": "domain", **known_threats[domain_lower]})
                threat_score = max(threat_score, known_threats[domain_lower]["score"])
            # Check for suspicious TLDs or patterns
            elif any(tld in domain_lower for tld in [".tk", ".ml", ".ga", ".cf", ".xyz"]):
                threat_score = max(threat_score, 40)

        for file_hash in hashes:
            hash_lower = file_hash.lower()
            if hash_lower in known_threats:
                matched_threats.append({"indicator": file_hash, "type": "hash", **known_threats[hash_lower]})
                threat_score = max(threat_score, known_threats[hash_lower]["score"])

        for email in emails:
            email_lower = email.lower()
            if any(sus in email_lower for sus in ["@evil-", "@phish", "@malware", "@spam"]):
                threat_score = max(threat_score, 70)

        # Base score on indicator volume
        volume_score = min(total_indicators * 5, 30)
        threat_score = max(threat_score, volume_score)

        # Determine classification
        if threat_score >= 80:
            classification = "critical_threat"
        elif threat_score >= 60:
            classification = "high_threat"
        elif threat_score >= 40:
            classification = "medium_threat"
        elif threat_score >= 20:
            classification = "low_threat"
        else:
            classification = "suspicious"

        # Generate recommended actions
        recommended_actions = []
        if threat_score >= 80:
            recommended_actions.extend([
                "Immediately isolate affected systems from the network",
                "Block all identified IOCs at firewall, proxy, and DNS levels",
                "Reset credentials for any accounts that communicated with identified C2",
                "Initiate full forensic investigation and preserve evidence",
                "Notify the incident response team and senior management immediately",
            ])
        elif threat_score >= 60:
            recommended_actions.extend([
                "Block identified IOCs at perimeter security controls",
                "Conduct endpoint scans on systems that interacted with indicators",
                "Review logs for additional indicators of compromise",
                "Increase monitoring sensitivity for related network segments",
            ])
        elif threat_score >= 40:
            recommended_actions.extend([
                "Add indicators to watchlist for enhanced monitoring",
                "Review proxy and DNS logs for additional suspicious activity",
                "Brief the SOC team on the indicators",
            ])
        else:
            recommended_actions.extend([
                "Log indicators for future reference",
                "Continue routine monitoring",
            ])

        # Determine confidence
        if matched_threats:
            confidence = "high" if len(matched_threats) >= 2 else "medium"
        else:
            confidence = "low"

        result = {
            "threat_score": threat_score,
            "classification": classification,
            "recommended_actions": recommended_actions,
            "related_threats": list({t["threat"] for t in matched_threats}),
            "matched_indicators": matched_threats,
            "confidence": confidence,
            "total_indicators_analyzed": total_indicators,
            "timestamp": datetime.now().isoformat(),
        }

        self._save_json(f"threat_analysis_{uuid.uuid4().hex[:8]}.json", result)
        return result

    # =================================================================
    # 5. COMPLIANCE FRAMEWORKS
    # =================================================================

    def get_compliance_frameworks(self) -> dict:
        """List all supported compliance frameworks.

        Returns:
            Dictionary with a ``frameworks`` key containing a list of
            framework dictionaries with ``id``, ``name``,
            ``description``, ``origin``, and ``controls_count``.
        """
        return {"frameworks": self.compliance_frameworks}

    def get_compliance_controls(self, framework_id: str) -> dict:
        """Get controls for a specific compliance framework.

        Args:
            framework_id: One of ``NIST-CSF``, ``ISO-27001``,
                ``CIS-Controls``, ``POPIA``, ``NIST-800-53``,
                ``PCI-DSS``.

        Returns:
            Dictionary with ``framework_id`` and a ``controls`` list.
            Returns an error dictionary if the framework is unknown.
        """
        controls_map = {
            "NIST-CSF": [
                {"control_id": "GV.OC-01", "title": "Organisational cybersecurity policy", "description": "The organisational cybersecurity policy is established, communicated, and reviewed.", "category": "Govern", "implementation_level": "Level 1"},
                {"control_id": "GV.OC-02", "title": "Risk assessment", "description": "Cybersecurity risk is understood and assessed in the context of organisational objectives.", "category": "Govern", "implementation_level": "Level 1"},
                {"control_id": "ID.AM-01", "title": "Asset inventory", "description": "Inventories of hardware managed by the organisation are maintained.", "category": "Identify", "implementation_level": "Level 1"},
                {"control_id": "ID.AM-02", "title": "Software inventory", "description": "Inventories of software, services, and systems are maintained.", "category": "Identify", "implementation_level": "Level 1"},
                {"control_id": "ID.RA-01", "title": "Vulnerability identification", "description": "Vulnerabilities in assets are identified, validated, and recorded.", "category": "Identify", "implementation_level": "Level 1"},
                {"control_id": "PR.AA-01", "title": "Identity management", "description": "Identities and credentials are issued, managed, verified, revoked, and audited.", "category": "Protect", "implementation_level": "Level 1"},
                {"control_id": "PR.AT-01", "title": "Cybersecurity awareness", "description": "Personnel are provided with cybersecurity awareness and training.", "category": "Protect", "implementation_level": "Level 1"},
                {"control_id": "PR.DS-01", "title": "Data-at-rest protection", "description": "Data-at-rest is protected according to the data classification scheme.", "category": "Protect", "implementation_level": "Level 1"},
                {"control_id": "PR.DS-02", "title": "Data-in-transit protection", "description": "Data-in-transit is protected according to the data classification scheme.", "category": "Protect", "implementation_level": "Level 1"},
                {"control_id": "PR.PS-01", "title": "Policy and process management", "description": "Security policies and processes are established and maintained.", "category": "Protect", "implementation_level": "Level 1"},
                {"control_id": "DE.CM-01", "title": "Continuous monitoring", "description": "Networks and systems are continuously monitored to find anomalies and events.", "category": "Detect", "implementation_level": "Level 2"},
                {"control_id": "DE.AE-01", "title": "Anomaly detection", "description": "Anomalies and events are analysed to detect cybersecurity incidents.", "category": "Detect", "implementation_level": "Level 2"},
                {"control_id": "RS.MA-01", "title": "Incident management policy", "description": "An incident response policy and procedure are established.", "category": "Respond", "implementation_level": "Level 1"},
                {"control_id": "RS.AN-01", "title": "Incident analysis", "description": "Incidents are analysed to ensure effective response and recovery.", "category": "Respond", "implementation_level": "Level 1"},
                {"control_id": "RS.MI-01", "title": "Incident containment", "description": "Incidents are contained to prevent further damage.", "category": "Respond", "implementation_level": "Level 1"},
                {"control_id": "RC.RP-01", "title": "Recovery planning", "description": "Recovery procedures are tested and updated.", "category": "Recover", "implementation_level": "Level 1"},
                {"control_id": "RC.CO-01", "title": "Communication during recovery", "description": "Recovery activities are communicated to internal and external parties.", "category": "Recover", "implementation_level": "Level 1"},
            ],
            "ISO-27001": [
                {"control_id": "A.5.1", "title": "Policies for information security", "description": "Management shall define a set of policies to direct the organisation's information security efforts.", "category": "Organisational", "implementation_level": "Foundation"},
                {"control_id": "A.5.2", "title": "Information security roles", "description": "Information security roles and responsibilities shall be defined and allocated.", "category": "Organisational", "implementation_level": "Foundation"},
                {"control_id": "A.5.3", "title": "Segregation of duties", "description": "Conflicting duties and conflicting areas of responsibility shall be segregated.", "category": "Organisational", "implementation_level": "Foundation"},
                {"control_id": "A.5.4", "title": "Management responsibilities", "description": "Management shall require all personnel to apply information security in accordance with established policies.", "category": "Organisational", "implementation_level": "Foundation"},
                {"control_id": "A.5.5", "title": "Contact with special interest groups", "description": "Appropriate contacts with special interest groups shall be maintained.", "category": "Organisational", "implementation_level": "Advanced"},
                {"control_id": "A.6.1", "title": "Screening", "description": "Background verification checks on all candidates for employment shall be carried out.", "category": "People", "implementation_level": "Foundation"},
                {"control_id": "A.6.2", "title": "Terms and conditions of employment", "description": "Employment agreements shall state the organisation's information security responsibilities.", "category": "People", "implementation_level": "Foundation"},
                {"control_id": "A.6.3", "title": "Information security awareness, education and training", "description": "Personnel shall receive appropriate security awareness and training.", "category": "People", "implementation_level": "Foundation"},
                {"control_id": "A.6.4", "title": "Disciplinary process", "description": "A disciplinary process shall be formalised and communicated.", "category": "People", "implementation_level": "Foundation"},
                {"control_id": "A.7.1", "title": "Responsible use of assets", "description": "Rules for the acceptable use of information and assets shall be identified and documented.", "category": "Physical", "implementation_level": "Foundation"},
                {"control_id": "A.7.2", "title": "Clear desk and clear screen", "description": "A clear desk policy for papers and removable storage media and a clear screen policy shall be adopted.", "category": "Physical", "implementation_level": "Foundation"},
                {"control_id": "A.8.1", "title": "User endpoint devices", "description": "Endpoint devices shall be protected according to their classification.", "category": "Technological", "implementation_level": "Foundation"},
                {"control_id": "A.8.2", "title": "Privileged access rights", "description": "Allocation and use of privileged access rights shall be restricted and controlled.", "category": "Technological", "implementation_level": "Foundation"},
                {"control_id": "A.8.3", "title": "Information access restriction", "description": "Access to information and application system capabilities shall be restricted.", "category": "Technological", "implementation_level": "Foundation"},
                {"control_id": "A.8.4", "title": "Access to source code", "description": "Read and write access to source code shall be restricted.", "category": "Technological", "implementation_level": "Advanced"},
                {"control_id": "A.8.5", "title": "Secure authentication", "description": "Secure authentication technologies and procedures shall be implemented.", "category": "Technological", "implementation_level": "Foundation"},
                {"control_id": "A.8.6", "title": "Capacity management", "description": "Capacity shall be planned, monitored, and adjusted to meet requirements.", "category": "Technological", "implementation_level": "Intermediate"},
                {"control_id": "A.8.7", "title": "Protection against malware", "description": "Malware protection shall be implemented and supported by appropriate user awareness.", "category": "Technological", "implementation_level": "Foundation"},
                {"control_id": "A.8.8", "title": "Management of technical vulnerabilities", "description": "Information about technical vulnerabilities shall be obtained and evaluated.", "category": "Technological", "implementation_level": "Foundation"},
                {"control_id": "A.8.9", "title": "Configuration management", "description": "Configurations shall be established, documented, implemented, monitored, and reviewed.", "category": "Technological", "implementation_level": "Foundation"},
            ],
            "CIS-Controls": [
                {"control_id": "CIS-1", "title": "Inventory and Control of Enterprise Assets", "description": "Actively manage all hardware devices so only authorised devices are given access.", "category": "Inventory and Control", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-2", "title": "Inventory and Control of Software Assets", "description": "Actively manage all software so only authorised software is installed and can execute.", "category": "Inventory and Control", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-3", "title": "Data Protection", "description": "Establish processes to identify, classify, securely handle, retain, and dispose of data.", "category": "Data Protection", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-4", "title": "Secure Configuration of Enterprise Assets and Software", "description": "Establish and maintain secure configurations of assets and software.", "category": "Secure Configuration", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-5", "title": "Account Management", "description": "Use processes and tools to assign and manage authorisation credentials.", "category": "Account Management", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-6", "title": "Access Control Management", "description": "Use processes and tools to create, assign, manage, and revoke access credentials.", "category": "Access Control", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-7", "title": "Continuous Vulnerability Management", "description": "Develop a plan to continuously assess and track vulnerabilities on all enterprise assets.", "category": "Vulnerability Management", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-8", "title": "Audit Log Management", "description": "Collect, alert, analyse, and retain audit logs of events.", "category": "Audit Logging", "implementation_level": "Implementation Group 2"},
                {"control_id": "CIS-9", "title": "Email and Web Browser Protections", "description": "Improve protections and detections via email and web browser mechanisms.", "category": "Email and Web", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-10", "title": "Malware Defences", "description": "Prevent or control the installation, spread, and execution of malicious applications.", "category": "Malware Defence", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-11", "title": "Data Recovery", "description": "Establish and maintain data recovery practices sufficient to restore operations.", "category": "Data Recovery", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-12", "title": "Network Infrastructure Management", "description": "Establish, implement, and actively manage network devices.", "category": "Network", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-13", "title": "Network Monitoring and Defence", "description": "Operate processes and tooling to establish and maintain network monitoring.", "category": "Network", "implementation_level": "Implementation Group 2"},
                {"control_id": "CIS-14", "title": "Security Awareness and Skills Training", "description": "Establish and maintain a security awareness program.", "category": "Training", "implementation_level": "Implementation Group 1"},
                {"control_id": "CIS-15", "title": "Service Provider Management", "description": "Develop a process to evaluate service providers who hold sensitive data.", "category": "Third Party", "implementation_level": "Implementation Group 2"},
                {"control_id": "CIS-16", "title": "Application Software Security", "description": "Manage the security lifecycle of in-house developed and acquired software.", "category": "Application Security", "implementation_level": "Implementation Group 2"},
                {"control_id": "CIS-17", "title": "Incident Response Management", "description": "Establish a program to develop and maintain an incident response capability.", "category": "Incident Response", "implementation_level": "Implementation Group 2"},
                {"control_id": "CIS-18", "title": "Penetration Testing", "description": "Test the effectiveness and resiliency of enterprise assets.", "category": "Testing", "implementation_level": "Implementation Group 3"},
            ],
            "POPIA": [
                {"control_id": "POPIA-1", "title": "Condition 1: Accountability", "description": "The responsible party must ensure compliance with all POPIA conditions. An information officer must be appointed.", "category": "Conditions for Lawful Processing", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-2", "title": "Condition 2: Processing Limitation", "description": "Personal information must be processed lawfully and in a reasonable manner. Consent or another legal basis is required.", "category": "Conditions for Lawful Processing", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-3", "title": "Condition 3: Purpose Specification", "description": "Personal information must be collected for a specific, explicitly defined, and lawful purpose related to a function of the responsible party.", "category": "Conditions for Lawful Processing", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-4", "title": "Condition 4: Further Processing Limitation", "description": "Further processing must be compatible with the original purpose of collection.", "category": "Conditions for Lawful Processing", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-5", "title": "Condition 5: Information Quality", "description": "The responsible party must take reasonably practicable steps to ensure personal information is complete, accurate, and up to date.", "category": "Conditions for Lawful Processing", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-6", "title": "Condition 6: Openness", "description": "The responsible party must maintain documentation of all processing operations and notify the data subject of key information.", "category": "Conditions for Lawful Processing", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-7", "title": "Condition 7: Security Safeguards", "description": "Appropriate technical and organisational measures must protect personal information against loss, damage, and unauthorised access.", "category": "Conditions for Lawful Processing", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-8", "title": "Condition 8: Data Subject Participation", "description": "Data subjects have the right to request confirmation of information held, correction of information, and deletion of information.", "category": "Conditions for Lawful Processing", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-R1", "title": "Right to be Informed", "description": "Data subjects must be informed when their personal information is being collected, including the purpose and recipient.", "category": "Data Subject Rights", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-R2", "title": "Right to Access", "description": "Data subjects have the right to request access to their personal information held by a responsible party.", "category": "Data Subject Rights", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-R3", "title": "Right to Rectification", "description": "Data subjects may request correction or deletion of personal information that is inaccurate or no longer needed.", "category": "Data Subject Rights", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-R4", "title": "Right to Object", "description": "Data subjects may object to processing of personal information for direct marketing or other purposes.", "category": "Data Subject Rights", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-IO", "title": "Information Officer Duties", "description": "The Information Officer is responsible for ensuring POPIA compliance, handling data subject requests, and cooperating with the Information Regulator.", "category": "Obligations", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-NOT", "title": "Breach Notification", "description": "The responsible party must notify the Information Regulator and affected data subjects as soon as reasonably possible after a breach.", "category": "Obligations", "implementation_level": "Mandatory"},
                {"control_id": "POPIA-TRANS", "title": "Cross-Border Transfers", "description": "Personal information may only be transferred to countries with adequate data protection laws or with data subject consent.", "category": "Obligations", "implementation_level": "Mandatory"},
            ],
            "NIST-800-53": [
                {"control_id": "AC-1", "title": "Access Control Policy and Procedures", "description": "Establish and maintain access control policies and procedures.", "category": "Access Control", "implementation_level": "Low"},
                {"control_id": "AC-2", "title": "Account Management", "description": "Manage system accounts including establishing, activating, modifying, reviewing, and removing accounts.", "category": "Access Control", "implementation_level": "Low"},
                {"control_id": "AC-3", "title": "Access Enforcement", "description": "Enforce approved authorisations for logical access to information and system resources.", "category": "Access Control", "implementation_level": "Low"},
                {"control_id": "AC-17", "title": "Remote Access", "description": "Establish and document remote access policies and authorise remote access.", "category": "Access Control", "implementation_level": "Low"},
                {"control_id": "AU-1", "title": "Audit and Accountability Policy", "description": "Establish and maintain audit and accountability policies and procedures.", "category": "Audit and Accountability", "implementation_level": "Low"},
                {"control_id": "AU-2", "title": "Audit Events", "description": "Identify and document events that must be auditable.", "category": "Audit and Accountability", "implementation_level": "Low"},
                {"control_id": "AU-6", "title": "Audit Review, Analysis, and Reporting", "description": "Integrate audit review, analysis, and reporting into organisational incident response capability.", "category": "Audit and Accountability", "implementation_level": "Moderate"},
                {"control_id": "CM-1", "title": "Configuration Management Policy", "description": "Establish and maintain configuration management policies and procedures.", "category": "Configuration Management", "implementation_level": "Low"},
                {"control_id": "CM-2", "title": "Baseline Configuration", "description": "Develop, document, and maintain baseline configurations for organisational systems.", "category": "Configuration Management", "implementation_level": "Low"},
                {"control_id": "IA-1", "title": "Identification and Authentication Policy", "description": "Establish and maintain identification and authentication policies and procedures.", "category": "Identification and Authentication", "implementation_level": "Low"},
                {"control_id": "IA-2", "title": "Identification and Authentication", "description": "Uniquely identify and authenticate organisational users and devices.", "category": "Identification and Authentication", "implementation_level": "Low"},
                {"control_id": "SC-1", "title": "System and Communications Protection Policy", "description": "Establish and maintain system and communications protection policies and procedures.", "category": "System and Communications Protection", "implementation_level": "Low"},
                {"control_id": "SC-7", "title": "Boundary Protection", "description": "Monitor and control communications at external boundaries and key internal boundaries.", "category": "System and Communications Protection", "implementation_level": "Low"},
                {"control_id": "SI-1", "title": "System and Information Integrity Policy", "description": "Establish and maintain system and information integrity policies and procedures.", "category": "System and Information Integrity", "implementation_level": "Low"},
                {"control_id": "SI-4", "title": "Information System Monitoring", "description": "Monitor events, detect attacks, and provide evidence of attacks.", "category": "System and Information Integrity", "implementation_level": "Moderate"},
                {"control_id": "RA-1", "title": "Risk Assessment Policy", "description": "Establish and maintain risk assessment policies and procedures.", "category": "Risk Assessment", "implementation_level": "Low"},
                {"control_id": "IR-1", "title": "Incident Response Policy", "description": "Establish and maintain incident response policies and procedures.", "category": "Incident Response", "implementation_level": "Low"},
                {"control_id": "IR-4", "title": "Incident Handling", "description": "Implement an incident handling capability for security incidents.", "category": "Incident Response", "implementation_level": "Low"},
            ],
            "PCI-DSS": [
                {"control_id": "REQ-1", "title": "Install and Maintain Network Security Controls", "description": "Network security controls (NSCs) and related rules must be defined, approved, and maintained.", "category": "Network Security", "implementation_level": "Required"},
                {"control_id": "REQ-2", "title": "Apply Secure Configurations", "description": "Security configurations must be applied to all system components.", "category": "System Security", "implementation_level": "Required"},
                {"control_id": "REQ-3", "title": "Protect Stored Account Data", "description": "Sensitive authentication data must not be stored after authorisation.", "category": "Data Protection", "implementation_level": "Required"},
                {"control_id": "REQ-4", "title": "Protect Cardholder Data with Strong Cryptography", "description": "Cardholder data must be protected with strong cryptography during transmission.", "category": "Encryption", "implementation_level": "Required"},
                {"control_id": "REQ-5", "title": "Protect Systems and Networks from Malicious Software", "description": "Anti-malware solutions must be deployed and maintained on all systems.", "category": "Malware Defence", "implementation_level": "Required"},
                {"control_id": "REQ-6", "title": "Develop and Maintain Secure Systems and Software", "description": "Security patches must be applied within defined timeframes.", "category": "Patch Management", "implementation_level": "Required"},
                {"control_id": "REQ-7", "title": "Restrict Access", "description": "Access to system components and data must be restricted to only those required.", "category": "Access Control", "implementation_level": "Required"},
                {"control_id": "REQ-8", "title": "Identify Users and Authenticate Access", "description": "Strong authentication mechanisms must be implemented for all users and administrators.", "category": "Authentication", "implementation_level": "Required"},
                {"control_id": "REQ-9", "title": "Restrict Physical Access", "description": "Physical access to cardholder data environments must be restricted.", "category": "Physical Security", "implementation_level": "Required"},
                {"control_id": "REQ-10", "title": "Log and Monitor Access", "description": "Audit trails must be implemented to link access to system components to individual users.", "category": "Logging", "implementation_level": "Required"},
                {"control_id": "REQ-11", "title": "Test Security", "description": "Security systems and networks must be tested regularly for vulnerabilities.", "category": "Testing", "implementation_level": "Required"},
                {"control_id": "REQ-12", "title": "Support Information Security", "description": "An information security policy must be maintained and disseminated to all personnel.", "category": "Governance", "implementation_level": "Required"},
            ],
        }

        if framework_id not in controls_map:
            return {
                "error": f"Unknown framework: {framework_id}",
                "available_frameworks": list(controls_map.keys()),
            }

        result = {
            "framework_id": framework_id,
            "controls": controls_map[framework_id],
        }
        self._save_json(f"controls_{framework_id}.json", result)
        return result

    def assess_compliance(self, framework_id: str, responses: dict) -> dict:
        """Assess compliance maturity against a framework.

        Args:
            framework_id: The compliance framework identifier.
            responses: Dictionary mapping ``control_id`` to a status
                string: ``implemented``, ``partial``, ``planned``, or
                ``not_implemented``.

        Returns:
            Dictionary with ``framework_id``, ``overall_score``,
            ``maturity_level``, and a ``gaps`` list.
        """
        status_scores = {
            "implemented": 100,
            "partial": 50,
            "planned": 25,
            "not_implemented": 0,
        }

        controls_result = self.get_compliance_controls(framework_id)
        if "error" in controls_result:
            return controls_result

        controls = controls_result["controls"]
        total_score = 0
        gaps = []

        for control in controls:
            control_id = control["control_id"]
            status = responses.get(control_id, "not_implemented")
            score = status_scores.get(status, 0)
            total_score += score

            if status in ("not_implemented", "planned", "partial"):
                recommendation = self._generate_compliance_recommendation(control, status)
                gaps.append({
                    "control_id": control_id,
                    "title": control["title"],
                    "current_status": status,
                    "recommendation": recommendation,
                })

        overall_score = round(total_score / len(controls), 1) if controls else 0.0

        if overall_score >= 80:
            maturity_level = "Optimised"
        elif overall_score >= 60:
            maturity_level = "Managed"
        elif overall_score >= 40:
            maturity_level = "Defined"
        elif overall_score >= 20:
            maturity_level = "Initial"
        else:
            maturity_level = "Non-Compliant"

        result = {
            "framework_id": framework_id,
            "overall_score": overall_score,
            "maturity_level": maturity_level,
            "controls_assessed": len(controls),
            "gaps": gaps,
            "gap_count": len(gaps),
            "timestamp": datetime.now().isoformat(),
        }

        self._save_json(f"compliance_assessment_{framework_id}.json", result)
        return result

    def _generate_compliance_recommendation(self, control: dict, status: str) -> str:
        """Generate a compliance improvement recommendation.

        Args:
            control: The control dictionary.
            status: Current implementation status.

        Returns:
            Recommendation string.
        """
        recommendations = {
            "not_implemented": f"Priority: Fully implement {control['title']}. {control['description']} Start with a gap analysis and develop an implementation plan with timelines and responsible owners.",
            "planned": f"Accelerate implementation of {control['title']}. Move from planning to execution by allocating resources and setting a target completion date within 30 days.",
            "partial": f"Strengthen {control['title']}. Review current implementation against full requirements and address remaining gaps. {control['description']}",
        }
        return recommendations.get(status, f"Review and improve {control['title']}")

    def get_popia_guidelines(self) -> dict:
        """Get South Africa POPIA (Protection of Personal Information Act) guidelines.

        Returns comprehensive guidance on POPIA principles, conditions,
        data subject rights, obligations, and penalties.

        Returns:
            Dictionary with ``popia`` key containing principles,
            conditions, rights, obligations, and penalties.
        """
        popia = {
            "principles": [
                {
                    "principle": "Lawfulness",
                    "description": "Personal information must be processed lawfully and in a reasonable manner that does not infringe on the data subject's privacy.",
                },
                {
                    "principle": "Minimality",
                    "description": "Personal information may only be collected for a specific purpose and only the minimum necessary information should be collected.",
                },
                {
                    "principle": "Consent",
                    "description": "Where consent is the legal basis, the data subject must provide informed, voluntary, and specific consent.",
                },
                {
                    "principle": "Purpose Limitation",
                    "description": "Personal information must be collected for a specific, explicitly defined, and lawful purpose.",
                },
                {
                    "principle": "Information Quality",
                    "description": "The responsible party must take reasonably practicable steps to ensure personal information is complete, accurate, and up to date.",
                },
                {
                    "principle": "Openness",
                    "description": "Data subjects must be notified that their personal information is being collected and the purpose for which it is being collected.",
                },
                {
                    "principle": "Security Safeguards",
                    "description": "Appropriate technical and organisational measures must protect personal information against loss, damage, and unauthorised access.",
                },
                {
                    "principle": "Data Subject Participation",
                    "description": "Data subjects have the right to request confirmation of information held, correction of information, and deletion of information.",
                },
            ],
            "conditions_for_lawful_processing": [
                {
                    "condition_id": "C1",
                    "title": "Accountability",
                    "description": "The responsible party must ensure compliance with all POPIA conditions. An information officer must be appointed.",
                },
                {
                    "condition_id": "C2",
                    "title": "Processing Limitation",
                    "description": "Personal information must be processed lawfully and in a reasonable manner. Consent or another legal basis is required.",
                },
                {
                    "condition_id": "C3",
                    "title": "Purpose Specification",
                    "description": "Personal information must be collected for a specific, explicitly defined, and lawful purpose.",
                },
                {
                    "condition_id": "C4",
                    "title": "Further Processing Limitation",
                    "description": "Further processing must be compatible with the original purpose of collection.",
                },
                {
                    "condition_id": "C5",
                    "title": "Information Quality",
                    "description": "The responsible party must take reasonably practicable steps to ensure personal information is complete, accurate, and up to date.",
                },
                {
                    "condition_id": "C6",
                    "title": "Openness",
                    "description": "The responsible party must maintain documentation of all processing operations and notify the data subject of key information.",
                },
                {
                    "condition_id": "C7",
                    "title": "Security Safeguards",
                    "description": "Appropriate technical and organisational measures must protect personal information against loss, damage, and unauthorised access.",
                },
                {
                    "condition_id": "C8",
                    "title": "Data Subject Participation",
                    "description": "Data subjects have the right to request confirmation of information held, correction of information, and deletion of information.",
                },
            ],
            "data_subject_rights": [
                "Right to be informed when personal information is collected",
                "Right to request confirmation of information held",
                "Right to request correction of personal information",
                "Right to request deletion of personal information",
                "Right to object to processing of personal information",
                "Right to object to direct marketing",
                "Right to not have personal information processed for direct marketing purposes",
                "Right to complain to the Information Regulator",
                "Right to institute civil proceedings for interference with the protection of personal information",
            ],
            "obligations": [
                {
                    "obligation_id": "O1",
                    "title": "Appoint an Information Officer",
                    "description": "Every public and private body must appoint an information officer and one or more deputy information officers.",
                },
                {
                    "obligation_id": "O2",
                    "title": "Register with the Information Regulator",
                    "description": "Responsible parties must register with the Information Regulator and provide details of their information processing activities.",
                },
                {
                    "obligation_id": "O3",
                    "title": "Notify Data Subjects",
                    "description": "Data subjects must be notified when their personal information is collected, including the purpose and the recipient.",
                },
                {
                    "obligation_id": "O4",
                    "title": "Obtain Consent",
                    "description": "Where consent is the legal basis, informed, voluntary, and specific consent must be obtained.",
                },
                {
                    "obligation_id": "O5",
                    "title": "Ensure Information Quality",
                    "description": "Take reasonably practicable steps to ensure personal information is complete, accurate, and up to date.",
                },
                {
                    "obligation_id": "O6",
                    "title": "Implement Security Safeguards",
                    "description": "Implement appropriate technical and organisational measures to protect personal information.",
                },
                {
                    "obligation_id": "O7",
                    "title": "Breach Notification",
                    "description": "Notify the Information Regulator and affected data subjects as soon as reasonably possible after a breach.",
                },
                {
                    "obligation_id": "O8",
                    "title": "Cross-Border Transfers",
                    "description": "Personal information may only be transferred to countries with adequate data protection laws or with data subject consent.",
                },
            ],
            "penalties": {
                "administrative_fines": {
                    "description": "The Information Regulator may impose administrative fines for serious breaches of POPIA.",
                    "maximum_amount": "R10 million",
                },
                "criminal_penalties": {
                    "description": "Criminal penalties may be imposed for certain offences under POPIA, including imprisonment for up to 10 years.",
                    "examples": [
                        "Obstruction of the Information Regulator",
                        "Obstruction of an information officer",
                        "Failure to comply with an enforcement notice",
                    ],
                },
                "civil_liability": {
                    "description": "Data subjects may institute civil proceedings for damages suffered as a result of a breach of POPIA.",
                },
            },
        }

        self._save_json("popia_guidelines.json", popia)
        return {"popia": popia}

    # =================================================================
    # 6. PASSWORD ANALYSIS
    # =================================================================

    def check_password_strength(self, password: str) -> dict:
        """Analyse the strength of a password.

        Evaluates length, character variety, and resistance to common
        attack patterns.  Returns a score from 0-100 and a human-readable
        crack-time estimate.

        Args:
            password: The password to analyse.

        Returns:
            Dictionary with ``score`` (0-100), ``strength`` (one of
            ``very_weak``, ``weak``, ``fair``, ``strong``, ``very_strong``),
            ``crack_time``, ``improvement_suggestions``, and
            ``characteristics``.
        """
        if not password:
            return {
                "score": 0,
                "strength": "very_weak",
                "crack_time": "Instant",
                "improvement_suggestions": ["Please enter a password"],
                "characteristics": {},
            }

        score = 0
        characteristics = {
            "length": len(password),
            "has_uppercase": bool(re.search(r"[A-Z]", password)),
            "has_lowercase": bool(re.search(r"[a-z]", password)),
            "has_numbers": bool(re.search(r"[0-9]", password)),
            "has_special": bool(re.search(r"[^A-Za-z0-9]", password)),
            "unique_characters": len(set(password)),
        }

        # Length scoring
        length = len(password)
        if length >= 16:
            score += 30
        elif length >= 12:
            score += 25
        elif length >= 8:
            score += 15
        elif length >= 6:
            score += 5

        # Character variety scoring
        char_types = sum([
            characteristics["has_uppercase"],
            characteristics["has_lowercase"],
            characteristics["has_numbers"],
            characteristics["has_special"],
        ])
        score += char_types * 10

        # Unique characters bonus
        unique_ratio = characteristics["unique_characters"] / length if length > 0 else 0
        if unique_ratio >= 0.8:
            score += 15
        elif unique_ratio >= 0.6:
            score += 10
        elif unique_ratio >= 0.4:
            score += 5

        # Penalise common patterns
        common_patterns = [
            r"^(password|passwd|pwd|123456|qwerty|abc123|letmein|admin|login|welcome|monkey|dragon|master|sunshine|princess|football|baseball|iloveyou|trustno1|shadow|ashley|michael|jesus|manchester|liverpool|chelsea|arsenal|barcelona|realmadrid)\d*$",
            r"^\d{1,8}$",
            r"^([a-zA-Z])\1+$",
            r"^(19|20)\d{2}$",
            r"^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$",
        ]
        for pattern in common_patterns:
            if re.match(pattern, password, re.IGNORECASE):
                score = max(0, score - 40)

        # Penalise keyboard patterns
        keyboard_patterns = [
            "qwerty", "asdfgh", "zxcvbn", "qazwsx", "wsxedc", "edcrfv",
            "123456", "234567", "345678", "456789", "567890",
        ]
        pwd_lower = password.lower()
        for kp in keyboard_patterns:
            if kp in pwd_lower:
                score = max(0, score - 20)
                break

        score = max(0, min(100, score))

        # Determine strength and crack time
        if score >= 90:
            strength = "very_strong"
            crack_time = "Centuries"
        elif score >= 70:
            strength = "strong"
            crack_time = "Years to decades"
        elif score >= 50:
            strength = "fair"
            crack_time = "Months to years"
        elif score >= 30:
            strength = "weak"
            crack_time = "Days to weeks"
        elif score >= 10:
            strength = "very_weak"
            crack_time = "Minutes to hours"
        else:
            strength = "very_weak"
            crack_time = "Instant"

        # Generate improvement suggestions
        suggestions = []
        if length < 12:
            suggestions.append(f"Increase password length to at least 12 characters (currently {length})")
        if not characteristics["has_uppercase"]:
            suggestions.append("Add uppercase letters (A-Z)")
        if not characteristics["has_lowercase"]:
            suggestions.append("Add lowercase letters (a-z)")
        if not characteristics["has_numbers"]:
            suggestions.append("Add numbers (0-9)")
        if not characteristics["has_special"]:
            suggestions.append("Add special characters (!@#$%^&* etc.)")
        if unique_ratio < 0.5:
            suggestions.append("Use more unique characters — avoid repetition")

        result = {
            "score": score,
            "strength": strength,
            "crack_time": crack_time,
            "improvement_suggestions": suggestions or ["Good password! Consider using a passphrase for even stronger security."],
            "characteristics": characteristics,
        }

        self._save_json(f"password_check_{uuid.uuid4().hex[:8]}.json", result)
        return result

    def generate_password(self, length: int = 16, include_special: bool = True) -> dict:
        """Generate a secure random password.

        Args:
            length: Password length (default 16, minimum 8).
            include_special: Whether to include special characters.

        Returns:
            Dictionary with ``password`` and ``strength``.
        """
        length = max(8, length)

        alphabet = string.ascii_letters + string.digits
        if include_special:
            alphabet += "!@#$%^&*()-_=+[]{}|;:,.<>?"

        while True:
            password = "".join(secrets.choice(alphabet) for _ in range(length))
            # Ensure at least one of each required character type
            if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and (not include_special or any(c in "!@#$%^&*()-_=+[]{}|;:,.<>?" for c in password))):
                break

        strength_result = self.check_password_strength(password)

        return {
            "password": password,
            "strength": strength_result,
        }

    def generate_passphrase(self, word_count: int = 6, separator: str = "-") -> dict:
        """Generate a secure passphrase using Diceware-style word list.

        Args:
            word_count: Number of words (default 6, minimum 4).
            separator: Word separator (default "-").

        Returns:
            Dictionary with ``passphrase`` and ``entropy_bits``.
        """
        word_count = max(4, word_count)

        # Common Diceware word list (abbreviated for this implementation)
        word_list = [
            "apple", "banana", "cherry", "dragon", "eagle", "falcon", "grape", "honey",
            "iceberg", "jungle", "kangaroo", "lemon", "mango", "nebula", "orange", "panda",
            "quartz", "rabbit", "silver", "tiger", "umbrella", "violin", "whale", "xenon",
            "yellow", "zebra", "anchor", "bridge", "canyon", "desert", "forest", "galaxy",
            "harbor", "island", "journey", "kingdom", "lantern", "meadow", "noble", "ocean",
            "palace", "quest", "river", "summit", "temple", "unicorn", "valley", "waterfall",
            "crystal", "diamond", "emerald", "feather", "garden", "horizon", "infinity", "jewel",
            "knight", "legend", "miracle", "nature", "oracle", "phoenix", "quantum", "rainbow",
            "sapphire", "thunder", "universe", "voyage", "wisdom", "zenith", "blizzard", "comet",
            "destiny", "eclipse", "fortune", "granite", "harmony", "illusion", "jupiter", "keystone",
            "liberty", "mystic", "neptune", "obsidian", "paradox", "quiver", "rhapsody", "solstice",
            "tornado", "utopia", "vertex", "willow", "yonder", "aurora", "breeze", "cascade",
            "dawn", "echo", "flame", "glimmer", "haven", "iris", "jade", "karma",
        ]

        words = [secrets.choice(word_list) for _ in range(word_count)]
        passphrase = separator.join(words)

        # Add random digits for extra entropy
        passphrase += separator + str(secrets.randbelow(100)).zfill(2)

        # Calculate entropy
        entropy_per_word = 6.64  # log2(100)
        entropy_total = word_count * entropy_per_word + 6.64  # extra for 2 digits

        return {
            "passphrase": passphrase,
            "entropy_bits": round(entropy_total, 1),
            "word_count": word_count,
            "crack_time": "Centuries" if entropy_total > 50 else "Years to decades",
        }

    # =================================================================
    # 7. SECURITY POLICY GENERATOR
    # =================================================================

    def generate_security_policy(self, policy_type: str = "password", organisation: str = "[Organisation Name]") -> dict:
        """Generate a security policy document.

        Args:
            policy_type: One of ``password``, ``acceptable_use``,
                ``remote_access``, ``incident_response``, ``data_protection``,
                `` BYOD``, ``cloud_usage``.
            organisation: The organisation name to include in the policy.

        Returns:
            Dictionary with ``policy_type``, ``organisation``, ``policy``
            (the full text), and ``sections``.
        """
        policies = {
            "password": {
                "title": "Password Security Policy",
                "sections": [
                    ("1. Purpose", f"This policy establishes the requirements for creating, managing, and protecting passwords at {organisation}. All employees, contractors, and third-party users must adhere to these requirements."),
                    ("2. Scope", f"This policy applies to all systems, applications, and services owned or managed by {organisation}, including cloud services, third-party applications, and internal systems."),
                    ("3. Password Requirements", "- Minimum length: 12 characters\n- Must contain at least one uppercase letter (A-Z)\n- Must contain at least one lowercase letter (a-z)\n- Must contain at least one number (0-9)\n- Must contain at least one special character (!@#$%^&* etc.)\n- Must not contain the user's name, username, or organisation name\n- Must not be a previously breached password"),
                    ("4. Password Management", "- Passwords must be changed every 90 days\n- Passwords must not be reused across different systems\n- Passwords must not be shared with anyone\n- Passwords must not be written down or stored in plain text\n- Multi-factor authentication (MFA) must be enabled where available"),
                    ("5. Enforcement", "Violations of this policy may result in disciplinary action, up to and including termination of employment or contract."),
                ],
            },
            "acceptable_use": {
                "title": "Acceptable Use Policy",
                "sections": [
                    ("1. Purpose", f"This policy defines the acceptable use of {organisation}'s information systems, networks, and resources."),
                    ("2. Scope", f"This policy applies to all employees, contractors, and third-party users who access {organisation}'s systems."),
                    ("3. Acceptable Use", "- Using systems for legitimate business purposes\n- Complying with all applicable laws and regulations\n- Protecting confidential information\n- Reporting security incidents promptly"),
                    ("4. Prohibited Activities", "- Accessing unauthorised systems or data\n- Installing unauthorised software\n- Using systems for illegal activities\n- Sending offensive or harassing communications\n- Downloading or distributing pirated content\n- Bypassing security controls"),
                    ("5. Monitoring", f"{organisation} reserves the right to monitor all network traffic and system usage to ensure compliance with this policy."),
                    ("6. Enforcement", "Violations may result in disciplinary action, including termination and legal proceedings."),
                ],
            },
            "remote_access": {
                "title": "Remote Access Policy",
                "sections": [
                    ("1. Purpose", f"This policy establishes the requirements for secure remote access to {organisation}'s systems."),
                    ("2. Scope", f"This policy applies to all remote access methods including VPN, remote desktop, SSH, and cloud-based access to {organisation} systems."),
                    ("3. Requirements", "- Multi-factor authentication (MFA) is mandatory for all remote access\n- All remote connections must use encrypted protocols\n- Remote access sessions must be logged and monitored\n- Remote access privileges are granted on a least-privilege basis\n- Personal devices used for remote access must meet security standards"),
                    ("4. Responsibilities", "- Users must secure their remote work environment\n- Users must report lost or stolen devices immediately\n- IT must review remote access logs regularly\n- IT must revoke remote access upon termination"),
                    ("5. Enforcement", "Unauthorized remote access attempts will be investigated and may result in disciplinary action."),
                ],
            },
            "incident_response": {
                "title": "Incident Response Policy",
                "sections": [
                    ("1. Purpose", f"This policy establishes the framework for detecting, responding to, and recovering from security incidents at {organisation}."),
                    ("2. Scope", f"This policy applies to all security incidents affecting {organisation}'s information systems, networks, and data."),
                    ("3. Incident Classification", "- Critical: Active data breach, ransomware, system compromise\n- High: Unauthorized access, malware outbreak, DDoS attack\n- Medium: Phishing campaign, policy violation, suspicious activity\n- Low: Scanning, probing, minor policy violations"),
                    ("4. Response Procedures", "- All incidents must be reported within 1 hour of discovery\n- The Incident Response Team must be activated for Critical and High incidents\n- Forensic evidence must be preserved\n- Affected systems must be isolated to prevent further damage\n- Post-incident reviews must be conducted within 5 business days"),
                    ("5. Roles and Responsibilities", "- CISO: Overall incident response coordination\n- IT Security Team: Technical response and containment\n- Legal: Regulatory notifications and legal advice\n- Communications: Internal and external communications"),
                    ("6. Enforcement", "Failure to report incidents promptly may result in disciplinary action."),
                ],
            },
            "data_protection": {
                "title": "Data Protection Policy",
                "sections": [
                    ("1. Purpose", f"This policy establishes the requirements for protecting {organisation}'s data throughout its lifecycle."),
                    ("2. Scope", f"This policy applies to all data owned or processed by {organisation}, including customer data, employee data, and proprietary information."),
                    ("3. Data Classification", "- Confidential: Data that could cause significant harm if disclosed\n- Internal: Data intended for internal use only\n- Public: Data approved for public disclosure"),
                    ("4. Data Handling", "- Confidential data must be encrypted at rest and in transit\n- Data must be accessed on a need-to-know basis\n- Data transfers must be logged and approved\n- Third-party data sharing requires a data processing agreement"),
                    ("5. Data Retention", "- Data must be retained only as long as legally and operationally necessary\n- Secure disposal procedures must be followed when data is no longer needed\n- Backup data must be encrypted and regularly tested"),
                    ("6. Breach Notification", "- Data breaches must be reported within 24 hours\n- Affected individuals must be notified as required by law\n- The Information Regulator must be notified per POPIA requirements"),
                ],
            },
            "BYOD": {
                "title": "Bring Your Own Device (BYOD) Policy",
                "sections": [
                    ("1. Purpose", f"This policy establishes the requirements for using personal devices to access {organisation}'s systems and data."),
                    ("2. Scope", f"This policy applies to all employees, contractors, and third-party users who use personal devices for {organisation} business."),
                    ("3. Eligible Devices", "- Smartphones and tablets\n- Laptops and notebooks\n- Other devices approved by IT"),
                    ("4. Security Requirements", "- Device must have a passcode or biometric lock\n- Device must be encrypted\n- Anti-malware software must be installed\n- Operating system must be up to date\n- Device must be enrolled in mobile device management (MDM)"),
                    ("5. Prohibited Activities", "- Jailbreaking or rooting devices\n- Storing confidential data on personal cloud services\n- Sharing device access with unauthorised persons"),
                    ("6. Enforcement", "Non-compliant devices may be blocked from accessing organisational resources."),
                ],
            },
            "cloud_usage": {
                "title": "Cloud Usage Policy",
                "sections": [
                    ("1. Purpose", f"This policy establishes the requirements for using cloud services at {organisation}."),
                    ("2. Scope", f"This policy applies to all cloud services used for {organisation} business, including SaaS, PaaS, and IaaS."),
                    ("3. Approved Services", "- Only IT-approved cloud services may be used\n- New cloud services require security assessment\n- Shadow IT is prohibited"),
                    ("4. Data Protection", "- Confidential data must not be stored in unapproved cloud services\n- Cloud data must be encrypted\n- Access controls must align with organisational policies"),
                    ("5. Compliance", "- Cloud usage must comply with POPIA and other applicable regulations\n- Data residency requirements must be considered\n- Vendor security assessments must be conducted annually"),
                ],
            },
        }

        if policy_type not in policies:
            return {
                "error": f"Unknown policy type: {policy_type}",
                "available_types": list(policies.keys()),
            }

        policy_def = policies[policy_type]
        policy_text = f"{policy_def['title']}\n{'=' * len(policy_def['title'])}\n\n"
        policy_text += f"Organisation: {organisation}\n"
        policy_text += f"Date: {datetime.now().strftime('%Y-%m-%d')}\n"
        policy_text += f"Version: 1.0\n\n"

        for section_title, section_content in policy_def["sections"]:
            policy_text += f"{section_title}\n{'-' * len(section_title)}\n{section_content}\n\n"

        policy_text += f"---\nThis policy is effective immediately and applies to all users of {organisation}'s systems.\n"
        policy_text += f"For questions about this policy, contact the Information Security team at {organisation}.\n"

        result = {
            "policy_type": policy_type,
            "organisation": organisation,
            "policy": policy_text,
            "sections": [title for title, _ in policy_def["sections"]],
            "generated_at": datetime.now().isoformat(),
        }

        self._save_json(f"policy_{policy_type}_{organisation.replace(' ', '_')}.json", result)
        return result

    # =================================================================
    # 8. UTILITY / INTEGRATION
    # =================================================================

    def get_status(self) -> dict:
        """Get the current engine status and available data counts.

        Returns:
            Dictionary with counts of available resources.
        """
        return {
            "status": "operational",
            "cve_database_size": len(self.cve_database),
            "training_modules_count": len(self.training_modules),
            "total_lessons": sum(len(m.get("lessons", [])) for m in self.training_modules),
            "incident_playbooks_count": len(self.incident_playbooks),
            "compliance_frameworks_count": len(self.compliance_frameworks),
            "practice_labs_count": len(self.practice_labs),
            "data_directory": str(self.DATA_DIR),
        }

    def quick_assess(self, domain: str = None) -> dict:
        """Run a quick general security assessment.

        Convenience wrapper around ``run_security_assessment`` with
        sensible defaults.

        Args:
            domain: Optional target domain.

        Returns:
            Assessment result dictionary.
        """
        return self.run_security_assessment(domain=domain, assessment_type="general")

    def generate_report(self, assessment_id: str = None) -> dict:
        """Generate a summary report.

        Args:
            assessment_id: Optional assessment ID to include in report.
                If omitted, returns a summary of available resources.

        Returns:
            Dictionary with report content.
        """
        if assessment_id and assessment_id in self._assessment_cache:
            assessment = self._assessment_cache[assessment_id]
            return {
                "report_type": "assessment",
                "assessment_id": assessment_id,
                "generated_at": datetime.now().isoformat(),
                "summary": {
                    "type": assessment["type"],
                    "domain": assessment["domain"],
                    "score": assessment["score"],
                    "risk_level": assessment["risk_level"],
                    "findings_count": len(assessment["findings"]),
                    "critical_count": sum(1 for f in assessment["findings"] if f["severity"] == "critical"),
                    "high_count": sum(1 for f in assessment["findings"] if f["severity"] == "high"),
                },
            }

        # General report
        status = self.get_status()
        return {
            "report_type": "general",
            "generated_at": datetime.now().isoformat(),
            "summary": {
                **status,
                "recommendation": "Run a security assessment using run_security_assessment() to get started.",
            },
        }


# ====================================================================
# Standalone execution
# ====================================================================

if __name__ == "__main__":
    engine = CybersecurityEngine()
    print(f"{'='*60}")
    print("  Cybersecurity Engine — Status Report")
    print(f"{'='*60}")

    status = engine.get_status()
    for key, value in status.items():
        print(f"  {key}: {value}")

    print(f"\n{'='*60}")
    print("  Quick Assessment Demo")
    print(f"{'='*60}")

    result = engine.quick_assess(domain="example.com")
    print(f"  Assessment ID: {result['assessment_id']}")
    print(f"  Type: {result['type']}")
    print(f"  Domain: {result['domain']}")
    print(f"  Score: {result['score']}/100")
    print(f"  Risk Level: {result['risk_level'].upper()}")
    print(f"  Findings: {len(result['findings'])}")
    print(f"  Checks Performed: {result['checks_performed']}")

    print(f"\n  Top Findings:")
    for finding in sorted(result["findings"], key=lambda x: {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(x["severity"], 0), reverse=True)[:5]:
        print(f"    [{finding['severity'].upper()}] {finding['category']}: {finding['description'][:80]}...")

    print(f"\n{'='*60}")
    print("  Password Check Demo")
    print(f"{'='*60}")

    pwd_result = engine.check_password_strength("MyStr0ng!P@ss")
    print(f"  Password: MyStr0ng!P@ss")
    print(f"  Score: {pwd_result['score']}/100")
    print(f"  Strength: {pwd_result['strength']}")
    print(f"  Crack Time: {pwd_result['crack_time']}")
    print(f"  Suggestions: {pwd_result['improvement_suggestions']}")

    print(f"\n{'='*60}")
    print("  Generated Password")
    print(f"{'='*60}")

    gen_result = engine.generate_password(length=16)
    print(f"  Password: {gen_result['password']}")
    print(f"  Strength: {gen_result['strength']['strength']}")

    print(f"\n{'='*60}")
    print("  Generated Passphrase")
    print(f"{'='*60}")

    phrase_result = engine.generate_passphrase(word_count=6)
    print(f"  Passphrase: {phrase_result['passphrase']}")
    print(f"  Entropy: {phrase_result['entropy_bits']} bits")

    print(f"\n{'='*60}")
    print("  CybersecurityEngine initialised and verified successfully.")
    print(f"{'='*60}\n")