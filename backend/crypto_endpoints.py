"""
LUQI AI — Cryptocurrency API Endpoints
========================================
FastAPI router for crypto market data, SARS tax compliance,
portfolio analysis, and AI-powered crypto advisory.

South African Context: All tax calculations follow SARS guidelines
for crypto asset taxation (CGT vs Income Tax classification).
"""
from __future__ import annotations

import json
import time
from datetime import datetime
from typing import Any, Optional

import structlog
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from omega_ai.crypto_engine import (
    CryptoAdvisor,
    classify_transaction,
    get_crypto_price,
    get_crypto_market_data,
    get_trending_coins,
    get_crypto_history,
    get_binance_ticker,
    get_binance_order_book,
    get_sa_exchanges,
    calculate_cgt,
    calculate_income_tax,
    calculate_mining_tax,
    calculate_staking_tax,
    calculate_airdrop_tax,
    calculate_crypto_swap_tax,
    generate_tax_summary,
    search_coins,
)

logger = structlog.get_logger("luqi.crypto")

# ── Router ───────────────────────────────────────────────────────────────
crypto_router = APIRouter(prefix="/crypto", tags=["crypto"])

# ── Pydantic Models ────────────────────────────────────────────────────────

class PriceResponse(BaseModel):
    coin_id: str
    name: str
    symbol: str
    price_usd: float
    price_zar: float
    change_24h: float
    market_cap: float
    volume_24h: float
    last_updated: str
    source: str

class MarketDataResponse(BaseModel):
    coins: list[dict]
    count: int
    timestamp: float

class TrendingResponse(BaseModel):
    coins: list[dict]
    timestamp: float

class HistoryResponse(BaseModel):
    coin_id: str
    prices: list[list[float]]  # [[timestamp, price], ...]
    days: int
    source: str

class SearchResponse(BaseModel):
    results: list[dict]
    count: int

# Tax models
class CGTRequest(BaseModel):
    proceeds: float = Field(..., gt=0, description="Sale proceeds in ZAR")
    base_cost: float = Field(..., ge=0, description="Original cost in ZAR")
    annual_gains: float = Field(default=0.0, ge=0, description="Other capital gains this tax year")
    holding_period_days: int = Field(default=365, ge=0, description="How long the asset was held")

class CGTResponse(BaseModel):
    raw_gain_loss: float
    annual_exclusion: float
    net_gain_loss: float
    inclusion_amount: float
    marginal_rate: float
    tax_payable: float
    effective_rate: float
    holding_period_days: int
    classification: str
    sars_reference: str

class IncomeTaxRequest(BaseModel):
    crypto_income: float = Field(..., ge=0, description="Crypto income in ZAR (mining, staking, etc.)")
    other_income: float = Field(default=0.0, ge=0, description="Other taxable income")

class IncomeTaxResponse(BaseModel):
    total_taxable_income: float
    tax_before_rebate: float
    primary_rebate: float
    tax_payable: float
    marginal_rate: float
    bracket: str
    effective_rate: float
    monthly_withholding: float

class ClassifyRequest(BaseModel):
    frequency: int = Field(..., ge=0, description="Number of trades per year")
    holding_period_days: int = Field(..., ge=0)
    intent: str = Field(default="investment", description="investment | trading | mining | staking")
    income_percentage: float = Field(default=0.0, ge=0, le=1, description="Crypto income as % of total income")

class ClassifyResponse(BaseModel):
    classification: str  # "capital" | "revenue"
    confidence: str  # "high" | "medium" | "low"
    factors: list[str]
    tax_type: str  # "CGT" | "Income Tax"
    sars_guidance: str

class MiningTaxRequest(BaseModel):
    rewards_zar: float = Field(..., ge=0)
    other_income: float = Field(default=0.0, ge=0)
    expenses_zar: float = Field(default=0.0, ge=0, description="Deductible expenses (electricity, hardware)")

class StakingTaxRequest(BaseModel):
    rewards_zar: float = Field(..., ge=0)
    holding_period_days: int = Field(default=0, ge=0)
    other_income: float = Field(default=0.0, ge=0)

class AirdropTaxRequest(BaseModel):
    value_zar: float = Field(..., ge=0)
    is_passive: bool = Field(default=True, description="True if unsolicited, False if earned via activity")
    other_income: float = Field(default=0.0, ge=0)

class SwapTaxRequest(BaseModel):
    coin1_value: float = Field(..., gt=0, description="Fair market value of coin given up")
    coin1_cost: float = Field(..., ge=0, description="Base cost of coin given up")
    coin2_value: float = Field(..., gt=0, description="Fair market value of coin received")
    coin2_symbol: str = Field(default="", description="Symbol of coin received")

class SwapTaxResponse(BaseModel):
    disposal_gain_loss: float
    cgt_inclusion: float
    tax_payable: float
    new_base_cost: float
    sars_treatment: str

class TransactionRecord(BaseModel):
    date: str
    type: str  # buy | sell | mining | staking | airdrop | swap | transfer
    asset: str
    amount: float
    value_zar: float
    cost_zar: float
    proceeds_zar: float
    notes: str = ""

class TaxSummaryRequest(BaseModel):
    tax_year: int = Field(default=2026)
    transactions: list[TransactionRecord]

class TaxSummaryResponse(BaseModel):
    tax_year: int
    total_trades: int
    total_gains: float
    total_losses: float
    net_capital_gain: float
    cgt_payable: float
    income_tax_payable: float
    total_tax_liability: float
    sars_deadline: str
    records_needed: list[str]
    recommendations: list[str]

# Portfolio models
class HoldingInput(BaseModel):
    symbol: str
    quantity: float = Field(..., gt=0)
    avg_cost_zar: float = Field(..., ge=0)

class PortfolioAnalyzeRequest(BaseModel):
    holdings: list[HoldingInput]

class PortfolioAnalyzeResponse(BaseModel):
    total_value_zar: float
    total_cost_zar: float
    unrealized_gain_zar: float
    unrealized_gain_pct: float
    risk_score: float  # 0-100
    diversification_score: float  # 0-100
    allocation: list[dict]
    warnings: list[str]
    timestamp: float

class AdvisorRecommendRequest(BaseModel):
    risk_tolerance: str = Field(default="moderate", description="conservative | moderate | aggressive")
    amount_zar: float = Field(..., gt=0)
    goals: str = Field(default="long_term_growth")
    time_horizon_months: int = Field(default=12, ge=1)
    existing_holdings: list[HoldingInput] = Field(default_factory=list)

class AdvisorRecommendResponse(BaseModel):
    strategy: str
    asset_allocation: list[dict]
    expected_return_range: str
    risk_level: str
    warnings: list[str]
    sa_specific_notes: list[str]

class TaxExplainRequest(BaseModel):
    event_type: str = Field(..., description="sale | mining | staking | airdrop | swap | inheritance | donation")
    details: dict[str, Any]

class TaxExplainResponse(BaseModel):
    explanation: str
    tax_type: str
    tax_implications: list[str]
    records_needed: list[str]
    sars_deadline: str
    penalties_warning: Optional[str]

# ── Market Data Endpoints ──────────────────────────────────────────────────

@crypto_router.get("/price/{coin_id}", response_model=PriceResponse)
async def crypto_price(coin_id: str):
    """Get current crypto price in ZAR and USD (CoinGecko)."""
    try:
        data = await get_crypto_price(coin_id)
        return PriceResponse(**data)
    except Exception as e:
        logger.error("crypto_price_error", coin_id=coin_id, error=str(e))
        raise HTTPException(status_code=502, detail=f"Failed to fetch price: {e}")


@crypto_router.get("/market", response_model=MarketDataResponse)
async def crypto_market(
    coin_ids: str = Query("bitcoin,ethereum", description="Comma-separated CoinGecko IDs"),
    vs_currency: str = Query("zar", description="Quote currency"),
):
    """Get market data for multiple cryptocurrencies."""
    ids = [c.strip() for c in coin_ids.split(",") if c.strip()]
    try:
        data = await get_crypto_market_data(ids, vs_currency=vs_currency)
        return MarketDataResponse(coins=data, count=len(data), timestamp=time.time())
    except Exception as e:
        logger.error("crypto_market_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"Failed to fetch market data: {e}")


@crypto_router.get("/trending", response_model=TrendingResponse)
async def crypto_trending():
    """Get trending cryptocurrencies (last 24h search volume)."""
    try:
        data = await get_trending_coins()
        return TrendingResponse(coins=data, timestamp=time.time())
    except Exception as e:
        logger.error("crypto_trending_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"Failed to fetch trending: {e}")


@crypto_router.get("/history/{coin_id}", response_model=HistoryResponse)
async def crypto_history(
    coin_id: str,
    days: int = Query(30, ge=1, le=365, description="Days of history"),
):
    """Get historical price data for charting."""
    try:
        data = await get_crypto_history(coin_id, days)
        return HistoryResponse(coin_id=coin_id, prices=data, days=days, source="coingecko")
    except Exception as e:
        logger.error("crypto_history_error", coin_id=coin_id, error=str(e))
        raise HTTPException(status_code=502, detail=f"Failed to fetch history: {e}")


@crypto_router.get("/search")
async def crypto_search(q: str = Query(..., min_length=1, description="Search query")):
    """Search cryptocurrencies by name or symbol."""
    try:
        data = await search_coins(q)
        return SearchResponse(results=data, count=len(data))
    except Exception as e:
        logger.error("crypto_search_error", query=q, error=str(e))
        raise HTTPException(status_code=502, detail=f"Search failed: {e}")


# ── Binance Endpoints ────────────────────────────────────────────────────

@crypto_router.get("/binance/ticker/{symbol}")
async def binance_ticker(symbol: str = Query("BTCUSDT", description="e.g. BTCUSDT, ETHUSDT")):
    """Get real-time ticker from Binance (no API key needed)."""
    try:
        data = await get_binance_ticker(symbol.upper())
        return data
    except Exception as e:
        logger.error("binance_ticker_error", symbol=symbol, error=str(e))
        raise HTTPException(status_code=502, detail=f"Binance ticker failed: {e}")


@crypto_router.get("/binance/orderbook/{symbol}")
async def binance_orderbook(
    symbol: str = Query("BTCUSDT"),
    limit: int = Query(10, ge=1, le=100),
):
    """Get order book depth from Binance."""
    try:
        data = await get_binance_order_book(symbol.upper(), limit)
        return data
    except Exception as e:
        logger.error("binance_orderbook_error", symbol=symbol, error=str(e))
        raise HTTPException(status_code=502, detail=f"Binance order book failed: {e}")


# ── SARS Tax Endpoints ───────────────────────────────────────────────────

@crypto_router.post("/tax/cgt", response_model=CGTResponse)
async def tax_cgt(request: CGTRequest):
    """
    Calculate South African Capital Gains Tax on crypto disposal.
    
    SARS Rules:
    - 40% inclusion rate (only 40% of gain is taxable)
    - R40,000 annual exclusion (2026 tax year)
    - Taxed at your marginal income tax rate (18%-45%)
    - Max effective rate: 18%
    """
    try:
        result = calculate_cgt(
            request.proceeds,
            request.base_cost,
            request.annual_gains,
        )
        result["holding_period_days"] = request.holding_period_days
        result["classification"] = "Capital Gains Tax"
        result["sars_reference"] = "sars.gov.za/tax-types/capital-gains-tax"
        return CGTResponse(**result)
    except Exception as e:
        logger.error("cgt_calc_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"CGT calculation failed: {e}")


@crypto_router.post("/tax/income", response_model=IncomeTaxResponse)
async def tax_income(request: IncomeTaxRequest):
    """
    Calculate Income Tax on crypto earnings (mining, staking, trading profits).
    
    SARS treats crypto income as normal taxable income at marginal rates.
    """
    try:
        result = calculate_income_tax(request.crypto_income, request.other_income)
        return IncomeTaxResponse(**result)
    except Exception as e:
        logger.error("income_tax_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Income tax calculation failed: {e}")


@crypto_router.post("/tax/classify", response_model=ClassifyResponse)
async def tax_classify(request: ClassifyRequest):
    """
    Classify a crypto transaction as capital vs revenue for SARS.
    
    This determines whether you pay CGT (max 18%) or Income Tax (up to 45%).
    """
    try:
        result = classify_transaction(
            request.frequency,
            request.holding_period_days,
            request.intent,
        )
        result["income_percentage"] = request.income_percentage
        return ClassifyResponse(**result)
    except Exception as e:
        logger.error("classify_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Classification failed: {e}")


@crypto_router.post("/tax/mining", response_model=IncomeTaxResponse)
async def tax_mining(request: MiningTaxRequest):
    """Calculate tax on mining rewards (treated as income at fair market value)."""
    try:
        net_rewards = max(0, request.rewards_zar - request.expenses_zar)
        result = calculate_income_tax(net_rewards, request.other_income)
        result["note"] = f"Mining: R{request.rewards_zar:,.2f} income, R{request.expenses_zar:,.2f} deductible expenses"
        return IncomeTaxResponse(**result)
    except Exception as e:
        logger.error("mining_tax_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Mining tax calculation failed: {e}")


@crypto_router.post("/tax/staking", response_model=IncomeTaxResponse)
async def tax_staking(request: StakingTaxRequest):
    """Calculate tax on staking rewards (income at receipt, CGT on sale)."""
    try:
        result = calculate_staking_tax(request.rewards_zar, request.holding_period_days)
        result["other_income"] = request.other_income
        total_income = request.rewards_zar + request.other_income
        tax_result = calculate_income_tax(total_income, 0)
        tax_result["note"] = f"Staking: R{request.rewards_zar:,.2f} taxed as income. CGT applies when sold."
        return IncomeTaxResponse(**tax_result)
    except Exception as e:
        logger.error("staking_tax_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Staking tax calculation failed: {e}")


@crypto_router.post("/tax/airdrop", response_model=IncomeTaxResponse)
async def tax_airdrop(request: AirdropTaxRequest):
    """
    Calculate tax on airdrops.
    
    SARS: Fortuitous airdrops = capital (CGT when sold).
    Earned airdrops (e.g. for activity) = income.
    """
    try:
        result = calculate_airdrop_tax(request.value_zar, request.is_passive)
        if not request.is_passive:
            total_income = request.value_zar + request.other_income
            tax_result = calculate_income_tax(total_income, 0)
            tax_result["note"] = f"Airdrop: R{request.value_zar:,.2f} taxed as income (earned)."
            return IncomeTaxResponse(**tax_result)
        result["note"] = f"Airdrop: R{request.value_zar:,.2f} treated as capital. CGT applies when sold."
        return IncomeTaxResponse(**result)
    except Exception as e:
        logger.error("airdrop_tax_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Airdrop tax calculation failed: {e}")


@crypto_router.post("/tax/swap", response_model=SwapTaxResponse)
async def tax_swap(request: SwapTaxRequest):
    """
    Calculate tax on crypto-to-crypto swaps.
    
    SARS treats this as a barter transaction — disposal of Coin A at fair market value,
    acquisition of Coin B at same value. CGT applies to the gain/loss on Coin A.
    """
    try:
        result = calculate_crypto_swap_tax(
            request.coin1_value,
            request.coin1_cost,
            request.coin2_value,
        )
        result["sars_treatment"] = (
            f"Barter transaction: Disposed of Coin A at R{request.coin1_value:,.2f} "
            f"(base cost R{request.coin1_cost:,.2f}). Acquired Coin B at R{request.coin2_value:,.2f}. "
            "CGT applies to disposal gain. New base cost for Coin B = FMV at acquisition."
        )
        return SwapTaxResponse(**result)
    except Exception as e:
        logger.error("swap_tax_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Swap tax calculation failed: {e}")


@crypto_router.post("/tax/summary", response_model=TaxSummaryResponse)
async def tax_summary(request: TaxSummaryRequest):
    """Generate comprehensive annual tax summary for SARS submission."""
    try:
        tx_dicts = [t.model_dump() for t in request.transactions]
        result = generate_tax_summary(tx_dicts, request.tax_year)
        return TaxSummaryResponse(**result)
    except Exception as e:
        logger.error("tax_summary_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Tax summary failed: {e}")


# ── Portfolio & Advisory ──────────────────────────────────────────────────

@crypto_router.post("/portfolio/analyze", response_model=PortfolioAnalyzeResponse)
async def portfolio_analyze(request: PortfolioAnalyzeRequest):
    """Analyze crypto portfolio: value, risk, diversification."""
    try:
        advisor = CryptoAdvisor()
        result = await advisor.assess_portfolio([h.model_dump() for h in request.holdings])
        return PortfolioAnalyzeResponse(**result)
    except Exception as e:
        logger.error("portfolio_analyze_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Portfolio analysis failed: {e}")


@crypto_router.post("/advisor/recommend", response_model=AdvisorRecommendResponse)
async def advisor_recommend(request: AdvisorRecommendRequest):
    """Get personalized crypto investment recommendation for South Africans."""
    try:
        advisor = CryptoAdvisor()
        result = await advisor.recommend_strategy(
            request.risk_tolerance,
            request.amount_zar,
            request.goals,
            request.time_horizon_months,
            [h.model_dump() for h in request.existing_holdings],
        )
        return AdvisorRecommendResponse(**result)
    except Exception as e:
        logger.error("advisor_recommend_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {e}")


@crypto_router.get("/exchanges/sa")
async def exchanges_sa():
    """List South African cryptocurrency exchanges."""
    try:
        data = get_sa_exchanges()
        return {"exchanges": data, "count": len(data)}
    except Exception as e:
        logger.error("exchanges_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to list exchanges: {e}")


@crypto_router.post("/advisor/tax-explain", response_model=TaxExplainResponse)
async def tax_explain(request: TaxExplainRequest):
    """Get plain-language explanation of SARS tax rules for a crypto event."""
    try:
        advisor = CryptoAdvisor()
        explanation = advisor.explain_tax_event(request.event_type, request.details)
        return TaxExplainResponse(
            explanation=explanation["explanation"],
            tax_type=explanation["tax_type"],
            tax_implications=explanation["tax_implications"],
            records_needed=explanation["records_needed"],
            sars_deadline=explanation["sars_deadline"],
            penalties_warning=explanation.get("penalties_warning"),
        )
    except Exception as e:
        logger.error("tax_explain_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Tax explanation failed: {e}")


# ── AI-Powered Crypto Analysis ────────────────────────────────────────────

class AIAnalyzeRequest(BaseModel):
    coin_id: str = Field(default="bitcoin")
    analysis_type: str = Field(default="price", description="price | sentiment | risk | tax | portfolio")
    timeframe: str = Field(default="30d", description="1d | 7d | 30d | 90d | 1y")
    risk_tolerance: Optional[str] = Field(default=None)


class AIAnalyzeResponse(BaseModel):
    analysis: str
    data: dict
    recommendations: list[str]
    risk_warnings: list[str]
    sources: list[str]
    timestamp: float


@crypto_router.post("/ai/analyze", response_model=AIAnalyzeResponse)
async def crypto_ai_analyze(request: AIAnalyzeRequest):
    """
    AI-powered cryptocurrency analysis combining market data and SARS tax guidance.
    
    Types:
    - price: Price trend analysis with support/resistance
    - sentiment: Market sentiment (fear/greed, social metrics)
    - risk: Volatility, drawdown, correlation risk assessment
    - tax: SARS tax implications for SA residents
    - portfolio: Optimal allocation for given risk tolerance
    """
    try:
        advisor = CryptoAdvisor()
        result = await advisor.analyze_market_sentiment(request.coin_id)
        
        analysis_text = f"""
## {request.coin_id.upper()} Analysis ({request.analysis_type})

**Market Sentiment:** {result.get('sentiment', 'neutral').title()}
**Price Trend:** {result.get('trend', 'sideways')}
**Volatility (30d):** {result.get('volatility_30d', 'N/A')}

### Key Metrics
- Current Price: ${result.get('price_usd', 'N/A')}
- 24h Change: {result.get('change_24h', 'N/A')}%
- Market Cap: ${result.get('market_cap', 'N/A')}

### SARS Tax Note (South Africa)
{result.get('sars_note', 'Crypto is treated as an intangible asset. CGT (max 18%) or Income Tax (up to 45%) applies depending on intent and frequency.')}

### Recommendations
{chr(10).join(['- ' + r for r in result.get('recommendations', [])])}
        """.strip()
        
        return AIAnalyzeResponse(
            analysis=analysis_text,
            data=result,
            recommendations=result.get("recommendations", []),
            risk_warnings=result.get("risk_warnings", []),
            sources=["coingecko", "binance", "sars.gov.za"],
            timestamp=time.time(),
        )
    except Exception as e:
        logger.error("ai_analyze_error", coin=request.coin_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {e}")


# ── Router export ────────────────────────────────────────────────────────
router = crypto_router
