#!/usr/bin/env python3
"""
Luqi AI v25.1.2 "Prometheus . LUQI" - Unified Web Core
=======================================================
One codebase serves Web, Desktop, and Mobile:
  Web:     FastAPI + Uvicorn
  Desktop: PyQt6 (bundled)
  Mobile:  Kivy (bundled)
"""

# ── Version ───────────────────────────────────────────────────────────
VERSION = "25.1.2"

import argparse
import asyncio
import base64
import hashlib
import importlib
import inspect
import io
import json
import logging
import mimetypes
import os
import pickle
import queue
import random
import re
import secrets
import shutil
import signal
import string
import subprocess
import sys
import tempfile
import threading
import time
import traceback
import uuid
import warnings
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import uvicorn
from fastapi import (BackgroundTasks, Depends, FastAPI, File, Form, HTTPException,
                     Request, UploadFile, WebSocket, WebSocketDisconnect, status)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import (FileResponse, HTMLResponse, JSONResponse,
                               PlainTextResponse, StreamingResponse)
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles

# ── Logging ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("LuqiAI")

# ═══════════════════════════════════════════════════════════════════════
#  IN-MEMORY DATA STORES (replace with Redis/DB in production)
# ═══════════════════════════════════════════════════════════════════════
conversation_db: Dict[str, list] = {}
user_sessions: Dict[str, dict] = {}
active_websockets: Dict[str, WebSocket] = {}
memory_cache: Dict[str, Any] = {}
pending_tasks: queue.Queue = queue.Queue()

# ── Memory Engine ─────────────────────────────────────────────────────
class MemoryEngine:
    """Short-term + long-term memory with LRU eviction."""
    def __init__(self, capacity: int = 10_000):
        self.capacity = capacity
        self.short_term: Dict[str, Any] = {}
        self.long_term: Dict[str, Any] = {}
        self.access_order: List[str] = []
        self.lock = threading.RLock()

    def get(self, key: str) -> Any:
        with self.lock:
            if key in self.short_term:
                self._touch(key)
                return self.short_term[key]
            if key in self.long_term:
                val = self.long_term[key]
                self._promote(key, val)
                return val
            return None

    def set(self, key: str, value: Any, permanent: bool = False):
        with self.lock:
            if permanent:
                self.long_term[key] = value
            else:
                self.short_term[key] = value
            self._touch(key)
            self._evict_if_needed()

    def delete(self, key: str):
        with self.lock:
            self.short_term.pop(key, None)
            self.long_term.pop(key, None)
            if key in self.access_order:
                self.access_order.remove(key)

    def search(self, query: str) -> List[Tuple[str, Any]]:
        with self.lock:
            results = []
            q = query.lower()
            for k, v in {**self.short_term, **self.long_term}.items():
                if q in k.lower() or q in str(v).lower():
                    results.append((k, v))
            return results

    def _touch(self, key: str):
        if key in self.access_order:
            self.access_order.remove(key)
        self.access_order.append(key)

    def _promote(self, key: str, value: Any):
        self.long_term.pop(key, None)
        self.short_term[key] = value

    def _evict_if_needed(self):
        total = len(self.short_term) + len(self.long_term)
        while total > self.capacity and self.access_order:
            oldest = self.access_order.pop(0)
            if oldest in self.short_term:
                del self.short_term[oldest]
            elif oldest in self.long_term:
                del self.long_term[oldest]
            total -= 1

    def stats(self) -> dict:
        with self.lock:
            return {
                "short_term": len(self.short_term),
                "long_term": len(self.long_term),
                "total_keys": len(self.short_term) + len(self.long_term),
                "capacity": self.capacity,
                "utilization": round((len(self.short_term) + len(self.long_term)) / self.capacity * 100, 2),
            }

memory_engine = MemoryEngine()

# ── Document Parser ───────────────────────────────────────────────────
class DocumentParser:
    """Extract text from PDF, DOCX, TXT, CSV."""
    SUPPORTED = {".pdf", ".docx", ".txt", ".csv", ".md", ".json"}

    @staticmethod
    def parse(file_path: str) -> str:
        path = Path(file_path)
        if not path.exists():
            return f"[Error] File not found: {file_path}"
        suffix = path.suffix.lower()
        if suffix not in DocumentParser.SUPPORTED:
            return f"[Error] Unsupported format: {suffix}"
        try:
            if suffix == ".txt" or suffix == ".md" or suffix == ".json":
                return path.read_text(encoding="utf-8")
            elif suffix == ".csv":
                return DocumentParser._parse_csv(path)
            elif suffix == ".pdf":
                return DocumentParser._parse_pdf(path)
            elif suffix == ".docx":
                return DocumentParser._parse_docx(path)
        except Exception as e:
            return f"[Error] Parsing failed: {e}"

    @staticmethod
    def _parse_csv(path: Path) -> str:
        try:
            import csv
            rows = []
            with open(path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                for row in reader:
                    rows.append(" | ".join(row))
            return "\n".join(rows)
        except Exception as e:
            return f"[CSV Error] {e}"

    @staticmethod
    def _parse_pdf(path: Path) -> str:
        try:
            import fitz
            doc = fitz.open(str(path))
            text = ""
            for page in doc:
                text += page.get_text()
            return text
        except ImportError:
            return "[Error] PyMuPDF (fitz) not installed. Run: pip install PyMuPDF"
        except Exception as e:
            return f"[PDF Error] {e}"

    @staticmethod
    def _parse_docx(path: Path) -> str:
        try:
            from docx import Document
            doc = Document(str(path))
            return "\n".join([p.text for p in doc.paragraphs])
        except ImportError:
            return "[Error] python-docx not installed. Run: pip install python-docx"
        except Exception as e:
            return f"[DOCX Error] {e}"

# ── Voice Engine ──────────────────────────────────────────────────────
class VoiceEngine:
    """Text-to-Speech and Speech-to-Text."""
    def __init__(self):
        self.tts_engine = None
        self.stt_engine = None
        self._init_tts()
        self._init_stt()

    def _init_tts(self):
        try:
            import pyttsx3
            self.tts_engine = pyttsx3.init()
            self.tts_engine.setProperty("rate", 150)
        except ImportError:
            logger.warning("pyttsx3 not available. TTS disabled.")

    def _init_stt(self):
        try:
            import speech_recognition as sr
            self.stt_engine = sr.Recognizer()
        except ImportError:
            logger.warning("speech_recognition not available. STT disabled.")

    def speak(self, text: str) -> str:
        if not self.tts_engine:
            return "[TTS not available]"
        try:
            self.tts_engine.say(text)
            self.tts_engine.runAndWait()
            return "[Spoke text]"
        except Exception as e:
            return f"[TTS Error] {e}"

    def listen(self, duration: int = 5) -> str:
        if not self.stt_engine:
            return "[STT not available]"
        try:
            import speech_recognition as sr
            with sr.Microphone() as source:
                logger.info("Listening...")
                audio = self.stt_engine.listen(source, timeout=duration)
            return self.stt_engine.recognize_google(audio)
        except Exception as e:
            return f"[STT Error] {e}"

    def text_to_speech(self, text: str) -> bytes:
        if not self.tts_engine:
            return b"[TTS not available]"
        try:
            import pyttsx3
            engine = pyttsx3.init()
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                tmp_path = f.name
            engine.save_to_file(text, tmp_path)
            engine.runAndWait()
            with open(tmp_path, "rb") as f:
                audio = f.read()
            os.unlink(tmp_path)
            return audio
        except Exception as e:
            return f"[TTS Error] {e}".encode()

voice_engine = VoiceEngine()

# ── Tool Registry ─────────────────────────────────────────────────────
class ToolRegistry:
    """Dynamic tool/plugin registration and execution."""
    def __init__(self):
        self.tools: Dict[str, Callable] = {}
        self.descriptions: Dict[str, str] = {}
        self.lock = threading.RLock()

    def register(self, name: str, func: Callable, description: str = ""):
        with self.lock:
            self.tools[name] = func
            self.descriptions[name] = description

    def unregister(self, name: str):
        with self.lock:
            self.tools.pop(name, None)
            self.descriptions.pop(name, None)

    def execute(self, name: str, *args, **kwargs) -> Any:
        with self.lock:
            if name not in self.tools:
                return f"[Error] Tool '{name}' not found"
            tool = self.tools[name]
        try:
            return tool(*args, **kwargs)
        except Exception as e:
            return f"[Tool Error] {e}"

    def list_tools(self) -> List[Dict]:
        with self.lock:
            return [{"name": n, "description": d} for n, d in self.descriptions.items()]

tool_registry = ToolRegistry()

# ── Capability Tracking ───────────────────────────────────────────────
class CapabilityItem:
    def __init__(self, name: str, description: str, category: str, func: Callable = None):
        self.name = name
        self.description = description
        self.category = category
        self.func = func
        self.use_count = 0
        self.created_at = datetime.now().isoformat()

class CapabilityTracker:
    def __init__(self):
        self.capabilities: Dict[str, CapabilityItem] = {}
        self.lock = threading.RLock()

    def register(self, name: str, description: str, category: str, func: Callable = None):
        with self.lock:
            self.capabilities[name] = CapabilityItem(name, description, category, func)

    def get(self, name: str) -> Optional[CapabilityItem]:
        with self.lock:
            cap = self.capabilities.get(name)
            if cap:
                cap.use_count += 1
            return cap

    def list_by_category(self, category: str) -> List[CapabilityItem]:
        with self.lock:
            return [c for c in self.capabilities.values() if c.category == category]

    def all(self) -> List[Dict]:
        with self.lock:
            return [{"name": c.name, "description": c.description, "category": c.category,
                     "use_count": c.use_count} for c in self.capabilities.values()]

capability_tracker = CapabilityTracker()

# ═══════════════════════════════════════════════════════════════════════
#  SELF-IMPROVEMENT AGENT
# ═══════════════════════════════════════════════════════════════════════
class SelfImprovementAgent:
    """
    Continuously monitors and improves the codebase:
    - Performance profiling
    - Bottleneck detection
    - Auto-optimization suggestions
    """
    def __init__(self, check_interval: int = 3600):
        self.check_interval = check_interval
        self.performance_log: List[Dict] = []
        self.suggestions: List[str] = []
        self.running = False
        self.thread: Optional[threading.Thread] = None

    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._loop, daemon=True)
            self.thread.start()
            logger.info("SelfImprovementAgent started")

    def stop(self):
        self.running = False
        logger.info("SelfImprovementAgent stopped")

    def _loop(self):
        while self.running:
            self._run_checks()
            time.sleep(self.check_interval)

    def _run_checks(self):
        logger.info("Running self-improvement checks...")
        self._profile_memory()
        self._profile_imports()
        self._check_bottlenecks()

    def _profile_memory(self):
        try:
            import psutil
            process = psutil.Process()
            mem_info = process.memory_info()
            entry = {
                "timestamp": datetime.now().isoformat(),
                "rss_mb": mem_info.rss / 1024 / 1024,
                "vms_mb": mem_info.vms / 1024 / 1024,
            }
            self.performance_log.append(entry)
            if len(self.performance_log) > 1000:
                self.performance_log = self.performance_log[-500:]
        except ImportError:
            self.suggestions.append("Install psutil for memory profiling: pip install psutil")

    def _profile_imports(self):
        slow_imports = []
        for name, module in sys.modules.items():
            if hasattr(module, "__file__") and module.__file__:
                try:
                    stat = os.stat(module.__file__)
                    size_kb = stat.st_size / 1024
                    if size_kb > 1000:
                        slow_imports.append(f"{name}: {size_kb:.0f}KB")
                except Exception:
                    pass
        if slow_imports:
            self.suggestions.append(f"Large imports detected: {', '.join(slow_imports[:5])}")

    def _check_bottlenecks(self):
        if len(self.performance_log) >= 2:
            recent = self.performance_log[-10:]
            avg_rss = sum(e["rss_mb"] for e in recent) / len(recent)
            if avg_rss > 500:
                self.suggestions.append(f"High memory usage detected: {avg_rss:.0f}MB avg")

    def get_report(self) -> Dict:
        return {
            "performance_log_count": len(self.performance_log),
            "recent_suggestions": self.suggestions[-20:],
            "memory_trend": self.performance_log[-10:] if self.performance_log else [],
        }

    def apply_suggestion(self, index: int) -> str:
        if 0 <= index < len(self.suggestions):
            return f"Would apply: {self.suggestions[index]}"
        return "Invalid suggestion index"

# ── Update Push Agent ─────────────────────────────────────────────────
class UpdatePushAgent:
    """Handles code updates and pushes to repository."""
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        self.update_queue: queue.Queue = queue.Queue()
        self.running = False

    def start(self):
        self.running = True
        threading.Thread(target=self._process_updates, daemon=True).start()

    def stop(self):
        self.running = False

    def queue_update(self, file_path: str, content: str, commit_msg: str):
        self.update_queue.put({"file": file_path, "content": content, "msg": commit_msg})

    def _process_updates(self):
        while self.running:
            try:
                update = self.update_queue.get(timeout=1)
                self._apply_update(update)
            except queue.Empty:
                continue

    def _apply_update(self, update: dict):
        try:
            target = self.repo_path / update["file"]
            target.write_text(update["content"], encoding="utf-8")
            logger.info(f"Updated: {update['file']}")
        except Exception as e:
            logger.error(f"Update failed for {update['file']}: {e}")

# ── YouTube Creation Engine ───────────────────────────────────────────
class YoutubeCreationEngine:
    """Tools for YouTube content creation workflow."""
    def __init__(self):
        self.templates_dir = Path("youtube_templates")
        self.templates_dir.mkdir(exist_ok=True)

    def generate_script(self, topic: str, duration: int = 10, style: str = "educational") -> str:
        """Generate a YouTube video script."""
        sections = duration // 5
        script = f"""# {topic} - Video Script
Style: {style.title()}
Target Duration: {duration} minutes

## HOOK (0:00 - 0:30)
[Grab attention with a surprising fact or question about {topic}]

## INTRO (0:30 - 1:00)
Welcome back! Today we're diving deep into {topic}.
If you're new here, subscribe for more content like this.

## MAIN CONTENT
"""
        for i in range(sections):
            start = 1 + i * (duration - 1) // sections
            end = 1 + (i + 1) * (duration - 1) // sections
            script += f"""
### Section {i+1} ({start}:00 - {end}:00)
[Explain key concept {i+1} about {topic}]
- Key point A
- Key point B
- Visual: [Describe what should be on screen]
"""
        script += f"""
## CTA (Last 30 seconds)
If you found this helpful, hit like and subscribe!
Drop your questions about {topic} in the comments.

## OUTRO
Thanks for watching! See you in the next one.
"""
        return script

    def generate_thumbnail_prompt(self, topic: str, style: str = "professional") -> str:
        """Generate an AI image prompt for a thumbnail."""
        prompts = {
            "professional": f"Professional thumbnail for '{topic}', clean design, bold text overlay, high contrast, 4K, YouTube style",
            "clickbait": f"Eye-catching thumbnail for '{topic}', surprised face, bright colors, arrows, bold text, high energy",
            "minimal": f"Minimalist thumbnail for '{topic}', simple geometric shapes, muted colors, elegant typography",
        }
        return prompts.get(style, prompts["professional"])

    def generate_title_ideas(self, topic: str, count: int = 5) -> List[str]:
        """Generate catchy YouTube title ideas."""
        templates = [
            f"The Truth About {topic} That Nobody Talks About",
            f"How I Mastered {topic} in 30 Days",
            f"{topic} Explained in 10 Minutes",
            f"Stop Doing {topic} Wrong! Do This Instead",
            f"The Ultimate Guide to {topic} for Beginners",
            f"5 {topic} Secrets the Pros Don't Want You to Know",
            f"Why You're Failing at {topic} (And How to Fix It)",
            f"{topic} vs [Alternative]: Which is Better?",
            f"I Tried {topic} for 100 Days. Here's What Happened",
            f"The Science Behind {topic} - Mind-Blowing!",
        ]
        return random.sample(templates, min(count, len(templates)))

    def generate_tags(self, topic: str) -> List[str]:
        """Generate SEO tags for a video."""
        base_tags = [topic.lower(), "tutorial", "how to", "guide", "tips",
                     "education", "explained", "for beginners", "2025"]
        topic_words = topic.lower().split()
        return list(set(base_tags + topic_words))[:15]

    def generate_description(self, topic: str, video_url: str = "") -> str:
        """Generate a YouTube video description."""
        desc = f"""Learn everything about {topic} in this comprehensive guide!

🚀 Timestamps:
0:00 - Introduction
1:00 - What is {topic}?
3:00 - Key Concepts
7:00 - Practical Examples
10:00 - Common Mistakes to Avoid
12:00 - Advanced Tips
15:00 - Summary

📚 Resources:
• Link to related content
• Free checklist/template
• Community forum

🔗 Connect with us:
• Website: https://example.com
• Newsletter: Subscribe for weekly insights

# {topic.replace(' ', '')} #Tutorial #HowTo #Education
"""
        if video_url:
            desc = f"Watch this video: {video_url}\n\n" + desc
        return desc

    def generate_video_ideas(self, niche: str, count: int = 10) -> List[Dict]:
        """Generate video content ideas for a niche."""
        templates = [
            {"title": f"Top 10 {niche} Tools You Need in 2025", "format": "listicle", "difficulty": "easy"},
            {"title": f"How to Get Started with {niche}", "format": "tutorial", "difficulty": "beginner"},
            {"title": f"{niche} Tutorial for Complete Beginners", "format": "tutorial", "difficulty": "beginner"},
            {"title": f"5 {niche} Mistakes That Are Costing You Money", "format": "educational", "difficulty": "easy"},
            {"title": f"Advanced {niche} Strategies", "format": "educational", "difficulty": "advanced"},
            {"title": f"I Spent $1000 on {niche}. Here's What I Learned", "format": "case study", "difficulty": "easy"},
            {"title": f"{niche} FAQs Answered", "format": "Q&A", "difficulty": "easy"},
            {"title": f"Day in the Life: {niche} Professional", "format": "vlog", "difficulty": "easy"},
            {"title": f"{niche} Trends to Watch in 2025", "format": "news", "difficulty": "medium"},
            {"title": f"Before You Start {niche}, Watch This", "format": "educational", "difficulty": "beginner"},
        ]
        return templates[:count]

    def analytics_dashboard_template(self) -> str:
        """Return a template for an analytics dashboard."""
        return """# YouTube Analytics Dashboard

## Key Metrics
- Views: [Total views]
- Watch Time: [Total hours]
- Subscribers: [Gain/Loss]
- CTR: [Click-through rate %]
- Avg View Duration: [Minutes]

## Top Performing Videos
1. [Video 1] - [Views] views
2. [Video 2] - [Views] views
3. [Video 3] - [Views] views

## Audience Demographics
- Age: [Top age group]
- Gender: [Distribution]
- Geography: [Top countries]

## Recommendations
- [Optimization suggestion 1]
- [Content strategy update]
- [Posting schedule adjustment]
"""

    def save_script(self, topic: str, script: str):
        """Save a script to the templates directory."""
        filename = f"{topic.lower().replace(' ', '_')}_script.md"
        filepath = self.templates_dir / filename
        filepath.write_text(script, encoding="utf-8")
        return str(filepath)

# ── Wealth Creation Engine ────────────────────────────────────────────
class WealthCreationEngine:
    """Financial education and wealth-building tools."""
    def __init__(self):
        self.risk_profiles = {
            "conservative": {"stocks": 40, "bonds": 40, "cash": 15, "crypto": 5},
            "moderate": {"stocks": 60, "bonds": 25, "cash": 10, "crypto": 5},
            "aggressive": {"stocks": 80, "bonds": 10, "cash": 5, "crypto": 5},
        }

    def budget_calculator(self, income: float, expenses: Dict[str, float]) -> Dict:
        """Calculate budget breakdown and savings rate."""
        total_expenses = sum(expenses.values())
        savings = income - total_expenses
        savings_rate = (savings / income * 100) if income > 0 else 0
        return {
            "income": income,
            "total_expenses": total_expenses,
            "savings": savings,
            "savings_rate": round(savings_rate, 2),
            "expense_breakdown": {k: round(v / income * 100, 2) if income > 0 else 0
                                  for k, v in expenses.items()},
            "recommendation": self._budget_recommendation(savings_rate),
        }

    def _budget_recommendation(self, savings_rate: float) -> str:
        if savings_rate >= 20:
            return "Excellent! You're saving 20%+ of income. Consider investing the surplus."
        elif savings_rate >= 10:
            return "Good progress. Try to increase savings to 20% for financial independence."
        elif savings_rate > 0:
            return "Warning: Low savings rate. Review expenses and cut unnecessary spending."
        return "Critical: Spending exceeds income! Immediate budget overhaul needed."

    def compound_interest(self, principal: float, monthly_contribution: float,
                         annual_rate: float, years: int) -> List[Dict]:
        """Calculate compound interest projection."""
        results = []
        balance = principal
        monthly_rate = annual_rate / 12 / 100
        for year in range(1, years + 1):
            for _ in range(12):
                balance = balance * (1 + monthly_rate) + monthly_contribution
            results.append({
                "year": year,
                "balance": round(balance, 2),
                "total_contributed": round(principal + monthly_contribution * year * 12, 2),
                "interest_earned": round(balance - principal - monthly_contribution * year * 12, 2),
            })
        return results

    def investment_projection(self, age: int, target_age: int, monthly_savings: float,
                              annual_return: float = 7) -> Dict:
        """Project investment growth from current age to target age."""
        years = target_age - age
        if years <= 0:
            return {"error": "Target age must be greater than current age"}
        projection = self.compound_interest(0, monthly_savings, annual_return, years)
        final = projection[-1] if projection else {"balance": 0}
        return {
            "current_age": age,
            "target_age": target_age,
            "years": years,
            "monthly_savings": monthly_savings,
            "projected_balance": final["balance"],
            "total_strategy": f"Save ${monthly_savings}/month for {years} years at {annual_return}% return",
            "yearly_breakdown": projection,
        }

    def portfolio_allocator(self, risk_profile: str, total_amount: float) -> Dict:
        """Allocate portfolio based on risk profile."""
        allocation = self.risk_profiles.get(risk_profile, self.risk_profiles["moderate"])
        return {
            "risk_profile": risk_profile,
            "total_amount": total_amount,
            "allocation": {k: round(total_amount * v / 100, 2) for k, v in allocation.items()},
            "percentages": allocation,
            "rebalancing_frequency": "Quarterly" if risk_profile == "aggressive" else "Semi-annually",
        }

    def debt_payoff_strategy(self, debts: List[Dict]) -> Dict:
        """Calculate avalanche and snowball payoff strategies."""
        # Avalanche: highest interest first
        avalanche = sorted(debts, key=lambda d: d.get("interest_rate", 0), reverse=True)
        # Snowball: smallest balance first
        snowball = sorted(debts, key=lambda d: d.get("balance", float("inf")))
        return {
            "avalanche_method": [{"name": d["name"], "balance": d["balance"],
                                   "rate": d.get("interest_rate", 0)} for d in avalanche],
            "snowball_method": [{"name": d["name"], "balance": d["balance"],
                                  "rate": d.get("interest_rate", 0)} for d in snowball],
            "recommendation": "Avalanche saves more on interest. Snowball provides quicker wins.",
        }

    def financial_health_check(self, income: float, expenses: float, savings: float,
                               debt: float, assets: float) -> Dict:
        """Comprehensive financial health assessment."""
        savings_rate = (savings / income * 100) if income > 0 else 0
        debt_to_income = (debt / income * 100) if income > 0 else float("inf")
        net_worth = assets - debt
        scores = {
            "savings_rate": min(savings_rate / 20 * 100, 100),
            "debt_management": max(100 - debt_to_income, 0),
            "net_worth": min(max(net_worth / income * 10, 0), 100) if income > 0 else 0,
        }
        overall = sum(scores.values()) / len(scores)
        return {
            "overall_score": round(overall, 1),
            "category_scores": {k: round(v, 1) for k, v in scores.items()},
            "net_worth": round(net_worth, 2),
            "debt_to_income": round(debt_to_income, 2),
            "status": "Healthy" if overall >= 70 else "Needs Improvement" if overall >= 40 else "Critical",
        }

    def side_hustle_ideas(self, skills: List[str], budget: float = 0) -> List[Dict]:
        """Generate side hustle ideas based on skills."""
        ideas_db = [
            {"name": "Freelance Writing", "skills": ["writing", "communication"], "startup_cost": 0, "earning_potential": "$$"},
            {"name": "Web Development", "skills": ["coding", "programming", "web"], "startup_cost": 0, "earning_potential": "$$$$"},
            {"name": "Graphic Design", "skills": ["design", "creative", "art"], "startup_cost": 200, "earning_potential": "$$$"},
            {"name": "Online Tutoring", "skills": ["teaching", "education"], "startup_cost": 0, "earning_potential": "$$"},
            {"name": "Social Media Management", "skills": ["social media", "marketing"], "startup_cost": 0, "earning_potential": "$$"},
            {"name": "E-commerce Store", "skills": ["sales", "marketing"], "startup_cost": 500, "earning_potential": "$$$$"},
            {"name": "Photography", "skills": ["photography", "creative"], "startup_cost": 1000, "earning_potential": "$$$"},
            {"name": "Consulting", "skills": ["expertise", "communication"], "startup_cost": 0, "earning_potential": "$$$$"},
        ]
        matched = []
        user_skills_lower = [s.lower() for s in skills]
        for idea in ideas_db:
            if any(s in user_skills_lower for s in idea["skills"]) and idea["startup_cost"] <= budget + 500:
                matched.append(idea)
        return matched[:5]

wealth_engine = WealthCreationEngine()