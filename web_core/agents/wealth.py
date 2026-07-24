"""
web_core.agents.wealth - Wealth creation agent.
Coordinates funnel generation, sponsor finding, pricing with persistence.
"""

from __future__ import annotations

import json
import logging

from web_core.db.connection import ConnectionPool
from web_core.engines.wealth import WealthEngine

logger = logging.getLogger("luqi.agents.wealth")


class WealthAgent:
    """Generates and persists sales funnels, sponsor lists, pricing tiers."""

    def __init__(self, engine: WealthEngine, pool: ConnectionPool):
        self.engine = engine
        self.pool = pool

    def create_funnel(self, niche: str, audience_size: int, content_type: str) -> dict:
        funnel = self.engine.generate_funnel(niche, audience_size, content_type)
        cur = self.pool.execute(
            "INSERT INTO wealth_funnels (name, funnel_type, price_tier, estimated_revenue, status) VALUES (?, ?, ?, ?, ?)",
            (f"{niche} Funnel", funnel.template, json.dumps([t.tier for t in funnel.tiers]),
             funnel.total_yearly_revenue, "active")
        )
        return {
            "funnel_id": cur.lastrowid,
            "niche": funnel.niche,
            "template": funnel.template,
            "audience_size": funnel.audience_size,
            "content_type": funnel.content_type,
            "tiers": [{"tier": t.tier, "audience": t.audience, "revenue": t.revenue} for t in funnel.tiers],
            "total_yearly_revenue": funnel.total_yearly_revenue,
            "recommended_actions": funnel.recommended_actions,
        }

    def list_funnels(self) -> list:
        rows = self.pool.fetchall("SELECT * FROM wealth_funnels ORDER BY created_at DESC")
        return [dict(r) for r in rows]

    def find_sponsors(self, niche: str, subscriber_count: int) -> dict:
        info = self.engine.find_sponsors(niche, subscriber_count)
        return {
            "niche": info.niche,
            "potential_sponsors": info.potential_sponsors,
            "estimated_sponsorship_per_video": info.estimated_sponsorship_per_video,
            "recommended_approach": info.recommended_approach,
            "negotiation_tips": info.negotiation_tips,
        }

    def create_pricing(self, product_name: str, value_props: list) -> list:
        tiers = self.engine.create_pricing(product_name, value_props)
        return [
            {"tier": t.tier_name, "price": t.price, "target": t.target,
             "includes": t.includes, "extras": t.extras}
            for t in tiers
        ]
