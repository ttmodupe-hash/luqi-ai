"""
web_core.agents.youtube - YouTube creation agent.
Coordinates campaign generation with persistence.
"""

from __future__ import annotations

import json
import logging

from web_core.db.connection import ConnectionPool
from web_core.engines.youtube import YoutubeEngine

logger = logging.getLogger("luqi.agents.youtube")


class YoutubeAgent:
    """Generates and persists YouTube campaigns, scripts, thumbnails."""

    def __init__(self, engine: YoutubeEngine, pool: ConnectionPool):
        self.engine = engine
        self.pool = pool

    def create_campaign(self, niche: str, target_audience: str, video_count: int = 30) -> dict:
        campaign = self.engine.generate_campaign(niche, target_audience, video_count)
        cur = self.pool.execute(
            "INSERT INTO youtube_campaigns (title, niche, target_audience, content_pillars, upload_schedule, seo_strategy) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (f"{niche} Campaign", niche, target_audience,
             json.dumps(campaign.content_pillars), json.dumps(campaign.upload_schedule),
             json.dumps(campaign.seo_strategy))
        )
        return {"campaign_id": cur.lastrowid, **campaign.__dict__}

    def list_campaigns(self) -> list:
        rows = self.pool.fetchall("SELECT * FROM youtube_campaigns ORDER BY created_at DESC")
        return [dict(r) for r in rows]

    def generate_thumbnail(self, title: str) -> str:
        return self.engine.generate_thumbnail_prompt(title)

    def generate_script(self, topic: str, duration: int = 10) -> dict:
        outline = self.engine.generate_script_outline(topic, duration)
        return {
            "topic": outline.topic,
            "total_duration": outline.total_duration,
            "segments": [{"type": s.seg_type, "duration": s.duration, "content": s.content} for s in outline.segments]
        }
