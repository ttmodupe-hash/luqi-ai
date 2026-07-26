"""
SA Tax Engine — South African tax calculator for 2024/2025.

Calculates PAYE (Pay-As-You-Earn) income tax, UIF (Unemployment
Insurance Fund), SDL (Skills Development Levy), medical tax credits,
and retirement projections based on official SARS tax brackets.

Usage:
    engine = SATaxEngine()
    result = engine.calculate_paye(500000, age=30, medical_aid_members=2)
    brackets = engine.get_brackets()
    retirement = engine.calculate_retirement(3000, years=25)
"""

from __future__ import annotations

from typing import Any


# ── SARS 2024/2025 tax year constants ─────────────────────────────────────

# Tax brackets (R)
_BRACKETS: list[dict[str, Any]] = [
    {"threshold": 0, "rate": 0.18, "base_tax": 0},
    {"threshold": 237_101, "rate": 0.26, "base_tax": 42_678},
    {"threshold": 370_501, "rate": 0.31, "base_tax": 77_362},
    {"threshold": 512_801, "rate": 0.36, "base_tax": 121_475},
    {"threshold": 673_001, "rate": 0.39, "base_tax": 179_147},
    {"threshold": 857_901, "rate": 0.41, "base_tax": 251_258},
    {"threshold": 1_817_001, "rate": 0.45, "base_tax": 644_489},
]

# Tax rebates (R)
_PRIMARY_REBATE = 17_235
_SECONDARY_REBATE = 9_444  # Age 65–74
_TERTIARY_REBATE = 3_145   # Age 75+

# Tax thresholds (R) — income below these pays no tax
_THRESHOLD_AGE_65 = 95_750
_THRESHOLD_AGE_75 = 148_217

# Medical tax credits (R per month)
_MEDICAL_MAIN = 364
_MEDICAL_DEPENDANT = 364

# UIF
_UIF_RATE_EMPLOYEE = 0.01
_UIF_RATE_EMPLOYER = 0.01
_UIF_MONTHLY_CAP = 177.12

# SDL
_SDL_RATE_EMPLOYER = 0.01
_SDL_PAYROLL_THRESHOLD = 500_000  # Annual payroll threshold


class SATaxEngine:
    """South African tax calculator for the 2024/2025 tax year."""

    def __init__(self) -> None:
        self.brackets = _BRACKETS
        self.primary_rebate = _PRIMARY_REBATE
        self.secondary_rebate = _SECONDARY_REBATE
        self.tertiary_rebate = _TERTIARY_REBATE

    # ── Public API ─────────────────────────────────────────────────────────

    def calculate_paye(self, annual_salary: float, age: int = 30, medical_aid_members: int = 0) -> dict:
        """Calculate PAYE tax for South Africa 2024/2025.

        Args:
            annual_salary: Gross annual salary in Rand.
            age: Age of the taxpayer (affects rebates).
            medical_aid_members: Number of medical aid dependants
                                 (including main member).

        Returns:
            Dictionary with annual_salary, paye_annual, paye_monthly,
            uif, sdl, medical_credit, tax_rebate, effective_rate,
            and take_home amounts.
        """
        if annual_salary < 0:
            annual_salary = 0

        # 1. Calculate tax before rebates
        tax_before_rebate = self._calculate_tax_on_income(annual_salary)

        # 2. Apply rebates
        rebate = self._get_rebate(age)
        tax_after_rebate = max(0.0, tax_before_rebate - rebate)

        # 3. Medical tax credit
        medical_credit = self._medical_tax_credit(medical_aid_members)
        tax_after_medical = max(0.0, tax_after_rebate - medical_credit)

        # 4. UIF (employee portion)
        uif_monthly = min(annual_salary / 12 * _UIF_RATE_EMPLOYEE, _UIF_MONTHLY_CAP)
        uif_annual = round(uif_monthly * 12, 2)

        # 5. SDL (employer only — informational)
        sdl_annual = self._calculate_sdl(annual_salary)

        # 6. Effective tax rate
        effective_rate = round(tax_after_medical / annual_salary, 4) if annual_salary > 0 else 0.0

        # 7. Take-home
        take_home = annual_salary - tax_after_medical - uif_annual

        return {
            "annual_salary": round(annual_salary, 2),
            "age": age,
            "paye_annual": round(tax_after_medical, 2),
            "paye_monthly": round(tax_after_medical / 12, 2),
            "tax_before_rebate": round(tax_before_rebate, 2),
            "uif_annual": uif_annual,
            "uif_monthly": round(uif_monthly, 2),
            "sdl_annual": sdl_annual,
            "sdl_monthly": round(sdl_annual / 12, 2),
            "medical_credit_annual": round(medical_credit, 2),
            "medical_credit_monthly": round(medical_credit / 12, 2),
            "tax_rebate": rebate,
            "effective_rate": effective_rate,
            "take_home_annual": round(take_home, 2),
            "take_home_monthly": round(take_home / 12, 2),
            "tax_year": "2024/2025",
            "currency": "ZAR",
        }

    def get_brackets(self) -> dict:
        """Return SARS tax brackets for 2024/2025.

        Returns:
            Dictionary with tax_year, brackets, rebates, and thresholds.
        """
        return {
            "tax_year": "2024/2025",
            "currency": "ZAR",
            "brackets": [
                {
                    "band": f"R{b['threshold']:,.0f} – R{self._next_threshold(i):,.0f}",
                    "rate_percent": round(b["rate"] * 100, 1),
                    "base_tax": b["base_tax"],
                }
                for i, b in enumerate(self.brackets)
            ],
            "top_bracket": {
                "band": f"R{self.brackets[-1]['threshold']:,.0f} +",
                "rate_percent": round(self.brackets[-1]["rate"] * 100, 1),
            },
            "rebates": {
                "primary": self.primary_rebate,
                "secondary_65_74": self.secondary_rebate,
                "tertiary_75_plus": self.tertiary_rebate,
            },
            "thresholds": {
                "under_65": _THRESHOLD_AGE_65,
                "65_to_74": "Tax + secondary rebate",
                "75_plus": _THRESHOLD_AGE_75,
            },
            "uif": {
                "employee_rate_percent": _UIF_RATE_EMPLOYEE * 100,
                "employer_rate_percent": _UIF_RATE_EMPLOYER * 100,
                "monthly_cap": _UIF_MONTHLY_CAP,
            },
            "sdl": {
                "employer_rate_percent": _SDL_RATE_EMPLOYER * 100,
                "payroll_threshold": _SDL_PAYROLL_THRESHOLD,
                "note": "Employer only; applies when annual payroll exceeds R500,000",
            },
            "medical_tax_credits": {
                "main_member_monthly": _MEDICAL_MAIN,
                "dependant_monthly": _MEDICAL_DEPENDANT,
            },
        }

    def calculate_retirement(self, monthly_contribution: float, years: int, rate: float = 0.08) -> dict:
        """Calculate retirement projection.

        Uses the future value of a series formula:
            FV = PMT × (((1 + r)^n - 1) / r)

        Args:
            monthly_contribution: Monthly retirement contribution in Rand.
            years: Number of years until retirement.
            rate: Annual interest rate (default 8%).

        Returns:
            Dictionary with projected values and breakdown.
        """
        if monthly_contribution < 0:
            monthly_contribution = 0
        if years < 0:
            years = 0
        if rate < 0:
            rate = 0.0

        monthly_rate = rate / 12
        n_months = years * 12

        if monthly_rate == 0:
            future_value = monthly_contribution * n_months
        else:
            future_value = monthly_contribution * (
                ((1 + monthly_rate) ** n_months - 1) / monthly_rate
            )

        total_contributed = monthly_contribution * n_months
        total_interest = future_value - total_contributed

        # Estimate monthly income (4% rule — conservative)
        annual_withdrawal_rate = 0.04
        estimated_monthly_income = (future_value * annual_withdrawal_rate) / 12

        return {
            "monthly_contribution": round(monthly_contribution, 2),
            "years": years,
            "annual_rate": rate,
            "rate_percent": round(rate * 100, 1),
            "total_contributed": round(total_contributed, 2),
            "total_interest_earned": round(total_interest, 2),
            "projected_value": round(future_value, 2),
            "estimated_monthly_income": round(estimated_monthly_income, 2),
            "estimated_annual_income": round(estimated_monthly_income * 12, 2),
            "withdrawal_assumption": "4% rule",
            "currency": "ZAR",
        }

    def compare_salary(self, annual_salary: float, age: int = 30, medical_aid_members: int = 0) -> dict:
        """Compare gross vs net salary with full breakdown.

        Args:
            annual_salary: Gross annual salary.
            age: Age of taxpayer.
            medical_aid_members: Medical aid dependants.

        Returns:
            Detailed comparison dictionary.
        """
        paye = self.calculate_paye(annual_salary, age, medical_aid_members)

        monthly_gross = annual_salary / 12
        monthly_net = paye["take_home_monthly"]
        monthly_deductions = monthly_gross - monthly_net

        return {
            "monthly_gross": round(monthly_gross, 2),
            "monthly_net": monthly_net,
            "monthly_deductions": round(monthly_deductions, 2),
            "deduction_breakdown": {
                "paye": paye["paye_monthly"],
                "uif": paye["uif_monthly"],
            },
            "annual_summary": paye,
        }

    def calculate_business_tax(self, taxable_income: float, age: int = 30) -> dict:
        """Calculate tax for small business / provisional taxpayers.

        Args:
            taxable_income: Annual taxable income.
            age: Age of taxpayer.

        Returns:
            Tax calculation dictionary.
        """
        tax = self._calculate_tax_on_income(taxable_income)
        rebate = self._get_rebate(age)
        final_tax = max(0.0, tax - rebate)

        return {
            "taxable_income": round(taxable_income, 2),
            "tax_before_rebate": round(tax, 2),
            "tax_rebate": rebate,
            "tax_payable": round(final_tax, 2),
            "effective_rate": round(final_tax / taxable_income, 4) if taxable_income > 0 else 0.0,
            "tax_year": "2024/2025",
            "currency": "ZAR",
        }

    # ── Helpers ────────────────────────────────────────────────────────────

    def _calculate_tax_on_income(self, income: float) -> float:
        """Calculate tax before rebates using SARS brackets."""
        tax = 0.0
        for i, bracket in enumerate(self.brackets):
            threshold = bracket["threshold"]
            rate = bracket["rate"]
            upper = self._next_threshold(i)

            if income > upper:
                taxable_in_band = upper - threshold
            elif income > threshold:
                taxable_in_band = income - threshold
            else:
                continue

            tax += taxable_in_band * rate

        return round(tax, 2)

    def _next_threshold(self, index: int) -> float:
        """Return the upper bound of a tax bracket."""
        if index + 1 < len(self.brackets):
            return self.brackets[index + 1]["threshold"] - 1
        return float("inf")

    def _get_rebate(self, age: int) -> float:
        """Calculate total rebate based on age."""
        rebate = self.primary_rebate
        if age >= 75:
            rebate += self.secondary_rebate + self.tertiary_rebate
        elif age >= 65:
            rebate += self.secondary_rebate
        return rebate

    @staticmethod
    def _medical_tax_credit(members: int) -> float:
        """Calculate annual medical tax credit."""
        if members <= 0:
            return 0.0
        monthly = _MEDICAL_MAIN + _MEDICAL_DEPENDANT * (members - 1)
        return monthly * 12

    @staticmethod
    def _calculate_sdl(annual_salary: float) -> float:
        """Calculate SDL (employer only)."""
        # SDL applies to employer's total payroll; here we approximate
        # by checking if this individual salary alone triggers it
        if annual_salary >= _SDL_PAYROLL_THRESHOLD:
            return round(annual_salary * _SDL_RATE_EMPLOYER, 2)
        return 0.0


# ── Module-level convenience alias ────────────────────────────────────────

ModuleName = SATaxEngine
