"""
Real-Time Price Tracker Module for LUQI AI.

Fetches current financial prices with a live-first strategy:
1. Attempt CoinGecko free API for crypto symbols.
2. Fall back to cached/demo data if the network is unreachable.

Demo data covers: BTC, ETH, SOL, ADA, XRP, GOLD, USDZAR, EURZAR.

Usage:
    mod = __import__("omega_ai.realtime_prices")
    engine = mod.PriceTracker()
    prices = engine.get_prices(["BTC", "ETH", "SOL"])
"""

from __future__ import annotations

import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any


# Map common symbols to CoinGecko API IDs
_CG_ID_MAP: dict[str, str] = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "ADA": "cardano",
    "XRP": "ripple",
    "DOT": "polkadot",
    "DOGE": "dogecoin",
    "AVAX": "avalanche-2",
    "LINK": "chainlink",
    "MATIC": "matic-network",
}

# Realistic demo prices (USD for crypto, raw rate for FX/metals)
_DEMO_PRICES: dict[str, dict[str, Any]] = {
    "BTC": {
        "price": 87342.15,
        "currency": "USD",
        "change_24h": 2.34,
        "source": "demo",
    },
    "ETH": {
        "price": 2456.78,
        "currency": "USD",
        "change_24h": -0.87,
        "source": "demo",
    },
    "SOL": {
        "price": 142.63,
        "currency": "USD",
        "change_24h": 5.12,
        "source": "demo",
    },
    "ADA": {
        "price": 0.8234,
        "currency": "USD",
        "change_24h": 1.05,
        "source": "demo",
    },
    "XRP": {
        "price": 2.4567,
        "currency": "USD",
        "change_24h": -1.23,
        "source": "demo",
    },
    "GOLD": {
        "price": 2923.50,
        "currency": "USD",
        "change_24h": 0.45,
        "source": "demo",
    },
    "USDZAR": {
        "price": 18.45,
        "currency": "ZAR",
        "change_24h": 0.12,
        "source": "demo",
    },
    "EURZAR": {
        "price": 20.12,
        "currency": "ZAR",
        "change_24h": -0.34,
        "source": "demo",
    },
}

_CG_API_URL = "https://api.coingecko.com/api/v3/simple/price"
_CACHE_TTL_SECONDS = 60  # 1-minute cache


class PriceTracker:
    """Financial price tracker with cached data and live API fallback."""

    def __init__(self) -> None:
        """Initialize the price tracker with empty cache."""
        self.cache: dict[str, dict[str, Any]] = {}
        self.last_update: float = 0.0

    # ── internal helpers ──────────────────────────────────────────────────

    def _is_cache_fresh(self) -> bool:
        """Check if the in-memory cache is still within the TTL window."""
        return (time.time() - self.last_update) < _CACHE_TTL_SECONDS

    def _fetch_live(self, symbols: list[str]) -> dict[str, dict[str, Any]] | None:
        """Try to fetch from CoinGecko free API (no key required).

        Only crypto symbols with known CoinGecko IDs are queried.
        FX and metal symbols silently fall through to demo data.

        Args:
            symbols: List of ticker symbols (e.g. ["BTC", "ETH"]).

        Returns:
            Dictionary of symbol -> price_data, or None on failure.
        """
        cg_ids = []
        symbol_to_id: dict[str, str] = {}
        for sym in symbols:
            sid = sym.upper()
            cg = _CG_ID_MAP.get(sid)
            if cg:
                cg_ids.append(cg)
                symbol_to_id[sid] = cg

        if not cg_ids:
            return None

        ids_param = ",".join(cg_ids)
        url = f"{_CG_API_URL}?ids={ids_param}&vs_currencies=usd&include_24hr_change=true"

        try:
            req = urllib.request.Request(
                url,
                headers={"Accept": "application/json", "User-Agent": "LUQI-PriceTracker/1.0"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                import json

                payload = json.loads(resp.read().decode("utf-8"))
        except Exception:
            return None

        results: dict[str, dict[str, Any]] = {}
        for sym, cg in symbol_to_id.items():
            entry = payload.get(cg)
            if entry:
                results[sym] = {
                    "price": entry.get("usd"),
                    "currency": "USD",
                    "change_24h": entry.get("usd_24h_change", 0.0),
                    "source": "coingecko",
                }

        return results if results else None

    def _get_demo_data(self, symbols: list[str]) -> dict[str, dict[str, Any]]:
        """Return realistic demo prices for requested symbols.

        Args:
            symbols: List of ticker symbols.

        Returns:
            Dictionary of symbol -> price_data from the demo dataset.
        """
        results: dict[str, dict[str, Any]] = {}
        for sym in symbols:
            sid = sym.upper()
            if sid in _DEMO_PRICES:
                entry = dict(_DEMO_PRICES[sid])
                entry["symbol"] = sid
                results[sid] = entry
        return results

    # ── public API ────────────────────────────────────────────────────────

    def get_prices(self, symbols: list[str] | None = None) -> dict:
        """Get prices for symbols. Try live API, fallback to cached/demo data.

        Args:
            symbols: List of ticker symbols. Defaults to all demo symbols.

        Returns:
            Dictionary with prices dict, source, and timestamp.
        """
        if symbols is None:
            symbols = list(_DEMO_PRICES.keys())

        # 1. Check cache
        if self._is_cache_fresh():
            cached = {s: self.cache[s] for s in symbols if s in self.cache}
            if len(cached) == len(symbols):
                return {
                    "result": "success",
                    "status": "ok",
                    "data": {
                        "prices": cached,
                        "source": "cache",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                }

        # 2. Try live API
        live = self._fetch_live(symbols)
        if live:
            self.cache.update(live)
            self.last_update = time.time()
            return {
                "result": "success",
                "status": "ok",
                "data": {
                    "prices": live,
                    "source": "coingecko",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            }

        # 3. Fallback to demo data
        demo = self._get_demo_data(symbols)
        self.cache.update(demo)
        self.last_update = time.time()
        return {
            "result": "success",
            "status": "ok",
            "data": {
                "prices": demo,
                "source": "demo",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        }

    def invalidate_cache(self) -> dict:
        """Clear the in-memory price cache.

        Returns:
            Confirmation dictionary.
        """
        self.cache.clear()
        self.last_update = 0.0
        return {
            "result": "success",
            "status": "ok",
            "data": {"message": "Price cache cleared."},
        }
