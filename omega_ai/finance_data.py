"""
Financial Literacy Data Module
==============================
Comprehensive financial literacy content adapted for the South African context.

Includes budget categories, investment types, debt management strategies,
emergency fund guidelines, retirement planning, and a financial glossary.

All monetary values are in South African Rand (ZAR) where applicable.
Specific reference is made to SA institutions, regulations, and cultural
practices (e.g., stokvels, retirement annuity products).

Usage:
    from finance_data import (
        BUDGET_CATEGORIES, INVESTMENT_TYPES,
        DEBT_MANAGEMENT_STRATEGIES, FINANCIAL_GLOSSARY
    )
"""

from typing import Dict, List, Any


# =============================================================================
# BUDGET CATEGORIES
# =============================================================================
# Based on the 50/30/20 rule adapted for South African economic realities

BUDGET_FRAMEWORK: Dict[str, Any] = {
    "name": "50/30/20 Rule - SA Adapted",
    "description": (
        "A practical budgeting framework adapted for South African economic conditions. "
        "The standard 50/30/20 rule is adjusted to account for higher transport costs, "
        "private medical aid necessity, and variable income patterns."
    ),
    "standard_rule": {
        "needs": 0.50,
        "wants": 0.30,
        "savings_debt": 0.20,
        "description": "Standard international guideline"
    },
    "sa_adjusted_rule": {
        "needs": 0.55,
        "wants": 0.20,
        "savings_debt": 0.25,
        "description": "Adjusted for SA: higher needs due to medical aid, security, transport",
        "rationale": (
            "SA households typically spend more on private healthcare (medical aid), "
            "security, and transport. The adjustment reflects these realities while "
            "maintaining aggressive savings to counter economic volatility."
        )
    },
    "low_income_adjustment": {
        "description": "For households earning below R15,000/month",
        "needs": 0.70,
        "wants": 0.15,
        "savings_debt": 0.15,
        "note": "Focus on building a small emergency fund first, then debt repayment"
    },
    "high_income_adjustment": {
        "description": "For households earning above R60,000/month",
        "needs": 0.40,
        "wants": 0.20,
        "savings_debt": 0.40,
        "note": "Aggressive savings and investment to leverage higher disposable income"
    }
}

BUDGET_CATEGORIES: Dict[str, List[Dict[str, Any]]] = {
    "needs": [
        {
            "category": "Housing",
            "description": "Rent, bond repayments, rates, levies",
            "recommended_percent": 0.25,
            "recommended_percent_of_income": "20-30%",
            "sa_specific_notes": [
                "Bond repayments may include transfer duties and bond registration costs",
                "Municipal rates vary significantly by area (e.g., Cape Town vs. rural Limpopo)",
                "Sectional title levies cover building insurance and maintenance",
                "Renting in major cities (JHB, CPT, DBN) is increasingly expensive"
            ],
            "examples_sa": {
                "rent_1bed_cape_town_city": "R12,000 - R18,000/month",
                "rent_1bed_johannesburg": "R7,000 - R12,000/month",
                "rent_1bed_rural": "R3,000 - R5,500/month",
                "bond_repayment_1m": "~R9,500/month (over 20 years at prime)"
            }
        },
        {
            "category": "Utilities",
            "description": "Electricity, water, gas, refuse",
            "recommended_percent": 0.05,
            "recommended_percent_of_income": "3-8%",
            "sa_specific_notes": [
                "Eskom tariffs increase annually (NERSA-approved)",
                "Load shedding may require generator/solar investment",
                "Municipal rates include refuse and sewage charges",
                "Prepaid electricity often has higher per-unit costs"
            ]
        },
        {
            "category": "Transport",
            "description": "Car payments, petrol, insurance, maintenance, public transport",
            "recommended_percent": 0.10,
            "recommended_percent_of_income": "8-15%",
            "sa_specific_notes": [
                "Petrol prices are regulated and change monthly",
                "Comprehensive car insurance is essential (high accident/theft rates)",
                "e-tolls in Gauteng (though largely unenforced as of 2024)",
                "Gautrain, Rea Vaya, MyCiTi as public transport options",
                "Uber/Bolt as alternatives to car ownership in cities"
            ],
            "examples_sa": {
                "petrol_monthly_average": "R2,500 - R5,000/month",
                "car_insurance_comprehensive": "R800 - R3,500/month",
                "gautrain_monthly_pretoria_jhb": "~R1,800/month",
                "uber_commute_daily": "R3,000 - R8,000/month"
            }
        },
        {
            "category": "Groceries",
            "description": "Food, household essentials, cleaning supplies",
            "recommended_percent": 0.10,
            "recommended_percent_of_income": "8-15%",
            "sa_specific_notes": [
                "Food inflation typically higher than CPI",
                "Shop at Pick n Pay, Woolworths, Checkers, Spar, OK Foods",
                "Buy in bulk where possible; compare prices across stores",
                "Fresh produce markets often cheaper for fruit and vegetables",
                "Private label brands (No Name, Checkers Housebrand) offer savings"
            ],
            "examples_sa": {
                "single_person": "R2,500 - R4,000/month",
                "couple": "R4,500 - R7,000/month",
                "family_of_four": "R7,000 - R12,000/month"
            }
        },
        {
            "category": "Medical Aid",
            "description": "Medical scheme contributions",
            "recommended_percent": 0.05,
            "recommended_percent_of_income": "3-10%",
            "sa_specific_notes": [
                "Medical aid is effectively essential in SA (public healthcare constraints)",
                "Major providers: Discovery Health, Bonitas, Momentum Health, Medihelp, Bestmed",
                "Options range from hospital plans to comprehensive cover",
                "Gap cover recommended to cover in-hospital specialist shortfalls",
                "Medical tax credits reduce tax payable (R364/month for member)"
            ],
            "examples_sa": {
                "hospital_plan_only": "R1,500 - R3,000/month",
                "comprehensive_single": "R3,500 - R7,000/month",
                "comprehensive_family": "R7,000 - R15,000/month",
                "gap_cover": "R200 - R500/month"
            }
        },
        {
            "category": "Insurance",
            "description": "Life, disability, dread disease, car, home contents",
            "recommended_percent": 0.03,
            "recommended_percent_of_income": "2-5%",
            "sa_specific_notes": [
                "Life insurance crucial if you have dependents (funeral costs are high)",
                "Funeral cover is culturally important and widely purchased",
                "Credit life insurance covers debt in case of death/disability",
                "Compare quotes from Old Mutual, Sanlam, Liberty, Discovery Life",
                "Disability cover important given high accident rates"
            ]
        },
        {
            "category": "Security",
            "description": "Armed response, CCTV, access control",
            "recommended_percent": 0.02,
            "recommended_percent_of_income": "1-3%",
            "sa_specific_notes": [
                "Private security is often necessary in SA",
                "ADT, Fidelity ADT, Blue Security as major providers",
                "Estate levies often include security",
                "Home insurance may require specific security measures"
            ]
        }
    ],
    "wants": [
        {
            "category": "Entertainment & Dining",
            "description": "Restaurants, movies, streaming, hobbies",
            "recommended_percent": 0.05,
            "recommended_percent_of_income": "3-8%",
            "sa_specific_notes": [
                "Netflix, Showmax, Disney+, Amazon Prime available",
                "Eating out: R150-R400 per person at mid-range restaurants",
                "Braai culture is a significant social activity",
                "Movie tickets: R80-R120 (Ster-Kinekor, Nu Metro)"
            ]
        },
        {
            "category": "Personal Care",
            "description": "Clothing, hair, grooming, gym",
            "recommended_percent": 0.05,
            "recommended_percent_of_income": "3-7%",
            "sa_specific_notes": [
                "Gym memberships: Virgin Active, Planet Fitness, Viva",
                "Monthly gym: R300 - R1,200",
                "Personal grooming costs vary significantly"
            ]
        },
        {
            "category": "Travel & Holidays",
            "description": "Domestic and international travel",
            "recommended_percent": 0.05,
            "recommended_percent_of_income": "3-10%",
            "sa_specific_notes": [
                "Strong domestic tourism market (Kruger, Cape Town, Drakensberg)",
                "Holiday savings clubs popular in SA",
                "Off-peak travel significantly cheaper"
            ]
        },
        {
            "category": "Subscriptions & Miscellaneous",
            "description": "Cell phone, data, apps, miscellaneous",
            "recommended_percent": 0.05,
            "recommended_percent_of_income": "2-5%",
            "sa_specific_notes": [
                "Mobile data is expensive in SA — compare Vodacom, MTN, Cell C, Telkom",
                "Prepaid vs contract: evaluate carefully",
                " fibre Internet: R500-R1,500/month depending on speed"
            ]
        }
    ],
    "savings_and_debt": [
        {
            "category": "Emergency Fund",
            "description": "Liquid savings for unexpected expenses",
            "recommended_percent": 0.05,
            "recommended_percent_of_income": "5-10% until target reached",
            "sa_specific_notes": [
                "Target: 3-6 months of expenses (6 months recommended for SA volatility)",
                "Keep in high-interest savings account or money market",
                "Consider TymeBank, African Bank, Capitec for competitive rates",
                "Only withdraw for genuine emergencies (job loss, medical, car repairs)"
            ],
            "priority": "HIGHEST — build this FIRST"
        },
        {
            "category": "Retirement Savings",
            "description": "Pension fund, provident fund, RA contributions",
            "recommended_percent": 0.10,
            "recommended_percent_of_income": "10-20%",
            "sa_specific_notes": [
                "Tax-deductible up to 27.5% of income (capped at R350,000/year)",
                "Employer pension/provident fund contributions count",
                "Retirement Annuity (RA) for additional savings or self-employed",
                "Two-pot system allows limited pre-retirement access from Sept 2024",
                "Target: replace 70-80% of final salary in retirement"
            ],
            "priority": "HIGH — start as early as possible"
        },
        {
            "category": "Debt Repayment",
            "description": "Extra payments toward debt (above minimums)",
            "recommended_percent": 0.05,
            "recommended_percent_of_income": "5-15%",
            "sa_specific_notes": [
                "Prioritise highest-interest debt first (avalanche method)",
                "Credit cards typically 18-25% interest in SA",
                "Personal loans: 15-28% interest",
                "Pay more than minimum on vehicle finance",
                "Student debt (NSFAS) has favourable terms — lower priority"
            ],
            "priority": "HIGH — after emergency fund"
        },
        {
            "category": "Investments & Wealth Building",
            "description": "Shares, ETFs, property, unit trusts",
            "recommended_percent": 0.05,
            "recommended_percent_of_income": "5-15%",
            "sa_specific_notes": [
                "TFSA (Tax-Free Savings Account): R36,000/year limit, R500,000 lifetime",
                "Satrix, EasyEquities, FNB Shares Zero for low-cost investing",
                "Property investment through REITs or physical property",
                "Unit trusts through Allan Gray, Coronation, Nedgroup",
                "Stokvels as collective investment vehicles"
            ],
            "priority": "MEDIUM — after emergency fund and high-interest debt"
        }
    ]
}


# =============================================================================
# INVESTMENT TYPES
# =============================================================================

INVESTMENT_TYPES: Dict[str, Dict[str, Any]] = {
    "stocks_equities": {
        "name": "Stocks / Equities",
        "description": "Ownership shares in publicly listed companies on the JSE or international exchanges.",
        "risk_level": "High (short-term) / Moderate-High (long-term)",
        "expected_return_annual": "10-15% (JSE All Share long-term average, before inflation)",
        "time_horizon": "5+ years recommended",
        "sa_specific": {
            "exchanges": "Johannesburg Stock Exchange (JSE) — largest in Africa",
            "major_indices": ["FTSE/JSE All Share (J203)", "FTSE/JSE Top 40 (J200)", "FTSE/JSE SWIX"],
            "major_companies": [
                "Naspers / Prosus (tech)",
                "BHP Group (mining)",
                "Anglo American (mining)",
                "Sasol (energy/chemicals)",
                "Standard Bank / FirstRand (banking)",
                "MTN / Vodacom (telecoms)"
            ],
            "trading_platforms": [
                "EasyEquities (low cost, fractional shares)",
                "FNB Shares Zero (zero brokerage on selected shares)",
                "Standard Bank Online Share Trading",
                "SatrixNOW (ETF-focused)",
                "Luno (for crypto assets)"
            ]
        },
        "tax_treatment": {
            "capital_gains_tax": "40% inclusion rate for individuals (max effective 18%)",
            "annual_cgt_exclusion": "R40,000 annual capital gain exclusion",
            "dividends_tax": "20% dividends withholding tax",
            "tfsa_eligible": "Yes — can hold shares in a TFSA"
        },
        "advantages": [
            "Highest long-term returns among major asset classes",
            "Ownership in real businesses",
            "Dividend income potential",
            "Liquidity (can sell quickly on exchange)"
        ],
        "disadvantages": [
            "Volatility and potential for significant short-term losses",
            "Requires research and monitoring",
            "Emotional decision-making can hurt returns",
            "JSE has relatively few large-cap stocks (concentration risk)"
        ]
    },

    "bonds": {
        "name": "Bonds (Government and Corporate)",
        "description": "Fixed-income securities where you lend money to government or companies in exchange for interest.",
        "risk_level": "Low to Moderate",
        "expected_return_annual": "8-12% (SA government bonds); 7-10% (investment grade corporate)",
        "time_horizon": "2-10 years",
        "sa_specific": {
            "government_bonds": [
                "RSA Retail Savings Bonds (retail-friendly, fixed or inflation-linked)",
                "Treasury Bills (short-term, 91/182/364 days)",
                "Government bonds available through stockbrokers"
            ],
            "corporate_bonds": [
                "Listed corporate bonds on JSE Interest Rate Market",
                "Unlisted bonds through private placement"
            ],
            "yield_curve": "SA government bonds offer attractive yields relative to developed markets",
            "credit_rating": "SA sovereign rating: BB (Fitch), Ba2 (Moody's), BB- (S&P) — sub-investment grade"
        },
        "tax_treatment": {
            "interest_income_tax": "Taxed at marginal rate",
            "interest_exemption": "R23,800 exemption under 65; R34,500 for 65+",
            "capital_gains": "CGT applies if sold at a premium/discount"
        },
        "advantages": [
            "Lower volatility than stocks",
            "Predictable income stream",
            "Government bonds backed by sovereign",
            "Diversification benefit in a portfolio"
        ],
        "disadvantages": [
            "Lower returns than equities long-term",
            "Interest rate risk (bond prices fall when rates rise)",
            "Credit risk for corporate bonds",
            "SA government bonds carry country risk"
        ]
    },

    "etfs": {
        "name": "Exchange-Traded Funds (ETFs)",
        "description": "Funds that track an index, commodity, or basket of assets, traded on the stock exchange like shares.",
        "risk_level": "Moderate (varies by underlying index)",
        "expected_return_annual": "Varies by index — JSE Top 40: ~10-12%, S&P 500: ~10% (USD)",
        "time_horizon": "5+ years",
        "sa_specific": {
            "major_providers": ["Satrix", "CoreShares (now 10X)", "Absa ETFs", "Sygnia ETFs"],
            "popular_local_etfs": [
                {"ticker": "STX40", "name": "Satrix Top 40", "tracks": "FTSE/JSE Top 40"},
                {"ticker": "STXIND", "name": "Satrix Indi 25", "tracks": "FTSE/JSE India 25"},
                {"ticker": "STXQUA", "name": "Satrix Quality SA", "tracks": "S&P Quality SA Index"},
                {"ticker": "ASHGEQ", "name": "Ashburton Global 1200", "tracks": "MSCI All Country World"},
                {"ticker": "STXEMG", "name": "Satrix MSCI Emerging Markets", "tracks": "MSCI EM Index"}
            ],
            "dividend_etfs": [
                {"ticker": "STXDIV", "name": "Satrix Dividend Plus"},
                {"ticker": "COREDIV", "name": "CoreShares SA Dividend Aristocrats"}
            ],
            "property_etfs": [
                {"ticker": "STXPRO", "name": "Satrix Property"},
                {"ticker": "GLPROP", "name": "Satrix Global Property"}
            ],
            "trading_platforms": ["EasyEquities", "SatrixNOW", "FNB", "Standard Bank", "Nedbank"]
        },
        "tax_treatment": {
            "tfsa_eligible": "Yes — most ETFs can be held in a TFSA",
            "capital_gains_tax": "CGT applies on disposal",
            "dividends_tax": "20% withholding tax on dividends",
            "total_expense_ratio": "Typically 0.2% - 0.8% per annum"
        },
        "advantages": [
            "Instant diversification across many companies",
            "Low cost compared to actively managed funds",
            "Traded on exchange (liquidity)",
            "Transparent — you know exactly what you own",
            "No stock-picking expertise required"
        ],
        "disadvantages": [
            "Tracking error (may not perfectly match index)",
            "Brokerage costs on each trade",
            "Cannot outperform the index",
            "Currency risk for offshore ETFs"
        ]
    },

    "property": {
        "name": "Property Investment",
        "description": "Investment in physical real estate or property securities (REITs).",
        "risk_level": "Moderate to High",
        "expected_return_annual": "8-12% (capital growth + rental yield)",
        "time_horizon": "7+ years",
        "categories": {
            "residential_buy_to_let": {
                "description": "Purchase residential property to rent out",
                "typical_yield_gross": "6-10% gross rental yield",
                "typical_yield_net": "4-7% after expenses",
                "sa_notes": [
                    "Major cities: Johannesburg, Cape Town, Durban, Pretoria",
                    "Sectional title apartments popular for rental",
                    "Student accommodation can yield higher returns",
                    "Consider rental agent fees (typically 10% of rental)",
                    "Tenants' rights protected by Rental Housing Act"
                ]
            },
            "commercial_property": {
                "description": "Office, retail, or industrial property",
                "typical_yield": "8-12% net yield",
                "sa_notes": [
                    "Higher capital requirement",
                    "Longer lease terms (3-5 years typical)",
                    "Professional property management recommended"
                ]
            },
            "reits": {
                "description": "Real Estate Investment Trusts — property companies listed on JSE",
                "popular_sa_reits": [
                    "Growthpoint Properties",
                    "Redefine Properties",
                    "Hyprop Investments",
                    "Emira Property Fund",
                    "Fortress REIT"
                ],
                "advantages": [
                    "Liquid (trade on JSE like shares)",
                    "Lower capital requirement than physical property",
                    "Professional management",
                    "Quarterly distributions"
                ]
            },
            "property_etfs": {
                "description": "ETFs that invest in property companies",
                "examples": ["STXPRO", "GLPROP"],
                "advantage": "Instant diversification across multiple properties"
            }
        },
        "tax_treatment": {
            "rental_income": "Taxed at marginal rate after allowable deductions",
            "deductible_expenses": [
                "Bond interest", "Rates and taxes", "Insurance",
                "Maintenance and repairs", "Rental agent fees",
                "Depreciation on furniture"
            ],
            "capital_gains": "CGT applies on sale (primary residence has R2M exclusion)",
            "transfer_duty": "Progressive rates 0%-13% on purchase price"
        },
        "advantages": [
            "Tangible asset",
            "Rental income stream",
            "Potential capital appreciation",
            "Inflation hedge",
            "Leverage through bond financing"
        ],
        "disadvantages": [
            "Illiquid (takes months to sell)",
            "High transaction costs (transfer duty, conveyancing)",
            "Tenant risk (non-payment, vacancy)",
            "Maintenance responsibilities",
            "Concentration risk (large capital in single asset)"
        ]
    },

    "stokvels": {
        "name": "Stokvels",
        "description": (
            "Traditional South African collective savings/ investment groups. "
            "Members contribute regularly to a common pool for rotating payouts, "
            "savings, or investment purposes."
        ),
        "risk_level": "Low to Moderate (depends on structure)",
        "expected_return_annual": "Varies — savings stokvels: bank interest; investment stokvels: market-linked",
        "time_horizon": "Flexible (monthly to annual cycles)",
        "sa_specific": {
            "market_size": "Estimated R50+ billion industry in SA",
            "participation_rate": "Approximately 1 in 2 SA adults belong to a stokvel",
            "governing_body": "National Stokvel Association of South Africa (NASASA)",
            "registration": "Can register with NASASA for formal structure"
        },
        "types": [
            {
                "type": "Savings Stokvel",
                "description": "Members save collectively; funds withdrawn at year-end",
                "purpose": "Christmas/holiday savings, school fees, lump-sum needs"
            },
            {
                "type": "Rotating Savings (umgalelo)",
                "description": "Members take turns receiving the full pooled amount",
                "purpose": "Access to lump sums without formal credit"
            },
            {
                "type": "Investment Stokvel",
                "description": "Collective investment in shares, property, or other assets",
                "purpose": "Wealth building through collective buying power"
            },
            {
                "type": "Grocery Stokvel",
                "description": "Bulk purchasing of groceries at wholesale prices",
                "purpose": "Cost savings on household essentials"
            },
            {
                "type": "Burial Society",
                "description": "Savings for funeral expenses",
                "purpose": "Culturally essential — funerals are significant events in SA",
                "note": "Often combined with formal funeral insurance"
            },
            {
                "type": "Property Stokvel",
                "description": "Collective saving/investing to purchase property",
                "purpose": "Pool resources for property deposits or development"
            }
        ],
        "advantages": [
            "Forced savings discipline through group commitment",
            "Access to lump sums without formal credit",
            "Community support and financial education",
            "Lower barriers to entry than formal investments",
            "Social cohesion and trust-building",
            "No credit checks required"
        ],
        "disadvantages": [
            "Risk of default by members",
            "Requires trust in group members",
            "May lack formal legal protection",
            "Returns may be lower than formal investments",
            "Disputes can damage social relationships",
            "No FSCS/ deposit insurance protection"
        ],
        "success_tips": [
            "Have a written constitution/agreement",
            "Elect responsible leadership (chair, treasurer, secretary)",
            "Maintain transparent financial records",
            "Meet regularly (monthly recommended)",
            "Register with NASASA for support and credibility",
            "Open a dedicated bank account (many banks offer stokvel accounts)",
            "Set clear rules for late payments and defaults",
            "Consider formalising into an investment club for larger sums"
        ],
        "banking_options": [
            "Absa Stokvel Account",
            "FNB Stokvel Account",
            "Nedbank Stokvel Account",
            "Standard Bank Stokvel Account",
            "Shoprite/Checkers Money Market account for grocery stokvels"
        ]
    },

    "unit_trusts": {
        "name": "Unit Trusts",
        "description": "Pooled investment vehicles managed by professional fund managers. Investors buy 'units' in the fund.",
        "risk_level": "Varies by fund type (Low to High)",
        "expected_return_annual": "Varies: Money market ~7-8%, Balanced ~10-12%, Equity ~12-15%",
        "time_horizon": "3+ years (varies by fund)",
        "sa_specific": {
            "major_managers": [
                "Allan Gray", "Coronation", "Nedgroup Investments",
                "Old Mutual", "Sanlam", "Sygnia", "10X Investments",
                "Satrix (passive/index tracking)"
            ],
            "categories": [
                "Money Market (lowest risk)",
                "Income/Bond funds",
                "Balanced funds (multi-asset)",
                "Equity funds (highest risk/return)",
                "Global/Offshore funds"
            ],
            "regulator": "Financial Sector Conduct Authority (FSCA)",
            "platforms": [
                "Allan Gray Investment Platform",
                "Coronation Fund Managers",
                "Nedgroup Private Wealth",
                "Old Mutual Wealth",
                "EasyEquities (unit trusts available)",
                "LISP platforms (Linked Investment Service Providers)"
            ]
        },
        "tax_treatment": {
            "interest": "Taxed at marginal rate (with interest exemption)",
            "dividends": "20% dividends tax withheld",
            "capital_gains": "CGT on gains when units sold",
            "tfsa_eligible": "Select unit trusts available in TFSA wrapper"
        },
        "advantages": [
            "Professional management",
            "Diversification",
            "Accessible with small amounts (R500/month typical)",
            "Regulated by FSCA",
            "Wide range of risk profiles available"
        ],
        "disadvantages": [
            "Management fees (total expense ratio 0.5% - 2.5%+)",
            "Active funds may underperform index/ETFs after fees",
            "Some have minimum investment periods",
            "Potential capital gains tax on switching"
        ]
    },

    "tax_free_savings": {
        "name": "Tax-Free Savings Account (TFSA)",
        "description": (
            "Government-incentivised savings wrapper where all growth "
            "(interest, dividends, capital gains) is completely tax-free."
        ),
        "risk_level": "Varies by underlying investment",
        "expected_return_annual": "Depends on underlying investment (equity TFSA: 10-15%)",
        "time_horizon": "Long-term (10+ years for equity TFSA)",
        "sa_specific": {
            "annual_contribution_limit": 36_000,
            "lifetime_contribution_limit": 500_000,
            "launch_date": "1 March 2015",
            "excess_contribution_penalty": "40% tax on contributions above annual limit",
            "providers": [
                "EasyEquities (TFSA with ETFs/shares)",
                "SatrixNOW (TFSA with Satrix ETFs)",
                "Allan Gray (TFSA with unit trusts)",
                "FNB (TFSA with ETF portfolios)",
                "Standard Bank",
                "Old Mutual",
                "Sygnia",
                "10X Investments"
            ],
            "popular_tfsa_investments": [
                "Satrix MSCI World (offshore exposure)",
                "Satrix Top 40 (local equity)",
                "Satrix Emerging Markets",
                "Allan Gray Equity Fund",
                "Money market for short-term savings"
            ]
        },
        "advantages": [
            "All returns completely tax-free (no CGT, no dividends tax, no income tax)",
            "Flexible — can withdraw anytime (but cannot replace withdrawn amounts)",
            "Wide investment choice",
            "No minimum investment period",
            "Compound growth significantly enhanced by tax savings over long term"
        ],
        "disadvantages": [
            "Annual limit of R36,000 (R3,000/month)",
            "Lifetime limit of R500,000",
            "Excess contributions taxed at 40%",
            "Withdrawn amounts cannot be re-contributed"
        ],
        "strategy_tips": [
            "Maximise R36,000/year contribution every year",
            "Use for equity investments (not cash) to maximise tax benefit",
            "Start early — compound growth is the biggest advantage",
            "Do NOT withdraw unless absolutely necessary",
            "Pass on to heirs (no estate duty on TFSA assets)",
            "Compare fees across providers"
        ]
    }
}


# =============================================================================
# DEBT MANAGEMENT STRATEGIES
# =============================================================================

DEBT_MANAGEMENT_STRATEGIES: Dict[str, Any] = {
    "overview": {
        "description": (
            "South Africa has high levels of household debt. The National Credit Act (NCA) "
            "regulates credit and protects consumers. Effective debt management is essential "
            "for financial health."
        ),
        "debt_statistics_sa": {
            "household_debt_to_income": "Approximately 62-65% of disposable income",
            "credit_active_consumers": "~25 million credit-active consumers",
            "impaired_records": "~38% of credit-active consumers have impaired records",
            "source": "National Credit Regulator (NCR) data"
        }
    },
    "strategies": [
        {
            "name": "Debt Avalanche",
            "description": "Pay off highest-interest debt first while making minimum payments on others.",
            "steps": [
                "List all debts with their interest rates",
                "Order from highest to lowest interest rate",
                "Pay minimum on all debts",
                "Put all extra money toward highest-interest debt",
                "When highest is paid off, move to next highest"
            ],
            "advantages": ["Mathematically optimal — saves most money on interest", "Reduces total interest paid significantly"],
            "disadvantages": ["May take longer to see first debt cleared", "Requires discipline"],
            "best_for": "People who are motivated by mathematical optimisation"
        },
        {
            "name": "Debt Snowball",
            "description": "Pay off smallest debt first to build momentum, then move to larger debts.",
            "steps": [
                "List all debts from smallest to largest balance",
                "Pay minimum on all debts",
                "Put all extra money toward smallest debt",
                "When smallest is cleared, roll that payment to next smallest"
            ],
            "advantages": ["Quick wins build motivation and confidence", "Psychological momentum"],
            "disadvantages": ["May pay more in total interest than avalanche method"],
            "best_for": "People who need motivation from quick wins"
        },
        {
            "name": "Debt Consolidation",
            "description": "Combine multiple debts into a single loan with lower interest rate.",
            "sa_options": [
                "Personal loan from bank (Absa, FNB, Nedbank, Standard Bank)",
                "Debt consolidation loan from specialist lenders",
                "Home loan top-up (if you have equity in your property)",
                "Credit card balance transfer (some banks offer 0% for limited period)"
            ],
            "advantages": ["Single monthly payment", "Potentially lower interest rate", "Simpler to manage"],
            "disadvantages": ["May extend repayment period", "Risk of accumulating new debt", "Fees may apply"],
            "warning": "Do NOT consolidate and then rack up new debt on cleared accounts"
        },
        {
            "name": "Debt Counselling (Debt Review)",
            "description": (
                "Formal process under the National Credit Act where a registered debt counsellor "
                "negotiates reduced payments with creditors."
            ),
            "process": [
                "Apply to registered debt counsellor (check NCR registration)",
                "Debt counsellor assesses your financial situation",
                "If over-indebted, debt counsellor negotiates with creditors",
                "Court order may be obtained to make arrangement binding",
                "Make single reduced monthly payment through Payment Distribution Agent (PDA)"
            ],
            "advantages": [
                "Legal protection from creditors",
                "Reduced monthly payments",
                "Assets protected from repossession",
                "Structured path to becoming debt-free"
            ],
            "disadvantages": [
                "Cannot take on new credit while under debt review",
                "Credit bureau listing indicates debt review status",
                "Debt counsellor fees apply",
                "Process can take 3-5 years to complete"
            ],
            "registered_debt_counsellors": "Check NCR website (ncr.org.za) for registered practitioners",
            "note": "Debt review is NOT the same as administration or sequestration"
        },
        {
            "name": "Administration Order",
            "description": "Court order for debt management under the Magistrates' Courts Act.",
            "applicable_when": "Total debt less than R50,000",
            "advantages": ["Legal protection", "Affordable for small debts"],
            "disadvantages": ["Debt limit of R50,000", "Limited flexibility"]
        },
        {
            "name": "Voluntary Sequestration",
            "description": "Legal process where you declare yourself insolvent. Assets sold to pay creditors.",
            "consequences": [
                "All assets surrendered to trustee",
                "Credit record severely affected for 10 years",
                "Rehabilitation possible after certain period",
                "May have to pay portion of future income to estate"
            ],
            "last_resort": "Only consider when all other options exhausted"
        }
    ],
    "debt_priority_order": {
        "description": "Recommended order for paying off debts",
        "priority_1": {
            "category": "Payday loans / Mashonisa loans",
            "reason": "Extortionate interest rates (often 50-200%+)",
            "action": "Eliminate ASAP — consider debt counselling"
        },
        "priority_2": {
            "category": "Credit cards",
            "reason": "High interest (18-27% in SA)",
            "action": "Pay more than minimum; consider balance transfer"
        },
        "priority_3": {
            "category": "Personal loans / Store accounts",
            "reason": "High interest (15-28%)",
            "action": "Aggressive repayment after credit cards"
        },
        "priority_4": {
            "category": "Vehicle finance",
            "reason": "Moderate interest (prime + 2% to prime + 6%)",
            "action": "Pay extra when possible; consider selling if unaffordable"
        },
        "priority_5": {
            "category": "Home loan",
            "reason": "Lower interest (prime - 0.5% to prime + 3%)",
            "action": "Pay extra when higher-interest debt cleared"
        },
        "priority_6": {
            "category": "Student loans (NSFAS)",
            "reason": "Favourable terms; income-contingent repayment",
            "action": "Lower priority; maintain minimum payments"
        }
    },
    "tips_for_sa": [
        "Check your credit report free annually at credit bureaus (TransUnion, Experian, Compuscan)",
        "Understand the difference between good debt (home loan, education) and bad debt (payday loans, excessive consumer debt)",
        "Never ignore debt — it grows and damages your credit record",
        "Communicate with creditors if you cannot pay — many offer hardship programmes",
        "Avoid Mashonisa (informal money lenders) — rates are predatory",
        "Be cautious of debt consolidation offers — read the fine print",
        "If using a debt counsellor, verify their NCR registration",
        "Build an emergency fund to avoid future debt for unexpected expenses",
        "Review bank fees — switching banks can save significant money",
        "Consider a side hustle to accelerate debt repayment"
    ]
}


# =============================================================================
# EMERGENCY FUND GUIDELINES
# =============================================================================

EMERGENCY_FUND: Dict[str, Any] = {
    "description": (
        "An emergency fund is cash set aside for unexpected financial shocks. "
        "In South Africa's volatile economy with high unemployment, this is CRITICAL."
    ),
    "sa_context": {
        "unemployment_rate": "Approximately 32-33% (expanded definition)",
        "economic_volatility": "High — load shedding, currency fluctuation, political uncertainty",
        "job_security": "Lower than developed markets — retrenchments common",
        "reason_for_larger_fund": "SA's economic volatility justifies a larger emergency fund (6 months vs. 3 months)"
    },
    "targets": {
        "single_earner_no_dependents": {
            "minimum_months": 3,
            "recommended_months": 6,
            "ideal_months": 6,
            "rationale": "Single person can survive on less but needs buffer for job search"
        },
        "single_earner_with_dependents": {
            "minimum_months": 6,
            "recommended_months": 6,
            "ideal_months": 9,
            "rationale": "Dependents increase essential expenses significantly"
        },
        "dual_income_no_dependents": {
            "minimum_months": 3,
            "recommended_months": 4,
            "ideal_months": 6,
            "rationale": "Second income provides some buffer"
        },
        "dual_income_with_dependents": {
            "minimum_months": 4,
            "recommended_months": 6,
            "ideal_months": 9,
            "rationale": "Family needs plus economic uncertainty justify larger fund"
        },
        "self_employed": {
            "minimum_months": 6,
            "recommended_months": 9,
            "ideal_months": 12,
            "rationale": "Income variability requires larger buffer"
        }
    },
    "where_to_keep": {
        "priority": "Must be LIQUID and ACCESSIBLE",
        "options_sa": [
            {
                "option": "High-interest savings account",
                "providers": ["TymeBank", "African Bank", "Capitec", "Discovery Bank"],
                "interest_range": "7-10% per annum",
                "access": "Immediate",
                "notes": "Best balance of interest and accessibility"
            },
            {
                "option": "Money Market Account",
                "providers": ["Allan Gray", "Coronation", "Nedbank", "FNB"],
                "interest_range": "7.5-9.5% per annum",
                "access": "1-3 business days",
                "notes": "Slightly better rates; good for larger amounts"
            },
            {
                "option": "Money Market Unit Trust",
                "providers": ["Allan Gray", "Coronation", "Sygnia"],
                "interest_range": "7-9% per annum",
                "access": "2-3 business days",
                "notes": "Professional management; slightly higher fees"
            },
            {
                "option": "Notice Deposit",
                "providers": ["Most major banks"],
                "interest_range": "7.5-9% per annum",
                "access": "32-90 days notice",
                "notes": "Better rates but less accessible — use for portion of fund"
            }
        ],
        "avoid": [
            "Fixed deposits (locked in)",
            "Shares/ETFs (volatile)",
            "Property (illiquid)",
            "Under the mattress (no interest, theft risk)"
        ]
    },
    "building_strategy": [
        {"step": 1, "action": "Start with R1,000 'starter emergency fund'", "timeline": "Week 1"},
        {"step": 2, "action": "Pay off high-interest debt (credit cards, payday loans)", "timeline": "Months 1-6"},
        {"step": 3, "action": "Build to 1 month of expenses", "timeline": "Months 3-8"},
        {"step": 4, "action": "Build to 3 months of expenses", "timeline": "Months 6-12"},
        {"step": 5, "action": "Build to 6 months of expenses", "timeline": "Year 1-2"},
        {"step": 6, "action": "Build to target (6-12 months depending on situation)", "timeline": "Year 2-3"}
    ],
    "what_counts_as_emergency": [
        "Job loss or retrenchment",
        "Medical emergency not covered by medical aid",
        "Major car repairs (if car essential for work)",
        "Urgent home repairs (burst geyser, roof damage)",
        "Funeral expenses (culturally significant in SA)",
        "Unexpected travel for family emergency"
    ],
    "what_is_not_emergency": [
        "Holiday or travel",
        "New phone or gadget",
        "Sale at favourite store",
        "Wedding or celebration",
        "Investment opportunity",
        "Gifts"
    ],
    "replenishment_rule": "If you use your emergency fund, pause other savings until it is replenished."
}


# =============================================================================
# RETIREMENT PLANNING
# =============================================================================

RETIREMENT_PLANNING: Dict[str, Any] = {
    "sa_context": {
        "state_pension": {
            "old_age_grant": "R2,180/month (2024/2025) for people 60+",
            "old_age_grant_75+": "R2,200/month (slightly higher for 75+)",
            "means_test": "Must pass means test — not available to those with sufficient assets/income",
            "reality_check": "State pension is NOT sufficient to maintain any reasonable standard of living"
        },
        "retirement_age": {
            "formal_sector": "Typically 60-65 (varies by employer)",
            "state_pension_age": 60,
            "early_retirement_possible": "Yes, from age 55 for most retirement funds"
        },
        "replacement_ratio": {
            "description": "Percentage of final salary needed in retirement",
            "minimum": "60-70%",
            "comfortable": "75-85%",
            "luxury": "90%+"
        },
        "key_challenges": [
            "High unemployment means interrupted contributions",
            "Early withdrawals deplete savings (Two-Pot System aims to address this)",
            "Longevity risk — living longer than savings last",
            "Inflation eroding purchasing power",
            "Dependency on family members who may also struggle"
        ]
    },
    "retirement_products": {
        "pension_fund": {
            "description": "Employer-sponsored retirement fund. Contributions deducted from salary.",
            "contributions": "Usually employer + employee contributions (e.g., 7% + 7%)",
            "tax_treatment": "Contributions tax-deductible (up to 27.5% of income, R350k cap)",
            "at_retirement": "Can take up to 1/3 as lump sum (taxed), must buy annuity with 2/3",
            "access": "Generally accessible from age 55; on resignation/retrenchment/retirement",
            "two_pot": "From Sept 2024: savings component (1/3 of future contributions) accessible; vested component preserved"
        },
        "provident_fund": {
            "description": "Similar to pension fund but historically allowed full lump sum withdrawal.",
            "note": "Post-March 2021 contributions treated same as pension fund (1/3 lump sum, 2/3 annuity)"
        },
        "retirement_annuity": {
            "description": "Personal retirement savings vehicle, typically for self-employed or those wanting extra savings.",
            "who_should_consider": [
                "Self-employed individuals",
                "Those whose employer fund is insufficient",
                "People wanting additional retirement savings",
                "Those wanting to maximise tax deductions"
            ],
            "advantages": [
                "Tax-deductible contributions (up to overall 27.5% limit)",
                "Creditor protection (RA assets protected from creditors)",
                " disciplined savings (cannot access before age 55 except emigration)",
                "Compulsory preservation"
            ],
            "disadvantages": [
                "Locked in until age 55 (limited flexibility)",
                "Costs and fees vary significantly",
                "Post-retirement: must buy living annuity or guaranteed annuity",
                "Regulation 28 limits offshore exposure to 45%"
            ],
            "providers_sa": ["Allan Gray", "Coronation", "Nedgroup", "Old Mutual", "Liberty", "10X Investments", "Sygnia"],
            "investment_limits": {
                "regulation_28": "Limits on asset classes (max 75% equity, max 25% property, max 45% offshore)",
                "note": "Limits exist to protect retirement savings from excessive risk"
            }
        },
        "preservation_fund": {
            "description": "Vehicle to preserve retirement savings when changing jobs.",
            "purpose": "Transfer savings from employer fund when resigning — preserves tax benefits",
            "advantage": "Avoids tax on withdrawal; keeps savings growing",
            "one_withdrawal": "Allowed one full or partial withdrawal before retirement"
        },
        "living_annuity": {
            "description": "Post-retirement product where you draw income from invested savings.",
            "drawdown_limits": "2.5% to 17.5% of capital per annum",
            "flexibility": "Can adjust drawdown rate annually; choice of underlying investments",
            "risk": "Capital can be depleted if drawdown too high or returns poor",
            "inheritance": "Balance passes to heirs on death"
        },
        "guaranteed_annuity": {
            "description": "Insurance product providing guaranteed income for life.",
            "advantages": ["No investment risk", "Guaranteed income for life", "Peace of mind"],
            "disadvantages": ["No flexibility", "Typically lower initial income", "No inheritance for heirs"],
            "types": ["Level annuity (fixed)", "Inflation-linked annuity (increases with inflation)", "With-profit annuity"]
        }
    },
    "savings_guidelines": {
        "rule_of_thumb": "Save 15% of gross salary from age 25 for 40 years",
        "by_age": {
            "age_30": "1x annual salary saved",
            "age_40": "3x annual salary saved",
            "age_50": "6x annual salary saved",
            "age_60": "8x annual salary saved",
            "age_65": "10-12x annual salary saved"
        },
        "late_start_adjustments": {
            "starting_at_35": "Save 20-22% of salary",
            "starting_at_40": "Save 25-30% of salary",
            "starting_at_45": "Save 35-40% of salary",
            "starting_at_50": "Save 45-50% of salary; consider working longer"
        }
    }
}


# =============================================================================
# FINANCIAL GLOSSARY (50+ TERMS)
# =============================================================================

FINANCIAL_GLOSSARY: Dict[str, str] = {
    # A
    "annuity": "A financial product that provides regular income payments, typically purchased at retirement. Can be guaranteed (fixed for life) or living (investment-based with drawdown limits).",
    "asset": "Any resource with economic value that an individual or entity owns with the expectation that it will provide future benefit.",
    "asset_allocation": "The strategy of dividing investments among different asset categories (stocks, bonds, cash, property) to balance risk and return.",
    "annual_percentage_rate": "The annual rate charged for borrowing or earned through an investment, expressed as a single percentage.",

    # B
    "bond": "A fixed-income instrument representing a loan made by an investor to a borrower (government or corporation). The borrower pays periodic interest and returns the principal at maturity.",
    "budget": "A plan for spending and saving money based on expected income and expenses over a specific period.",
    "bear_market": "A market condition where prices fall 20% or more from recent highs, accompanied by widespread pessimism.",
    "bull_market": "A market condition where prices rise consistently, accompanied by investor optimism and confidence.",
    "black_tax": "Colloquial South African term for the financial responsibility many Black professionals have toward extended family members, impacting personal wealth building.",

    # C
    "compound_interest": "Interest calculated on the initial principal and also on the accumulated interest of previous periods. Described as 'interest on interest' — the most powerful force in wealth building.",
    "credit_score": "A numerical rating representing your creditworthiness, based on your credit history. In SA, ranges from 300-850+ with major bureaus (TransUnion, Experian, Compuscan).",
    "capital_gains_tax": "Tax on the profit made from selling an asset (shares, property) for more than its purchase price. In SA, individuals pay tax on 40% of the gain at their marginal rate.",
    "cash_flow": "The movement of money into and out of your accounts. Positive cash flow means more coming in than going out.",
    "credit_counselling": "Professional advice and assistance for managing debt. In SA, must be provided by NCR-registered debt counsellors.",

    # D
    "debt_to_income_ratio": "The percentage of your monthly gross income that goes toward debt payments. Lenders use this to assess borrowing capacity.",
    "diversification": "Spreading investments across different asset classes, sectors, and geographies to reduce risk.",
    "dividend": "A distribution of a portion of a company's earnings to shareholders. In SA, dividends are subject to 20% dividends withholding tax.",
    "defined_benefit_fund": "A pension fund where retirement benefit is calculated using a formula (typically based on salary and years of service).",
    "defined_contribution_fund": "A pension fund where retirement benefit depends on contributions made and investment returns earned.",

    # E
    "emergency_fund": "Cash savings set aside for unexpected expenses or financial emergencies. In SA, 6 months of expenses is recommended.",
    "etf": "Exchange-Traded Fund — a basket of securities that tracks an index, commodity, or sector, traded on a stock exchange like a share.",
    "equity": "Ownership interest in a company, represented by shares. Also refers to the value of a property minus outstanding mortgage.",
    "effective_tax_rate": "The actual percentage of your total income that you pay in tax, after all deductions and rebates. Always lower than the marginal rate.",
    "estate_duty": "Tax on the estate of a deceased person. In SA, 20% on estates above R3.5 million (with spousal rollover).",

    # F
    "fixed_deposit": "A savings account where money is deposited for a fixed term at a fixed interest rate. Early withdrawal typically incurs penalties.",
    "frugal": "Being economical in spending; making conscious choices to spend less without compromising quality of life.",
    "fund_manager": "A professional who manages investment funds, making decisions about what securities to buy and sell.",
    "financial_advisor": "A professional who provides guidance on financial matters. In SA, should be registered with the FSCA.",

    # G
    "gross_income": "Total income before any deductions (tax, UIF, pension contributions).",
    "group_scheme": "Insurance or investment products offered through an employer or organisation, typically at discounted rates.",
    "guaranteed_annuity": "An insurance product that pays a guaranteed income for life in exchange for a lump sum.",

    # H
    "hedge": "An investment made to reduce the risk of adverse price movements in an asset. Used for protection rather than growth.",
    "home_equity": "The difference between the market value of your property and the outstanding balance on your home loan.",

    # I
    "inflation": "The rate at which the general level of prices for goods and services rises, eroding purchasing power. SA target: 3-6% (CPI).",
    "interest_rate": "The cost of borrowing money or the return on lending/investing money, expressed as a percentage.",
    "investment_horizon": "The length of time an investor expects to hold an investment before needing the money.",
    "income_tax": "Tax levied by government on personal income. In SA, administered by SARS using a progressive tax system.",

    # J
    "jse": "Johannesburg Stock Exchange — the largest stock exchange in Africa, where SA companies' shares are traded.",
    "joint_account": "A bank or investment account shared by two or more people, commonly used by couples.",

    # K
    "knowledge_economy": "An economy where growth is driven by knowledge, information, and skills rather than material resources.",

    # L
    "liquidity": "How quickly and easily an asset can be converted to cash without significant loss of value.",
    "living_annuity": "A post-retirement investment product where you draw income from invested capital, with drawdown between 2.5% and 17.5% annually.",
    "lump_sum": "A single payment of money, as opposed to instalments. In retirement context, the portion that can be taken as cash.",

    # M
    "marginal_tax_rate": "The tax rate applied to your last rand of income — the highest bracket you fall into.",
    "medical_tax_credit": "A tax credit for medical aid contributions. R364/month for the member and first dependant; R246/month for additional dependants (2024/2025).",
    "money_market": "A segment of the financial market for short-term borrowing and lending. Money market funds offer capital preservation with modest returns.",
    "municipal_bonds": "Bonds issued by local government authorities to fund infrastructure projects.",
    "mutual_fund": "Pooled investment vehicle managed by professionals. In SA, commonly called unit trusts.",

    # N
    "net_worth": "The difference between your total assets and total liabilities. A key measure of financial health.",
    "ncr": "National Credit Regulator — the South African body that regulates the credit industry and protects consumers.",
    "nsfas": "National Student Financial Aid Scheme — government-backed student loans for tertiary education in SA.",
    "nominal_return": "The return on an investment before adjusting for inflation.",

    # O
    "over_indebted": "A state where your total debt payments exceed your ability to pay, after covering essential living expenses.",
    "offshore_investing": "Investing in assets outside South Africa to diversify currency and country risk.",

    # P
    "paye": "Pay-As-You-Earn — the system where employers deduct income tax from employees' salaries and pay it to SARS monthly.",
    "pension_fund": "A retirement fund where contributions from employer and employee are invested to provide retirement benefits.",
    "portfolio": "A collection of investments held by an individual or institution.",
    "prime_rate": "The interest rate charged by banks to their most creditworthy customers. Serves as a benchmark for other lending rates in SA.",
    "provident_fund": "Similar to a pension fund but historically allowed full lump sum withdrawal at retirement.",
    "preservation_fund": "A retirement product that preserves savings when changing jobs, maintaining tax benefits.",

    # R
    "retirement_annuity": "A personal retirement savings plan offering tax benefits. Contributions are tax-deductible; assets are protected from creditors.",
    "return_on_investment": "The gain or loss on an investment relative to the amount invested, expressed as a percentage.",
    "risk_profile": "An assessment of an investor's willingness and ability to take investment risks.",
    "real_return": "The return on an investment after adjusting for inflation. The true measure of purchasing power growth.",
    "rebate": "A deduction from tax payable. In SA, primary rebate is R17,235 for all taxpayers (2024/2025).",

    # S
    "sars": "South African Revenue Service — the government agency responsible for tax collection and customs.",
    "sdl": "Skills Development Levy — 1% of payroll paid by employers to fund skills training via SETAs.",
    "stokvel": "A traditional South African savings collective where members contribute regularly to a common pool for savings, investment, or rotating payouts.",
    "shares": "Units of ownership in a company. Also called stocks or equities.",
    "savings_rate": "The percentage of income that is saved rather than spent. A key determinant of long-term wealth.",

    # T
    "tax_free_savings_account": "A savings wrapper where all returns (interest, dividends, capital gains) are completely tax-free. Annual limit: R36,000; lifetime limit: R500,000.",
    "total_expense_ratio": "The total cost of owning an investment fund, expressed as a percentage of assets under management.",
    "trust": "A legal arrangement where assets are held by trustees for the benefit of beneficiaries. Used for estate planning and asset protection.",
    "two_pot_system": "Retirement reform from Sept 2024 dividing retirement savings into a savings component (accessible) and vested component (preserved).",

    # U
    "uif": "Unemployment Insurance Fund — provides short-term financial relief to workers who lose their jobs, become ill, or take maternity leave.",
    "unit_trust": "A pooled investment vehicle where investors buy units. The most common form of collective investment in SA.",

    # V
    "volatility": "The degree of variation in investment returns over time. Higher volatility means larger price swings.",
    "vested_rights": "Benefits that have been earned and cannot be taken away, typically referring to retirement savings.",

    # W
    "will": "A legal document specifying how a person's assets should be distributed after death. Essential for estate planning.",
    "withdrawal": "Taking money out of an investment or savings account. Early withdrawal from retirement funds typically incurs tax penalties.",
    "wealth_building": "The process of accumulating assets and net worth over time through saving, investing, and debt management.",

    # Y
    "yield": "The income return on an investment, expressed as a percentage. Can refer to dividends, interest, or rental income.",

    # Z
    "zero_based_budgeting": "A budgeting method where income minus expenses equals zero — every rand is assigned a purpose."
}


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "BUDGET_FRAMEWORK",
    "BUDGET_CATEGORIES",
    "INVESTMENT_TYPES",
    "DEBT_MANAGEMENT_STRATEGIES",
    "EMERGENCY_FUND",
    "RETIREMENT_PLANNING",
    "FINANCIAL_GLOSSARY",
]