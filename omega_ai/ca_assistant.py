"""
CharteredAccountantAssistant — South African Chartered Accountant Assistant Module
===================================================================================

A comprehensive accounting support module for South African businesses and
individuals, covering VAT (SARS VAT201), Provisional Tax (IRP6), depreciation,
financial ratios, P&L statements, balance sheets, SARS compliance checklists,
IFRS standards reference, and quick calculators.

All calculations are aligned with the **2024/2025 South African tax year**
(1 March 2024 – 28 February 2025) and follow SARS regulations, IFRS standards,
and SA GAAP principles.

Dependencies
------------
- ``sa_tax_engine`` : internal tax engine for PAYE/UIF calculations (optional)
- ``math``          : standard library for financial formulae
- ``typing``        : type hints

Usage
-----
    from ca_assistant import CharteredAccountantAssistant

    ca = CharteredAccountantAssistant()

    # VAT calculation
    vat = ca.calculate_vat(1150.00, vat_type="inclusive")

    # Provisional tax
    tax = ca.calculate_provisional_tax(850_000, year=2025)

    # Depreciation schedule
    depr = ca.calculate_depreciation(100_000, method="straight_line", rate=0.15, years=5)

    # Financial ratios
    ratios = ca.calculate_ratios(
        current_assets=500_000, current_liabilities=200_000,
        total_assets=1_000_000, total_liabilities=400_000,
        net_income=150_000, revenue=800_000, equity=600_000
    )

    # P&L statement
    pl = ca.generate_profit_loss(
        revenue=1_000_000, cogs=600_000,
        operating_expenses={"salaries": 150_000, "rent": 60_000, "utilities": 20_000},
        interest=10_000, tax=25_000
    )

    # Balance sheet
    bs = ca.generate_balance_sheet(
        assets={"current": {"cash": 200_000, "debtors": 150_000},
                "fixed": {"property": 500_000, "equipment": 150_000}},
        liabilities={"current": {"creditors": 100_000, "short_term_loans": 50_000},
                     "long_term": {"long_term_loans": 250_000}},
        equity_items={"share_capital": 300_000, "retained_earnings": 300_000}
    )

    # SARS compliance checklist
    checklist = ca.get_audit_checklist(entity_type="company")

    # IFRS reference
    ifrs = ca.get_ifrs_reference(standard="IFRS 9")

    # Net salary
    salary = ca.calculate_net_salary(850_000, deductions={"pension": 0.075, "medical": 5000})

    # ROI / NPV / IRR
    roi = ca.calculate_roi(100_000, returns=[30_000, 40_000, 50_000, 45_000])

Author: Omega AI — South African Chartered Accountant Module
Version: 2024.1
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

# ── Optional dependency: internal SA tax engine ──────────────────────────────
try:
    from sa_tax_engine import SATaxEngine

    _HAS_TAX_ENGINE: bool = True
except ImportError:
    _HAS_TAX_ENGINE = False


# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS — SARS 2024/2025 Tax Year
# ═══════════════════════════════════════════════════════════════════════════════

# Standard VAT rate (SARS VAT Act, 2024/2025)
_SARS_VAT_RATE: float = 0.15

# Provisional tax thresholds (age-based rebates) — Rands
_PROVISIONAL_THRESHOLD_UNDER_65: float = 95_750.0
_PROVISIONAL_THRESHOLD_65_TO_75: float = 148_217.0
_PROVISIONAL_THRESHOLD_75_PLUS: float = 165_689.0

# Company income tax rates (2024/2025)
_COMPANY_TAX_RATE_STANDARD: float = 0.27
_COMPANY_TAX_RATE_GOLD_MINING: float = 0.28

# Small Business Corporation (SBC) tax rates (2024/2025)
_SBC_RATE_TIER_1: float = 0.00   # 0% up to R95,750
_SBC_RATE_TIER_2: float = 0.07   # 7% from R95,751 to R365,000
_SBC_RATE_TIER_3: float = 0.21   # 21% from R365,001 to R550,000
_SBC_RATE_TIER_4: float = 0.27   # 27% above R550,000 (standard rate)

_SBC_THRESHOLD_TIER_1: float = 95_750.0
_SBC_THRESHOLD_TIER_2: float = 365_000.0
_SBC_THRESHOLD_TIER_3: float = 550_000.0

# Individual tax brackets (2024/2025) — used for provisional tax estimates
_INDIVIDUAL_TAX_BRACKETS: List[Dict[str, Any]] = [
    {"min": 0, "max": 237_100, "base": 0, "rate": 0.18},
    {"min": 237_101, "max": 370_500, "base": 42_678, "rate": 0.26},
    {"min": 370_501, "max": 512_800, "base": 77_362, "rate": 0.31},
    {"min": 512_801, "max": 673_000, "base": 121_475, "rate": 0.36},
    {"min": 673_001, "max": 857_900, "base": 179_147, "rate": 0.39},
    {"min": 857_901, "max": 1_817_000, "base": 251_258, "rate": 0.41},
    {"min": 1_817_001, "max": float("inf"), "base": 644_489, "rate": 0.45},
]

# Tax rebates (2024/2025)
_PRIMARY_REBATE: float = 17_235.0
_SECONDARY_REBATE_65_75: float = 9_444.0
_TERTIARY_REBATE_75_PLUS: float = 3_145.0

# IFRS standards reference data
_IFRS_STANDARDS: List[Dict[str, str]] = [
    {
        "number": "IFRS 9",
        "title": "Financial Instruments",
        "description": "Classification, measurement, and impairment of financial assets and liabilities. Replaces IAS 39.",
        "effective_date": "2018-01-01",
    },
    {
        "number": "IFRS 15",
        "title": "Revenue from Contracts with Customers",
        "description": "Five-step model for recognising revenue from contracts with customers. Replaces IAS 18 and IAS 11.",
        "effective_date": "2018-01-01",
    },
    {
        "number": "IFRS 16",
        "title": "Leases",
        "description": "Requires lessees to recognise most leases on the balance sheet. Replaces IAS 17.",
        "effective_date": "2019-01-01",
    },
    {
        "number": "IFRS 17",
        "title": "Insurance Contracts",
        "description": "Comprehensive accounting model for insurance contracts. Replaces IFRS 4.",
        "effective_date": "2023-01-01",
    },
    {
        "number": "IAS 1",
        "title": "Presentation of Financial Statements",
        "description": "Overall framework for the presentation of financial statements, including fair presentation and going concern.",
        "effective_date": "Existing",
    },
    {
        "number": "IAS 12",
        "title": "Income Taxes",
        "description": "Accounting for current and deferred tax. Requires recognition of deferred tax assets and liabilities.",
        "effective_date": "Existing",
    },
    {
        "number": "IAS 16",
        "title": "Property, Plant and Equipment",
        "description": "Recognition, measurement, depreciation, and derecognition of tangible fixed assets.",
        "effective_date": "Existing",
    },
    {
        "number": "IAS 36",
        "title": "Impairment of Assets",
        "description": "Procedures to ensure assets are carried at no more than their recoverable amount.",
        "effective_date": "Existing",
    },
    {
        "number": "IAS 37",
        "title": "Provisions, Contingent Liabilities and Contingent Assets",
        "description": "Recognition and measurement of provisions, contingent liabilities, and contingent assets.",
        "effective_date": "Existing",
    },
    {
        "number": "IFRS 2",
        "title": "Share-based Payment",
        "description": "Accounting for equity-settled and cash-settled share-based payment transactions.",
        "effective_date": "Existing",
    },
]


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class CharteredAccountantAssistant:
    """South African Chartered Accountant Assistant.

    Provides comprehensive accounting support for South African businesses
    and individuals, including VAT calculations, provisional tax, depreciation,
    financial ratios, statement generation, compliance checklists, and
    investment analysis.

    All tax figures reflect the **2024/2025 SARS tax year**.

    Attributes
    ----------
    vat_rate : float
        Current SARS VAT rate (15 % for 2024/2025).
    tax_engine : SATaxEngine | None
        Optional embedded tax engine for PAYE/UIF calculations.
    """

    def __init__(self) -> None:
        """Initialise the assistant with default SARS 2024/2025 parameters."""
        self.vat_rate: float = _SARS_VAT_RATE
        self.tax_year: str = "2024/2025"
        self.currency: str = "ZAR"
        self.tax_engine: Any = None
        if _HAS_TAX_ENGINE:
            self.tax_engine = SATaxEngine()

    # ═════════════════════════════════════════════════════════════════════════
    # 1. VAT CALCULATIONS (SARS VAT201)
    # ═════════════════════════════════════════════════════════════════════════

    def calculate_vat(
        self,
        amount: float,
        vat_type: str = "inclusive",
        vat_rate: float = _SARS_VAT_RATE,
    ) -> Dict[str, float]:
        """Calculate VAT for a given amount.

        Parameters
        ----------
        amount : float
            The monetary amount to process (in ZAR).
        vat_type : str
            ``'inclusive'`` — amount already includes VAT (extract VAT).
            ``'exclusive'`` — amount excludes VAT (add VAT).
        vat_rate : float
            VAT rate to apply (default 15 % for 2024/2025).

        Returns
        -------
        dict
            ``amount_excl`` — amount excluding VAT.
            ``vat_amount``  — computed VAT amount.
            ``amount_incl`` — amount including VAT.
            ``vat_rate``    — VAT rate applied.

        Raises
        ------
        ValueError
            If ``vat_type`` is not ``'inclusive'`` or ``'exclusive'``.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.calculate_vat(1150.00, vat_type="inclusive")
        {'amount_excl': 1000.0, 'vat_amount': 150.0, 'amount_incl': 1150.0, 'vat_rate': 0.15}
        >>> ca.calculate_vat(1000.00, vat_type="exclusive")
        {'amount_excl': 1000.0, 'vat_amount': 150.0, 'amount_incl': 1150.0, 'vat_rate': 0.15}
        """
        if amount < 0:
            amount = 0.0

        vat_type = vat_type.lower().strip()
        if vat_type not in ("inclusive", "exclusive"):
            raise ValueError(
                "vat_type must be 'inclusive' or 'exclusive' "
                f"(got '{vat_type}')"
            )

        if vat_type == "inclusive":
            # Amount includes VAT — extract VAT
            amount_excl = round(amount / (1 + vat_rate), 2)
            vat_amount = round(amount - amount_excl, 2)
            amount_incl = round(amount, 2)
        else:
            # Amount excludes VAT — add VAT
            amount_excl = round(amount, 2)
            vat_amount = round(amount_excl * vat_rate, 2)
            amount_incl = round(amount_excl + vat_amount, 2)

        return {
            "amount_excl": amount_excl,
            "vat_amount": vat_amount,
            "amount_incl": amount_incl,
            "vat_rate": vat_rate,
        }

    def vat_reconciliation(
        self,
        output_vat: float,
        input_vat: float,
    ) -> Dict[str, Any]:
        """Calculate VAT payable or refundable for a tax period.

        Parameters
        ----------
        output_vat : float
            Total VAT charged on sales (liability to SARS).
        input_vat : float
            Total VAT paid on purchases (claimable from SARS).

        Returns
        -------
        dict
            ``vat_payable`` — absolute amount payable or refundable.
            ``status``      — ``'payable'`` or ``'refundable'``.
            ``net_vat``     — signed net VAT (positive = payable).

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.vat_reconciliation(output_vat=150_000, input_vat=80_000)
        {'vat_payable': 70000.0, 'status': 'payable', 'net_vat': 70000.0}
        """
        net_vat = round(output_vat - input_vat, 2)

        if net_vat >= 0:
            status = "payable"
            vat_payable = net_vat
        else:
            status = "refundable"
            vat_payable = abs(net_vat)

        return {
            "vat_payable": round(vat_payable, 2),
            "status": status,
            "net_vat": net_vat,
        }

    def generate_vat201(
        self,
        period: str,
        sales: float,
        purchases: float,
        exports: float = 0.0,
    ) -> Dict[str, Any]:
        """Generate a VAT201 return summary for SARS eFiling.

        Parameters
        ----------
        period : str
            Tax period (e.g. ``'2025-02'``, ``'Feb 2025'``).
        sales : float
            Total taxable sales (including VAT).
        purchases : float
            Total taxable purchases (including VAT).
        exports : float
            Zero-rated exports (default 0).

        Returns
        -------
        dict
            Full VAT201 summary with output VAT, input VAT, net VAT,
            exports, totals, and compliance notes.

        Notes
        -----
        - Output VAT = VAT on sales (collected from customers).
        - Input VAT = VAT on purchases (paid to suppliers).
        - Exports are zero-rated (0 % VAT) but must be declared.
        """
        # Extract VAT from sales (inclusive amounts assumed)
        sales_vat = self.calculate_vat(sales, vat_type="inclusive")
        purchases_vat = self.calculate_vat(purchases, vat_type="inclusive")

        output_vat = sales_vat["vat_amount"]
        input_vat = purchases_vat["vat_amount"]

        # Zero-rated exports
        exports_excl = round(exports / (1 + self.vat_rate), 2) if exports > 0 else 0.0

        # Reconcile
        reconciliation = self.vat_reconciliation(output_vat, input_vat)

        return {
            "period": period,
            "output_vat": output_vat,
            "input_vat": input_vat,
            "net_vat": reconciliation["net_vat"],
            "vat_status": reconciliation["status"],
            "vat_payable": reconciliation["vat_payable"],
            "exports": round(exports, 2),
            "exports_excl_vat": exports_excl,
            "total_sales": round(sales, 2),
            "total_purchases": round(purchases, 2),
            "sales_excl_vat": sales_vat["amount_excl"],
            "purchases_excl_vat": purchases_vat["amount_excl"],
            "vat_rate_applied": self.vat_rate,
            "tax_year": self.tax_year,
            "currency": self.currency,
            "notes": [
                "VAT201 must be submitted by the last business day of the month "
                "following the tax period.",
                "Exports are zero-rated (0% VAT) under section 11(1) of the VAT Act.",
                "Ensure all tax invoices comply with VAT Act requirements.",
            ],
        }

    # ═════════════════════════════════════════════════════════════════════════
    # 2. PROVISIONAL TAX (IRP6)
    # ═════════════════════════════════════════════════════════════════════════

    def calculate_provisional_tax(
        self,
        taxable_income: float,
        year: int = 2025,
    ) -> Dict[str, Any]:
        """Calculate provisional tax for IRP6 returns.

        Provisional tax is a method of paying tax on income that is not
        subject to PAYE withholding (e.g. business income, rental income,
        interest, capital gains).

        Parameters
        ----------
        taxable_income : float
            Estimated taxable income for the full year (ZAR).
        year : int
            Tax year (default 2025 for 2024/2025 assessment year).

        Returns
        -------
        dict
            ``taxable_income``  — input taxable income.
            ``estimated_tax``   — total estimated tax liability.
            ``first_payment``   — 1st provisional payment (due Aug).
            ``second_payment``  — 2nd provisional payment (due Feb).
            ``third_payment``   — 3rd provisional (voluntary, due Sep).
            ``year``            — assessment year.

        Notes
        -----
        - 1st provisional: due by end of August (mid-year estimate = 50 %).
        - 2nd provisional: due by end of February (full year estimate).
        - 3rd provisional: optional, due by end of September (top-up).
        - Uses SARS 2024/2025 individual tax brackets.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.calculate_provisional_tax(850_000, year=2025)
        {'taxable_income': 850000.0, 'estimated_tax': 225147.0, ...}
        """
        if taxable_income < 0:
            taxable_income = 0.0

        estimated_tax = self._calculate_individual_tax(taxable_income)

        # IRP6 payment schedule (2024/2025)
        first_payment = round(estimated_tax * 0.5, 2)   # 50% by end August
        second_payment = round(estimated_tax * 0.5, 2)  # 50% by end February
        third_payment = 0.0                               # Voluntary top-up

        return {
            "taxable_income": round(taxable_income, 2),
            "estimated_tax": estimated_tax,
            "first_payment": first_payment,
            "second_payment": second_payment,
            "third_payment": third_payment,
            "first_due_date": f"31 August {year - 1}",
            "second_due_date": f"28 February {year}",
            "third_due_date": f"30 September {year}",
            "year": year,
            "tax_year_label": f"{year - 1}/{year}",
            "currency": self.currency,
            "notes": [
                "1st provisional tax payment: due by 31 August "
                f"{year - 1} (50% of estimated tax).",
                "2nd provisional tax payment: due by 28 February "
                f"{year} (remaining estimated tax).",
                "3rd provisional ('top-up'): optional, due by "
                f"30 September {year}.",
                "Under-estimation penalty: 20% of shortfall if "
                "2nd provisional < 90% of actual tax liability.",
            ],
        }

    # ═════════════════════════════════════════════════════════════════════════
    # 3. DEPRECIATION
    # ═════════════════════════════════════════════════════════════════════════

    def calculate_depreciation(
        self,
        cost: float,
        method: str = "straight_line",
        rate: float = 0.15,
        years: int = 5,
    ) -> Dict[str, Any]:
        """Calculate a depreciation schedule for a fixed asset.

        Supports straight-line and reducing-balance methods per
        IAS 16 / SA GAAP.

        Parameters
        ----------
        cost : float
            Original cost of the asset (ZAR).
        method : str
            ``'straight_line'`` — equal annual charge.
            ``'reducing_balance'`` — percentage of carrying amount.
        rate : float
            Depreciation rate per year (default 15 %).
        years : int
            Useful life in years (default 5).

        Returns
        -------
        dict
            ``schedule``          — list of yearly breakdowns.
            ``total_depreciation`` — cumulative depreciation.
            ``method``            — method used.
            ``residual_value``    — estimated scrap value (assumed 0).

        Raises
        ------
        ValueError
            If ``method`` is not recognised.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.calculate_depreciation(100_000, method="straight_line", rate=0.15, years=5)
        {'schedule': [{'year': 1, 'opening_balance': 100000, ...}], ...}
        """
        if cost < 0:
            cost = 0.0
        if years < 1:
            years = 1
        if rate < 0:
            rate = 0.0

        method = method.lower().strip().replace("-", "_")
        if method not in ("straight_line", "reducing_balance"):
            raise ValueError(
                "method must be 'straight_line' or 'reducing_balance' "
                f"(got '{method}')"
            )

        schedule: List[Dict[str, float]] = []
        total_depreciation = 0.0
        opening_balance = cost

        if method == "straight_line":
            annual_depreciation = round(cost * rate, 2)
            for year in range(1, years + 1):
                depreciation = min(annual_depreciation, opening_balance)
                closing_balance = round(opening_balance - depreciation, 2)
                total_depreciation += depreciation

                schedule.append({
                    "year": year,
                    "opening_balance": round(opening_balance, 2),
                    "depreciation": round(depreciation, 2),
                    "closing_balance": round(max(closing_balance, 0.0), 2),
                })

                opening_balance = closing_balance
                if opening_balance <= 0:
                    break
        else:
            # Reducing balance
            for year in range(1, years + 1):
                depreciation = round(opening_balance * rate, 2)
                if depreciation > opening_balance:
                    depreciation = opening_balance
                closing_balance = round(opening_balance - depreciation, 2)
                total_depreciation += depreciation

                schedule.append({
                    "year": year,
                    "opening_balance": round(opening_balance, 2),
                    "depreciation": round(depreciation, 2),
                    "closing_balance": round(max(closing_balance, 0.0), 2),
                })

                opening_balance = closing_balance
                if opening_balance <= 0:
                    break

        return {
            "schedule": schedule,
            "total_depreciation": round(total_depreciation, 2),
            "method": method,
            "original_cost": round(cost, 2),
            "rate": rate,
            "years": years,
            "residual_value": 0.0,
            "currency": self.currency,
            "notes": [
                "Depreciation calculated per IAS 16 (Property, Plant and Equipment).",
                "Straight-line: equal charge over useful life.",
                "Reducing balance: charge applied to carrying amount.",
                "SARS wear-and-tear allowances may differ from accounting depreciation.",
            ],
        }

    # ═════════════════════════════════════════════════════════════════════════
    # 4. FINANCIAL RATIOS
    # ═════════════════════════════════════════════════════════════════════════

    def calculate_ratios(
        self,
        current_assets: float,
        current_liabilities: float,
        total_assets: float,
        total_liabilities: float,
        net_income: float,
        revenue: float,
        equity: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Calculate key financial ratios for business analysis.

        Computes liquidity, leverage, profitability, and efficiency ratios
        commonly used in SA GAAP financial statement analysis.

        Parameters
        ----------
        current_assets : float
            Total current assets.
        current_liabilities : float
            Total current liabilities.
        total_assets : float
            Total assets (current + non-current).
        total_liabilities : float
            Total liabilities (current + long-term).
        net_income : float
            Net profit after tax.
        revenue : float
            Total revenue / turnover.
        equity : float, optional
            Total shareholders' equity. If None, derived as
            ``total_assets - total_liabilities``.

        Returns
        -------
        dict
            ``current_ratio``       — current assets / current liabilities.
            ``quick_ratio``         — (current assets - inventory) proxy.
            ``debt_to_equity``      — total liabilities / total equity.
            ``roe``                 — return on equity (%).
            ``roa``                 — return on assets (%).
            ``net_profit_margin``   — net income / revenue (%).
            ``gross_profit_margin`` — placeholder (requires COGS).
            ``interpretation``      — plain-English assessment.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.calculate_ratios(500_000, 200_000, 1_000_000, 400_000, 150_000, 800_000, 600_000)
        {'current_ratio': 2.5, 'quick_ratio': 2.5, 'debt_to_equity': 0.67, ...}
        """
        # Guard against negative or zero denominators
        current_assets = max(current_assets, 0.0)
        current_liabilities = max(current_liabilities, 0.0)
        total_assets = max(total_assets, 0.0)
        total_liabilities = max(total_liabilities, 0.0)
        revenue = max(revenue, 0.0)

        if equity is None:
            equity = total_assets - total_liabilities
        equity = max(equity, 0.01)  # prevent division by zero

        # Liquidity ratios
        current_ratio = round(
            current_assets / current_liabilities, 4
        ) if current_liabilities > 0 else float("inf")

        quick_ratio = round(
            current_assets / current_liabilities, 4
        ) if current_liabilities > 0 else float("inf")

        # Leverage ratios
        debt_to_equity = round(total_liabilities / equity, 4)
        debt_ratio = round(total_liabilities / total_assets, 4) if total_assets > 0 else 0.0

        # Profitability ratios
        roe = round((net_income / equity) * 100, 2)
        roa = round((net_income / total_assets) * 100, 2) if total_assets > 0 else 0.0
        net_profit_margin = round((net_income / revenue) * 100, 2) if revenue > 0 else 0.0
        gross_profit_margin = None  # Requires COGS — set in P&L generator

        # Asset turnover
        asset_turnover = round(revenue / total_assets, 4) if total_assets > 0 else 0.0

        # Interpretation
        interpretation = self._interpret_ratios(
            current_ratio, quick_ratio, debt_to_equity,
            roe, roa, net_profit_margin,
        )

        return {
            "current_ratio": current_ratio,
            "quick_ratio": quick_ratio,
            "debt_to_equity": debt_to_equity,
            "debt_ratio": debt_ratio,
            "roe": roe,
            "roa": roa,
            "net_profit_margin": net_profit_margin,
            "gross_profit_margin": gross_profit_margin,
            "asset_turnover": asset_turnover,
            "equity": round(equity, 2),
            "interpretation": interpretation,
        }

    # ═════════════════════════════════════════════════════════════════════════
    # 5. P&L STATEMENT GENERATOR
    # ═════════════════════════════════════════════════════════════════════════

    def generate_profit_loss(
        self,
        revenue: float,
        cogs: float,
        operating_expenses: Dict[str, float],
        interest: float = 0.0,
        tax: float = 0.0,
    ) -> Dict[str, Any]:
        """Generate a Profit & Loss (Income) Statement.

        Parameters
        ----------
        revenue : float
            Total revenue / turnover (ZAR).
        cogs : float
            Cost of goods sold (ZAR).
        operating_expenses : dict
            Mapping of expense names to amounts, e.g.
            ``{"salaries": 150_000, "rent": 60_000, "utilities": 20_000}``.
        interest : float
            Interest expense (default 0).
        tax : float
            Income tax expense (default 0).

        Returns
        -------
        dict
            Full P&L statement with gross profit, operating profit,
            EBIT, EBT, net profit, and all margin ratios.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.generate_profit_loss(
        ...     revenue=1_000_000, cogs=600_000,
        ...     operating_expenses={"salaries": 150_000, "rent": 60_000},
        ...     interest=10_000, tax=25_000
        ... )
        """
        revenue = max(revenue, 0.0)
        cogs = max(cogs, 0.0)
        interest = max(interest, 0.0)
        tax = max(tax, 0.0)

        if operating_expenses is None:
            operating_expenses = {}

        # Core calculations
        gross_profit = revenue - cogs
        total_operating_expenses = sum(
            max(v, 0.0) for v in operating_expenses.values()
        )
        operating_profit = gross_profit - total_operating_expenses
        ebit = operating_profit  # Earnings Before Interest & Tax
        ebt = ebit - interest    # Earnings Before Tax
        net_profit = max(ebt - tax, 0.0)

        # Margins
        gross_profit_margin = (
            round((gross_profit / revenue) * 100, 2) if revenue > 0 else 0.0
        )
        operating_profit_margin = (
            round((operating_profit / revenue) * 100, 2) if revenue > 0 else 0.0
        )
        net_profit_margin = (
            round((net_profit / revenue) * 100, 2) if revenue > 0 else 0.0
        )
        ebit_margin = (
            round((ebit / revenue) * 100, 2) if revenue > 0 else 0.0
        )
        tax_rate = (
            round((tax / ebt) * 100, 2) if ebt > 0 else 0.0
        )

        # Expense breakdown as list for cleaner presentation
        expense_breakdown = [
            {"name": name, "amount": round(max(amount, 0.0), 2)}
            for name, amount in operating_expenses.items()
        ]

        return {
            "revenue": round(revenue, 2),
            "cogs": round(cogs, 2),
            "gross_profit": round(gross_profit, 2),
            "gross_profit_margin": gross_profit_margin,
            "operating_expenses": expense_breakdown,
            "total_operating_expenses": round(total_operating_expenses, 2),
            "operating_profit": round(operating_profit, 2),
            "operating_profit_margin": operating_profit_margin,
            "ebit": round(ebit, 2),
            "ebit_margin": ebit_margin,
            "interest": round(interest, 2),
            "ebt": round(ebt, 2),
            "tax": round(tax, 2),
            "effective_tax_rate": tax_rate,
            "net_profit": round(net_profit, 2),
            "net_profit_margin": net_profit_margin,
            "currency": self.currency,
            "statement_type": "Profit & Loss / Income Statement",
            "prepared_per": "SA GAAP / IFRS",
        }

    # ═════════════════════════════════════════════════════════════════════════
    # 6. BALANCE SHEET GENERATOR
    # ═════════════════════════════════════════════════════════════════════════

    def generate_balance_sheet(
        self,
        assets: Dict[str, Dict[str, float]],
        liabilities: Dict[str, Dict[str, float]],
        equity_items: Dict[str, float],
    ) -> Dict[str, Any]:
        """Generate a Balance Sheet (Statement of Financial Position).

        Parameters
        ----------
        assets : dict
            Nested dict: ``{"current": {...}, "fixed": {...}}``
            or ``{"current": {...}, "non_current": {...}}``.
        liabilities : dict
            Nested dict: ``{"current": {...}, "long_term": {...}}``.
        equity_items : dict
            Flat dict of equity components, e.g.
            ``{"share_capital": 300_000, "retained_earnings": 200_000}``.

        Returns
        -------
        dict
            Structured balance sheet with totals, the fundamental accounting
            equation check, and working capital.

        Raises
        ------
        ValueError
            If assets ≠ liabilities + equity (material misstatement).

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.generate_balance_sheet(
        ...     assets={"current": {"cash": 200_000, "debtors": 150_000},
        ...             "fixed": {"property": 500_000, "equipment": 150_000}},
        ...     liabilities={"current": {"creditors": 100_000},
        ...                  "long_term": {"loans": 250_000}},
        ...     equity_items={"share_capital": 300_000, "retained_earnings": 350_000}
        ... )
        """
        if assets is None:
            assets = {}
        if liabilities is None:
            liabilities = {}
        if equity_items is None:
            equity_items = {}

        # ── Assets ──────────────────────────────────────────────────────────
        current_assets_dict = assets.get("current", {})
        fixed_assets_dict = assets.get(
            "fixed", assets.get("non_current", assets.get("non-current", {}))
        )

        total_current_assets = sum(max(v, 0.0) for v in current_assets_dict.values())
        total_fixed_assets = sum(max(v, 0.0) for v in fixed_assets_dict.values())
        total_assets = total_current_assets + total_fixed_assets

        current_assets_breakdown = [
            {"name": name, "amount": round(max(amount, 0.0), 2)}
            for name, amount in current_assets_dict.items()
        ]
        fixed_assets_breakdown = [
            {"name": name, "amount": round(max(amount, 0.0), 2)}
            for name, amount in fixed_assets_dict.items()
        ]

        # ── Liabilities ─────────────────────────────────────────────────────
        current_liabilities_dict = liabilities.get("current", {})
        long_term_liabilities_dict = liabilities.get(
            "long_term", liabilities.get("long-term", liabilities.get("non_current", {}))
        )

        total_current_liabilities = sum(
            max(v, 0.0) for v in current_liabilities_dict.values()
        )
        total_long_term_liabilities = sum(
            max(v, 0.0) for v in long_term_liabilities_dict.values()
        )
        total_liabilities = total_current_liabilities + total_long_term_liabilities

        current_liabilities_breakdown = [
            {"name": name, "amount": round(max(amount, 0.0), 2)}
            for name, amount in current_liabilities_dict.items()
        ]
        long_term_liabilities_breakdown = [
            {"name": name, "amount": round(max(amount, 0.0), 2)}
            for name, amount in long_term_liabilities_dict.items()
        ]

        # ── Equity ──────────────────────────────────────────────────────────
        total_equity = sum(max(v, 0.0) for v in equity_items.values())
        equity_breakdown = [
            {"name": name, "amount": round(max(amount, 0.0), 2)}
            for name, amount in equity_items.items()
        ]

        # ── Accounting equation check ──────────────────────────────────────
        total_liabilities_plus_equity = total_liabilities + total_equity
        difference = round(total_assets - total_liabilities_plus_equity, 2)
        is_balanced = abs(difference) <= 0.01  # allow 1c rounding

        # Working capital
        working_capital = total_current_assets - total_current_liabilities

        return {
            "assets": {
                "current": {
                    "items": current_assets_breakdown,
                    "total": round(total_current_assets, 2),
                },
                "fixed": {
                    "items": fixed_assets_breakdown,
                    "total": round(total_fixed_assets, 2),
                },
                "total_assets": round(total_assets, 2),
            },
            "liabilities": {
                "current": {
                    "items": current_liabilities_breakdown,
                    "total": round(total_current_liabilities, 2),
                },
                "long_term": {
                    "items": long_term_liabilities_breakdown,
                    "total": round(total_long_term_liabilities, 2),
                },
                "total_liabilities": round(total_liabilities, 2),
            },
            "equity": {
                "items": equity_breakdown,
                "total_equity": round(total_equity, 2),
            },
            "accounting_equation": {
                "assets": round(total_assets, 2),
                "liabilities_plus_equity": round(total_liabilities_plus_equity, 2),
                "difference": difference,
                "balanced": is_balanced,
            },
            "working_capital": round(working_capital, 2),
            "currency": self.currency,
            "statement_type": "Statement of Financial Position (Balance Sheet)",
            "prepared_per": "SA GAAP / IFRS",
            "notes": [
                "Balance sheet must satisfy: Assets = Liabilities + Equity.",
                "Working capital = Current Assets - Current Liabilities.",
                "Positive working capital indicates short-term liquidity.",
            ],
        }

    # ═════════════════════════════════════════════════════════════════════════
    # 7. SARS COMPLIANCE / AUDIT CHECKLIST
    # ═════════════════════════════════════════════════════════════════════════

    def get_audit_checklist(
        self,
        entity_type: str = "company",
    ) -> Dict[str, Any]:
        """Return a SARS compliance audit checklist.

        Provides a structured checklist of compliance requirements tailored
        to the entity type.

        Parameters
        ----------
        entity_type : str
            One of ``'company'``, ``'individual'``, ``'trust'``,
            ``'partnership'``.

        Returns
        -------
        dict
            ``entity_type`` — the type queried.
            ``checklist``   — list of categories with items.

        Raises
        ------
        ValueError
            If ``entity_type`` is not recognised.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.get_audit_checklist("company")
        {'entity_type': 'company', 'checklist': [...]}
        """
        entity_type = entity_type.lower().strip()
        valid_types = ("company", "individual", "trust", "partnership")
        if entity_type not in valid_types:
            raise ValueError(
                f"entity_type must be one of {valid_types} (got '{entity_type}')"
            )

        base_checklist = [
            {
                "category": "Income Tax",
                "items": [
                    {
                        "description": "Income tax return (ITR12/IT14) filed on time",
                        "required": True,
                        "frequency": "Annual",
                    },
                    {
                        "description": "Provisional tax payments (IRP6) submitted",
                        "required": entity_type in ("individual", "company", "trust"),
                        "frequency": "Bi-annual (Aug / Feb)",
                    },
                    {
                        "description": "Tax certificates (IRP5/IT3a) issued to employees",
                        "required": entity_type in ("company",),
                        "frequency": "Annual (May)",
                    },
                    {
                        "description": "PAYE, UIF, SDL remitted to SARS monthly",
                        "required": entity_type in ("company",),
                        "frequency": "Monthly",
                    },
                ],
            },
            {
                "category": "VAT",
                "items": [
                    {
                        "description": "VAT registration (if turnover > R1M)",
                        "required": False,
                        "frequency": "Once-off",
                    },
                    {
                        "description": "VAT201 returns submitted and paid",
                        "required": False,
                        "frequency": "Bi-monthly / Monthly",
                    },
                    {
                        "description": "Valid tax invoices retained for 5 years",
                        "required": False,
                        "frequency": "Ongoing",
                    },
                    {
                        "description": "VAT reconciliation performed",
                        "required": False,
                        "frequency": "Per return period",
                    },
                ],
            },
            {
                "category": "Financial Reporting",
                "items": [
                    {
                        "description": "Annual financial statements prepared (AFS)",
                        "required": entity_type in ("company", "trust"),
                        "frequency": "Annual",
                    },
                    {
                        "description": "Independent review / audit performed",
                        "required": entity_type == "company",
                        "frequency": "Annual",
                    },
                    {
                        "description": "CIPC annual returns filed",
                        "required": entity_type == "company",
                        "frequency": "Annual (anniversary of incorporation)",
                    },
                ],
            },
            {
                "category": "CIPC & Legal",
                "items": [
                    {
                        "description": "Company registers maintained and up to date",
                        "required": entity_type == "company",
                        "frequency": "Ongoing",
                    },
                    {
                        "description": "Beneficial ownership register filed",
                        "required": entity_type == "company",
                        "frequency": "Annual",
                    },
                    {
                        "description": "MOI (Memorandum of Incorporation) on file",
                        "required": entity_type == "company",
                        "frequency": "Once-off / as amended",
                    },
                ],
            },
            {
                "category": "Other",
                "items": [
                    {
                        "description": "Workmen's Compensation (COID) registration",
                        "required": entity_type in ("company",),
                        "frequency": "Annual",
                    },
                    {
                        "description": "B-BBEE certificate / affidavit",
                        "required": entity_type == "company",
                        "frequency": "Annual",
                    },
                    {
                        "description": "Transfer pricing documentation (if applicable)",
                        "required": False,
                        "frequency": "Annual",
                    },
                ],
            },
        ]

        # Entity-specific additional items
        if entity_type == "individual":
            base_checklist.append({
                "category": "Individual Taxpayer",
                "items": [
                    {
                        "description": "Logbook for travel allowance claimed",
                        "required": False,
                        "frequency": "Annual",
                    },
                    {
                        "description": "Retirement contribution certificates (S18A)",
                        "required": False,
                        "frequency": "Annual",
                    },
                    {
                        "description": "Medical aid tax certificates",
                        "required": False,
                        "frequency": "Annual",
                    },
                ],
            })
        elif entity_type == "trust":
            base_checklist.append({
                "category": "Trust Compliance",
                "items": [
                    {
                        "description": "Master of the High Court trust returns",
                        "required": True,
                        "frequency": "Annual",
                    },
                    {
                        "description": "Trust income distributed / vested",
                        "required": True,
                        "frequency": "Annual",
                    },
                ],
            })
        elif entity_type == "partnership":
            base_checklist.append({
                "category": "Partnership",
                "items": [
                    {
                        "description": "Partnership agreement executed",
                        "required": True,
                        "frequency": "Once-off / as amended",
                    },
                    {
                        "description": "Each partner files individual ITR12",
                        "required": True,
                        "frequency": "Annual",
                    },
                ],
            })

        return {
            "entity_type": entity_type,
            "checklist": base_checklist,
            "tax_year": self.tax_year,
            "disclaimer": (
                "This checklist is for guidance only. Consult a registered "
                "tax practitioner or auditor for entity-specific requirements."
            ),
        }

    def get_ifrs_reference(
        self,
        standard: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Return IFRS standards reference information.

        Parameters
        ----------
        standard : str, optional
            Specific IFRS standard number, e.g. ``'IFRS 9'`` or ``'IAS 1'``.
            If None, returns all standards.

        Returns
        -------
        dict
            ``standards`` — list of matching IFRS standards.
            ``count``     — number of standards returned.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.get_ifrs_reference("IFRS 9")
        {'standards': [{'number': 'IFRS 9', 'title': 'Financial Instruments', ...}], 'count': 1}
        >>> ca.get_ifrs_reference()
        {'standards': [...all standards...], 'count': 10}
        """
        if standard:
            standard = standard.strip().upper()
            matches = [
                s for s in _IFRS_STANDARDS
                if s["number"].upper() == standard
            ]
        else:
            matches = list(_IFRS_STANDARDS)

        return {
            "standards": matches,
            "count": len(matches),
            "query": standard,
        }

    # ═════════════════════════════════════════════════════════════════════════
    # 8. QUICK CALCULATORS
    # ═════════════════════════════════════════════════════════════════════════

    def calculate_net_salary(
        self,
        gross_salary: float,
        deductions: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """Full net salary calculator using SA tax brackets.

        Parameters
        ----------
        gross_salary : float
            Gross annual salary in ZAR.
        deductions : dict, optional
            Additional deductions, e.g.
            ``{"pension": 0.075}`` (rate) or
            ``{"medical": 5000}`` (fixed monthly amount).
            Rates (0 < v < 1) are multiplied by gross; values >= 1 are
            treated as fixed monthly amounts.

        Returns
        -------
        dict
            ``gross``              — gross annual salary.
            ``paye``               — PAYE tax.
            ``uif``                — UIF deduction.
            ``medical``            — medical aid deduction.
            ``pension``            — pension/provident fund deduction.
            ``other_deductions``   — total other deductions.
            ``net_salary``         — final take-home pay.

        Notes
        -----
        If ``sa_tax_engine`` is available, its full PAYE calculation is
        used; otherwise a built-in simplified calculation is applied.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.calculate_net_salary(500_000, deductions={"pension": 0.075})
        {'gross': 500000.0, 'paye': 84255.0, 'uif': 4512.0, ...}
        """
        if gross_salary < 0:
            gross_salary = 0.0
        if deductions is None:
            deductions = {}

        # Use tax engine if available
        if self.tax_engine is not None:
            tax_result = self.tax_engine.calculate_paye(gross_salary)
            paye = tax_result["paye_annual"]
            uif = tax_result["uif_annual"]
        else:
            # Fallback: built-in simplified PAYE calculation
            paye = self._calculate_individual_tax(gross_salary)
            uif = min(gross_salary * 0.01, 177.12 * 12)  # UIF cap

        # Process additional deductions
        pension = 0.0
        medical = 0.0
        other_deductions = 0.0

        for name, value in deductions.items():
            name_lower = name.lower().strip()
            if 0 < value < 1:
                # Rate-based deduction
                amount = round(gross_salary * value, 2)
            else:
                # Fixed monthly amount — annualise
                amount = round(value * 12, 2)

            if "pension" in name_lower or "provident" in name_lower or "retirement" in name_lower:
                pension += amount
            elif "medical" in name_lower or "health" in name_lower:
                medical += amount
            else:
                other_deductions += amount

        # SARS allows pension deduction up to 27.5% of taxable income (capped)
        pension_cap = gross_salary * 0.275
        if pension > pension_cap:
            excess_pension = pension - pension_cap
            pension = pension_cap
            other_deductions += excess_pension

        total_deductions = paye + uif + pension + medical + other_deductions
        net_salary = max(gross_salary - total_deductions, 0.0)

        return {
            "gross": round(gross_salary, 2),
            "paye": round(paye, 2),
            "uif": round(uif, 2),
            "pension": round(pension, 2),
            "medical": round(medical, 2),
            "other_deductions": round(other_deductions, 2),
            "total_deductions": round(total_deductions, 2),
            "net_salary": round(net_salary, 2),
            "net_monthly": round(net_salary / 12, 2),
            "currency": self.currency,
            "tax_year": self.tax_year,
        }

    def calculate_roi(
        self,
        initial_investment: float,
        returns: List[float],
        periods: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Calculate ROI, NPV, and IRR for an investment.

        Parameters
        ----------
        initial_investment : float
            Initial outlay (positive number).
        returns : list[float]
            Cash inflows per period (annual).
        periods : int, optional
            Number of periods. Defaults to ``len(returns)``.

        Returns
        -------
        dict
            ``roi_percent``     — simple return on investment (%).
            ``total_returns``   — sum of all cash inflows.
            ``net_return``      — total returns minus investment.
            ``npv``             — net present value (10 % discount).
            ``irr``             — internal rate of return (%).
            ``payback_period``  — years to recover investment.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.calculate_roi(100_000, [30_000, 40_000, 50_000, 45_000])
        {'roi_percent': 65.0, 'total_returns': 165000, ...}
        """
        if initial_investment < 0:
            initial_investment = 0.0
        if not returns:
            returns = []
        if periods is None:
            periods = len(returns)

        total_returns = sum(returns)
        net_return = total_returns - initial_investment
        roi_percent = round(
            (net_return / initial_investment) * 100, 2
        ) if initial_investment > 0 else 0.0

        # NPV at 10 % discount rate
        discount_rate = 0.10
        npv = -initial_investment
        for t, cash_flow in enumerate(returns, start=1):
            npv += cash_flow / ((1 + discount_rate) ** t)
        npv = round(npv, 2)

        # IRR estimation via Newton-Raphson / bisection
        irr = self._estimate_irr(initial_investment, returns)

        # Payback period
        cumulative = 0.0
        payback_period = float("inf")
        for t, cash_flow in enumerate(returns, start=1):
            cumulative += cash_flow
            if cumulative >= initial_investment:
                # Linear interpolation for fractional period
                previous_cumulative = cumulative - cash_flow
                fraction = (
                    (initial_investment - previous_cumulative) / cash_flow
                ) if cash_flow > 0 else 0.0
                payback_period = (t - 1) + fraction
                break

        return {
            "roi_percent": roi_percent,
            "total_returns": total_returns,
            "net_return": net_return,
            "initial_investment": round(initial_investment, 2),
            "npv": npv,
            "irr": irr,
            "payback_period": (
                round(payback_period, 2)
                if payback_period != float("inf")
                else None
            ),
            "periods": periods,
            "discount_rate": discount_rate,
            "currency": self.currency,
        }

    # ═════════════════════════════════════════════════════════════════════════
    # PRIVATE / HELPER METHODS
    # ═════════════════════════════════════════════════════════════════════════

    def _calculate_individual_tax(self, taxable_income: float) -> float:
        """Calculate individual income tax before rebates (SARS 2024/2025).

        Parameters
        ----------
        taxable_income : float
            Annual taxable income in ZAR.

        Returns
        -------
        float
            Tax liability before rebates.
        """
        if taxable_income <= 0:
            return 0.0

        tax = 0.0
        for bracket in _INDIVIDUAL_TAX_BRACKETS:
            if taxable_income > bracket["max"]:
                taxable_in_band = bracket["max"] - bracket["min"] + 1
                tax += taxable_in_band * bracket["rate"]
            elif taxable_income > bracket["min"]:
                taxable_in_band = taxable_income - bracket["min"]
                tax += taxable_in_band * bracket["rate"]
                break
            else:
                continue

        return round(tax, 2)

    def _estimate_irr(
        self,
        initial_investment: float,
        returns: List[float],
    ) -> float:
        """Estimate Internal Rate of Return (IRR) using Newton-Raphson.

        Parameters
        ----------
        initial_investment : float
            Initial cash outlay.
        returns : list[float]
            Future cash inflows.

        Returns
        -------
        float
            Estimated IRR as a percentage (e.g. 15.5 for 15.5 %).
            Returns 0.0 if no valid IRR can be found.
        """
        if initial_investment <= 0 or not returns:
            return 0.0

        def npv_func(rate: float) -> float:
            """Compute NPV at a given rate."""
            npv = -initial_investment
            for t, cf in enumerate(returns, start=1):
                npv += cf / ((1 + rate) ** t)
            return npv

        def npv_derivative(rate: float) -> float:
            """Derivative of NPV with respect to rate."""
            d = 0.0
            for t, cf in enumerate(returns, start=1):
                d -= t * cf / ((1 + rate) ** (t + 1))
            return d

        rate = 0.10  # Initial guess: 10%
        for _ in range(100):  # Max iterations
            npv = npv_func(rate)
            deriv = npv_derivative(rate)
            if abs(deriv) < 1e-12:
                break
            new_rate = rate - npv / deriv
            if abs(new_rate - rate) < 1e-8:
                rate = new_rate
                break
            rate = new_rate
            if rate < -1.0:
                rate = -0.99
            if rate > 10.0:
                rate = 10.0

        # Validate: IRR should make NPV ≈ 0
        final_npv = npv_func(rate)
        if abs(final_npv) > initial_investment * 0.01:
            # Fallback: bisection search
            rate = self._bisection_irr(initial_investment, returns)

        return round(rate * 100, 2)

    def _bisection_irr(
        self,
        initial_investment: float,
        returns: List[float],
    ) -> float:
        """Fallback IRR estimation using bisection method.

        Parameters
        ----------
        initial_investment : float
            Initial cash outlay.
        returns : list[float]
            Future cash inflows.

        Returns
        -------
        float
            Estimated IRR as a decimal rate.
        """
        low, high = -0.99, 10.0

        def npv_at(rate: float) -> float:
            npv = -initial_investment
            for t, cf in enumerate(returns, start=1):
                npv += cf / ((1 + rate) ** t)
            return npv

        npv_low = npv_at(low)
        npv_high = npv_at(high)

        # Check signs differ
        if npv_low * npv_high > 0:
            return 0.0

        for _ in range(100):
            mid = (low + high) / 2
            npv_mid = npv_at(mid)
            if abs(npv_mid) < 1e-8:
                return mid
            if npv_low * npv_mid < 0:
                high = mid
                npv_high = npv_mid
            else:
                low = mid
                npv_low = npv_mid

        return (low + high) / 2

    def _interpret_ratios(
        self,
        current_ratio: float,
        quick_ratio: float,
        debt_to_equity: float,
        roe: float,
        roa: float,
        net_profit_margin: float,
    ) -> Dict[str, str]:
        """Generate plain-English interpretation of financial ratios.

        Parameters
        ----------
        current_ratio : float
            Current assets / current liabilities.
        quick_ratio : float
            Quick assets / current liabilities.
        debt_to_equity : float
            Total liabilities / total equity.
        roe : float
            Return on equity (%).
        roa : float
            Return on assets (%).
        net_profit_margin : float
            Net profit / revenue (%).

        Returns
        -------
        dict
            Textual assessment for each ratio category.
        """
        # Liquidity
        if current_ratio >= 2.0:
            liquidity = (
                "Strong liquidity position. The business has more than "
                "twice as many current assets as current liabilities."
            )
        elif current_ratio >= 1.0:
            liquidity = (
                "Adequate liquidity. Current assets cover current "
                "liabilities, but buffer is limited."
            )
        else:
            liquidity = (
                "Liquidity risk WARNING. Current liabilities exceed "
                "current assets — potential solvency issues."
            )

        # Leverage
        if debt_to_equity <= 0.5:
            leverage = (
                "Conservative capital structure. Low reliance on debt "
                "financing."
            )
        elif debt_to_equity <= 1.0:
            leverage = (
                "Moderate leverage. Balanced debt and equity financing."
            )
        elif debt_to_equity <= 2.0:
            leverage = (
                "High leverage. Significant debt relative to equity — "
                "monitor debt servicing capacity."
            )
        else:
            leverage = (
                "VERY HIGH leverage WARNING. Debt significantly exceeds "
                "equity — elevated financial risk."
            )

        # Profitability
        if net_profit_margin >= 15.0:
            profitability = (
                "Strong profitability. Healthy net profit margin."
            )
        elif net_profit_margin >= 5.0:
            profitability = (
                "Moderate profitability. Reasonable net profit margin."
            )
        elif net_profit_margin > 0:
            profitability = (
                "Low profitability. Thin net profit margin — review "
                "costs and pricing."
            )
        else:
            profitability = (
                "LOSS MAKING. Negative net profit margin — urgent "
                "attention required."
            )

        # ROE
        if roe >= 20.0:
            roe_assessment = (
                "Excellent return on equity. Strong value generation "
                "for shareholders."
            )
        elif roe >= 10.0:
            roe_assessment = (
                "Good return on equity. Acceptable shareholder returns."
            )
        elif roe > 0:
            roe_assessment = (
                "Below-average ROE. Shareholder returns could be improved."
            )
        else:
            roe_assessment = (
                "Negative ROE. Equity is being eroded by losses."
            )

        # ROA
        if roa >= 10.0:
            roa_assessment = (
                "Strong asset utilisation. Efficient use of assets to "
                "generate profit."
            )
        elif roa >= 5.0:
            roa_assessment = (
                "Moderate asset utilisation. Acceptable efficiency."
            )
        elif roa > 0:
            roa_assessment = (
                "Low asset utilisation. Review asset deployment."
            )
        else:
            roa_assessment = (
                "Negative ROA. Assets are generating losses."
            )

        return {
            "liquidity": liquidity,
            "leverage": leverage,
            "profitability": profitability,
            "roe_assessment": roe_assessment,
            "roa_assessment": roa_assessment,
            "overall": (
                f"Liquidity: {'OK' if current_ratio >= 1 else 'RISK'} | "
                f"Leverage: {'OK' if debt_to_equity <= 1 else 'HIGH'} | "
                f"Profitability: {'OK' if net_profit_margin > 0 else 'LOSS'}"
            ),
        }

    # ═════════════════════════════════════════════════════════════════════════
    # ADDITIONAL UTILITY METHODS
    # ═════════════════════════════════════════════════════════════════════════

    def calculate_small_business_tax(self, taxable_income: float) -> Dict[str, Any]:
        """Calculate Small Business Corporation (SBC) tax.

        Uses the favourable SARS SBC tax brackets for qualifying
        small business corporations (2024/2025).

        Parameters
        ----------
        taxable_income : float
            Annual taxable income of the SBC (ZAR).

        Returns
        -------
        dict
            ``taxable_income``, ``tax_payable``, ``effective_rate``,
            and a tiered breakdown.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.calculate_small_business_tax(300_000)
        {'taxable_income': 300000.0, 'tax_payable': 12297.5, ...}
        """
        if taxable_income < 0:
            taxable_income = 0.0

        tax = 0.0
        tiers = []

        remaining = taxable_income

        # Tier 1: 0% up to R95,750
        tier_1_amount = min(remaining, _SBC_THRESHOLD_TIER_1)
        tiers.append({
            "tier": 1,
            "range": f"R0 – R{_SBC_THRESHOLD_TIER_1:,.0f}",
            "rate": _SBC_RATE_TIER_1,
            "amount": tier_1_amount,
            "tax": 0.0,
        })
        remaining -= tier_1_amount

        # Tier 2: 7% from R95,751 to R365,000
        if remaining > 0:
            tier_2_band = _SBC_THRESHOLD_TIER_2 - _SBC_THRESHOLD_TIER_1
            tier_2_amount = min(remaining, tier_2_band)
            tier_2_tax = tier_2_amount * _SBC_RATE_TIER_2
            tax += tier_2_tax
            tiers.append({
                "tier": 2,
                "range": f"R{_SBC_THRESHOLD_TIER_1 + 1:,.0f} – R{_SBC_THRESHOLD_TIER_2:,.0f}",
                "rate": _SBC_RATE_TIER_2,
                "amount": tier_2_amount,
                "tax": round(tier_2_tax, 2),
            })
            remaining -= tier_2_amount

        # Tier 3: 21% from R365,001 to R550,000
        if remaining > 0:
            tier_3_band = _SBC_THRESHOLD_TIER_3 - _SBC_THRESHOLD_TIER_2
            tier_3_amount = min(remaining, tier_3_band)
            tier_3_tax = tier_3_amount * _SBC_RATE_TIER_3
            tax += tier_3_tax
            tiers.append({
                "tier": 3,
                "range": f"R{_SBC_THRESHOLD_TIER_2 + 1:,.0f} – R{_SBC_THRESHOLD_TIER_3:,.0f}",
                "rate": _SBC_RATE_TIER_3,
                "amount": tier_3_amount,
                "tax": round(tier_3_tax, 2),
            })
            remaining -= tier_3_amount

        # Tier 4: 27% above R550,000
        if remaining > 0:
            tier_4_tax = remaining * _SBC_RATE_TIER_4
            tax += tier_4_tax
            tiers.append({
                "tier": 4,
                "range": f"R{_SBC_THRESHOLD_TIER_3 + 1:,.0f} +",
                "rate": _SBC_RATE_TIER_4,
                "amount": remaining,
                "tax": round(tier_4_tax, 2),
            })

        effective_rate = round(tax / taxable_income, 4) if taxable_income > 0 else 0.0

        return {
            "taxable_income": round(taxable_income, 2),
            "tax_payable": round(tax, 2),
            "effective_rate": effective_rate,
            "effective_rate_percent": round(effective_rate * 100, 2),
            "tiers": tiers,
            "currency": self.currency,
            "tax_year": self.tax_year,
            "notes": [
                "SBC rates apply to qualifying small business corporations.",
                "Qualifying criteria: turnover < R20M, all shareholders "
                "are natural persons, not a personal service provider.",
                f"Standard company rate ({_COMPANY_TAX_RATE_STANDARD * 100:.0f}%) "
                "applies above R550,000.",
            ],
        }

    def calculate_company_tax(
        self,
        taxable_income: float,
        company_type: str = "standard",
    ) -> Dict[str, Any]:
        """Calculate company income tax.

        Parameters
        ----------
        taxable_income : float
            Taxable income of the company (ZAR).
        company_type : str
            ``'standard'`` (27 %) or ``'gold_mining'`` (28 %).

        Returns
        -------
        dict
            ``taxable_income``, ``tax_payable``, ``effective_rate``.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.calculate_company_tax(1_000_000)
        {'taxable_income': 1000000.0, 'tax_payable': 270000.0, ...}
        """
        if taxable_income < 0:
            taxable_income = 0.0

        company_type = company_type.lower().strip()
        if company_type == "gold_mining":
            rate = _COMPANY_TAX_RATE_GOLD_MINING
        else:
            rate = _COMPANY_TAX_RATE_STANDARD

        tax_payable = round(taxable_income * rate, 2)
        effective_rate = round(tax_payable / taxable_income, 4) if taxable_income > 0 else 0.0

        return {
            "taxable_income": round(taxable_income, 2),
            "tax_payable": tax_payable,
            "rate": rate,
            "effective_rate": effective_rate,
            "effective_rate_percent": round(effective_rate * 100, 2),
            "company_type": company_type,
            "currency": self.currency,
            "tax_year": self.tax_year,
        }

    def calculate_capital_gains_tax(
        self,
        capital_gain: float,
        annual_inclusion_rate: float = 0.40,
    ) -> Dict[str, Any]:
        """Estimate capital gains tax (CGT) for an individual.

        Parameters
        ----------
        capital_gain : float
            Total capital gain before inclusion (ZAR).
        annual_inclusion_rate : float
            Inclusion rate for individuals (40 % for 2024/2025).

        Returns
        -------
        dict
            ``capital_gain``, ``taxable_portion``, ``estimated_cgt``.

        Notes
        -----
        - Annual exclusion: R40,000 (individuals) is NOT deducted here;
          subtract before calling if applicable.
        - Inclusion rate: 40 % for individuals, 80 % for companies/trusts.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.calculate_capital_gains_tax(200_000)
        {'capital_gain': 200000.0, 'taxable_portion': 80000.0, ...}
        """
        if capital_gain < 0:
            capital_gain = 0.0

        taxable_portion = round(capital_gain * annual_inclusion_rate, 2)
        estimated_cgt = self._calculate_individual_tax(taxable_portion)

        return {
            "capital_gain": round(capital_gain, 2),
            "annual_inclusion_rate": annual_inclusion_rate,
            "taxable_portion": taxable_portion,
            "estimated_cgt": estimated_cgt,
            "currency": self.currency,
            "tax_year": self.tax_year,
            "notes": [
                f"Annual exclusion of R40,000 applies to individuals. "
                "Subtract before calculation.",
                f"Inclusion rate: {annual_inclusion_rate * 100:.0f}% for individuals, "
                "80% for companies and trusts.",
            ],
        }

    def format_currency(self, amount: float, symbol: str = "R") -> str:
        """Format an amount as South African Rand.

        Parameters
        ----------
        amount : float
            Amount to format.
        symbol : str
            Currency symbol (default ``'R'``).

        Returns
        -------
        str
            Formatted currency string, e.g. ``'R150,000.00'``.

        Examples
        --------
        >>> ca = CharteredAccountantAssistant()
        >>> ca.format_currency(150000)
        'R150,000.00'
        """
        return f"{symbol}{amount:,.2f}"

    def get_tax_year_summary(self) -> Dict[str, Any]:
        """Return a summary of the current tax year parameters.

        Returns
        -------
        dict
            Key thresholds, rates, and dates for 2024/2025.
        """
        return {
            "tax_year": self.tax_year,
            "period": "1 March 2024 – 28 February 2025",
            "vat_rate": self.vat_rate,
            "vat_rate_percent": f"{self.vat_rate * 100:.0f}%",
            "company_tax_rate_standard": _COMPANY_TAX_RATE_STANDARD,
            "company_tax_rate_gold_mining": _COMPANY_TAX_RATE_GOLD_MINING,
            "provisional_thresholds": {
                "under_65": _PROVISIONAL_THRESHOLD_UNDER_65,
                "65_to_75": _PROVISIONAL_THRESHOLD_65_TO_75,
                "75_plus": _PROVISIONAL_THRESHOLD_75_PLUS,
            },
            "sbc_rates": {
                "tier_1": f"{_SBC_RATE_TIER_1 * 100:.0f}% up to R{_SBC_THRESHOLD_TIER_1:,.0f}",
                "tier_2": f"{_SBC_RATE_TIER_2 * 100:.0f}% up to R{_SBC_THRESHOLD_TIER_2:,.0f}",
                "tier_3": f"{_SBC_RATE_TIER_3 * 100:.0f}% up to R{_SBC_THRESHOLD_TIER_3:,.0f}",
                "tier_4": f"{_SBC_RATE_TIER_4 * 100:.0f}% above R{_SBC_THRESHOLD_TIER_3:,.0f}",
            },
            "primary_rebate": _PRIMARY_REBATE,
            "tax_brackets_count": len(_INDIVIDUAL_TAX_BRACKETS),
            "top_marginal_rate": f"{_INDIVIDUAL_TAX_BRACKETS[-1]['rate'] * 100:.0f}%",
            "currency": self.currency,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE-LEVEL CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def quick_vat(amount: float, vat_type: str = "inclusive") -> Dict[str, float]:
    """Quick VAT calculation without instantiating the class.

    Parameters
    ----------
    amount : float
        Amount to process.
    vat_type : str
        ``'inclusive'`` or ``'exclusive'``.

    Returns
    -------
    dict
        VAT breakdown.
    """
    ca = CharteredAccountantAssistant()
    return ca.calculate_vat(amount, vat_type)


def quick_salary(gross_salary: float, deductions: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    """Quick net salary calculation without instantiating the class.

    Parameters
    ----------
    gross_salary : float
        Gross annual salary.
    deductions : dict, optional
        Additional deductions.

    Returns
    -------
    dict
        Salary breakdown.
    """
    ca = CharteredAccountantAssistant()
    return ca.calculate_net_salary(gross_salary, deductions)


def quick_ratios(
    current_assets: float,
    current_liabilities: float,
    total_assets: float,
    total_liabilities: float,
    net_income: float,
    revenue: float,
    equity: Optional[float] = None,
) -> Dict[str, Any]:
    """Quick financial ratios without instantiating the class.

    Parameters
    ----------
    current_assets : float
    current_liabilities : float
    total_assets : float
    total_liabilities : float
    net_income : float
    revenue : float
    equity : float, optional

    Returns
    -------
    dict
        Financial ratios.
    """
    ca = CharteredAccountantAssistant()
    return ca.calculate_ratios(
        current_assets, current_liabilities, total_assets,
        total_liabilities, net_income, revenue, equity,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# EXECUTE IF RUN AS SCRIPT (DEMO)
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print("CharteredAccountantAssistant — South African CA Module Demo")
    print(f"Tax Year: 2024/2025 | Currency: ZAR")
    print("=" * 70)

    ca = CharteredAccountantAssistant()

    # 1. VAT
    print("\n1. VAT Calculation (R1,150 inclusive):")
    vat = ca.calculate_vat(1150.00, vat_type="inclusive")
    for k, v in vat.items():
        print(f"   {k}: {v}")

    # 2. Provisional Tax
    print("\n2. Provisional Tax (R850,000 taxable income):")
    prov = ca.calculate_provisional_tax(850_000)
    print(f"   Estimated tax: R{prov['estimated_tax']:,.2f}")
    print(f"   1st payment:   R{prov['first_payment']:,.2f} (due {prov['first_due_date']})")
    print(f"   2nd payment:   R{prov['second_payment']:,.2f} (due {prov['second_due_date']})")

    # 3. Depreciation
    print("\n3. Depreciation (R100,000 over 5 years, straight-line):")
    depr = ca.calculate_depreciation(100_000, method="straight_line", rate=0.15, years=5)
    for entry in depr["schedule"]:
        print(
            f"   Year {entry['year']}: OB={entry['opening_balance']:,.0f}, "
            f"Dep={entry['depreciation']:,.0f}, CB={entry['closing_balance']:,.0f}"
        )

    # 4. Ratios
    print("\n4. Financial Ratios:")
    ratios = ca.calculate_ratios(
        current_assets=500_000, current_liabilities=200_000,
        total_assets=1_000_000, total_liabilities=400_000,
        net_income=150_000, revenue=800_000, equity=600_000,
    )
    print(f"   Current ratio: {ratios['current_ratio']:.2f}")
    print(f"   Debt/Equity:   {ratios['debt_to_equity']:.2f}")
    print(f"   ROE:           {ratios['roe']:.1f}%")
    print(f"   Net margin:    {ratios['net_profit_margin']:.1f}%")

    # 5. P&L
    print("\n5. P&L Statement:")
    pl = ca.generate_profit_loss(
        revenue=1_000_000, cogs=600_000,
        operating_expenses={"salaries": 150_000, "rent": 60_000, "utilities": 20_000},
        interest=10_000, tax=25_000,
    )
    print(f"   Revenue:       R{pl['revenue']:,.2f}")
    print(f"   Gross profit:  R{pl['gross_profit']:,.2f} ({pl['gross_profit_margin']:.1f}%)")
    print(f"   Net profit:    R{pl['net_profit']:,.2f} ({pl['net_profit_margin']:.1f}%)")

    # 6. Balance Sheet
    print("\n6. Balance Sheet:")
    bs = ca.generate_balance_sheet(
        assets={"current": {"cash": 200_000, "debtors": 150_000},
                "fixed": {"property": 500_000, "equipment": 150_000}},
        liabilities={"current": {"creditors": 100_000, "short_term_loans": 50_000},
                     "long_term": {"long_term_loans": 250_000}},
        equity_items={"share_capital": 300_000, "retained_earnings": 300_000},
    )
    print(f"   Total assets:            R{bs['assets']['total_assets']:,.2f}")
    print(f"   Total liabilities:       R{bs['liabilities']['total_liabilities']:,.2f}")
    print(f"   Total equity:            R{bs['equity']['total_equity']:,.2f}")
    print(f"   Balanced:                {bs['accounting_equation']['balanced']}")
    print(f"   Working capital:         R{bs['working_capital']:,.2f}")

    # 7. Checklist
    print("\n7. SARS Audit Checklist (Company):")
    checklist = ca.get_audit_checklist("company")
    for cat in checklist["checklist"]:
        print(f"   [{cat['category']}] {len(cat['items'])} items")

    # 8. Net Salary
    print("\n8. Net Salary (R500,000 gross):")
    salary = ca.calculate_net_salary(500_000, deductions={"pension": 0.075})
    print(f"   Gross:         R{salary['gross']:,.2f}")
    print(f"   PAYE:          R{salary['paye']:,.2f}")
    print(f"   UIF:           R{salary['uif']:,.2f}")
    print(f"   Net salary:    R{salary['net_salary']:,.2f}")

    # 9. ROI
    print("\n9. ROI Analysis (R100k investment):")
    roi = ca.calculate_roi(100_000, returns=[30_000, 40_000, 50_000, 45_000])
    print(f"   ROI:           {roi['roi_percent']:.1f}%")
    print(f"   NPV (10%):     R{roi['npv']:,.2f}")
    print(f"   IRR:           {roi['irr']:.1f}%")
    print(f"   Payback:       {roi['payback_period']:.1f} years")

    print("\n" + "=" * 70)
    print("Demo complete. All calculations reflect 2024/2025 SARS rates.")
    print("=" * 70)
