"""
LUQI AI — Cryptocurrency Intelligence Engine
============================================
Core crypto logic: market data (CoinGecko, Binance), SARS tax compliance,
portfolio analysis, and AI-powered advisory for South African users.

Tax rules based on SARS 2025/2026 guidelines for crypto asset taxation.
"""
from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

import httpx
import structlog
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = structlog.get_logger("omega_ai.crypto")

# ── Constants ────────────────────────────────────────────────────────────

# SARS 2026 Tax Brackets (South Africa)
SA_TAX_BRACKETS_2026 = [
    (0, 237100, 0.18),
    (237101, 370500, 0.26),
    (370501, 512800, 0.31),
    (512801, 673000, 0.36),
    (673001, 857900, 0.39),
    (857901, 1817000, 0.41),
    (1817001, float("inf"), 0.45),
]

SA_PRIMARY_REBATE_2026 = 17235
SA_SECONDARY_REBATE_2026 = 9444  # 65-74
SA_TERTIARY_REBATE_2026 = 3145   # 75+

# SARS Crypto Tax Constants
CGT_INCLUSION_RATE = 0.40
CGT_ANNUAL_EXCLUSION = 40000
MAX_EFFECTIVE_CGT_RATE = 0.18
DONATIONS_TAX_RATE = 0.20
DONATIONS_TAX_THRESHOLD = 100000
SARS_DEADLINE_2026 = "2026-07-31"  # Provisional tax deadline

# CoinGecko API (free tier)
COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"
BINANCE_BASE_URL = "https://api.binance.com"

# ── HTTP Client ────────────────────────────────────────────────────────────
_httpx_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _httpx_client
    if _httpx_client is None:
        _httpx_client = httpx.AsyncClient(timeout=30.0, headers={"Accept": "application/json"})
    return _httpx_client


# ── Cache ──────────────────────────────────────────────────────────────────
_cache: dict[str, tuple[Any, float]] = {}
CACHE_TTL = 60  # seconds


def _cache_key(*parts: str) -> str:
    return ":".join(parts)


def _get_cached(key: str) -> Any | None:
    if key in _cache:
        data, expiry = _cache[key]
        if time.time() < expiry:
            return data
        del _cache[key]
    return None


def _set_cached(key: str, data: Any, ttl: int = CACHE_TTL) -> None:
    _cache[key] = (data, time.time() + ttl)


# ── CoinGecko Market Data ──────────────────────────────────────────────────

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.ConnectError)),
)
async def get_crypto_price(coin_id: str, vs_currency: str = "zar") -> dict[str, Any]:
    """Get current price and market data for a cryptocurrency."""
    cache_key = _cache_key("price", coin_id, vs_currency)
    cached = _get_cached(cache_key)
    if cached:
        return cached

    client = _get_client()
    url = f"{COINGECKO_BASE_URL}/coins/markets"
    params = {"vs_currency": vs_currency, "ids": coin_id, "sparkline": "false"}

    resp = await client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    if not data:
        raise ValueError(f"Coin '{coin_id}' not found on CoinGecko")

    coin = data[0]
    result = {
        "coin_id": coin_id,
        "name": coin.get("name", ""),
        "symbol": coin.get("symbol", "").upper(),
        "price_usd": coin.get("current_price", 0) if vs_currency == "usd" else None,
        "price_zar": coin.get("current_price", 0) if vs_currency == "zar" else None,
        "change_24h": coin.get("price_change_percentage_24h", 0) or 0,
        "market_cap": coin.get("market_cap", 0) or 0,
        "volume_24h": coin.get("total_volume", 0) or 0,
        "last_updated": coin.get("last_updated", datetime.utcnow().isoformat()),
        "source": "coingecko",
    }
    _set_cached(cache_key, result)
    return result


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.ConnectError)),
)
async def get_crypto_market_data(coin_ids: list[str], vs_currency: str = "zar") -> list[dict]:
    """Get market data for multiple coins."""
    cache_key = _cache_key("market", ",".join(sorted(coin_ids)), vs_currency)
    cached = _get_cached(cache_key)
    if cached:
        return cached

    client = _get_client()
    url = f"{COINGECKO_BASE_URL}/coins/markets"
    params = {"vs_currency": vs_currency, "ids": ",".join(coin_ids), "sparkline": "false"}

    resp = await client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    _set_cached(cache_key, data)
    return data


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.ConnectError)),
)
async def get_trending_coins() -> list[dict]:
    """Get trending coins (last 24h search volume on CoinGecko)."""
    cache_key = _cache_key("trending")
    cached = _get_cached(cache_key)
    if cached:
        return cached

    client = _get_client()
    resp = await client.get(f"{COINGECKO_BASE_URL}/search/trending")
    resp.raise_for_status()
    data = resp.json()
    coins = data.get("coins", [])
    result = [
        {
            "name": c["item"]["name"],
            "symbol": c["item"]["symbol"],
            "coin_id": c["item"]["id"],
            "market_cap_rank": c["item"].get("market_cap_rank"),
            "score": c["item"].get("score"),
        }
        for c in coins
    ]
    _set_cached(cache_key, result, ttl=300)
    return result


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.ConnectError)),
)
async def get_crypto_history(coin_id: str, days: int = 30) -> list[list[float]]:
    """Get historical price data for charting."""
    cache_key = _cache_key("history", coin_id, str(days))
    cached = _get_cached(cache_key)
    if cached:
        return cached

    client = _get_client()
    url = f"{COINGECKO_BASE_URL}/coins/{coin_id}/market_chart"
    params = {"vs_currency": "usd", "days": days}

    resp = await client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    prices = data.get("prices", [])
    _set_cached(cache_key, prices, ttl=600)
    return prices


async def search_coins(query: str) -> list[dict]:
    """Search coins by name or symbol."""
    client = _get_client()
    resp = await client.get(f"{COINGECKO_BASE_URL}/search", params={"query": query})
    resp.raise_for_status()
    data = resp.json()
    coins = data.get("coins", [])
    return [
        {
            "id": c["id"],
            "name": c["name"],
            "symbol": c["symbol"],
            "market_cap_rank": c.get("market_cap_rank"),
            "thumb": c.get("thumb"),
        }
        for c in coins[:10]
    ]


# ── Binance Data ─────────────────────────────────────────────────────────

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.ConnectError)),
)
async def get_binance_ticker(symbol: str) -> dict[str, Any]:
    """Get 24h ticker data from Binance (no API key needed)."""
    client = _get_client()
    resp = await client.get(f"{BINANCE_BASE_URL}/api/v3/ticker/24hr", params={"symbol": symbol.upper()})
    resp.raise_for_status()
    return resp.json()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.ConnectError)),
)
async def get_binance_order_book(symbol: str, limit: int = 10) -> dict[str, Any]:
    """Get order book from Binance."""
    client = _get_client()
    resp = await client.get(
        f"{BINANCE_BASE_URL}/api/v3/depth",
        params={"symbol": symbol.upper(), "limit": limit},
    )
    resp.raise_for_status()
    return resp.json()


# ── SARS Tax Calculations ────────────────────────────────────────────────

def calculate_income_tax(taxable_income: float, other_income: float = 0) -> dict[str, Any]:
    """Calculate South African income tax for 2026 tax year."""
    total_income = taxable_income + other_income
    tax = 0.0
    bracket = ""
    marginal_rate = 0.0

    for low, high, rate in SA_TAX_BRACKETS_2026:
        if total_income > low:
            taxable_at_bracket = min(total_income, high) - low
            tax += taxable_at_bracket * rate
            if taxable_at_bracket > 0:
                marginal_rate = rate
                bracket = f"R{low:,.0f} - R{high:,.0f}" if high < float("inf") else f"R{low:,.0f}+"

    tax_after_rebate = max(0, tax - SA_PRIMARY_REBATE_2026)
    monthly = tax_after_rebate / 12

    return {
        "total_taxable_income": round(total_income, 2),
        "tax_before_rebate": round(tax, 2),
        "primary_rebate": SA_PRIMARY_REBATE_2026,
        "tax_payable": round(tax_after_rebate, 2),
        "marginal_rate": marginal_rate,
        "bracket": bracket,
        "effective_rate": round(tax_after_rebate / total_income, 4) if total_income > 0 else 0,
        "monthly_withholding": round(monthly, 2),
    }


def calculate_cgt(proceeds: float, base_cost: float, annual_gains: float = 0) -> dict[str, Any]:
    """
    Calculate Capital Gains Tax (CGT) on crypto disposal.
    
    SARS Rules (2026):
    - 40% inclusion rate
    - R40,000 annual exclusion
    - Taxed at marginal rate (18%-45%)
    - Max effective rate: 18%
    """
    gain_loss = proceeds - base_cost
    net_gain = max(0, gain_loss + annual_gains - CGT_ANNUAL_EXCLUSION)
    inclusion = net_gain * CGT_INCLUSION_RATE

    # Find marginal rate
    marginal_rate = 0.0
    for low, high, rate in SA_TAX_BRACKETS_2026:
        if inclusion > low:
            marginal_rate = rate

    tax_payable = inclusion * marginal_rate
    effective_rate = tax_payable / gain_loss if gain_loss > 0 else 0

    return {
        "raw_gain_loss": round(gain_loss, 2),
        "annual_exclusion": CGT_ANNUAL_EXCLUSION,
        "net_gain_loss": round(net_gain, 2),
        "inclusion_amount": round(inclusion, 2),
        "marginal_rate": marginal_rate,
        "tax_payable": round(tax_payable, 2),
        "effective_rate": round(min(effective_rate, MAX_EFFECTIVE_CGT_RATE), 4),
    }


def classify_transaction(frequency: int, holding_period_days: int, intent: str) -> dict[str, Any]:
    """
    Classify a crypto transaction as capital (CGT) or revenue (Income Tax).
    
    SARS Badges of Trade:
    1. Intention at acquisition
    2. Frequency of transactions
    3. Holding period
    4. Source of finance
    5. Whether for personal use
    """
    factors = []
    score = 0  # Higher = more likely revenue

    # Frequency
    if frequency > 20:
        score += 3
        factors.append("High trading frequency (>20 trades/year) suggests revenue intent")
    elif frequency > 5:
        score += 1
        factors.append("Moderate trading frequency suggests mixed intent")
    else:
        factors.append("Low trading frequency supports capital treatment")

    # Holding period
    if holding_period_days < 30:
        score += 2
        factors.append("Short holding period (<30 days) suggests trading/revenue")
    elif holding_period_days > 365:
        factors.append("Long holding period (>1 year) supports capital treatment")

    # Intent
    intent_lower = intent.lower()
    if "trade" in intent_lower or "flip" in intent_lower:
        score += 3
        factors.append("Stated trading intent strongly suggests revenue")
    elif "invest" in intent_lower or "hold" in intent_lower or "hodl" in intent_lower:
        factors.append("Investment intent supports capital treatment")
    elif "mine" in intent_lower or "stake" in intent_lower:
        score += 2
        factors.append("Mining/staking is treated as income at receipt")

    classification = "revenue" if score >= 3 else "capital"
    confidence = "high" if score >= 4 or score == 0 else "medium"
    tax_type = "Income Tax" if classification == "revenue" else "CGT"

    return {
        "classification": classification,
        "confidence": confidence,
        "factors": factors,
        "tax_type": tax_type,
        "sars_guidance": (
            "SARS evaluates the 'badges of trade' to determine intent. "
            "Revenue treatment (Income Tax up to 45%) applies to active trading. "
            "Capital treatment (CGT max 18%) applies to long-term investment."
        ),
    }


def calculate_mining_tax(rewards_zar: float, other_income: float = 0) -> dict[str, Any]:
    """Calculate tax on mining rewards (income at fair market value)."""
    return calculate_income_tax(rewards_zar, other_income)


def calculate_staking_tax(rewards_zar: float, holding_period_days: int = 0) -> dict[str, Any]:
    """
    Calculate tax on staking rewards.
    
    SARS: Staking rewards are income at receipt. CGT applies when sold.
    """
    income_tax = calculate_income_tax(rewards_zar)
    income_tax["note"] = (
        f"Staking rewards of R{rewards_zar:,.2f} taxed as income at receipt. "
        "When you later sell the staked tokens, CGT applies to any gain/loss from the base cost "
        f"(which is the R{rewards_zar:,.2f} fair market value at receipt)."
    )
    return income_tax


def calculate_airdrop_tax(value_zar: float, is_passive: bool = True) -> dict[str, Any]:
    """
    Calculate tax on airdrops.
    
    SARS:
    - Fortuitous/unsolicited airdrops: capital (CGT when sold)
    - Earned airdrops (for activity): income at receipt
    """
    if is_passive:
        return {
            "tax_type": "CGT (deferred)",
            "tax_payable_now": 0,
            "base_cost": value_zar,
            "note": (
                f"Passive airdrop of R{value_zar:,.2f} treated as capital acquisition. "
                "No tax at receipt. CGT applies when you sell, using R{value_zar:,.2f} as base cost."
            ),
        }
    else:
        result = calculate_income_tax(value_zar)
        result["tax_type"] = "Income Tax"
        result["note"] = f"Earned airdrop of R{value_zar:,.2f} taxed as income at receipt."
        return result


def calculate_crypto_swap_tax(coin1_value: float, coin1_cost: float, coin2_value: float) -> dict[str, Any]:
    """
    Calculate tax on crypto-to-crypto swap.
    
    SARS treats this as a barter transaction:
    - You dispose of Coin A at fair market value (taxable event)
    - You acquire Coin B at the same fair market value (new base cost)
    """
    gain_loss = coin1_value - coin1_cost
    cgt_result = calculate_cgt(coin1_value, coin1_cost)

    return {
        "disposal_gain_loss": round(gain_loss, 2),
        "cgt_inclusion": cgt_result["inclusion_amount"],
        "tax_payable": cgt_result["tax_payable"],
        "new_base_cost": coin2_value,
        "note": (
            f"Swapped Coin A (FMV R{coin1_value:,.2f}, base cost R{coin1_cost:,.2f}). "
            f"Disposal gain: R{gain_loss:,.2f}. CGT: R{cgt_result['tax_payable']:,.2f}. "
            f"Coin B new base cost: R{coin2_value:,.2f}"
        ),
    }


def generate_tax_summary(transactions: list[dict], tax_year: int = 2026) -> dict[str, Any]:
    """Generate comprehensive annual tax summary for SARS."""
    total_gains = 0.0
    total_losses = 0.0
    income_events = []
    capital_events = []

    for tx in transactions:
        tx_type = tx.get("type", "").lower()
        value = tx.get("value_zar", 0)
        cost = tx.get("cost_zar", 0)
        proceeds = tx.get("proceeds_zar", 0)

        if tx_type in ("sell", "swap"):
            gain = proceeds - cost
            if gain > 0:
                total_gains += gain
            else:
                total_losses += abs(gain)
            capital_events.append(tx)
        elif tx_type in ("mining", "staking"):
            income_events.append(tx)
        elif tx_type == "airdrop":
            income_events.append(tx)

    net_capital = max(0, total_gains - total_losses)
    cgt = calculate_cgt(total_gains, total_losses)

    total_income = sum(tx.get("value_zar", 0) for tx in income_events)
    income_tax = calculate_income_tax(total_income)

    return {
        "tax_year": tax_year,
        "total_trades": len(transactions),
        "total_gains": round(total_gains, 2),
        "total_losses": round(total_losses, 2),
        "net_capital_gain": round(net_capital, 2),
        "cgt_payable": cgt["tax_payable"],
        "income_tax_payable": income_tax["tax_payable"],
        "total_tax_liability": round(cgt["tax_payable"] + income_tax["tax_payable"], 2),
        "sars_deadline": SARS_DEADLINE_2026,
        "records_needed": [
            "Transaction history from all exchanges (Luno, VALR, Binance, etc.)",
            "Wallet addresses and blockchain explorer screenshots",
            "Fiat deposit/withdrawal bank statements",
            "Mining/staking reward records with timestamps",
            "Airdrop documentation (value at receipt, source)",
            "Cost basis calculations for each disposal",
            "Donation records (if applicable)",
        ],
        "recommendations": [
            "Use provisional tax (IRP6) if crypto income > R30,000/year",
            "Keep detailed records for 5 years (SARS requirement)",
            "Consider using a crypto tax software (e.g. Koinly, CoinTracker)",
            "Report all crypto activity — SARS Crypto Unit actively audits",
            "CARF (Crypto Asset Reporting Framework) starts March 2026",
        ],
    }


# ── Portfolio & Advisory ─────────────────────────────────────────────────

class CryptoAdvisor:
    """AI-powered cryptocurrency advisor for South African users."""

    async def assess_portfolio(self, holdings: list[dict]) -> dict[str, Any]:
        """Analyze portfolio: value, risk, diversification."""
        total_value = 0.0
        total_cost = 0.0
        allocation = []
        warnings = []

        for h in holdings:
            symbol = h["symbol"].upper()
            qty = h["quantity"]
            avg_cost = h["avg_cost_zar"]
            try:
                price_data = await get_crypto_price(symbol.lower(), vs_currency="zar")
                current_price = price_data.get("price_zar", 0) or price_data.get("price_usd", 0)
            except Exception:
                current_price = avg_cost  # Fallback

            value = qty * current_price
            cost = qty * avg_cost
            gain = value - cost
            pct = (gain / cost * 100) if cost > 0 else 0

            total_value += value
            total_cost += cost
            allocation.append({
                "symbol": symbol,
                "quantity": qty,
                "avg_cost_zar": avg_cost,
                "current_price_zar": current_price,
                "value_zar": value,
                "unrealized_gain_zar": gain,
                "unrealized_gain_pct": pct,
            })

        unrealized = total_value - total_cost
        unrealized_pct = (unrealized / total_cost * 100) if total_cost > 0 else 0

        # Risk score (0-100)
        btc_eth_pct = sum(
            a["value_zar"] for a in allocation if a["symbol"] in ("BTC", "ETH")
        ) / total_value * 100 if total_value > 0 else 0
        risk_score = 100 - min(btc_eth_pct, 100)  # Higher BTC/ETH = lower risk

        # Diversification (0-100)
        num_assets = len(allocation)
        diversification = min(num_assets * 10, 100)

        if total_value > 500000:
            warnings.append("Portfolio exceeds R500k — consider cold storage security")
        if num_assets < 3:
            warnings.append("Portfolio is concentrated — consider diversification")
        if unrealized_pct < -20:
            warnings.append("Portfolio is down >20% — review risk tolerance")

        return {
            "total_value_zar": round(total_value, 2),
            "total_cost_zar": round(total_cost, 2),
            "unrealized_gain_zar": round(unrealized, 2),
            "unrealized_gain_pct": round(unrealized_pct, 2),
            "risk_score": round(risk_score, 1),
            "diversification_score": round(diversification, 1),
            "allocation": allocation,
            "warnings": warnings,
            "timestamp": time.time(),
        }

    async def recommend_strategy(
        self,
        risk_tolerance: str,
        amount_zar: float,
        goals: str,
        time_horizon_months: int,
        existing_holdings: list[dict],
    ) -> dict[str, Any]:
        """Generate personalized investment recommendation."""
        risk_lower = risk_tolerance.lower()

        if risk_lower == "conservative":
            allocation = [
                {"asset": "Bitcoin (BTC)", "pct": 50, "rationale": "Store of value, lowest volatility"},
                {"asset": "Ethereum (ETH)", "pct": 30, "rationale": "Smart contract leader, staking yield"},
                {"asset": "Stablecoins (USDT/USDC)", "pct": 20, "rationale": "Capital preservation, yield farming"},
            ]
            expected = "8-15% annual return"
            risk_level = "Low"
        elif risk_lower == "aggressive":
            allocation = [
                {"asset": "Bitcoin (BTC)", "pct": 30, "rationale": "Core holding"},
                {"asset": "Ethereum (ETH)", "pct": 25, "rationale": "DeFi exposure"},
                {"asset": "Altcoins (SOL, AVAX, etc.)", "pct": 35, "rationale": "Growth potential"},
                {"asset": "Stablecoins", "pct": 10, "rationale": "Dry powder for dips"},
            ]
            expected = "25-50% annual return (high volatility)"
            risk_level = "High"
        else:  # moderate
            allocation = [
                {"asset": "Bitcoin (BTC)", "pct": 40, "rationale": "Digital gold"},
                {"asset": "Ethereum (ETH)", "pct": 30, "rationale": "DeFi + staking"},
                {"asset": "Altcoins", "pct": 20, "rationale": "Diversified growth"},
                {"asset": "Stablecoins", "pct": 10, "rationale": "Stability buffer"},
            ]
            expected = "15-25% annual return"
            risk_level = "Medium"

        warnings = []
        if time_horizon_months < 6:
            warnings.append("Short time horizon increases risk — consider stablecoins")
        if amount_zar > 100000:
            warnings.append("Large investment — consider dollar-cost averaging over 3 months")
        if "debt" in goals.lower() or "loan" in goals.lower():
            warnings.append("Never invest borrowed money in crypto")

        sa_notes = [
            "Use Luno, VALR, or AltCoinTrader for ZAR on/off ramps",
            "SARS requires reporting all crypto trades — keep records",
            "Consider cold storage (Ledger/Trezor) for holdings > R50,000",
            "Crypto arbitrage between SA and global exchanges is legal but reportable",
        ]

        return {
            "strategy": f"{risk_tolerance.title()} {time_horizon_months}month strategy",
            "asset_allocation": allocation,
            "expected_return_range": expected,
            "risk_level": risk_level,
            "warnings": warnings,
            "sa_specific_notes": sa_notes,
        }

    async def analyze_market_sentiment(self, coin_id: str) -> dict[str, Any]:
        """Analyze market sentiment for a cryptocurrency."""
        try:
            price_data = await get_crypto_price(coin_id)
            history = await get_crypto_history(coin_id, 30)

            # Calculate volatility
            if len(history) > 1:
                prices = [p[1] for p in history]
                avg = sum(prices) / len(prices)
                variance = sum((p - avg) ** 2 for p in prices) / len(prices)
                volatility = (variance ** 0.5) / avg * 100 if avg > 0 else 0
            else:
                volatility = 0

            change = price_data.get("change_24h", 0) or 0

            if change > 10:
                sentiment = "greed"
                trend = "strongly_bullish"
            elif change > 3:
                sentiment = "optimistic"
                trend = "bullish"
            elif change < -10:
                sentiment = "fear"
                trend = "strongly_bearish"
            elif change < -3:
                sentiment = "pessimistic"
                trend = "bearish"
            else:
                sentiment = "neutral"
                trend = "sideways"

            recommendations = []
            if sentiment == "fear" and volatility > 50:
                recommendations.append("High fear + high volatility — potential accumulation opportunity (DCA)")
            elif sentiment == "greed" and change > 20:
                recommendations.append("Extreme greed — consider taking profits")
            if volatility > 80:
                recommendations.append("Very high volatility — reduce position size")

            return {
                "coin_id": coin_id,
                "sentiment": sentiment,
                "trend": trend,
                "price_usd": price_data.get("price_usd"),
                "price_zar": price_data.get("price_zar"),
                "change_24h": change,
                "market_cap": price_data.get("market_cap"),
                "volatility_30d": round(volatility, 2),
                "recommendations": recommendations,
                "risk_warnings": [
                    "Crypto is highly volatile — never invest more than you can afford to lose",
                    "Past performance does not guarantee future returns",
                ],
                "sars_note": (
                    "Remember: Every profitable trade is taxable. SARS requires reporting "
                    "all crypto transactions. Use our /crypto/tax/* endpoints to calculate your liability."
                ),
            }
        except Exception as e:
            logger.error("sentiment_analysis_error", coin=coin_id, error=str(e))
            return {
                "coin_id": coin_id,
                "sentiment": "unknown",
                "trend": "unknown",
                "error": str(e),
                "recommendations": ["Unable to fetch market data — try again later"],
            }

    def explain_tax_event(self, event_type: str, details: dict) -> dict[str, Any]:
        """Provide plain-language SARS tax explanation for a crypto event."""
        explanations = {
            "sale": {
                "explanation": (
                    "When you sell crypto for ZAR (or any fiat), you trigger a taxable disposal. "
                    "If you held it as an investment, you pay CGT (max 18%). "
                    "If you were trading, you pay Income Tax (up to 45%)."
                ),
                "tax_type": "CGT or Income Tax",
                "tax_implications": [
                    "Calculate gain/loss: Proceeds - Base Cost",
                    "CGT: 40% of gain included, R40,000 annual exclusion",
                    "Income Tax: Full gain taxed at marginal rate",
                ],
                "records_needed": [
                    "Date of acquisition and disposal",
                    "ZAR value at acquisition (base cost)",
                    "ZAR value at disposal (proceeds)",
                    "Exchange fee receipts",
                ],
                "sars_deadline": SARS_DEADLINE_2026,
                "penalties_warning": (
                    "Non-disclosure penalties: up to 200% of tax + criminal prosecution. "
                    "SARS Crypto Unit is actively auditing taxpayers."
                ),
            },
            "mining": {
                "explanation": (
                    "Mining rewards are taxed as income when you receive them, at fair market value. "
                    "If you mine as a business, you can deduct expenses (electricity, hardware, rent)."
                ),
                "tax_type": "Income Tax",
                "tax_implications": [
                    "FMV of mined coins at receipt = taxable income",
                    "Deductible: electricity, hardware depreciation, internet",
                    "When sold later: CGT applies to post-mining gains",
                ],
                "records_needed": [
                    "Mining pool payout records with timestamps",
                    "Electricity bills (portion used for mining)",
                    "Hardware purchase receipts and depreciation schedule",
                    "Wallet addresses for verification",
                ],
                "sars_deadline": SARS_DEADLINE_2026,
                "penalties_warning": "Mining without reporting is tax evasion — SARS can trace blockchain activity.",
            },
            "staking": {
                "explanation": (
                    "Staking rewards are income at receipt (FMV). When you sell the staked tokens, "
                    "CGT applies with the receipt FMV as your base cost."
                ),
                "tax_type": "Income Tax + CGT",
                "tax_implications": [
                    "Staking reward = income at FMV on receipt date",
                    "Sale of staked tokens = CGT event",
                    "Base cost for CGT = FMV at receipt",
                ],
                "records_needed": [
                    "Staking reward timestamps and FMV",
                    "Validator/node participation records",
                    "Sale records if/when tokens are sold",
                ],
                "sars_deadline": SARS_DEADLINE_2026,
            },
            "airdrop": {
                "explanation": (
                    "Unsolicited airdrops are capital (no tax at receipt). Earned airdrops are income. "
                    "When you sell, CGT applies with FMV at receipt as base cost."
                ),
                "tax_type": "CGT (passive) or Income Tax (earned)",
                "tax_implications": [
                    "Passive airdrop: CGT deferred until sale",
                    "Earned airdrop: Income tax at receipt",
                    "Sale: CGT with receipt FMV as base cost",
                ],
                "records_needed": [
                    "Airdrop announcement/source",
                    "Wallet receipt timestamp and FMV",
                    "Sale records if applicable",
                ],
                "sars_deadline": SARS_DEADLINE_2026,
            },
            "swap": {
                "explanation": (
                    "Crypto-to-crypto swaps are barter transactions. You dispose of Coin A at FMV "
                    "(CGT event) and acquire Coin B at the same FMV (new base cost)."
                ),
                "tax_type": "CGT",
                "tax_implications": [
                    "Coin A disposal: CGT on gain/loss",
                    "Coin B acquisition: FMV = new base cost",
                    "Every swap is a taxable event",
                ],
                "records_needed": [
                    "FMV of both coins at swap time",
                    "Base cost of Coin A",
                    "Transaction hash/blockchain record",
                    "Exchange fee receipt",
                ],
                "sars_deadline": SARS_DEADLINE_2026,
                "penalties_warning": "SARS treats all crypto swaps as taxable — non-reporting is high risk.",
            },
        }

        result = explanations.get(event_type, {
            "explanation": "Unknown event type. Please consult a crypto tax specialist.",
            "tax_type": "Unknown",
            "tax_implications": ["Seek professional advice"],
            "records_needed": ["All transaction records"],
            "sars_deadline": SARS_DEADLINE_2026,
        })
        result["event_type"] = event_type
        return result


def get_sa_exchanges() -> list[dict]:
    """Return South African cryptocurrency exchanges."""
    return [
        {
            "name": "Luno",
            "url": "luno.com",
            "fiat_currencies": ["ZAR"],
            "features": ["ZAR deposits/withdrawals", "Savings wallets", "Multiple cryptos"],
            "regulation": "FSCA registered",
            "fees": "0.1% maker / 0.2% taker",
        },
        {
            "name": "VALR",
            "url": "valr.com",
            "fiat_currencies": ["ZAR"],
            "features": ["ZAR on/off ramp", "Institutional grade", "API trading"],
            "regulation": "FSCA registered",
            "fees": "0.1% maker / 0.2% taker",
        },
        {
            "name": "AltCoinTrader",
            "url": "altcointrader.co.za",
            "fiat_currencies": ["ZAR"],
            "features": ["SA founded", "ZAR deposits", "Local support"],
            "regulation": "FSCA registered",
            "fees": "0.25% flat",
        },
        {
            "name": "Binance P2P",
            "url": "p2p.binance.com",
            "fiat_currencies": ["ZAR"],
            "features": ["P2P trading", "Wide selection", "Escrow protection"],
            "regulation": "International (not SA registered)",
            "fees": "0% for P2P / 0.1% spot",
        },
        {
            "name": "Ovex",
            "url": "ovex.io",
            "fiat_currencies": ["ZAR"],
            "features": ["Arbitrage focus", "ZAP tokens", "OTC desk"],
            "regulation": "FSCA registered",
            "fees": "Variable",
        },
    ]
