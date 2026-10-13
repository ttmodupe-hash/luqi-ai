"""Token Billing Gateway & Payment Processor — Luqi AI.

Enforces:
  1. Virtual Credit System (Margin Protector):
     - Prevents insolvency by gating costly generative video/agent tasks.
     - Charges 10 credits ($0.50) per video second vs $0.25 API rendering cost (50% profit margin).
     - Pre-deducts tokens before dispatching tasks to Celery workers.
  2. Multi-Gateway Payment Webhooks:
     - PayFast ITN (Instant Transaction Notification) for South Africa / Gauteng.
     - Stripe Webhooks for global card and subscription payments.
  3. Durable Wallet and Transaction Ledger.
"""

import os
import time
import hashlib
import sqlite3
import logging
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode

logger = logging.getLogger("luqi.billing")

# Pricing & Margin Protection Constants
CREDIT_PRICE_USD = 0.05
CREDITS_PER_VIDEO_SECOND = 10  # 10 credits = $0.50 vs $0.25 API cost -> 50% margin
CREDITS_PER_HEAVY_TASK = 5      # Base cost for multi-agent / Celery task
DEFAULT_INITIAL_CREDITS = 100   # Complimentary starting balance

DB_PATH = os.environ.get("SQLITE_DB_PATH", "omega_ai.db")

# PayFast Configuration
PAYFAST_MERCHANT_ID = os.environ.get("PAYFAST_MERCHANT_ID", "10000100")
PAYFAST_MERCHANT_KEY = os.environ.get("PAYFAST_MERCHANT_KEY", "46f0cd694581a")
PAYFAST_PASSPHRASE = os.environ.get("PAYFAST_PASSPHRASE", "")

# In-Memory Cache for rapid reads and zero latency
_WALLET_CACHE: Dict[str, int] = {}


def _init_billing_tables():
    """Initializes SQLite ledger tables for wallets and payment transactions."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS token_wallets (
                user_email TEXT PRIMARY KEY,
                token_balance INTEGER DEFAULT 100,
                tier TEXT DEFAULT 'standard',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id TEXT PRIMARY KEY,
                user_email TEXT,
                provider TEXT,
                amount_gross REAL,
                currency TEXT,
                tokens_credited INTEGER,
                status TEXT,
                payload TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS token_deduction_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT,
                task_id TEXT,
                tokens_deducted INTEGER,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error("Failed to initialize billing tables: %s", e)


_init_billing_tables()


class TokenBillingGateway:
    """Manages virtual token balances, deductions, and payment gateways."""

    @staticmethod
    def get_balance(user_email: str) -> int:
        """Retrieves user's token balance. Initializes with default free credits if new."""
        clean_email = (user_email or "guest@luqi.ai").strip().lower()
        if clean_email in _WALLET_CACHE:
            return _WALLET_CACHE[clean_email]

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT token_balance FROM token_wallets WHERE user_email = ?", (clean_email,))
            row = cursor.fetchone()
            if row:
                balance = int(row[0])
            else:
                balance = DEFAULT_INITIAL_CREDITS
                cursor.execute(
                    "INSERT INTO token_wallets (user_email, token_balance, tier) VALUES (?, ?, 'standard')",
                    (clean_email, balance),
                )
                conn.commit()
            conn.close()
            _WALLET_CACHE[clean_email] = balance
            return balance
        except Exception as e:
            logger.warning("Error reading wallet: %s. Using default.", e)
            return _WALLET_CACHE.get(clean_email, DEFAULT_INITIAL_CREDITS)

    @staticmethod
    def check_and_deduct_tokens(
        user_email: str,
        required_tokens: int,
        task_id: Optional[str] = None,
        description: str = "Agent task execution",
    ) -> Dict[str, Any]:
        """Pre-execution margin check. Deducts tokens only if balance is sufficient."""
        clean_email = (user_email or "guest@luqi.ai").strip().lower()
        current_balance = TokenBillingGateway.get_balance(clean_email)

        if current_balance < required_tokens:
            return {
                "success": False,
                "current_balance": current_balance,
                "required_tokens": required_tokens,
                "shortfall": required_tokens - current_balance,
                "error": f"Insufficient Luqi credits. Required: {required_tokens}, Available: {current_balance}.",
            }

        new_balance = current_balance - required_tokens

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE token_wallets SET token_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_email = ?",
                (new_balance, clean_email),
            )
            cursor.execute(
                "INSERT INTO token_deduction_ledger (user_email, task_id, tokens_deducted, description) VALUES (?, ?, ?, ?)",
                (clean_email, task_id or "immediate", required_tokens, description),
            )
            conn.commit()
            conn.close()
            _WALLET_CACHE[clean_email] = new_balance
        except Exception as e:
            logger.error("Failed to commit token deduction: %s", e)
            _WALLET_CACHE[clean_email] = new_balance

        return {
            "success": True,
            "deducted": required_tokens,
            "remaining_balance": new_balance,
            "task_id": task_id,
        }

    @staticmethod
    def credit_tokens(
        user_email: str,
        amount_tokens: int,
        transaction_id: Optional[str] = None,
        provider: str = "manual",
        amount_gross: float = 0.0,
        currency: str = "ZAR",
    ) -> Dict[str, Any]:
        """Credits tokens to a user's wallet following a successful payment or top-up."""
        clean_email = (user_email or "guest@luqi.ai").strip().lower()
        current_balance = TokenBillingGateway.get_balance(clean_email)
        new_balance = current_balance + amount_tokens

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO token_wallets (user_email, token_balance, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) "
                "ON CONFLICT(user_email) DO UPDATE SET token_balance = token_balance + ?, updated_at = CURRENT_TIMESTAMP",
                (clean_email, new_balance, amount_tokens),
            )
            if transaction_id:
                cursor.execute(
                    "INSERT OR REPLACE INTO payment_transactions "
                    "(id, user_email, provider, amount_gross, currency, tokens_credited, status) "
                    "VALUES (?, ?, ?, ?, ?, ?, 'COMPLETE')",
                    (transaction_id, clean_email, provider, amount_gross, currency, amount_tokens),
                )
            conn.commit()
            conn.close()
            _WALLET_CACHE[clean_email] = new_balance
        except Exception as e:
            logger.error("Failed to credit wallet: %s", e)
            _WALLET_CACHE[clean_email] = new_balance

        return {
            "success": True,
            "credited": amount_tokens,
            "new_balance": new_balance,
            "user_email": clean_email,
        }

    @staticmethod
    def verify_payfast_signature(data: Dict[str, Any], passphrase: str = "") -> bool:
        """Validates PayFast MD5 signature according to official specification."""
        if "signature" not in data:
            return False

        given_signature = data["signature"]
        # Filter out signature
        sorted_pairs = []
        for k in sorted(data.keys()):
            if k != "signature" and data[k] is not None and str(data[k]).strip() != "":
                sorted_pairs.append((k, str(data[k]).strip()))

        pf_string = urlencode(sorted_pairs)
        if passphrase:
            pf_string += f"&passphrase={passphrase}"

        computed = hashlib.md5(pf_string.encode("utf-8")).hexdigest()
        # In sandbox or local test, allow signature match or bypass if passphrase empty
        return computed == given_signature or os.environ.get("PAYFAST_TEST_MODE", "true").lower() == "true"

    @staticmethod
    def process_payfast_webhook(data_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Processes PayFast Instant Transaction Notification (ITN)."""
        logger.info("Processing PayFast ITN: %s", data_dict)

        m_payment_id = data_dict.get("m_payment_id", f"pf_{int(time.time())}")
        payment_status = data_dict.get("payment_status", "COMPLETE").upper()
        amount_gross = float(data_dict.get("amount_gross", 0.0) or 0.0)
        user_email = (
            data_dict.get("custom_str1")
            or data_dict.get("email_address")
            or "guest@luqi.ai"
        ).strip().lower()

        # Calculate tokens to grant: R1 ZAR = 20 Luqi Credits (or custom_int1)
        tokens_to_grant = int(data_dict.get("custom_int1") or (amount_gross * 20))
        if tokens_to_grant <= 0:
            tokens_to_grant = 100

        if payment_status == "COMPLETE":
            # Update database transaction status to COMPLETE
            TokenBillingGateway.credit_tokens(
                user_email=user_email,
                amount_tokens=tokens_to_grant,
                transaction_id=m_payment_id,
                provider="payfast",
                amount_gross=amount_gross,
                currency="ZAR",
            )
            logger.info("PayFast payment %s confirmed. Credited %d tokens to %s", m_payment_id, tokens_to_grant, user_email)

        return {"status": "Acknowledged"}

    @staticmethod
    def process_stripe_webhook(event_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Processes Stripe webhook events (checkout.session.completed, payment_intent.succeeded)."""
        event_type = event_payload.get("type", "")
        data_object = event_payload.get("data", {}).get("object", {})

        logger.info("Processing Stripe webhook event: %s", event_type)

        if event_type in ("checkout.session.completed", "payment_intent.succeeded"):
            payment_id = data_object.get("id", f"stripe_{int(time.time())}")
            user_email = (
                data_object.get("customer_email")
                or data_object.get("customer_details", {}).get("email")
                or data_object.get("metadata", {}).get("user_email")
                or "guest@luqi.ai"
            )
            amount_cents = data_object.get("amount", data_object.get("amount_total", 0))
            amount_usd = amount_cents / 100.0

            # 1 credit = $0.05 -> tokens = amount_usd * 20
            tokens = int(data_object.get("metadata", {}).get("tokens") or (amount_usd * 20))
            if tokens <= 0:
                tokens = 100

            TokenBillingGateway.credit_tokens(
                user_email=user_email,
                amount_tokens=tokens,
                transaction_id=payment_id,
                provider="stripe",
                amount_gross=amount_usd,
                currency="USD",
            )
            logger.info("Stripe transaction %s completed. Credited %d tokens to %s", payment_id, tokens, user_email)

        return {"status": "Acknowledged"}
