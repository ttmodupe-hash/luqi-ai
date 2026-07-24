"""
web_core.engines.wealth - Wealth creation and monetization engine.
Pure generation logic — no DB access.
"""

from __future__ import annotations

import logging
import random
from typing import Any, Dict, List

from web_core.models import FunnelTier, PricingTier, SalesFunnel, SponsorInfo

logger = logging.getLogger("luqi.engines.wealth")

FUNNEL_TEMPLATES = [
    {"name": "Free Video → Email List → Course", "tiers": ["Free", "$27", "$197"]},
    {"name": "Tutorial → Tool/Template → Coaching", "tiers": ["Free", "$47", "$497/mo"]},
    {"name": "Webinar → Program → Mastermind", "tiers": ["Free", "$297", "$2,997"]},
    {"name": "Content → Affiliate → Product", "tiers": ["Free", "$17-97", "$497"]},
    {"name": "Community → Membership → Agency", "tiers": ["Free", "$29/mo", "$5,000+"]},
]

SPONSOR_NICHES = {
    "tech": ["Software companies", "Hardware brands", "SaaS platforms", "Developer tools"],
    "education": ["Online course platforms", "Book publishers", "EdTech startups", "Certification bodies"],
    "finance": ["Investment apps", "Banking services", "Crypto exchanges", "Financial advisors"],
    "health": ["Fitness brands", "Supplement companies", "Health apps", "Medical devices"],
    "creative": ["Design tools", "Stock media sites", "Creative software", "Freelance platforms"],
}


class WealthEngine:
    """Generate sales funnels, find sponsors, create pricing tiers."""

    def generate_funnel(self, niche: str, audience_size: int, content_type: str) -> SalesFunnel:
        template = random.choice(FUNNEL_TEMPLATES)
        conversion_rates = [0.05, 0.02, 0.005]
        tiers = []
        current_audience = audience_size
        for i, tier_name in enumerate(template["tiers"]):
            if i == 0:
                tiers.append(FunnelTier(tier_name, current_audience, 0))
            else:
                converted = int(current_audience * conversion_rates[i - 1])
                price_str = tier_name.replace("/mo", "").replace("$", "").replace("+", "").replace(",", "")
                price = int(''.join(c for c in price_str if c.isdigit()))
                revenue = converted * price * 12 if "/mo" in tier_name else converted * price
                tiers.append(FunnelTier(tier_name, converted, revenue))
                current_audience = converted

        return SalesFunnel(
            niche=niche,
            template=template["name"],
            audience_size=audience_size,
            content_type=content_type,
            tiers=tiers,
            total_yearly_revenue=sum(t.revenue for t in tiers),
            recommended_actions=[
                f"Create lead magnet for {niche} audience",
                "Set up email automation sequence",
                "Build sales page for main offer",
                "Create upsell/downsell flow",
                "Implement affiliate program",
            ]
        )

    def find_sponsors(self, niche: str, subscriber_count: int) -> SponsorInfo:
        potential = SPONSOR_NICHES.get(niche.lower(), SPONSOR_NICHES["tech"])
        cpm_rate = 20 if subscriber_count < 10000 else 35 if subscriber_count < 50000 else 50
        estimated_sponsorship = (subscriber_count / 1000) * cpm_rate
        return SponsorInfo(
            niche=niche,
            potential_sponsors=potential,
            estimated_sponsorship_per_video=estimated_sponsorship,
            recommended_approach=f"Reach out with media kit showing {subscriber_count:,} engaged subscribers",
            negotiation_tips=[
                "Offer package deals (3-6 videos)",
                "Include social media promotion",
                "Provide detailed analytics report",
                "Create exclusive discount codes",
            ]
        )

    def create_pricing(self, product_name: str, value_props: List[str]) -> List[PricingTier]:
        props = value_props or ["Core features"]
        return [
            PricingTier("basic", "$27-47", "Beginners", props[:2]),
            PricingTier("pro", "$97-197", "Professionals", props[:4]),
            PricingTier("premium", "$497-1,997", "Businesses", props,
                       extras=["1-on-1 coaching", "Custom implementation", "Priority support"]),
        ]
