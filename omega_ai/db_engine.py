"""
Omega AI - SQLite Database Engine

A thread-safe SQLite backend that replaces JSON file storage across all modules.
Uses only the Python standard library (sqlite3, threading, pathlib, datetime, json).

Database file: ~/.omega_ai/omega.db

Tables:
    - interactions      : All user interactions (replaces memory_store.py)
    - feedback          : User ratings and feedback (replaces feedback.jsonl)
    - preferences       : User settings (replaces preferences.py)
    - reminders         : Reminders (replaces reminders.py)
    - learning_progress : Learning tracker progress (replaces learning_tracker.py)
    - price_alerts      : Price alerts (replaces price_ticker.py)
    - knowledge_base    : FAQ/knowledge entries with FTS5 search
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Schema version for migrations
# ---------------------------------------------------------------------------
SCHEMA_VERSION: int = 1

# ---------------------------------------------------------------------------
# SQL for initial schema creation
# ---------------------------------------------------------------------------
_SCHEMA_SQL: str = """
-- Schema version marker
PRAGMA user_version = {version};

-- ---------------------------------------------------------------------------
-- 1. interactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interactions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp     TEXT    NOT NULL,
    query         TEXT    NOT NULL,
    response_preview TEXT,
    module        TEXT    DEFAULT 'general',
    rating        INTEGER DEFAULT 0,
    feedback      TEXT    DEFAULT '',
    sources       TEXT,                    -- JSON array
    session_id    TEXT
);

CREATE INDEX IF NOT EXISTS idx_interactions_ts      ON interactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_interactions_module  ON interactions(module);
CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id);

-- ---------------------------------------------------------------------------
-- 2. feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT    NOT NULL,
    query       TEXT,
    response    TEXT,
    rating      INTEGER NOT NULL,
    module      TEXT,
    comment     TEXT    DEFAULT ''
);

-- ---------------------------------------------------------------------------
-- 3. preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS preferences (
    key        TEXT PRIMARY KEY,
    value      TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
);

-- ---------------------------------------------------------------------------
-- 4. reminders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
    id            TEXT PRIMARY KEY,
    text          TEXT    NOT NULL,
    due_date      TEXT,
    recurring     TEXT    DEFAULT '',
    completed     INTEGER DEFAULT 0,
    created_at    TEXT    NOT NULL,
    completed_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_date);

-- ---------------------------------------------------------------------------
-- 5. learning_progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_progress (
    topic       TEXT    NOT NULL,
    level       TEXT    NOT NULL,
    completed   INTEGER DEFAULT 0,
    completed_at TEXT,
    PRIMARY KEY (topic, level)
);

-- ---------------------------------------------------------------------------
-- 6. price_alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_alerts (
    id            TEXT PRIMARY KEY,
    symbol        TEXT    NOT NULL,
    target_price  REAL    NOT NULL,
    direction     TEXT    NOT NULL,          -- 'above' or 'below'
    created_at    TEXT    NOT NULL,
    triggered     INTEGER DEFAULT 0,
    triggered_at  TEXT
);

-- ---------------------------------------------------------------------------
-- 7. knowledge_base + FTS5
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_base (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    category      TEXT    NOT NULL,
    question      TEXT    NOT NULL,
    answer        TEXT    NOT NULL,
    keywords      TEXT,                    -- JSON array
    language      TEXT    DEFAULT 'en',
    usage_count   INTEGER DEFAULT 0,
    created_at    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_search USING fts5(
    question,
    answer,
    content='knowledge_base',
    content_rowid='id'
);

-- Triggers to keep FTS5 index in sync
CREATE TRIGGER IF NOT EXISTS kb_ai AFTER INSERT ON knowledge_base BEGIN
    INSERT INTO knowledge_search(rowid, question, answer)
    VALUES (NEW.id, NEW.question, NEW.answer);
END;

CREATE TRIGGER IF NOT EXISTS kb_ad AFTER DELETE ON knowledge_base BEGIN
    INSERT INTO knowledge_search(knowledge_search, rowid, question, answer)
    VALUES ('delete', OLD.id, OLD.question, OLD.answer);
END;

CREATE TRIGGER IF NOT EXISTS kb_au AFTER UPDATE ON knowledge_base BEGIN
    INSERT INTO knowledge_search(knowledge_search, rowid, question, answer)
    VALUES ('delete', OLD.id, OLD.question, OLD.answer);
    INSERT INTO knowledge_search(rowid, question, answer)
    VALUES (NEW.id, NEW.question, NEW.answer);
END;
""".format(version=SCHEMA_VERSION)

# ---------------------------------------------------------------------------
# Seed data – FAQ entries for Omega AI knowledge base
# ---------------------------------------------------------------------------
_KB_SEED_DATA: list[tuple[str, str, str, str, str]] = [
    # SARS Tax Filing
    (
        "tax",
        "When is the deadline for SARS tax filing in South Africa?",
        "For individuals and provisional taxpayers, the deadline for filing tax returns is typically 31 October each year for eFiling. Provisional taxpayers have an additional deadline: the first provisional payment is due by 31 August, and the second by 28 February of the following year. Always check the SARS website for the current tax year deadlines as they can change.",
        json.dumps(["sars", "deadline", "efiling", "south africa"]),
        "en",
    ),
    (
        "tax",
        "What documents do I need to file my SARS tax return?",
        "You will need your IRP5/IT3(a) certificate from your employer, medical aid certificate (if applicable), retirement annuity certificates, travel logbook (if claiming travel expenses), proof of home office expenses (if applicable), and any other income or deduction documentation. Have your tax number and eFiling login credentials ready.",
        json.dumps(["sars", "documents", "irp5", "tax return"]),
        "en",
    ),
    (
        "tax",
        "How do I register for eFiling with SARS?",
        "Visit the SARS eFiling website (www.sarsefiling.co.za), click on 'Register New Account', provide your personal details including your tax reference number, and follow the verification steps. You will need your ID number, a valid email address, and mobile phone for OTP verification. Once registered, you can file returns, make payments, and check your tax status online.",
        json.dumps(["sars", "efiling", "register", "tax number"]),
        "en",
    ),
    (
        "tax",
        "What are the tax brackets for South Africa in 2024/2025?",
        "South Africa uses a progressive tax system. For the 2024/2025 tax year, the brackets range from 18% for taxable income up to R237,100, to 45% for taxable income above R1,817,001. There are rebates based on age, and tax thresholds apply. Consult the SARS income tax tables for the exact thresholds and rebates for your age group.",
        json.dumps(["sars", "tax brackets", "2024", "2025", "income tax"]),
        "en",
    ),
    # Crypto Tax
    (
        "crypto",
        "Is cryptocurrency taxable in South Africa?",
        "Yes. SARS considers cryptocurrency as an intangible asset. Any gains from crypto trading or investing are subject to normal income tax or capital gains tax, depending on your intent and holding period. If you trade frequently, gains are taxed as income (up to 45%). For long-term holdings, capital gains tax applies with a maximum effective rate of 18%. You must declare all crypto transactions in your annual tax return.",
        json.dumps(["crypto", "tax", "sars", "cryptocurrency", "south africa"]),
        "en",
    ),
    (
        "crypto",
        "How do I report crypto transactions to SARS?",
        "Crypto transactions should be declared in your annual income tax return (ITR12). Report trading profits as taxable income in the 'Other Income' section. For capital gains, complete the capital gains section of your return. Keep detailed records of all transactions, including dates, amounts, exchange rates at the time, and the ZAR value of each transaction. SARS may request supporting documentation.",
        json.dumps(["crypto", "sars", "reporting", "tax return", "itr12"]),
        "en",
    ),
    (
        "crypto",
        "Do I pay tax on crypto-to-crypto trades in South Africa?",
        "Yes, crypto-to-crypto trades are taxable events in South Africa. SARS treats each trade as a disposal of the original cryptocurrency. You need to calculate the ZAR value of the crypto you disposed of at the time of the trade and determine any gain or loss. This applies even if you did not convert back to fiat currency (ZAR).",
        json.dumps(["crypto", "trading", "sars", "tax", "crypto-to-crypto"]),
        "en",
    ),
    # Bitcoin Mining
    (
        "mining",
        "What is Bitcoin mining and how does it work?",
        "Bitcoin mining is the process of validating Bitcoin transactions and adding them to the blockchain ledger. Miners use specialized hardware (ASICs) to solve complex cryptographic puzzles. The first miner to solve the puzzle gets to add the next block of transactions and receives a reward in newly minted bitcoins plus transaction fees. This process secures the network and ensures consensus without a central authority.",
        json.dumps(["bitcoin", "mining", "blockchain", "asic", "proof of work"]),
        "en",
    ),
    (
        "mining",
        "Is Bitcoin mining profitable in South Africa?",
        "Bitcoin mining profitability in South Africa depends on several factors: electricity costs (South Africa has relatively high electricity tariffs), the price of Bitcoin, mining difficulty, hardware efficiency, and cooling costs. Load shedding can also impact uptime. Most individual miners find it challenging to be profitable without very cheap electricity or large-scale operations. Consider mining pools to increase chances of earning consistent rewards.",
        json.dumps(["bitcoin", "mining", "south africa", "profitability", "electricity"]),
        "en",
    ),
    (
        "mining",
        "What hardware do I need to start Bitcoin mining?",
        "To mine Bitcoin effectively, you need an ASIC (Application-Specific Integrated Circuit) miner such as the Bitmain Antminer S19 series or MicroBT Whatsminer M30S series. You also need a reliable power supply, adequate cooling/ventilation, a stable internet connection, and mining pool membership. GPU mining is no longer profitable for Bitcoin due to high network difficulty. For altcoins like Ethereum Classic, GPUs may still be viable.",
        json.dumps(["bitcoin", "mining", "hardware", "asic", "antminer"]),
        "en",
    ),
    (
        "mining",
        "What is a mining pool and should I join one?",
        "A mining pool is a group of miners who combine their computational power to increase their chances of finding a block and earning rewards. When the pool successfully mines a block, the reward is distributed among participants based on their contributed hash power. For most individual miners, joining a pool is highly recommended as it provides more consistent, albeit smaller, payouts compared to solo mining which can be very unpredictable.",
        json.dumps(["mining", "pool", "hash rate", "rewards", "payout"]),
        "en",
    ),
    # M-Pesa & Mobile Money
    (
        "mobile_money",
        "What is M-Pesa and how does it work?",
        "M-Pesa ('M' for mobile, 'Pesa' for money in Swahili) is a mobile phone-based money transfer service launched in Kenya in 2007 by Safaricom and Vodafone. Users can deposit, withdraw, transfer money, pay for goods and services, and access micro-loans using their mobile phones. It works through a network of agents (local shops) where users can deposit or withdraw cash, and via USSD or mobile apps for transfers.",
        json.dumps(["m-pesa", "mobile money", "kenya", "safaricom", "transfer"]),
        "en",
    ),
    (
        "mobile_money",
        "Which countries in Africa use M-Pesa?",
        "M-Pesa is available in several African countries including Kenya (where it originated), Tanzania, Mozambique, the Democratic Republic of Congo, Lesotho, Ghana, Egypt, and Ethiopia. It has also expanded to parts of Asia and Europe. Kenya remains the largest market with over 30 million active users. Each country operates a localized version with country-specific agents and regulations.",
        json.dumps(["m-pesa", "africa", "kenya", "tanzania", "mobile money"]),
        "en",
    ),
    (
        "mobile_money",
        "How do I send money using M-Pesa?",
        "To send money via M-Pesa: Dial the USSD code (*234# or *150*00# depending on your country), select 'Send Money', enter the recipient's mobile number, enter the amount you want to send, enter your M-Pesa PIN to confirm, and wait for the confirmation SMS. You can also use the M-Pesa mobile app for a graphical interface. Both sender and receiver need active M-Pesa accounts.",
        json.dumps(["m-pesa", "send money", "ussd", "mobile app", "tutorial"]),
        "en",
    ),
    (
        "mobile_money",
        "What are the transaction limits for M-Pesa?",
        "M-Pesa transaction limits vary by country. In Kenya, the daily transaction limit is KES 300,000 (approximately $2,300 USD), with a maximum per-transaction limit of KES 150,000. Wallet balance limits and transfer limits may differ. Limits are set by the Central Bank of each country and can be adjusted by Safaricom. Higher-tier accounts (KYC-verified) generally have higher limits than basic accounts.",
        json.dumps(["m-pesa", "limits", "transaction", "kenya", "kyc"]),
        "en",
    ),
    # African Investment
    (
        "investment",
        "What are the best investment opportunities in Africa?",
        "Africa offers diverse investment opportunities including: fintech and mobile payments (Nigeria, Kenya), renewable energy (solar projects across the continent), agriculture and agri-tech (Ethiopia, Tanzania), real estate (major cities like Lagos, Nairobi, Cape Town), e-commerce and logistics, telecommunications infrastructure, and mining (gold, platinum, cobalt, lithium). The African Continental Free Trade Area (AfCFTA) is also creating new cross-border investment opportunities.",
        json.dumps(["africa", "investment", "fintech", "renewable energy", "afcfta"]),
        "en",
    ),
    (
        "investment",
        "How can I invest in the Johannesburg Stock Exchange (JSE)?",
        "To invest in the JSE, you need to open a brokerage account with a licensed South African stockbroker or through online platforms like EasyEquities, FNB Share Investing, or Standard Bank Online Share Trading. You will need your South African ID (or passport for non-residents), proof of address, and tax number. Once approved, you can buy and sell shares, ETFs, and REITs listed on the JSE. Non-residents can also invest but may need additional documentation.",
        json.dumps(["jse", "stock exchange", "invest", "south africa", "broker"]),
        "en",
    ),
    (
        "investment",
        "What is the African Continental Free Trade Area (AfCFTA)?",
        "The AfCFTA is a free trade area encompassing most of Africa, established in 2018 and operational since 2021. It aims to create a single continental market for goods and services, with free movement of businesspeople and investments. The agreement covers 54 of the 55 African Union nations. Key benefits include reduced tariffs (90% of goods), harmonized trade rules, and a combined GDP of over $3 trillion. It represents a major opportunity for intra-African trade and investment.",
        json.dumps(["afcfta", "africa", "trade", "investment", "free trade"]),
        "en",
    ),
    (
        "investment",
        "What are Exchange Traded Funds (ETFs) available on the JSE?",
        "The JSE offers numerous ETFs including: Satrix 40 (tracks Top 40 companies), CoreShares Total World Stock (global diversification), Satrix MSCI Emerging Markets, NewFunds S&P GIVI SA Top 50, Absa NewGold (tracks gold price), 1nvest S&P 500 (US market exposure), and property ETFs like the CoreShares Proptrax SAPY. ETFs provide diversified exposure at low costs and are suitable for both beginner and experienced investors.",
        json.dumps(["jse", "etf", "investment", "satrix", "diversification"]),
        "en",
    ),
    # Scams & Safety
    (
        "scams",
        "What are common cryptocurrency scams in South Africa?",
        "Common crypto scams in South Africa include: Ponzi schemes promising guaranteed returns (e.g., Mirror Trading International), fake crypto investment platforms, phishing emails pretending to be from legitimate exchanges, romance scams where victims are persuaded to invest in fake platforms, pump-and-dump schemes, and fake celebrity endorsements. Always verify platforms with the FSCA (Financial Sector Conduct Authority) and never share your private keys or wallet seed phrases.",
        json.dumps(["crypto", "scam", "south africa", "ponzi", "fsca", "safety"]),
        "en",
    ),
    (
        "scams",
        "How can I identify a Ponzi scheme?",
        "Warning signs of a Ponzi scheme include: promises of guaranteed high returns with little or no risk, consistent returns regardless of market conditions, unregistered investments or unlicensed sellers, secretive or complex strategies, difficulty receiving payments or cashing out, heavy emphasis on recruiting new members, and pressure to invest quickly. Famous examples include MTI in South Africa. Remember: if it sounds too good to be true, it probably is.",
        json.dumps(["ponzi", "scam", "fraud", "investment", "red flags"]),
        "en",
    ),
    (
        "scams",
        "What should I do if I have been scammed in South Africa?",
        "If you have been scammed in South Africa: 1) Report it to the South African Police Service (SAPS) and obtain a case number. 2) Report to the Financial Sector Conduct Authority (FSCA) at www.fsca.co.za. 3) For cybercrime, report to the Hawks (Directorate for Priority Crime Investigation). 4) Contact your bank immediately if funds were transferred. 5) Report to the Ombudsman for Banking Services if needed. 6) Share your experience on platforms like HelloPeter to warn others. Document all communications and transactions as evidence.",
        json.dumps(["scam", "report", "saps", "fsca", "south africa", "help"]),
        "en",
    ),
    (
        "scams",
        "What is phishing and how can I protect myself?",
        "Phishing is a cyber attack where scammers impersonate legitimate organizations via email, SMS, or fake websites to steal personal information, passwords, or banking details. To protect yourself: never click links in unsolicited emails, verify the sender's email address carefully, check for HTTPS on websites, use unique strong passwords and a password manager, enable two-factor authentication (2FA) on all accounts, and never share OTPs or passwords with anyone. Legitimate organizations will never ask for your password.",
        json.dumps(["phishing", "cyber security", "password", "2fa", "protection"]),
        "en",
    ),
    (
        "scams",
        "How do I verify if a financial service provider is legitimate in South Africa?",
        "You can verify a financial service provider by checking the FSCA (Financial Sector Conduct Authority) register at www.fsca.co.za. Search for the company or individual's name and verify their FSP (Financial Services Provider) license number. You can also check with the South African Reserve Bank (SARB) for authorized banks and payment providers. Additionally, search for reviews on HelloPeter and verify the company's physical address and registration with CIPC (Companies and Intellectual Property Commission).",
        json.dumps(["fsca", "verify", "financial", "south africa", "legitimate"]),
        "en",
    ),
    (
        "scams",
        "What are WhatsApp and social media investment scams?",
        "These scams typically involve messages on WhatsApp, Facebook, Instagram, or Telegram from strangers offering investment opportunities with guaranteed returns. They often use fake testimonials, screenshots of profits, and create a sense of urgency ('limited spots available'). Some operate as 'pig butchering' scams where scammers build a relationship before introducing a fake investment platform. Never invest based on unsolicited messages, and always independently verify any investment opportunity through licensed professionals.",
        json.dumps(["whatsapp", "scam", "social media", "investment", "pig butchering"]),
        "en",
    ),
]


# ---------------------------------------------------------------------------
# Database Engine
# ---------------------------------------------------------------------------

class DatabaseEngine:
    """Thread-safe SQLite database engine for Omega AI.

    Manages all persistent storage through a single SQLite database file.
    Provides CRUD operations, full-text search, schema migrations, and
    a context-manager interface.

    Usage:
        with DatabaseEngine() as db:
            db.save_interaction("Hello", "Hi there!")
            prefs = db.get_all_preferences()
    """

    def __init__(self, db_path: str = "") -> None:
        """Initialize the database engine.

        Args:
            db_path: Path to the SQLite database file. Defaults to
                     ~/.omega_ai/omega.db if empty.
        """
        if db_path:
            self._db_path: str = db_path
        else:
            home = Path.home()
            omega_dir = home / ".omega_ai"
            omega_dir.mkdir(parents=True, exist_ok=True)
            self._db_path = str(omega_dir / "omega.db")

        self._lock: threading.Lock = threading.Lock()
        self._conn: Optional[sqlite3.Connection] = None
        self._local = threading.local()

        self._connect()
        self._init_schema()

    # ------------------------------------------------------------------
    # Internal connection helpers
    # ------------------------------------------------------------------

    def _connect(self) -> None:
        """Open (or re-open) the SQLite connection."""
        self._conn = sqlite3.connect(
            self._db_path,
            check_same_thread=False,
            detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES,
        )
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._conn.execute("PRAGMA synchronous=NORMAL")

    def _execute(self, sql: str, parameters: tuple = ()) -> sqlite3.Cursor:
        """Execute SQL inside the thread lock."""
        with self._lock:
            cur = self._conn.execute(sql, parameters)
            return cur

    def _executemany(self, sql: str, parameters: list) -> sqlite3.Cursor:
        """Execute many SQL statements inside the thread lock."""
        with self._lock:
            cur = self._conn.executemany(sql, parameters)
            return cur

    def _fetchall(self, sql: str, parameters: tuple = ()) -> list[sqlite3.Row]:
        """Execute and fetch all rows."""
        with self._lock:
            cur = self._conn.execute(sql, parameters)
            return cur.fetchall()

    def _fetchone(self, sql: str, parameters: tuple = ()) -> Optional[sqlite3.Row]:
        """Execute and fetch one row."""
        with self._lock:
            cur = self._conn.execute(sql, parameters)
            return cur.fetchone()

    # ------------------------------------------------------------------
    # Schema Management
    # ------------------------------------------------------------------

    def _init_schema(self) -> None:
        """Create tables and indexes if they do not exist.

        Uses PRAGMA user_version to detect schema changes and re-run
        creation scripts when the version bumps.
        """
        with self._lock:
            row = self._conn.execute("PRAGMA user_version").fetchone()
            current_version: int = row[0] if row else 0

            if current_version < SCHEMA_VERSION:
                self._conn.executescript(_SCHEMA_SQL)
                self._conn.commit()

    # ------------------------------------------------------------------
    # Interactions
    # ------------------------------------------------------------------

    def save_interaction(
        self,
        query: str,
        response: str,
        module: str = "general",
        rating: int = 0,
        sources: list | None = None,
        session_id: str = "",
    ) -> int:
        """Save a user interaction and return the row ID.

        Args:
            query: The user's query.
            response: The full response text.
            module: Which Omega AI module handled the query.
            rating: User rating (-1 to 5, 0 = unrated).
            sources: List of source URLs/references.
            session_id: Optional session identifier.

        Returns:
            The auto-incremented row ID of the inserted record.
        """
        preview = response[:500] if response else ""
        sources_json = json.dumps(sources) if sources else None
        ts = datetime.now().isoformat()

        sql = """
            INSERT INTO interactions
                (timestamp, query, response_preview, module, rating, sources, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        cur = self._execute(sql, (ts, query, preview, module, rating, sources_json, session_id))
        self._conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def get_interactions(
        self,
        module: str = "",
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        """Retrieve interactions, optionally filtered by module.

        Args:
            module: Filter by module name (empty = all).
            limit: Maximum rows to return.
            offset: Row offset for pagination.

        Returns:
            List of interaction dictionaries.
        """
        if module:
            rows = self._fetchall(
                """SELECT * FROM interactions WHERE module = ?
                   ORDER BY timestamp DESC LIMIT ? OFFSET ?""",
                (module, limit, offset),
            )
        else:
            rows = self._fetchall(
                "SELECT * FROM interactions ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                (limit, offset),
            )
        return [dict(r) for r in rows]

    def search_interactions(self, query: str, limit: int = 10) -> list[dict]:
        """Full-text search over stored interactions.

        Args:
            query: Search term.
            limit: Maximum rows to return.

        Returns:
            List of matching interaction dictionaries.
        """
        pattern = f"%{query}%"
        rows = self._fetchall(
            """SELECT * FROM interactions
               WHERE query LIKE ? OR response_preview LIKE ?
               ORDER BY timestamp DESC LIMIT ?""",
            (pattern, pattern, limit),
        )
        return [dict(r) for r in rows]

    def get_interaction_stats(self) -> dict:
        """Return summary statistics for interactions.

        Returns:
            Dictionary with total count, count by module, average rating,
            and recent count (last 24h, last 7d).
        """
        total_row = self._fetchone("SELECT COUNT(*) AS c FROM interactions")
        total: int = total_row["c"] if total_row else 0

        avg_row = self._fetchone(
            "SELECT AVG(rating) AS avg_r FROM interactions WHERE rating != 0"
        )
        avg_rating: float = round(avg_row["avg_r"] or 0.0, 2)

        module_rows = self._fetchall(
            "SELECT module, COUNT(*) AS c FROM interactions GROUP BY module"
        )
        by_module: dict[str, int] = {r["module"]: r["c"] for r in module_rows}

        now = datetime.now().isoformat()
        day_ago = (datetime.now() - timedelta(days=1)).isoformat()
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()

        day_row = self._fetchone(
            "SELECT COUNT(*) AS c FROM interactions WHERE timestamp > ?", (day_ago,)
        )
        week_row = self._fetchone(
            "SELECT COUNT(*) AS c FROM interactions WHERE timestamp > ?", (week_ago,)
        )

        return {
            "total": total,
            "by_module": by_module,
            "average_rating": avg_rating,
            "last_24h": day_row["c"] if day_row else 0,
            "last_7d": week_row["c"] if week_row else 0,
        }

    # ------------------------------------------------------------------
    # Feedback
    # ------------------------------------------------------------------

    def save_feedback(
        self,
        query: str,
        response: str,
        rating: int,
        module: str = "",
        comment: str = "",
    ) -> None:
        """Record user feedback on a response.

        Args:
            query: The query that was asked.
            response: The response that was given.
            rating: Numeric rating (1-5).
            module: The module that generated the response.
            comment: Optional free-text comment.
        """
        ts = datetime.now().isoformat()
        sql = """
            INSERT INTO feedback (timestamp, query, response, rating, module, comment)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        self._execute(sql, (ts, query, response, rating, module, comment))
        self._conn.commit()

    def get_feedback_stats(self) -> dict:
        """Return aggregate feedback statistics.

        Returns:
            Dictionary with total count, average rating, rating distribution,
            and breakdown by module.
        """
        total_row = self._fetchone("SELECT COUNT(*) AS c FROM feedback")
        total: int = total_row["c"] if total_row else 0

        avg_row = self._fetchone("SELECT AVG(rating) AS avg_r FROM feedback")
        avg_rating: float = round(avg_row["avg_r"] or 0.0, 2)

        dist_rows = self._fetchall(
            "SELECT rating, COUNT(*) AS c FROM feedback GROUP BY rating ORDER BY rating"
        )
        distribution: dict[int, int] = {r["rating"]: r["c"] for r in dist_rows}

        module_rows = self._fetchall(
            "SELECT module, COUNT(*) AS c, AVG(rating) AS avg_r "
            "FROM feedback GROUP BY module"
        )
        by_module: dict[str, dict] = {
            r["module"] or "unspecified": {
                "count": r["c"],
                "average_rating": round(r["avg_r"] or 0.0, 2),
            }
            for r in module_rows
        }

        return {
            "total": total,
            "average_rating": avg_rating,
            "rating_distribution": distribution,
            "by_module": by_module,
        }

    # ------------------------------------------------------------------
    # Preferences
    # ------------------------------------------------------------------

    def get_preference(self, key: str, default: Any = None) -> Any:
        """Retrieve a user preference value.

        Values are stored as JSON strings, so they are transparently
        deserialized back to their original Python types.

        Args:
            key: Preference key.
            default: Value to return if key is not found.

        Returns:
            The deserialized preference value, or *default*.
        """
        row = self._fetchone(
            "SELECT value FROM preferences WHERE key = ?", (key,)
        )
        if row is None:
            return default
        try:
            return json.loads(row["value"])
        except (json.JSONDecodeError, TypeError):
            return row["value"]

    def set_preference(self, key: str, value: Any) -> None:
        """Store a user preference value.

        Values are serialized to JSON for storage.

        Args:
            key: Preference key.
            value: Value to store (any JSON-serializable type).
        """
        ts = datetime.now().isoformat()
        value_json = json.dumps(value)
        self._execute(
            """INSERT INTO preferences (key, value, updated_at)
               VALUES (?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET
                   value=excluded.value, updated_at=excluded.updated_at""",
            (key, value_json, ts),
        )
        self._conn.commit()

    def get_all_preferences(self) -> dict[str, Any]:
        """Return all preferences as a dictionary.

        Returns:
            Mapping of key -> deserialized value.
        """
        rows = self._fetchall("SELECT key, value FROM preferences")
        result: dict[str, Any] = {}
        for r in rows:
            try:
                result[r["key"]] = json.loads(r["value"])
            except (json.JSONDecodeError, TypeError):
                result[r["key"]] = r["value"]
        return result

    # ------------------------------------------------------------------
    # Reminders
    # ------------------------------------------------------------------

    def add_reminder(
        self,
        text: str,
        due_date: str = "",
        recurring: str = "",
        reminder_id: str = "",
    ) -> str:
        """Create a new reminder.

        Args:
            text: The reminder message.
            due_date: ISO-format due date (optional).
            recurring: Recurrence pattern, e.g. 'daily', 'weekly'.
            reminder_id: Explicit ID; auto-generated if empty.

        Returns:
            The reminder ID.
        """
        rid = reminder_id or str(uuid.uuid4())
        ts = datetime.now().isoformat()
        self._execute(
            """INSERT INTO reminders (id, text, due_date, recurring, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (rid, text, due_date, recurring, ts),
        )
        self._conn.commit()
        return rid

    def get_due_reminders(self) -> list[dict]:
        """Return reminders whose due_date has passed and are not completed.

        Reminders without a due_date (empty string) are excluded.

        Returns:
            List of overdue reminder dictionaries.
        """
        now = datetime.now().isoformat()
        rows = self._fetchall(
            """SELECT * FROM reminders
               WHERE due_date != '' AND due_date <= ? AND completed = 0
               ORDER BY due_date ASC""",
            (now,),
        )
        return [dict(r) for r in rows]

    def get_upcoming_reminders(self, days: int = 7) -> list[dict]:
        """Return reminders due within the next *days* days.

        Reminders without a due_date (empty string) are excluded.

        Args:
            days: Look-ahead window in days.

        Returns:
            List of upcoming reminder dictionaries.
        """
        now = datetime.now().isoformat()
        future = (datetime.now() + timedelta(days=days)).isoformat()
        rows = self._fetchall(
            """SELECT * FROM reminders
               WHERE due_date != '' AND due_date BETWEEN ? AND ? AND completed = 0
               ORDER BY due_date ASC""",
            (now, future),
        )
        return [dict(r) for r in rows]

    def complete_reminder(self, reminder_id: str) -> None:
        """Mark a reminder as completed.

        Args:
            reminder_id: The reminder's unique ID.

        Raises:
            KeyError: If the reminder does not exist.
        """
        ts = datetime.now().isoformat()
        cur = self._execute(
            """UPDATE reminders
               SET completed = 1, completed_at = ?
               WHERE id = ?""",
            (ts, reminder_id),
        )
        self._conn.commit()
        if cur.rowcount == 0:
            raise KeyError(f"Reminder not found: {reminder_id}")

    def delete_reminder(self, reminder_id: str) -> None:
        """Permanently delete a reminder.

        Args:
            reminder_id: The reminder's unique ID.

        Raises:
            KeyError: If the reminder does not exist.
        """
        cur = self._execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
        self._conn.commit()
        if cur.rowcount == 0:
            raise KeyError(f"Reminder not found: {reminder_id}")

    # ------------------------------------------------------------------
    # Learning Progress
    # ------------------------------------------------------------------

    def mark_lesson_complete(self, topic: str, level: str) -> None:
        """Mark a specific lesson/topic+level as completed.

        Args:
            topic: The topic name.
            level: The difficulty level (e.g. 'beginner', 'advanced').
        """
        ts = datetime.now().isoformat()
        self._execute(
            """INSERT INTO learning_progress (topic, level, completed, completed_at)
               VALUES (?, ?, 1, ?)
               ON CONFLICT(topic, level) DO UPDATE SET
                   completed=1, completed_at=excluded.completed_at""",
            (topic, level, ts),
        )
        self._conn.commit()

    def get_learning_progress(self) -> list[dict]:
        """Return all learning progress entries.

        Returns:
            List of progress dictionaries.
        """
        rows = self._fetchall(
            "SELECT * FROM learning_progress ORDER BY topic, level"
        )
        return [dict(r) for r in rows]

    def get_learning_stats(self) -> dict:
        """Return learning progress statistics.

        Returns:
            Dictionary with total lessons, completed count,
            completion percentage, and breakdown by topic.
        """
        total_row = self._fetchone(
            "SELECT COUNT(*) AS c FROM learning_progress"
        )
        total: int = total_row["c"] if total_row else 0

        done_row = self._fetchone(
            "SELECT COUNT(*) AS c FROM learning_progress WHERE completed = 1"
        )
        completed: int = done_row["c"] if done_row else 0

        pct = round((completed / total) * 100, 1) if total else 0.0

        topic_rows = self._fetchall(
            """SELECT topic,
                      COUNT(*) AS total,
                      SUM(completed) AS completed
               FROM learning_progress
               GROUP BY topic"""
        )
        by_topic: dict[str, dict] = {
            r["topic"]: {
                "total": r["total"],
                "completed": r["completed"] or 0,
                "percentage": round(
                    ((r["completed"] or 0) / r["total"]) * 100, 1
                ),
            }
            for r in topic_rows
        }

        return {
            "total_lessons": total,
            "completed": completed,
            "completion_percentage": pct,
            "by_topic": by_topic,
        }

    # ------------------------------------------------------------------
    # Price Alerts
    # ------------------------------------------------------------------

    def add_price_alert(
        self, symbol: str, target_price: float, direction: str = "above"
    ) -> str:
        """Create a new price alert.

        Args:
            symbol: Ticker symbol (e.g. 'BTC', 'AAPL').
            target_price: The price threshold to watch.
            direction: 'above' or 'below'.

        Returns:
            The alert's unique ID.
        """
        alert_id = str(uuid.uuid4())
        ts = datetime.now().isoformat()
        self._execute(
            """INSERT INTO price_alerts
                 (id, symbol, target_price, direction, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (alert_id, symbol.upper(), target_price, direction, ts),
        )
        self._conn.commit()
        return alert_id

    def get_active_alerts(self) -> list[dict]:
        """Return all price alerts that have not yet triggered.

        Returns:
            List of active alert dictionaries.
        """
        rows = self._fetchall(
            """SELECT * FROM price_alerts
               WHERE triggered = 0
               ORDER BY created_at DESC"""
        )
        return [dict(r) for r in rows]

    def trigger_alert(self, alert_id: str) -> None:
        """Mark a price alert as triggered.

        Args:
            alert_id: The alert's unique ID.

        Raises:
            KeyError: If the alert does not exist.
        """
        ts = datetime.now().isoformat()
        cur = self._execute(
            """UPDATE price_alerts
               SET triggered = 1, triggered_at = ?
               WHERE id = ?""",
            (ts, alert_id),
        )
        self._conn.commit()
        if cur.rowcount == 0:
            raise KeyError(f"Price alert not found: {alert_id}")

    # ------------------------------------------------------------------
    # Knowledge Base
    # ------------------------------------------------------------------

    def kb_add(
        self,
        category: str,
        question: str,
        answer: str,
        keywords: list | None = None,
        language: str = "en",
    ) -> int:
        """Add an entry to the knowledge base.

        Args:
            category: Entry category (e.g. 'tax', 'crypto').
            question: The question text.
            answer: The answer text.
            keywords: Optional list of keyword strings.
            language: ISO language code (default 'en').

        Returns:
            The auto-incremented row ID.
        """
        kw_json = json.dumps(keywords) if keywords else None
        ts = datetime.now().isoformat()
        cur = self._execute(
            """INSERT INTO knowledge_base
                 (category, question, answer, keywords, language, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (category, question, answer, kw_json, language, ts),
        )
        self._conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def kb_search(self, query: str, category: str = "", limit: int = 5) -> list[dict]:
        """Full-text search the knowledge base using FTS5.

        Args:
            query: Search query string.
            category: Optional category filter.
            limit: Maximum results.

        Returns:
            List of matching knowledge base entries.
        """
        # Sanitize FTS5 query – wrap each token in double quotes so FTS5
        # treats them as literals (hyphens, colons, etc. would otherwise be
        # interpreted as column qualifiers or operators).
        tokens = [t.strip() for t in query.split() if t.strip()]
        safe_tokens = []
        for t in tokens:
            # Skip bare FTS5 operators; everything else gets quoted
            if t.upper() in ("NOT", "OR", "AND"):
                continue
            # Strip leading/trailing asterisks
            t = t.strip("*")
            if t:
                safe_tokens.append(f'"{t}"')
        safe_query = " ".join(safe_tokens) if safe_tokens else f'"{query}"'

        if category:
            rows = self._fetchall(
                """SELECT kb.* FROM knowledge_base kb
                   JOIN knowledge_search ks ON ks.rowid = kb.id
                   WHERE knowledge_search MATCH ? AND kb.category = ?
                   ORDER BY rank
                   LIMIT ?""",
                (safe_query, category, limit),
            )
        else:
            rows = self._fetchall(
                """SELECT kb.* FROM knowledge_base kb
                   JOIN knowledge_search ks ON ks.rowid = kb.id
                   WHERE knowledge_search MATCH ?
                   ORDER BY rank
                   LIMIT ?""",
                (safe_query, limit),
            )
        return [dict(r) for r in rows]

    def kb_get_by_category(self, category: str) -> list[dict]:
        """Retrieve all knowledge base entries in a category.

        Args:
            category: The category name.

        Returns:
            List of entry dictionaries.
        """
        rows = self._fetchall(
            """SELECT * FROM knowledge_base
               WHERE category = ?
               ORDER BY question""",
            (category,),
        )
        return [dict(r) for r in rows]

    def kb_increment_usage(self, entry_id: int) -> None:
        """Increment the usage counter for a knowledge base entry.

        Args:
            entry_id: The entry's row ID.
        """
        self._execute(
            """UPDATE knowledge_base
               SET usage_count = usage_count + 1
               WHERE id = ?""",
            (entry_id,),
        )
        self._conn.commit()

    # ------------------------------------------------------------------
    # Seed Data
    # ------------------------------------------------------------------

    def seed(self) -> dict:
        """Populate the knowledge base with seed FAQ entries.

        Skips entries that already exist (matched by question text).

        Returns:
            Summary dict with counts seeded and categories.
        """
        seeded: int = 0
        categories: set[str] = set()

        for category, question, answer, keywords, language in _KB_SEED_DATA:
            # Check for duplicate by question text
            existing = self._fetchone(
                "SELECT 1 FROM knowledge_base WHERE question = ?", (question,)
            )
            if existing:
                continue

            self.kb_add(category, question, answer,
                        json.loads(keywords) if keywords else None, language)
            seeded += 1
            categories.add(category)

        return {
            "seeded_entries": seeded,
            "total_seed_data": len(_KB_SEED_DATA),
            "categories": sorted(categories),
        }

    # ------------------------------------------------------------------
    # Migration from JSON
    # ------------------------------------------------------------------

    def migrate_from_json(self) -> dict:
        """Migrate legacy JSON files into the SQLite database.

        Scans the default Omega AI config directory (~/.omega_ai) for
        known JSON files and imports their contents into the appropriate
        tables.

        Returns:
            Summary of what was migrated.
        """
        results: dict[str, Any] = {}
        base = Path.home() / ".omega_ai"

        # --- preferences.json ---
        pref_file = base / "preferences.json"
        if pref_file.exists():
            try:
                with open(pref_file, "r", encoding="utf-8") as fh:
                    prefs: dict = json.load(fh)
                for key, value in prefs.items():
                    self.set_preference(key, value)
                results["preferences"] = {"status": "ok", "keys": len(prefs)}
            except Exception as exc:  # noqa: BLE001
                results["preferences"] = {"status": "error", "message": str(exc)}

        # --- feedback.jsonl ---
        fb_file = base / "feedback.jsonl"
        if fb_file.exists():
            imported = 0
            errors = 0
            try:
                with open(fb_file, "r", encoding="utf-8") as fh:
                    for line in fh:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            entry: dict = json.loads(line)
                            self.save_feedback(
                                query=entry.get("query", ""),
                                response=entry.get("response", ""),
                                rating=entry.get("rating", 3),
                                module=entry.get("module", ""),
                                comment=entry.get("comment", ""),
                            )
                            imported += 1
                        except Exception:  # noqa: BLE001
                            errors += 1
                results["feedback"] = {"status": "ok", "imported": imported, "errors": errors}
            except Exception as exc:  # noqa: BLE001
                results["feedback"] = {"status": "error", "message": str(exc)}

        # --- reminders.json ---
        rem_file = base / "reminders.json"
        if rem_file.exists():
            try:
                with open(rem_file, "r", encoding="utf-8") as fh:
                    reminders: list[dict] = json.load(fh)
                imported = 0
                for r in reminders:
                    self.add_reminder(
                        text=r.get("text", ""),
                        due_date=r.get("due_date", ""),
                        recurring=r.get("recurring", ""),
                        reminder_id=r.get("id", ""),
                    )
                    imported += 1
                results["reminders"] = {"status": "ok", "imported": imported}
            except Exception as exc:  # noqa: BLE001
                results["reminders"] = {"status": "error", "message": str(exc)}

        # --- learning_progress.json ---
        learn_file = base / "learning_progress.json"
        if learn_file.exists():
            try:
                with open(learn_file, "r", encoding="utf-8") as fh:
                    progress: list[dict] = json.load(fh)
                imported = 0
                for p in progress:
                    topic = p.get("topic", "")
                    level = p.get("level", "")
                    self.mark_lesson_complete(topic, level)
                    imported += 1
                results["learning_progress"] = {"status": "ok", "imported": imported}
            except Exception as exc:  # noqa: BLE001
                results["learning_progress"] = {"status": "error", "message": str(exc)}

        # --- price_alerts.json ---
        alerts_file = base / "price_alerts.json"
        if alerts_file.exists():
            try:
                with open(alerts_file, "r", encoding="utf-8") as fh:
                    alerts: list[dict] = json.load(fh)
                imported = 0
                for a in alerts:
                    aid = a.get("id", "")
                    if not aid:
                        aid = str(uuid.uuid4())
                    ts = datetime.now().isoformat()
                    self._execute(
                        """INSERT OR IGNORE INTO price_alerts
                             (id, symbol, target_price, direction, created_at, triggered, triggered_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (
                            aid,
                            a.get("symbol", ""),
                            a.get("target_price", 0.0),
                            a.get("direction", "above"),
                            a.get("created_at", ts),
                            1 if a.get("triggered") else 0,
                            a.get("triggered_at", ""),
                        ),
                    )
                    imported += 1
                self._conn.commit()
                results["price_alerts"] = {"status": "ok", "imported": imported}
            except Exception as exc:  # noqa: BLE001
                results["price_alerts"] = {"status": "error", "message": str(exc)}

        # --- memory_store.json (interactions) ---
        mem_file = base / "memory_store.json"
        if mem_file.exists():
            try:
                with open(mem_file, "r", encoding="utf-8") as fh:
                    interactions: list[dict] = json.load(fh)
                imported = 0
                for i in interactions:
                    ts = i.get("timestamp", datetime.now().isoformat())
                    self._execute(
                        """INSERT INTO interactions
                             (timestamp, query, response_preview, module, rating, feedback, sources, session_id)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            ts,
                            i.get("query", ""),
                            i.get("response", "")[:500],
                            i.get("module", "general"),
                            i.get("rating", 0),
                            i.get("feedback", ""),
                            json.dumps(i.get("sources", [])),
                            i.get("session_id", ""),
                        ),
                    )
                    imported += 1
                self._conn.commit()
                results["interactions"] = {"status": "ok", "imported": imported}
            except Exception as exc:  # noqa: BLE001
                results["interactions"] = {"status": "error", "message": str(exc)}

        return results

    # ------------------------------------------------------------------
    # Connection management
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Close the database connection safely."""
        with self._lock:
            if self._conn:
                try:
                    self._conn.commit()
                finally:
                    self._conn.close()
                    self._conn = None

    def __enter__(self) -> "DatabaseEngine":
        """Enter context manager."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:  # type: ignore[override]
        """Exit context manager, closing connection."""
        self.close()

    # ------------------------------------------------------------------
    # Diagnostics / Utility
    # ------------------------------------------------------------------

    def table_counts(self) -> dict[str, int]:
        """Return row counts for all tables.

        Returns:
            Mapping of table name -> row count.
        """
        tables = [
            "interactions",
            "feedback",
            "preferences",
            "reminders",
            "learning_progress",
            "price_alerts",
            "knowledge_base",
        ]
        counts: dict[str, int] = {}
        for t in tables:
            row = self._fetchone("SELECT COUNT(*) AS c FROM ?", (t,))
            counts[t] = row["c"] if row else 0
        return counts

    def vacuum(self) -> None:
        """Run VACUUM to reclaim disk space and optimize the database."""
        with self._lock:
            self._conn.execute("VACUUM")

    def __repr__(self) -> str:
        return f"<DatabaseEngine db={self._db_path!r}>"
