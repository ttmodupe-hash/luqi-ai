#!/usr/bin/env python3
"""
Luqi-AI Dynamic Domain-Driven RAG & Exam Tutor Router Agent
Multi-Agent Intent Router, Namespaced Vector Retrieval & Stateful Socratic Tutor
Compatible with LangChain / LangGraph, Qdrant / Pinecone / pgvector, and Google Gemini
"""

import os
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

# LangChain Imports
try:
    from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
    from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
    from langchain_core.runnables import RunnableBranch, RunnableLambda, RunnablePassthrough
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
except ImportError:
    # Fallback mock classes for environments without installed langchain packages
    pass

# ============================================================================
# 1. DOMAIN SPECIFICATIONS & SYSTEM PROMPT DIRECTIVES
# ============================================================================

DOMAIN_DIRECTIVES = {
    "CLOUD_INFRASTRUCTURE": {
        "title": "Cloud Architecture & Infrastructure Specialist",
        "target_exams": ["AWS Certified Solutions Architect", "Azure Administrator", "Google Associate Cloud Engineer"],
        "vector_namespace": "kb_cloud_infrastructure",
        "system_instruction": (
            "You are an elite Principal Cloud Architect and Certification Tutor. "
            "When explaining cloud services, always emphasize the architectural trade-offs: "
            "cost, high availability, resilience, and security. For technical architecture questions, "
            "provide conceptual explanations along with structured infrastructure-as-code snippets "
            "(Terraform, AWS CloudFormation, or Azure ARM templates) where relevant. "
            "Focus heavily on security concepts like Least Privilege Access, IAM policies, and VPC networking configurations."
        )
    },
    "PROJECT_MANAGEMENT_PMP": {
        "title": "Senior Program Manager & Agile Coach",
        "target_exams": ["PMP (PMBOK Guide 7th Edition)", "CAPM", "Certified ScrumMaster (CSM)", "ITIL 4/5"],
        "vector_namespace": "kb_project_management",
        "system_instruction": (
            "You are a Senior Program Manager and Agile Coach. Your teaching style is highly situational. "
            "Do not just define terms; explain concepts using real-world enterprise scenarios. "
            "When training for the PMP exam, strictly align with the latest PMBOK Guide domains (People, Process, Business Environment). "
            "For Agile questions, clearly distinguish between Scrum, Kanban, and traditional Predictive (Waterfall) lifecycles. "
            "Structure your practice questions around complex corporate dilemmas, prompting students to determine 'What should the Project Manager do next?'"
        )
    },
    "SOFTWARE_DEVSECOPS": {
        "title": "Principal Software Engineer & DevSecOps Specialist",
        "target_exams": ["AWS DevOps Engineer", "Certified Kubernetes Administrator (CKA)", "CISSP", "Docker"],
        "vector_namespace": "kb_software_devsecops",
        "system_instruction": (
            "You are a Principal Software Engineer and DevSecOps Specialist. You teach modern application development, "
            "CI/CD pipelines, containerization (Docker, Kubernetes), and security practices. "
            "Always provide clean, production-ready code examples in the user's requested language. "
            "Highlight edge cases, code refactoring patterns, microservices design patterns, and shift-left security strategies within automated pipelines."
        )
    },
    "CISCO_NETWORKING": {
        "title": "Senior Cisco Network Architect & Certification Coach",
        "target_exams": ["CCNA 200-301", "CCNP 350-401 ENCOR", "CCNP ENARSI", "CCIP Service Provider"],
        "vector_namespace": "kb_cisco_networking",
        "system_instruction": (
            "You are a Senior Cisco Network Architect and Certification Instructor. "
            "Anchor explanations to official blueprints (Spanning Tree IEEE 802.1D/802.1w, OSPFv2/v3, BGP path attributes, VLANs, and Subnetting). "
            "Provide Cisco IOS CLI verification outputs (`show spanning-tree`, `show ip ospf neighbor`, `show ip route`) "
            "and explicitly alert students to common exam traps and distractor options."
        )
    }
}

# ============================================================================
# 2. STATEFUL STUDENT TRACKING SCHEMA
# ============================================================================

@dataclass
class StudentProfile:
    user_id: str
    active_track: str
    domain_scores: Dict[str, float]  # e.g., {"People": 0.82, "Process": 0.45, "Business Environment": 0.90}
    recent_errors: List[str]
    session_history: List[Dict[str, str]]

# ============================================================================
# 3. ROUTER AGENT: INTENT CLASSIFICATION PROMPT
# ============================================================================

ROUTER_PROMPT_TEMPLATE = """
You are the Master Classifier Agent for the Luqi-AI Multi-Domain IT Exam Tutor.
Analyze the user's input and classify it into EXACTLY ONE of the following technical domains:

1. CLOUD_INFRASTRUCTURE (AWS, Azure, GCP, VPC, IAM, S3, EC2, Terraform, CloudFormation, High Availability)
2. PROJECT_MANAGEMENT_PMP (PMP, PMBOK, Scrum, Agile, Sprint, CCB, Change Management, Conflict Resolution, People/Process)
3. SOFTWARE_DEVSECOPS (Python, TypeScript, Docker, Kubernetes, CKA, CI/CD, GitOps, OWASP, Microservices, Security)
4. CISCO_NETWORKING (CCNA, CCNP, BGP, OSPF, Spanning Tree, STP, VLAN, CLI commands, Subnetting, Routers, Switches)

User Input: "{user_query}"

Respond in valid JSON format only:
{{
  "domain": "CLOUD_INFRASTRUCTURE" | "PROJECT_MANAGEMENT_PMP" | "SOFTWARE_DEVSECOPS" | "CISCO_NETWORKING",
  "confidence": float (0.0 to 1.0),
  "detected_exam_focus": string,
  "reasoning": string
}}
"""

# ============================================================================
# 4. PYTHON DEMO RUNNER
# ============================================================================

def classify_query_intent(user_query: str) -> Dict[str, Any]:
    """
    Classifies user prompt using keyword heuristics or LangChain LLM execution.
    """
    lower = user_query.lower()
    if any(k in lower for k in ["pmp", "pmbok", "scrum", "agile", "sprint", "stakeholder", "change control", "ccb"]):
        return {
            "domain": "PROJECT_MANAGEMENT_PMP",
            "confidence": 0.98,
            "detected_exam_focus": "PMP 7th Edition Situational Management",
            "reasoning": "Detected project governance and PMBOK situational phrasing."
        }
    elif any(k in lower for k in ["aws", "azure", "gcp", "s3", "iam", "vpc", "terraform", "cloudformation", "ec2"]):
        return {
            "domain": "CLOUD_INFRASTRUCTURE",
            "confidence": 0.95,
            "detected_exam_focus": "AWS Solutions Architect / Cloud Engineering",
            "reasoning": "Detected hyperscaler cloud architecture keywords."
        }
    elif any(k in lower for k in ["docker", "kubernetes", "k8s", "cka", "ci/cd", "pipeline", "owasp", "gitops"]):
        return {
            "domain": "SOFTWARE_DEVSECOPS",
            "confidence": 0.96,
            "detected_exam_focus": "DevOps & Kubernetes CKA",
            "reasoning": "Detected container orchestration and pipeline automation keywords."
        }
    else:
        return {
            "domain": "CISCO_NETWORKING",
            "confidence": 0.92,
            "detected_exam_focus": "Cisco CCNA/CCNP Network Engineering",
            "reasoning": "Detected networking, routing, or protocols."
        }

def mock_vector_rag_retrieval(namespace: str, query: str) -> List[str]:
    """
    Simulates top-k vector search from namespaced vector DB (Qdrant / Pinecone / pgvector)
    """
    if namespace == "kb_project_management":
        return [
            "[PMBOK 7th Ed Sec 2.2]: Team conflict must be resolved collaboratively at the lowest possible level before escalation.",
            "[PMBOK 7th Ed Sec 2.5]: Integrated Change Control requires halting unapproved work before formal CCB impact assessment."
        ]
    elif namespace == "kb_cloud_infrastructure":
        return [
            "[AWS Well-Architected Framework - Reliability Pillar]: Multi-AZ deployments with automatic RDS failover ensure RTO < 60s.",
            "[AWS IAM Best Practices]: Enforce least privilege using Condition keys with aws:SourceVpc and MFA."
        ]
    elif namespace == "kb_cisco_networking":
        return [
            "[IEEE 802.1D STP Spec]: Max Age timer defaults to 20s. Forward Delay defaults to 15s for Listening and 15s for Learning.",
            "[Cisco IOS CLI Guide]: `show spanning-tree interface detail` inspects port state convergence."
        ]
    else:
        return [
            "[DevOps Security Handbook]: Shift-left SAST scanners must gate merge requests if CVSS score >= 7.0.",
            "[Kubernetes Documentation]: Resource requests and limits prevent OOMKilled cascade across worker nodes."
        ]

def execute_tutor_pipeline(user_query: str, student_profile: Optional[StudentProfile] = None):
    """
    Full End-to-End Dynamic Domain-Driven RAG Pipeline Execution
    """
    # 1. Route Intent
    routing_result = classify_query_intent(user_query)
    domain_key = routing_result["domain"]
    domain_meta = DOMAIN_DIRECTIVES[domain_key]

    print(f"\n[ROUTER AGENT] Detected Domain: {domain_key}")
    print(f"[ROUTER AGENT] Assigned Expert: {domain_meta['title']}")
    print(f"[ROUTER AGENT] Target Vector Namespace: {domain_meta['vector_namespace']}")

    # 2. Vector Retrieval from Segmented Namespace
    retrieved_chunks = mock_vector_rag_retrieval(domain_meta["vector_namespace"], user_query)
    print(f"[RAG ENGINE] Retrieved {len(retrieved_chunks)} grounding documents from namespace.")

    # 3. Augmented Prompt Assembly
    full_system_prompt = (
        f"{domain_meta['system_instruction']}\n\n"
        f"GROUNDING SYLLABUS KNOWLEDGE (STRICT):\n"
        + "\n".join(retrieved_chunks) + "\n\n"
        "PEDAGOGICAL DIRECTIVES:\n"
        "- Anchor answers strictly to official certification blueprints.\n"
        "- Break down incorrect distractor options thoroughly.\n"
        "- Highlight common exam traps."
    )

    print("\n[TUTOR CORE READY] Pipeline successfully configured for execution.")
    return {
        "status": "success",
        "domain": domain_key,
        "expert_persona": domain_meta["title"],
        "namespace": domain_meta["vector_namespace"],
        "retrieved_context": retrieved_chunks,
        "system_instruction_preview": domain_meta["system_instruction"][:150] + "..."
    }

if __name__ == "__main__":
    print("=" * 70)
    print("LUQI-AI DYNAMIC DOMAIN-DRIVEN RAG EXAM TUTOR AGENT")
    print("=" * 70)

    # Test Sample Queries
    sample_queries = [
        "A senior stakeholder demands an urgent unbudgeted feature during Sprint 4. What should the Project Manager do next?",
        "How do I configure an AWS VPC with private subnets and a NAT Gateway for high availability across 3 Availability Zones?",
        "Why is my switch port stuck in the LISTENING state during spanning tree convergence?",
        "Write a Dockerfile and Kubernetes deployment manifest for a Node.js microservice with health probes."
    ]

    for q in sample_queries:
        print("\n" + "-" * 70)
        print(f"User Query: \"{q}\"")
        execute_tutor_pipeline(q)
