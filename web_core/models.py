"""
web_core.models - Dataclasses, enums, and typed dictionaries.
All domain objects live here — no business logic, just structure.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


# -- Enums ------------------------------------------------------------------

class ModelProvider(str, Enum):
    GPT4O = "gpt-4o"
    GPT4O_MINI = "gpt-4o-mini"
    GPT4_TURBO = "gpt-4-turbo"
    CLAUDE_SONNET = "claude-sonnet"
    CLAUDE_HAIKU = "claude-haiku"
    LOCAL_LLAMA = "local-llama"


class Accent(str, Enum):
    AMERICAN = "american"
    BRITISH = "british"
    AUSTRALIAN = "australian"
    INDIAN = "indian"
    NIGERIAN = "nigerian"
    SOUTH_AFRICAN = "south_african"
    FRENCH = "french"
    GERMAN = "german"


class CapabilityStatus(str, Enum):
    ACTIVE = "active"
    PLANNED = "planned"
    DEPRECATED = "deprecated"


# -- Dataclasses ------------------------------------------------------------

@dataclass
class ChatMessage:
    role: str
    content: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    model: Optional[str] = None
    session_id: str = "default"


@dataclass
class CapabilityItem:
    """Represents a single LUQI capability/feature."""
    id: str
    name: str
    status: CapabilityStatus
    category: str
    description: str = ""


@dataclass
class DocumentInfo:
    """Metadata for an uploaded document."""
    id: int = 0
    filename: str = ""
    doc_type: str = ""
    size_bytes: int = 0
    content_preview: str = ""
    file_path: str = ""
    uploaded_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class SandboxRunResult:
    """Result of a sandboxed code execution."""
    filename: str = ""
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class ApiKeyInfo:
    """Information about an API key."""
    key_hash: str = ""
    name: str = "default"
    created_at: str = ""
    last_used: Optional[str] = None
    request_count: int = 0
    is_admin: bool = False


@dataclass
class RateLimitState:
    """Current rate limit bucket state."""
    key_hash: str = ""
    tokens: float = 60.0
    last_refill: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class RequestLogEntry:
    """A single logged HTTP request."""
    id: int = 0
    key_hash: str = ""
    method: str = ""
    path: str = ""
    status_code: int = 200
    latency_ms: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class YoutubeCampaign:
    """A generated YouTube content campaign."""
    niche: str = ""
    target_audience: str = ""
    content_pillars: List[str] = field(default_factory=list)
    upload_schedule: List[str] = field(default_factory=list)
    total_videos: int = 0
    estimated_total_duration: int = 0
    videos: List[Dict[str, Any]] = field(default_factory=list)
    seo_strategy: Dict[str, Any] = field(default_factory=dict)


@dataclass
class YoutubeVideo:
    """A single video in a campaign."""
    episode: int = 0
    title: str = ""
    pillar: str = ""
    estimated_duration: int = 0
    target_keywords: List[str] = field(default_factory=list)


@dataclass
class ScriptSegment:
    """A segment of a video script."""
    seg_type: str = ""  # hook, intro, content, cta
    duration: float = 0.0
    content: str = ""


@dataclass
class ScriptOutline:
    """Full video script outline."""
    topic: str = ""
    total_duration: int = 0
    segments: List[ScriptSegment] = field(default_factory=list)


@dataclass
class FunnelTier:
    """A single tier in a sales funnel."""
    tier: str = ""
    audience: int = 0
    revenue: int = 0


@dataclass
class SalesFunnel:
    """A generated sales funnel."""
    niche: str = ""
    template: str = ""
    audience_size: int = 0
    content_type: str = ""
    tiers: List[FunnelTier] = field(default_factory=list)
    total_yearly_revenue: int = 0
    recommended_actions: List[str] = field(default_factory=list)


@dataclass
class SponsorInfo:
    """Potential sponsor information."""
    niche: str = ""
    potential_sponsors: List[str] = field(default_factory=list)
    estimated_sponsorship_per_video: float = 0.0
    recommended_approach: str = ""
    negotiation_tips: List[str] = field(default_factory=list)


@dataclass
class PricingTier:
    """A pricing tier for a product."""
    tier_name: str = ""
    price: str = ""
    target: str = ""
    includes: List[str] = field(default_factory=list)
    extras: List[str] = field(default_factory=list)


@dataclass
class WebhookConfig:
    """A configured webhook endpoint."""
    id: int = 0
    url: str = ""
    event_type: str = "*"
    secret: str = ""
    created_at: str = ""


@dataclass
class SystemHealth:
    """System health snapshot with per-check diagnostics."""
    status: str = "healthy"
    version: str = ""
    capabilities_active: int = 0
    conversations: int = 0
    documents: int = 0
    requests_total: int = 0
    timestamp: str = ""
    # v25.2.0 — enhanced health check fields
    checks: Dict[str, Any] = field(default_factory=dict)
    overall_status: str = ""
    response_time_ms: float = 0.0
