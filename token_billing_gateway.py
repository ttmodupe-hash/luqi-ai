"""Retired Python/SQLite wallet and payment compatibility surface.

The former implementation could mint free credits on a read, charge arbitrary
caller-supplied email accounts, acknowledge failed wallet writes, accept unsigned
Stripe events, and bypass PayFast verification with PAYFAST_TEST_MODE defaulting
to true. It used a per-process balance cache and SQLite rather than the
owner-scoped transactional MySQL ledger used by the reviewed Node backend.

NO migration, balance adjustment, or deletion of historical SQLite records is
performed by this module. Actual financial operations require independent
provider signature verification, payment intent reconciliation, idempotency,
authenticated ownership, durable ledger transactions and audit review.

This compatibility facade deliberately has NO env-var bypass or write method.
"""
from typing import Any, Dict, Optional

CREDIT_PRICE_USD = 0.05  # Historical display value; not a current offer.
CREDITS_PER_VIDEO_SECOND = 10  # Historical estimate; not a billable rate.
CREDITS_PER_HEAVY_TASK = 5  # Historical estimate; not a billable rate.
DEFAULT_INITIAL_CREDITS = 0  # No new promotional credits are manufactured.


class LegacyBillingDisabledError(RuntimeError):
    """Unsafe legacy financial operation intentionally unavailable."""


def _unavailable() -> None:
    raise LegacyBillingDisabledError(
        "Legacy Python/SQLite billing is retired. No credits were added, "
        "deducted or verified. Use the authenticated reviewed billing system."
    )


class TokenBillingGateway:
    """Preserves old Python call signatures without allowing money mutations."""

    @staticmethod
    def calculate_task_cost(task_type: str) -> int:
        _unavailable()

    @staticmethod
    def get_balance(user_email: str) -> int:
        _unavailable()

    @staticmethod
    def check_and_deduct_tokens(
        user_email: str,
        required_tokens: int,
        task_id: Optional[str] = None,
        description: str = "Agent task execution",
    ) -> Dict[str, Any]:
        _unavailable()

    @staticmethod
    def credit_tokens(
        user_email: str,
        amount_tokens: int,
        transaction_id: Optional[str] = None,
        provider: str = "manual",
        amount_gross: float = 0.0,
        currency: str = "ZAR",
    ) -> Dict[str, Any]:
        _unavailable()

    @staticmethod
    def verify_payfast_signature(data: Dict[str, Any], passphrase: str = "") -> bool:
        # No signature verification may be inferred from an untrusted payload.
        # A future merchant-configured, settlement-verified payment handler
        # must replace this interface rather than re-enable a test bypass.
        return False

    @staticmethod
    def process_payfast_itn(data_dict: Dict[str, Any]) -> Dict[str, Any]:
        _unavailable()

    @staticmethod
    def process_payfast_webhook(data_dict: Dict[str, Any]) -> Dict[str, Any]:
        _unavailable()

    @staticmethod
    def process_stripe_webhook(event_payload: Dict[str, Any]) -> Dict[str, Any]:
        _unavailable()
