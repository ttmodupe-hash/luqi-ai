#!/usr/bin/env python3
"""
Crypto Price Ticker + Alerts Module for Luqi-AI.

Provides live cryptocurrency price fetching via the CoinGecko public API
with a local mock-data fallback, pretty-printed ASCII tables, and a
persistent JSON-backed alert system.

Example::

    from price_ticker import PriceTicker

    ticker = PriceTicker()
    print(ticker.get_price("bitcoin"))
    print(ticker.format_table(ticker.get_prices(["bitcoin", "ethereum"])))
    ticker.set_alert("bitcoin", "above", 110_000)
    print(ticker.check_alerts())
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_COINGECKO_BASE: str = "https://api.coingecko.com/api/v3"
"""Base URL for the CoinGecko public API."""

_CACHE_TTL_SECONDS: int = 30
"""Maximum age of cached price entries before re-fetching."""

# Colour / style codes for terminal output
_GREEN: str = "\033[92m"
_RED: str = "\033[91m"
_YELLOW: str = "\033[93m"
_RESET: str = "\033[0m"
_BOLD: str = "\033[1m"


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _now() -> float:
    """Return the current wall-clock time in seconds since the epoch."""
    return time.time()


def _http_get_json(url: str, timeout: int = 10) -> dict[str, Any]:
    """
    Perform a blocking HTTP GET and decode the JSON response.

    Args:
        url: Fully-qualified URL to request.
        timeout: Socket timeout in seconds.

    Returns:
        Parsed JSON body as a dictionary.

    Raises:
        urllib.error.URLError: On network or HTTP >= 400 errors.
    """
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Luqi-AI-PriceTicker/1.0 "
                "(github.com/luqi-ai; educational)"
            ),
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if resp.status != 200:
            raise urllib.error.URLError(
                f"HTTP {resp.status} from {url}"
            )
        return json.loads(resp.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# PriceTicker
# ---------------------------------------------------------------------------

class PriceTicker:
    """
    Live cryptocurrency price fetcher with local caching and alert support.

    Attributes:
        COIN_MAP: Mapping from CoinGecko ``ids`` (e.g. ``"bitcoin"``) to
            human-friendly ticker symbols (e.g. ``"BTC"``).
    """

    COIN_MAP: dict[str, str] = {
        "bitcoin": "BTC",
        "ethereum": "ETH",
        "solana": "SOL",
        "xrp": "XRP",
        "cardano": "ADA",
        "dogecoin": "DOGE",
        "bnb": "BNB",
        "tron": "TRX",
        "chainlink": "LINK",
    }
    """Mapping of CoinGecko coin IDs to ticker symbols."""

    # Mock fallback prices (USD) used when the CoinGecko API is unavailable.
    MOCK_PRICES: dict[str, dict[str, Any]] = {
        "BTC": {
            "price_usd": 105_230.0,
            "change_24h_percent": 2.4,
            "source": "mock",
        },
        "ETH": {
            "price_usd": 3_520.0,
            "change_24h_percent": -0.8,
            "source": "mock",
        },
        "SOL": {
            "price_usd": 178.0,
            "change_24h_percent": 5.1,
            "source": "mock",
        },
        "XRP": {
            "price_usd": 0.52,
            "change_24h_percent": 1.2,
            "source": "mock",
        },
        "ADA": {
            "price_usd": 0.45,
            "change_24h_percent": -2.3,
            "source": "mock",
        },
        "DOGE": {
            "price_usd": 0.16,
            "change_24h_percent": 8.7,
            "source": "mock",
        },
        "BNB": {
            "price_usd": 590.0,
            "change_24h_percent": 0.3,
            "source": "mock",
        },
        "TRX": {
            "price_usd": 0.12,
            "change_24h_percent": -1.1,
            "source": "mock",
        },
        "LINK": {
            "price_usd": 18.5,
            "change_24h_percent": 3.2,
            "source": "mock",
        },
    }

    def __init__(self) -> None:
        """
        Initialise the ticker with an empty price cache and ensure the
        persistent alert storage directory exists.
        """
        self._cache: dict[str, tuple[float, float, float]] = {}
        """symbol -> (price_usd, change_24h_percent, timestamp)"""

        self._alert_file: Path = Path.home() / ".omega_ai" / "price_alerts.json"
        self._alert_file.parent.mkdir(parents=True, exist_ok=True)

    # -- Price retrieval ----------------------------------------------------

    def get_price(self, symbol: str) -> dict[str, Any]:
        """
        Retrieve the current price data for *symbol*.

        The method first consults the in-memory cache (valid for
        :py:data:`_CACHE_TTL_SECONDS`), then attempts the CoinGecko API,
        and finally falls back to the built-in mock prices.

        Args:
            symbol: Ticker symbol such as ``"BTC"``, ``"ETH"`` or
                CoinGecko ID such as ``"bitcoin"``.

        Returns:
            Dictionary with keys ``symbol``, ``price_usd``,
            ``change_24h_percent``, ``last_updated``, and ``source``.
        """
        symbol = symbol.upper().strip()

        # Normalise "bitcoin" -> "BTC"
        cg_id: str | None = None
        for _id, sym in self.COIN_MAP.items():
            if symbol == sym.upper() or symbol == _id.lower():
                symbol = sym.upper()
                cg_id = _id
                break

        # 1. Cache hit?
        now = _now()
        if symbol in self._cache:
            price, change_24h, ts = self._cache[symbol]
            if now - ts < _CACHE_TTL_SECONDS:
                return {
                    "symbol": symbol,
                    "price_usd": price,
                    "change_24h_percent": change_24h,
                    "last_updated": datetime.fromtimestamp(
                        ts, tz=timezone.utc
                    ).isoformat(),
                    "source": "cache",
                }

        # 2. Try CoinGecko API
        if cg_id is not None:
            try:
                data = _http_get_json(
                    f"{_COINGECKO_BASE}/coins/markets?"
                    f"vs_currency=usd&ids={cg_id}"
                )
                if data and isinstance(data, list) and len(data) > 0:
                    entry = data[0]
                    price = float(entry.get("current_price", 0))
                    change_24h = float(entry.get("price_change_percentage_24h", 0))
                    self._cache[symbol] = (price, change_24h, now)
                    return {
                        "symbol": symbol,
                        "price_usd": price,
                        "change_24h_percent": round(change_24h, 2),
                        "last_updated": datetime.now(timezone.utc).isoformat(),
                        "source": "coingecko",
                    }
            except Exception:
                # Swallow network / JSON errors and fall through
                pass

        # 3. Mock fallback
        mock = self.MOCK_PRICES.get(symbol, {
            "price_usd": 0.0,
            "change_24h_percent": 0.0,
            "source": "unavailable",
        })
        self._cache[symbol] = (
            mock["price_usd"],
            mock["change_24h_percent"],
            now,
        )
        return {
            "symbol": symbol,
            "price_usd": mock["price_usd"],
            "change_24h_percent": mock["change_24h_percent"],
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "source": mock.get("source", "mock"),
        }

    def get_prices(self, symbols: list[str]) -> list[dict[str, Any]]:
        """
        Batch price lookup for multiple symbols.

        Args:
            symbols: List of ticker symbols or CoinGecko IDs.

        Returns:
            List of price dictionaries (see :meth:`get_price`).
        """
        return [self.get_price(sym) for sym in symbols]

    # -- Pretty printing ----------------------------------------------------

    def format_table(self, prices: list[dict[str, Any]]) -> str:
        """
        Render a pretty ASCII table with colour indicators.

        Args:
            prices: List of price dictionaries.

        Returns:
            Multi-line string containing the formatted table.
        """
        if not prices:
            return "No price data available."

        # Column widths
        w_sym = max(len(str(p["symbol"])) for p in prices)
        w_sym = max(w_sym, 6)  # header "Symbol"
        w_price = max(len(f"{p['price_usd']:,.2f}") for p in prices)
        w_price = max(w_price, 8)  # header "Price"
        w_change = max(len(f"{p['change_24h_percent']:+.2f}%") for p in prices)
        w_change = max(w_change, 9)  # header "24h Chg"

        sep = (
            f"┌─{'─' * (w_sym + 2)}─┬─{'─' * (w_price + 2)}─"
            f"┬─{'─' * (w_change + 2)}─┬──────────┐"
        )
        header = (
            f"│ {_BOLD}{'Symbol':^{w_sym}}{_RESET} "
            f"│ {_BOLD}{'Price':^{w_price}}{_RESET} "
            f"│ {_BOLD}{'24h Chg':^{w_change}}{_RESET} "
            f"│ {_BOLD}{'Signal':10}{_RESET}│"
        )
        mid = (
            f"├─{'─' * (w_sym + 2)}─┼─{'─' * (w_price + 2)}─"
            f"┼─{'─' * (w_change + 2)}─┼──────────┤"
        )
        footer = (
            f"└─{'─' * (w_sym + 2)}─┴─{'─' * (w_price + 2)}─"
            f"┴─{'─' * (w_change + 2)}─┴──────────┘"
        )

        lines = [sep, header, mid]
        for p in prices:
            sym = str(p["symbol"]).upper()
            price = p["price_usd"]
            chg = float(p["change_24h_percent"])
            if chg >= 0:
                colour = _GREEN
                arrow = "▲"
                signal = f"{colour}{arrow} BUY{_RESET}"
            else:
                colour = _RED
                arrow = "▼"
                signal = f"{colour}{arrow} SELL{_RESET}"
            lines.append(
                f"│ {sym:<{w_sym}} "
                f"│ ${price:>{w_price - 1},.2f} "
                f"│ {colour}{chg:+.2f}%{_RESET} "
                f"│ {signal:18}│"
            )
        lines.append(footer)

        return "\n".join(lines)

    # -- Alert management ---------------------------------------------------

    def _load_alerts(self) -> list[dict[str, Any]]:
        """
        Load persisted alerts from JSON storage.

        Returns:
            List of alert dictionaries.
        """
        if not self._alert_file.exists():
            return []
        try:
            with open(self._alert_file, "r", encoding="utf-8") as fh:
                data = json.load(fh)
                return data if isinstance(data, list) else []
        except (json.JSONDecodeError, OSError):
            return []

    def _save_alerts(self, alerts: list[dict[str, Any]]) -> None:
        """
        Persist *alerts* to JSON storage.

        Args:
            alerts: List of alert dictionaries.
        """
        try:
            with open(self._alert_file, "w", encoding="utf-8") as fh:
                json.dump(alerts, fh, indent=2)
        except OSError as exc:
            raise RuntimeError(f"Failed to save alerts: {exc}") from exc

    def set_alert(
        self, symbol: str, condition: str, target: float
    ) -> dict[str, Any]:
        """
        Create a new price alert.

        Args:
            symbol: Ticker symbol (e.g. ``"BTC"``).
            condition: Either ``"above"`` or ``"below"``.
            target: Target price threshold in USD.

        Returns:
            The newly created alert dictionary.

        Raises:
            ValueError: If *condition* is not ``"above"`` or ``"below"``.
        """
        condition = condition.strip().lower()
        if condition not in {"above", "below"}:
            raise ValueError(
                f"Invalid condition '{condition}'. "
                'Use "above" or "below".'
            )

        alerts = self._load_alerts()
        alert_id = f"{symbol.upper()}_{condition}_{int(target)}_{int(_now() * 1000)}"
        alert = {
            "id": alert_id,
            "symbol": symbol.upper().strip(),
            "condition": condition,
            "target": float(target),
            "created": datetime.now(timezone.utc).isoformat(),
            "recurring": False,
            "triggered": False,
        }
        alerts.append(alert)
        self._save_alerts(alerts)
        return alert

    def check_alerts(self) -> list[dict[str, Any]]:
        """
        Evaluate all active alerts against the latest cached / fetched
        prices.

        One-time (``recurring=False``) alerts are automatically removed
        once triggered. Recurring alerts are left in place.

        Returns:
            List of alert dictionaries that have fired.
        """
        alerts = self._load_alerts()
        if not alerts:
            return []

        triggered: list[dict[str, Any]] = []
        remaining: list[dict[str, Any]] = []

        for alert in alerts:
            sym = alert["symbol"]
            price_data = self.get_price(sym)
            current = float(price_data["price_usd"])
            condition = alert["condition"]
            target = float(alert["target"])

            fired = False
            if condition == "above" and current > target:
                fired = True
            elif condition == "below" and current < target:
                fired = True

            if fired:
                alert["triggered"] = True
                alert["triggered_at"] = datetime.now(timezone.utc).isoformat()
                alert["trigger_price"] = current
                triggered.append(alert)
                if not alert.get("recurring", False):
                    continue  # drop one-time alert
            remaining.append(alert)

        self._save_alerts(remaining)
        return triggered

    def list_alerts(self) -> list[dict[str, Any]]:
        """
        Return all active (not-yet-triggered) alerts.

        Returns:
            List of alert dictionaries.
        """
        return [a for a in self._load_alerts() if not a.get("triggered", False)]

    def delete_alert(self, alert_id: str) -> bool:
        """
        Remove an alert by its unique identifier.

        Args:
            alert_id: The ``id`` field of the alert to remove.

        Returns:
            ``True`` if an alert was found and removed, ``False`` otherwise.
        """
        alerts = self._load_alerts()
        before = len(alerts)
        alerts = [a for a in alerts if a.get("id") != alert_id]
        if len(alerts) == before:
            return False
        self._save_alerts(alerts)
        return True

    # -- CLI dispatcher -----------------------------------------------------

    def handle_command(self, args: list[str]) -> str:
        """
        Route sub-commands to the appropriate ticker method.

        Supported routes::

            btc eth sol          -> price table
            alert BTC above 100k -> set alert
            alerts               -> list alerts
            check                -> check triggered alerts

        Args:
            args: Tokenised command-line arguments.

        Returns:
            Human-readable response string.
        """
        if not args:
            return "Usage: <symbols...> | alert <sym> <above|below> <price> | alerts | check"

        # "alerts" -> list
        if args[0].lower() == "alerts" and len(args) == 1:
            alerts = self.list_alerts()
            if not alerts:
                return "No active alerts."
            lines = [f"ID: {a['id']} | {a['symbol']} {a['condition']} ${a['target']:,.2f}"
                     for a in alerts]
            return "Active alerts:\n" + "\n".join(lines)

        # "check" -> check triggered alerts
        if args[0].lower() == "check" and len(args) == 1:
            triggered = self.check_alerts()
            if not triggered:
                return "No alerts triggered."
            lines = [
                f"TRIGGERED: {t['symbol']} is ${t['trigger_price']:,.2f} "
                f"({t['condition']} ${t['target']:,.2f})"
                for t in triggered
            ]
            return "\n".join(lines)

        # "alert <sym> <above|below> <price>"
        if args[0].lower() == "alert" and len(args) >= 4:
            symbol = args[1]
            condition = args[2]
            try:
                target = float(args[3].replace(",", "").replace("$", ""))
            except ValueError:
                return f"Invalid price: {args[3]}"
            try:
                alert = self.set_alert(symbol, condition, target)
                return (
                    f"Alert set: {alert['symbol']} {alert['condition']} "
                    f"${alert['target']:,.2f} (ID: {alert['id']})"
                )
            except ValueError as exc:
                return str(exc)

        # Default: interpret all args as symbols
        symbols = [a for a in args if not a.startswith("-")]
        prices = self.get_prices(symbols)
        return self.format_table(prices)


# ---------------------------------------------------------------------------
# Self-test / demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    ticker = PriceTicker()

    # Demo: single price
    print("=== Single Price (BTC) ===")
    print(ticker.get_price("BTC"))

    # Demo: batch prices
    print("\n=== Batch Prices ===")
    print(ticker.format_table(ticker.get_prices(["BTC", "ETH", "SOL", "XRP"])))

    # Demo: alert lifecycle
    print("\n=== Alert Lifecycle ===")
    alert = ticker.set_alert("BTC", "above", 50_000)
    print(f"Created: {alert['id']}")
    print(f"Active alerts: {len(ticker.list_alerts())}")
    triggered = ticker.check_alerts()
    print(f"Triggered now (BTC > 50k): {len(triggered)}")
    print(f"Active after check: {len(ticker.list_alerts())}")
    ticker.delete_alert(alert["id"])
    print(f"Active after delete: {len(ticker.list_alerts())}")
