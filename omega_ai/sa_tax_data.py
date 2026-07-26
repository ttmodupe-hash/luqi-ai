"""
South African Tax Data Module (2024/2025 Tax Year)
==================================================
Comprehensive SARS tax data for the 2024/2025 year of assessment
(1 March 2024 - 29 February 2025).

Includes PAYE tax brackets, rebates, UIF, SDL, medical aid credits,
retirement contribution limits, and worked example calculations.

All figures sourced from official SARS publications and National Treasury
Budget documents for the 2024/2025 fiscal year.

Usage:
    from sa_tax_data import (
        TAX_BRACKETS_2024_2025, TAX_REBATES, UIF_RATES,
        calculate_paye_annual, calculate_take_home_pay
    )
    tax = calculate_paye_annual(annual_salary=500000, age=35)

Note: This data is for educational and development purposes.
Always consult a tax professional or SARS for official calculations.
"""

from typing import Dict, List, Any, Optional, Tuple

# =============================================================================
# TAX YEAR METADATA
# =============================================================================

TAX_YEAR: Dict[str, str] = {
    "year_label": "2024/2025",
    "start_date": "2024-03-01",
    "end_date": "2025-02-28",
    "source": "SARS / National Treasury Budget 2024",
    "currency": "ZAR (South African Rand)",
    "disclaimer": (
        "For educational purposes. Consult SARS or a registered tax practitioner "
        "for official tax calculations."
    )
}


# =============================================================================
# INDIVIDUAL INCOME TAX BRACKETS (2024/2025)
# =============================================================================
# Progressive tax system: higher income portions taxed at higher rates
# Taxable income = gross income minus allowable deductions

TAX_BRACKETS_2024_2025: Dict[str, Any] = {
    "tax_year": "2024/2025",
    "assessment_period": "1 March 2024 - 28 February 2025",
    "note": "South Africa uses a progressive tax system. Each bracket only applies to income within that bracket.",
    "brackets": [
        {
            "bracket": 1,
            "annual_income_min": 0,
            "annual_income_max": 237_100,
            "base_tax": 0,
            "marginal_rate": 0.18,
            "description": "18% of taxable income"
        },
        {
            "bracket": 2,
            "annual_income_min": 237_101,
            "annual_income_max": 370_500,
            "base_tax": 42_678,
            "marginal_rate": 0.26,
            "description": "R42,678 + 26% of amount above R237,100"
        },
        {
            "bracket": 3,
            "annual_income_min": 370_501,
            "annual_income_max": 512_800,
            "base_tax": 77_362,
            "marginal_rate": 0.31,
            "description": "R77,362 + 31% of amount above R370,500"
        },
        {
            "bracket": 4,
            "annual_income_min": 512_801,
            "annual_income_max": 673_000,
            "base_tax": 121_475,
            "marginal_rate": 0.36,
            "description": "R121,475 + 36% of amount above R512,800"
        },
        {
            "bracket": 5,
            "annual_income_min": 673_001,
            "annual_income_max": 857_900,
            "base_tax": 179_147,
            "marginal_rate": 0.39,
            "description": "R179,147 + 39% of amount above R673,000"
        },
        {
            "bracket": 6,
            "annual_income_min": 857_901,
            "annual_income_max": 1_817_000,
            "base_tax": 251_258,
            "marginal_rate": 0.41,
            "description": "R251,258 + 41% of amount above R857,900"
        },
        {
            "bracket": 7,
            "annual_income_min": 1_817_001,
            "annual_income_max": None,
            "base_tax": 644_489,
            "marginal_rate": 0.45,
            "description": "R644,489 + 45% of amount above R1,817,000"
        }
    ],
    "top_marginal_rate": 0.45,
    "effective_tax_rate_note": (
        "The effective tax rate is always lower than the marginal rate "
        "because lower brackets are taxed at lower rates."
    )
}


# =============================================================================
# MONTHLY TAX DEDUCTION TABLES (PAYE)
# =============================================================================
# Employers use these tables to deduct the correct PAYE each month

MONTHLY_TAX_BRACKETS_2024_2025: List[Dict[str, Any]] = [
    {
        "monthly_income_min": 0,
        "monthly_income_max": 19_758,
        "annual_equivalent_min": 0,
        "annual_equivalent_max": 237_100,
        "calculation": "18% of annual equivalent, divided by 12"
    },
    {
        "monthly_income_min": 19_759,
        "monthly_income_max": 30_875,
        "annual_equivalent_min": 237_101,
        "annual_equivalent_max": 370_500,
        "calculation": "(R42,678 + 26% above R237,100) / 12"
    },
    {
        "monthly_income_min": 30_876,
        "monthly_income_max": 42_733,
        "annual_equivalent_min": 370_501,
        "annual_equivalent_max": 512_800,
        "calculation": "(R77,362 + 31% above R370,500) / 12"
    },
    {
        "monthly_income_min": 42_734,
        "monthly_income_max": 56_083,
        "annual_equivalent_min": 512_801,
        "annual_equivalent_max": 673_000,
        "calculation": "(R121,475 + 36% above R512,800) / 12"
    },
    {
        "monthly_income_min": 56_084,
        "monthly_income_max": 71_492,
        "annual_equivalent_min": 673_001,
        "annual_equivalent_max": 857_900,
        "calculation": "(R179,147 + 39% above R673,000) / 12"
    },
    {
        "monthly_income_min": 71_493,
        "monthly_income_max": 151_417,
        "annual_equivalent_min": 857_901,
        "annual_equivalent_max": 1_817_000,
        "calculation": "(R251,258 + 41% above R857,900) / 12"
    },
    {
        "monthly_income_min": 151_418,
        "monthly_income_max": None,
        "annual_equivalent_min": 1_817_001,
        "annual_equivalent_max": None,
        "calculation": "(R644,489 + 45% above R1,817,000) / 12"
    }
]


# =============================================================================
# TAX REBATES (2024/2025)
# =============================================================================
# Rebates are deducted from calculated tax to arrive at final tax payable

TAX_REBATES: Dict[str, Any] = {
    "tax_year": "2024/2025",
    "description": "Tax rebates reduce the final tax payable. They are subtracted after tax is calculated from brackets.",
    "rebates": [
        {
            "type": "Primary",
            "description": "Available to all individual taxpayers",
            "age_requirement": "Under 65 years",
            "amount": 17_235,
            "notes": "Every taxpayer receives this rebate automatically"
        },
        {
            "type": "Secondary",
            "description": "Additional rebate for older taxpayers",
            "age_requirement": "65 years and older",
            "amount": 9_444,
            "notes": "Received IN ADDITION to the primary rebate"
        },
        {
            "type": "Tertiary",
            "description": "Further rebate for elderly taxpayers",
            "age_requirement": "75 years and older",
            "amount": 3_145,
            "notes": "Received IN ADDITION to primary and secondary rebates"
        }
    ],
    "total_rebates_by_age": {
        "under_65": 17_235,
        "65_to_74": 17_235 + 9_444,   # R26,679
        "75_and_over": 17_235 + 9_444 + 3_145  # R29,824
    }
}


# =============================================================================
# TAX THRESHOLDS (2024/2025)
# =============================================================================
# Income below these thresholds = no tax payable after rebates

TAX_THRESHOLDS: Dict[str, Any] = {
    "tax_year": "2024/2025",
    "description": "If your taxable income is below these amounts, you pay NO tax after rebates are applied.",
    "thresholds": [
        {
            "age_group": "Under 65",
            "threshold": 95_750,
            "explanation": "Tax on R95,750 = R17,235 (18%), which equals the primary rebate"
        },
        {
            "age_group": "65 to 74",
            "threshold": 148_217,
            "explanation": "Higher threshold due to secondary rebate"
        },
        {
            "age_group": "75 and over",
            "threshold": 165_689,
            "explanation": "Highest threshold due to secondary + tertiary rebates"
        }
    ]
}


# =============================================================================
# UIF (UNEMPLOYMENT INSURANCE FUND)
# =============================================================================

UIF_RATES: Dict[str, Any] = {
    "description": "UIF provides short-term relief to workers who become unemployed, ill, or go on maternity leave.",
    "tax_year": "2024/2025",
    "employee_contribution_rate": 0.01,
    "employer_contribution_rate": 0.01,
    "total_contribution_rate": 0.02,
    "earnings_ceiling_monthly": 17_712,
    "earnings_ceiling_annual": 212_544,
    "max_employee_contribution_monthly": 177.12,
    "max_employer_contribution_monthly": 177.12,
    "max_total_contribution_monthly": 354.24,
    "who_must_contribute": (
        "All employees and employers, except: employees working less than 24 hours/month, "
        "learners, public servants (certain categories), foreigners on contract, "
        "retired persons with pension income, and workers in certain special categories."
    ),
    "benefits": {
        "unemployment": "Up to 365 days of income replacement (38-60% of salary)",
        "illness": "Up to 238 days of illness benefits",
        "maternity": "Up to 121 days of maternity benefits (66% of salary)",
        "adoption": "Up to 238 days for adoption of child under 2",
        "dependant": "Benefits to dependents of deceased contributor"
    },
    "calculation_example": {
        "gross_monthly_salary": 25_000,
        "employee_uif": "1% x R25,000 = R250 (below cap, so full R250)",
        "employer_uif": "1% x R25,000 = R250",
        "total_uif": "R500"
    }
}


# =============================================================================
# SDL (SKILLS DEVELOPMENT LEVY)
# =============================================================================

SDL_RATES: Dict[str, Any] = {
    "description": "SDL funds skills development and training programmes in South Africa via SETAs.",
    "tax_year": "2024/2025",
    "levy_rate": 0.01,
    "levy_percentage": "1%",
    "who_pays": "Employer only (not deducted from employee salary)",
    "exemption_threshold": {
        "annual_remuneration": 500_000,
        "description": "Employers with annual payroll below R500,000 are EXEMPT from SDL"
    },
    "example": {
        "monthly_payroll": 100_000,
        "monthly_sdl": "1% x R100,000 = R1,000 (paid by employer)"
    },
    "seta_note": (
        "SDL contributions are paid to the relevant Sector Education and Training Authority (SETA) "
        "based on the employer's industry sector."
    )
}


# =============================================================================
# MEDICAL AID TAX CREDITS (2024/2025)
# =============================================================================
# Section 6A medical scheme fees tax credits (MTC)

MEDICAL_AID_CREDITS: Dict[str, Any] = {
    "tax_year": "2024/2025",
    "description": "Medical Tax Credits reduce the tax payable for members of registered medical aid schemes.",
    "note": "These are TAX CREDITS (not deductions) — they directly reduce tax payable Rand-for-Rand.",
    "monthly_credits": {
        "main_member": 364,
        "first_dependant": 364,
        "each_additional_dependant": 246
    },
    "annual_credits": {
        "main_member": 4_368,
        "first_dependant": 4_368,
        "each_additional_dependant": 2_952
    },
    "examples": [
        {
            "description": "Single person (member only)",
            "monthly_credit": 364,
            "annual_credit": 4_368
        },
        {
            "description": "Member + spouse",
            "monthly_credit": 364 + 364,  # R728
            "annual_credit": 8_736
        },
        {
            "description": "Member + spouse + 2 children",
            "monthly_credit": 364 + 364 + 246 + 246,  # R1,220
            "annual_credit": 14_640
        }
    ],
    "additional_medical_expenses": {
        "description": "Taxpayers can claim additional credits for out-of-pocket medical expenses",
        "calculation": "Based on a formula: (Medical expenses - 7.5% of taxable income) x specific rate",
        "note": "Only expenses NOT covered by medical aid qualify"
    }
}


# =============================================================================
# RETIREMENT CONTRIBUTION DEDUCTIONS (2024/2025)
# =============================================================================
# Section 11F deductions for pension, provident, and retirement annuity funds

RETIREMENT_DEDUCTIONS: Dict[str, Any] = {
    "tax_year": "2024/2025",
    "description": "Tax deductions for contributions to approved retirement funds.",
    "applicable_funds": [
        "Pension funds",
        "Provident funds",
        "Retirement Annuity (RA) funds",
        "Preservation funds"
    ],
    "deduction_limit": {
        "percentage_of_greater": 0.275,
        "percentage_description": "27.5% of the GREATER of remuneration or taxable income",
        "annual_cap": 350_000,
        "cap_description": "Maximum annual deduction of R350,000"
    },
    "example_calculations": [
        {
            "description": "Person earning R400,000/year, contributing 15% to pension",
            "remuneration": 400_000,
            "contribution": 60_000,
            "max_deduction": "27.5% x R400,000 = R110,000",
            "actual_deduction": "R60,000 (full amount, below cap)",
            "taxable_income": "R400,000 - R60,000 = R340,000"
        },
        {
            "description": "High earner: R2,000,000/year, contributing R500,000",
            "remuneration": 2_000_000,
            "contribution": 500_000,
            "max_deduction": "27.5% x R2,000,000 = R550,000",
            "actual_deduction": "R350,000 (capped at annual limit)",
            "taxable_income": "R2,000,000 - R350,000 = R1,650,000",
            "carry_forward": "R150,000 excess carried forward to future years"
        }
    ],
    "two_pot_system_note": (
        "From 1 September 2024, the Two-Pot Retirement System allows limited pre-retirement "
        "access to savings pot. Savings component withdrawals taxed at marginal rate. "
        "Seeded from existing retirement savings."
    )
}


# =============================================================================
# TRAVEL ALLOWANCE TAX TREATMENT
# =============================================================================

TRAVEL_ALLOWANCE: Dict[str, Any] = {
    "tax_year": "2024/2025",
    "description": "Travel allowances have specific tax treatment depending on business vs private use.",
    "taxable_percentage": {
        "default": 0.80,
        "description": "80% of travel allowance included in remuneration for PAYE purposes",
        "reduced": 0.20,
        "reduced_description": "20% if employer is satisfied that 80%+ of use is for business"
    },
    "reimbursive_travel": {
        "per_km_rate": "Prescribed rate per km (check SARS website for current rate)",
        "tax_free_up_to_rate": "Reimbursements at/below prescribed rate are tax-free"
    },
    "company_car_fringe_benefit": {
        "monthly_percentage_no_maintenance": 0.035,
        "monthly_percentage_with_maintenance": 0.0325,
        "description": "3.5% per month of determined value (3.25% with maintenance plan)"
    }
}


# =============================================================================
# OTHER DEDUCTIONS AND ALLOWANCES
# =============================================================================

OTHER_DEDUCTIONS: Dict[str, Any] = {
    "tax_year": "2024/2025",
    "home_office": {
        "eligible": "Employees who work from home >50% of time with dedicated office space",
        "deductible_expenses": [
            "Pro-rata portion of rent/bond interest",
            "Pro-rata utilities (electricity, water)",
            "Pro-rata maintenance and repairs",
            "Cleaning costs"
        ],
        "note": "Must meet strict SARS requirements. Keep detailed records."
    },
    "donations": {
        "description": "Donations to approved Public Benefit Organisations (PBOs)",
        "deduction_limit": "Up to 10% of taxable income",
        "receipt_required": "Section 18A certificate from PBO required"
    },
    "wear_and_tear": {
        "description": "Depreciation on assets used for work (laptops, tools, etc.)",
        "requirement": "Asset must be used for work purposes",
        "rates": "As per SARS prescribed wear and tear schedule"
    }
}


# =============================================================================
# TAX CALCULATION FUNCTIONS
# =============================================================================

def calculate_paye_annual(annual_salary: float, age: int = 35,
                           retirement_contributions: float = 0) -> Dict[str, Any]:
    """Calculate annual PAYE tax for 2024/2025.

    Args:
        annual_salary: Gross annual remuneration in ZAR
        age: Age of taxpayer (affects rebates)
        retirement_contributions: Annual retirement fund contributions

    Returns:
        Dictionary with detailed tax calculation breakdown
    """
    # Step 1: Calculate taxable income
    taxable_income = annual_salary - retirement_contributions

    # Ensure taxable income is not negative
    if taxable_income < 0:
        taxable_income = 0

    # Step 2: Calculate tax before rebates using brackets
    tax_before_rebates = 0.0
    applicable_bracket = None

    for bracket in TAX_BRACKETS_2024_2025["brackets"]:
        if bracket["annual_income_max"] is None or taxable_income <= bracket["annual_income_max"]:
            excess = taxable_income - bracket["annual_income_min"]
            if excess < 0:
                excess = 0
            tax_before_rebates = bracket["base_tax"] + (excess * bracket["marginal_rate"])
            applicable_bracket = bracket
            break

    # If income exceeds all brackets
    if applicable_bracket is None:
        last_bracket = TAX_BRACKETS_2024_2025["brackets"][-1]
        excess = taxable_income - last_bracket["annual_income_min"]
        tax_before_rebates = last_bracket["base_tax"] + (excess * last_bracket["marginal_rate"])
        applicable_bracket = last_bracket

    # Step 3: Apply rebates based on age
    if age < 65:
        total_rebates = TAX_REBATES["total_rebates_by_age"]["under_65"]
        age_group = "under_65"
    elif age < 75:
        total_rebates = TAX_REBATES["total_rebates_by_age"]["65_to_74"]
        age_group = "65_to_74"
    else:
        total_rebates = TAX_REBATES["total_rebates_by_age"]["75_and_over"]
        age_group = "75_and_over"

    # Step 4: Calculate final tax
    final_tax = max(0, tax_before_rebates - total_rebates)

    # Step 5: Calculate effective rate
    effective_rate = (final_tax / annual_salary * 100) if annual_salary > 0 else 0
    marginal_rate = (applicable_bracket["marginal_rate"] * 100) if applicable_bracket else 0

    return {
        "tax_year": "2024/2025",
        "gross_annual_salary": round(annual_salary, 2),
        "retirement_contributions": round(retirement_contributions, 2),
        "taxable_income": round(taxable_income, 2),
        "tax_before_rebates": round(tax_before_rebates, 2),
        "age": age,
        "age_group": age_group,
        "total_rebates": total_rebates,
        "final_annual_tax": round(final_tax, 2),
        "monthly_tax": round(final_tax / 12, 2),
        "marginal_rate_percent": round(marginal_rate, 1),
        "effective_tax_rate_percent": round(effective_rate, 2),
        "applicable_bracket": applicable_bracket["bracket"] if applicable_bracket else None,
        "tax_free_threshold": TAX_THRESHOLDS["thresholds"][
            0 if age < 65 else (1 if age < 75 else 2)
        ]["threshold"]
    }


def calculate_take_home_pay(monthly_salary: float, age: int = 35,
                             retirement_contribution_percent: float = 0,
                             medical_aid_members: int = 1,
                             medical_aid_dependants: int = 0) -> Dict[str, Any]:
    """Calculate monthly take-home pay for 2024/2025.

    Args:
        monthly_salary: Gross monthly salary in ZAR
        age: Age of taxpayer
        retirement_contribution_percent: Percentage of salary to retirement (0-27.5)
        medical_aid_members: Number of medical aid principal members (usually 1)
        medical_aid_dependants: Number of additional dependants

    Returns:
        Dictionary with full payslip-style breakdown
    """
    annual_salary = monthly_salary * 12

    # Retirement contributions
    monthly_retirement = monthly_salary * (retirement_contribution_percent / 100)
    annual_retirement = monthly_retirement * 12
    max_annual_retirement = min(annual_salary * 0.275, 350_000)
    actual_annual_retirement = min(annual_retirement, max_annual_retirement)

    # Calculate PAYE
    tax_result = calculate_paye_annual(
        annual_salary=annual_salary,
        age=age,
        retirement_contributions=actual_annual_retirement
    )

    monthly_paye = tax_result["monthly_tax"]

    # UIF calculation
    uif = min(monthly_salary * 0.01, UIF_RATES["max_employee_contribution_monthly"])

    # SDL (employer only - not deducted from employee)
    sdl = 0  # Not deducted from employee

    # Medical aid credits (reduce tax payable)
    monthly_medical_credit = (
        MEDICAL_AID_CREDITS["monthly_credits"]["main_member"] * medical_aid_members +
        MEDICAL_AID_CREDITS["monthly_credits"]["each_additional_dependant"] * medical_aid_dependants
    )

    # Adjust PAYE for medical credits
    monthly_paye_after_medical = max(0, monthly_paye - monthly_medical_credit)

    # Total deductions
    total_deductions = monthly_paye_after_medical + uif + monthly_retirement
    take_home = monthly_salary - total_deductions

    # Effective rate on take-home
    effective_rate = (total_deductions / monthly_salary * 100) if monthly_salary > 0 else 0

    return {
        "tax_year": "2024/2025",
        "gross_monthly_salary": round(monthly_salary, 2),
        "deductions": {
            "paye_tax": round(monthly_paye, 2),
            "medical_tax_credit": round(monthly_medical_credit, 2),
            "paye_after_medical_credit": round(monthly_paye_after_medical, 2),
            "uif": round(uif, 2),
            "retirement_contribution": round(monthly_retirement, 2),
            "sdl": 0,  # Employer pays, not deducted
            "total_deductions": round(total_deductions, 2)
        },
        "net_take_home": round(take_home, 2),
        "effective_deduction_rate_percent": round(effective_rate, 2),
        "annual_summary": {
            "gross_annual": round(annual_salary, 2),
            "annual_tax": round(monthly_paye_after_medical * 12, 2),
            "annual_uif": round(uif * 12, 2),
            "annual_retirement": round(monthly_retirement * 12, 2),
            "annual_take_home": round(take_home * 12, 2)
        }
    }


# =============================================================================
# WORKED EXAMPLE CALCULATIONS
# =============================================================================

WORKED_EXAMPLES: List[Dict[str, Any]] = [
    {
        "example_name": "Entry-level graduate",
        "description": "Recent graduate earning R20,000/month, age 24, no medical aid",
        "monthly_salary": 20_000,
        "age": 24,
        "retirement_percent": 0,
        "medical_members": 0,
        "medical_dependants": 0,
        "result": calculate_take_home_pay(
            monthly_salary=20_000, age=24,
            retirement_contribution_percent=0,
            medical_aid_members=0, medical_aid_dependants=0
        )
    },
    {
        "example_name": "Mid-level professional",
        "description": "Professional earning R45,000/month, age 35, with medical aid and 10% pension",
        "monthly_salary": 45_000,
        "age": 35,
        "retirement_percent": 10,
        "medical_members": 1,
        "medical_dependants": 1,
        "result": calculate_take_home_pay(
            monthly_salary=45_000, age=35,
            retirement_contribution_percent=10,
            medical_aid_members=1, medical_aid_dependants=1
        )
    },
    {
        "example_name": "Senior manager",
        "description": "Senior manager earning R85,000/month, age 48, family medical aid, 15% pension",
        "monthly_salary": 85_000,
        "age": 48,
        "retirement_percent": 15,
        "medical_members": 1,
        "medical_dependants": 3,
        "result": calculate_take_home_pay(
            monthly_salary=85_000, age=48,
            retirement_contribution_percent=15,
            medical_aid_members=1, medical_aid_dependants=3
        )
    },
    {
        "example_name": "Executive earner",
        "description": "Executive earning R160,000/month, age 55, family medical aid, 20% RA contribution",
        "monthly_salary": 160_000,
        "age": 55,
        "retirement_percent": 20,
        "medical_members": 1,
        "medical_dependants": 1,
        "result": calculate_take_home_pay(
            monthly_salary=160_000, age=55,
            retirement_contribution_percent=20,
            medical_aid_members=1, medical_aid_dependants=1
        )
    },
    {
        "example_name": "Pensioner (age 68)",
        "description": "Retiree working part-time, R15,000/month, age 68, on medical aid",
        "monthly_salary": 15_000,
        "age": 68,
        "retirement_percent": 0,
        "medical_members": 1,
        "medical_dependants": 0,
        "result": calculate_take_home_pay(
            monthly_salary=15_000, age=68,
            retirement_contribution_percent=0,
            medical_aid_members=1, medical_aid_dependants=0
        )
    }
]


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "TAX_YEAR",
    "TAX_BRACKETS_2024_2025",
    "MONTHLY_TAX_BRACKETS_2024_2025",
    "TAX_REBATES",
    "TAX_THRESHOLDS",
    "UIF_RATES",
    "SDL_RATES",
    "MEDICAL_AID_CREDITS",
    "RETIREMENT_DEDUCTIONS",
    "TRAVEL_ALLOWANCE",
    "OTHER_DEDUCTIONS",
    "WORKED_EXAMPLES",
    "calculate_paye_annual",
    "calculate_take_home_pay",
]