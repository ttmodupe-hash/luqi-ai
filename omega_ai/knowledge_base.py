#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Knowledge Base Module for Omega AI
Manages FAQs, documents, vector search, and semantic retrieval
for all Omega AI subsystems.
"""

import json
import logging
import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class KBEntry:
    """A knowledge base entry"""
    id: str
    question: str
    answer: str
    category: str = "general"
    tags: List[str] = field(default_factory=list)
    confidence: float = 1.0
    source: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    usage_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "question": self.question,
            "answer": self.answer,
            "category": self.category,
            "tags": self.tags,
            "confidence": self.confidence,
            "source": self.source,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "usage_count": self.usage_count
        }


@dataclass
class SearchResult:
    """Result of a knowledge base search"""
    entry: KBEntry
    score: float
    matched_keywords: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "entry": self.entry.to_dict(),
            "score": self.score,
            "matched_keywords": self.matched_keywords
        }


class KnowledgeBase:
    """
    Knowledge Base for Omega AI.
    Manages FAQs, documents, and provides semantic search capabilities.
    """
    
    def __init__(self):
        self.entries: Dict[str, KBEntry] = {}
        self.categories: Dict[str, List[str]] = {}  # category -> entry_ids
        self.tag_index: Dict[str, List[str]] = {}    # tag -> entry_ids
        self.search_history: List[Dict] = []
        self._initialize_default_entries()
        logger.info("KnowledgeBase initialized")
    
    def _initialize_default_entries(self):
        """Initialize default knowledge base entries"""
        default_entries = [
            {
                "id": "kb_001",
                "question": "What is Omega AI?",
                "answer": "Omega AI is an African-focused artificial intelligence platform that provides financial literacy, educational support, vocational guidance, and multilingual assistance including African languages.",
                "category": "general",
                "tags": ["omega", "about", "introduction"]
            },
            {
                "id": "kb_002",
                "question": "How do I create a budget?",
                "answer": "To create a budget: 1) List all income sources, 2) Track all expenses for a month, 3) Categorize expenses (needs/wants/savings), 4) Set spending limits per category, 5) Use the 50/30/20 rule as a guide, 6) Review and adjust monthly.",
                "category": "financial",
                "tags": ["budget", "planning", "money", "expenses"]
            },
            {
                "id": "kb_003",
                "question": "What is an emergency fund?",
                "answer": "An emergency fund is money set aside for unexpected expenses like medical emergencies, job loss, or car repairs. Aim for 3-6 months of living expenses. Keep it in a readily accessible savings account.",
                "category": "financial",
                "tags": ["emergency", "savings", "fund", "planning"]
            },
            {
                "id": "kb_004",
                "question": "How can I improve my credit score?",
                "answer": "To improve your credit score: 1) Pay all bills on time, 2) Keep credit utilization under 30%, 3) Don't close old accounts, 4) Limit new credit applications, 5) Check your credit report regularly for errors.",
                "category": "financial",
                "tags": ["credit", "score", "improve", "finance"]
            },
            {
                "id": "kb_005",
                "question": "What is a stokvel?",
                "answer": "A stokvel is a savings or investment society to which members regularly contribute an agreed amount. Originating in South Africa, stokvels are used for various purposes including savings, burial societies, and investment clubs. They are a traditional form of communal saving.",
                "category": "financial",
                "tags": ["stokvel", "savings", "south africa", "community"]
            },
            {
                "id": "kb_006",
                "question": "How do I say hello in Zulu?",
                "answer": "Hello in Zulu is 'Sawubona' (singular) or 'Sanibonani' (plural). 'Sawubona' literally means 'I see you' and is a respectful greeting acknowledging the other person's humanity.",
                "category": "language",
                "tags": ["zulu", "greeting", "hello", "african language"]
            },
            {
                "id": "kb_007",
                "question": "How do I say thank you in Swahili?",
                "answer": "Thank you in Swahili is 'Asante' (singular) or 'Asanteni' (plural). For emphasis, you can say 'Asante sana' meaning 'thank you very much'.",
                "category": "language",
                "tags": ["swahili", "thank you", "gratitude", "african language"]
            },
            {
                "id": "kb_008",
                "question": "What is compound interest?",
                "answer": "Compound interest is interest calculated on both the initial principal and the accumulated interest from previous periods. It allows your money to grow faster than simple interest. The formula is A = P(1 + r/n)^(nt), where P is principal, r is rate, n is compounding frequency, and t is time.",
                "category": "financial",
                "tags": ["interest", "compound", "investment", "math"]
            },
            {
                "id": "kb_009",
                "question": "How can I start investing?",
                "answer": "To start investing: 1) Build an emergency fund first, 2) Pay off high-interest debt, 3) Determine your risk tolerance, 4) Choose an investment account (retirement or taxable), 5) Start with low-cost index funds or ETFs, 6) Diversify across asset classes, 7) Invest regularly using dollar-cost averaging.",
                "category": "financial",
                "tags": ["investing", "stocks", "beginner", "wealth"]
            },
            {
                "id": "kb_010",
                "question": "What is inflation?",
                "answer": "Inflation is the rate at which the general level of prices for goods and services rises, causing purchasing power to fall. Central banks aim to keep inflation around 2% annually. High inflation erodes savings, while deflation can hurt economic growth.",
                "category": "financial",
                "tags": ["inflation", "economics", "prices", "purchasing power"]
            },
            {
                "id": "kb_011",
                "question": "How do I study effectively?",
                "answer": "Effective study techniques: 1) Use active recall (test yourself), 2) Space out your study sessions, 3) Use the Pomodoro technique (25 min study, 5 min break), 4) Teach concepts to others, 5) Create mind maps, 6) Get adequate sleep, 7) Review material regularly rather than cramming.",
                "category": "education",
                "tags": ["study", "learning", "techniques", "education"]
            },
            {
                "id": "kb_012",
                "question": "What career options are in technology?",
                "answer": "Technology career options include: Software Developer, Data Scientist, Cybersecurity Analyst, Cloud Architect, DevOps Engineer, AI/ML Engineer, Network Administrator, Database Administrator, IT Project Manager, UX/UI Designer, and Technical Writer. Each requires different skills and certifications.",
                "category": "vocational",
                "tags": ["career", "technology", "jobs", "skills"]
            },
            {
                "id": "kb_013",
                "question": "How do I write a CV?",
                "answer": "To write a good CV: 1) Include contact information, 2) Write a compelling personal statement, 3) List work experience (most recent first), 4) Include education and qualifications, 5) Add relevant skills, 6) Include achievements with metrics, 7) Keep it concise (1-2 pages), 8) Tailor it for each job application, 9) Proofread carefully.",
                "category": "vocational",
                "tags": ["cv", "resume", "job", "career"]
            },
            {
                "id": "kb_014",
                "question": "What is a tax deduction?",
                "answer": "A tax deduction reduces your taxable income, lowering the amount of tax you owe. Common deductions include retirement contributions, medical expenses, charitable donations, business expenses, and education costs. Keep records of all deductible expenses.",
                "category": "financial",
                "tags": ["tax", "deduction", "income", "savings"]
            },
            {
                "id": "kb_015",
                "question": "How do I say good morning in Yoruba?",
                "answer": "Good morning in Yoruba is 'Ẹ kú àárọ̀' (to an elder/respected person) or 'Kú àárọ̀' (informal). The response is 'Kú àárọ̀' or 'Àárọ̀ à máa dára' (morning will be good).",
                "category": "language",
                "tags": ["yoruba", "greeting", "morning", "african language"]
            }
        ]
        
        for entry_data in default_entries:
            self.add_entry(
                question=entry_data["question"],
                answer=entry_data["answer"],
                category=entry_data["category"],
                tags=entry_data.get("tags", []),
                entry_id=entry_data["id"]
            )
    
    def add_entry(self, question: str, answer: str, category: str = "general",
                  tags: Optional[List[str]] = None, entry_id: Optional[str] = None,
                  source: str = "") -> KBEntry:
        """Add an entry to the knowledge base"""
        entry_id = entry_id or f"kb_{len(self.entries) + 1:03d}"
        
        entry = KBEntry(
            id=entry_id,
            question=question,
            answer=answer,
            category=category,
            tags=tags or [],
            source=source
        )
        
        self.entries[entry_id] = entry
        
        # Update category index
        if category not in self.categories:
            self.categories[category] = []
        self.categories[category].append(entry_id)
        
        # Update tag index
        for tag in (tags or []):
            if tag not in self.tag_index:
                self.tag_index[tag] = []
            self.tag_index[tag].append(entry_id)
        
        logger.info(f"Added KB entry: {entry_id}")
        return entry
    
    def get_entry(self, entry_id: str) -> Optional[KBEntry]:
        """Get a knowledge base entry by ID"""
        return self.entries.get(entry_id)
    
    def update_entry(self, entry_id: str, **kwargs) -> Optional[KBEntry]:
        """Update a knowledge base entry"""
        entry = self.entries.get(entry_id)
        if not entry:
            return None
        
        for key, value in kwargs.items():
            if hasattr(entry, key):
                setattr(entry, key, value)
        
        entry.updated_at = datetime.now().isoformat()
        return entry
    
    def delete_entry(self, entry_id: str) -> bool:
        """Delete a knowledge base entry"""
        if entry_id not in self.entries:
            return False
        
        entry = self.entries[entry_id]
        
        # Remove from category index
        if entry.category in self.categories:
            self.categories[entry.category] = [e for e in self.categories[entry.category] if e != entry_id]
        
        # Remove from tag index
        for tag in entry.tags:
            if tag in self.tag_index:
                self.tag_index[tag] = [e for e in self.tag_index[tag] if e != entry_id]
        
        del self.entries[entry_id]
        logger.info(f"Deleted KB entry: {entry_id}")
        return True
    
    def search(self, query: str, category: Optional[str] = None,
               limit: int = 5) -> List[SearchResult]:
        """Search the knowledge base"""
        query_lower = query.lower()
        query_words = set(re.findall(r'\w+', query_lower))
        
        results = []
        
        # Filter by category if specified
        entries_to_search = self.entries.values()
        if category:
            entry_ids = self.categories.get(category, [])
            entries_to_search = [self.entries[eid] for eid in entry_ids if eid in self.entries]
        
        for entry in entries_to_search:
            score = 0.0
            matched_keywords = []
            
            entry_question_lower = entry.question.lower()
            entry_answer_lower = entry.answer.lower()
            entry_tags_lower = [t.lower() for t in entry.tags]
            
            # Check exact question match
            if query_lower == entry_question_lower:
                score += 10.0
            
            # Check if query is in question
            if query_lower in entry_question_lower:
                score += 5.0
                matched_keywords.append(query_lower)
            
            # Check if query is in answer
            if query_lower in entry_answer_lower:
                score += 2.0
            
            # Word matching
            for word in query_words:
                if word in entry_question_lower:
                    score += 1.5
                    matched_keywords.append(word)
                elif word in entry_answer_lower:
                    score += 0.5
                elif word in entry_tags_lower:
                    score += 2.0
                    matched_keywords.append(word)
            
            # Boost by usage count (popular entries)
            score += min(entry.usage_count * 0.1, 1.0)
            
            if score > 0:
                results.append(SearchResult(
                    entry=entry,
                    score=score,
                    matched_keywords=list(set(matched_keywords))
                ))
        
        # Sort by score descending
        results.sort(key=lambda r: r.score, reverse=True)
        
        # Log search
        self.search_history.append({
            "query": query,
            "category": category,
            "results_count": len(results),
            "timestamp": datetime.now().isoformat()
        })
        
        return results[:limit]
    
    def find_match(self, query: str, threshold: float = 0.5) -> Optional[Dict[str, Any]]:
        """Find the best matching entry for a query"""
        results = self.search(query, limit=1)
        
        if results and results[0].score >= threshold:
            result = results[0]
            result.entry.usage_count += 1
            return {
                "answer": result.entry.answer,
                "confidence": min(result.score / 10.0, 1.0),
                "source": result.entry.source or f"kb:{result.entry.id}",
                "question": result.entry.question,
                "matched_keywords": result.matched_keywords
            }
        
        return None
    
    def get_by_category(self, category: str) -> List[KBEntry]:
        """Get all entries in a category"""
        entry_ids = self.categories.get(category, [])
        return [self.entries[eid] for eid in entry_ids if eid in self.entries]
    
    def get_by_tag(self, tag: str) -> List[KBEntry]:
        """Get all entries with a specific tag"""
        entry_ids = self.tag_index.get(tag, [])
        return [self.entries[eid] for eid in entry_ids if eid in self.entries]
    
    def get_categories(self) -> List[str]:
        """Get all categories"""
        return sorted(self.categories.keys())
    
    def get_all_tags(self) -> List[str]:
        """Get all tags"""
        return sorted(self.tag_index.keys())
    
    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        return {
            "total_entries": len(self.entries),
            "total_categories": len(self.categories),
            "total_tags": len(self.tag_index),
            "categories": self.get_categories(),
            "top_tags": sorted(self.tag_index.keys(), 
                              key=lambda t: len(self.tag_index[t]), 
                              reverse=True)[:10]
        }
    
    def export_to_dict(self) -> Dict[str, Any]:
        """Export the knowledge base as a dictionary"""
        return {
            "entries": {eid: entry.to_dict() for eid, entry in self.entries.items()},
            "categories": self.categories,
            "tags": self.tag_index,
            "stats": self.get_stats()
        }
    
    def import_from_dict(self, data: Dict[str, Any]) -> int:
        """Import entries from a dictionary"""
        entries = data.get("entries", {})
        count = 0
        for entry_id, entry_data in entries.items():
            self.add_entry(
                question=entry_data["question"],
                answer=entry_data["answer"],
                category=entry_data.get("category", "general"),
                tags=entry_data.get("tags", []),
                entry_id=entry_id,
                source=entry_data.get("source", "")
            )
            count += 1
        return count
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize the KnowledgeBase state"""
        return {
            "total_entries": len(self.entries),
            "categories": self.get_categories(),
            "stats": self.get_stats()
        }
