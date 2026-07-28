"""
Real Estate & Property Calculator Module
========================================
South Africa-focused property calculations including bond repayments,
rental yield, transfer duty, capital gains tax, and buy-vs-rent analysis.

All methods return dictionaries with 'result', 'data', and 'status' keys.
Uses 2024 SA transfer duty brackets and current prime rate reference.
"""

from typing import Dict, Optional


class RealEstateCalculator:
    """South African real estate and property financial calculator.
    Covers home loans, rental yield, transfer duty, capital gains tax,
    and buy-versus-rent analysis using SA-specific rates and brackets."""

    # --- SA Transfer Duty brackets 2024 (1 March 2024 – 28 Feb 2025) ---
    # Source: SARS transfer duty tables for natural persons
    _TRANSFER_DUTY_BRACKETS_2024 = [
        (0, 1_100_000, 0.0, 0.0),            # No duty up to R1.1m
        (1_100_001, 1_512_500, 0.03, 0),       # 3% of amount above R1.1m
        (1_512_501, 2_117_500, 0.06, 12_375),  # R12,375 + 6% above R1,512,500
        (2_117_501, 2_722_500, 0.08, 48_675),  # R48,675 + 8% above R2,117,500
        (2_722_501, 12_100_000, 0.11, 97_075), # R97,075 + 11% above R2,722,500
        (12_100_001, 999_999_999, 0.13, 1_128_625),  # R1,128,625 + 13% above R12.1m
    ]

    # --- CGT parameters for SA individuals (2024 tax year) ---
    _CGT_ANNUAL_EXCLUSION = 40_000          # R40,000 annual exclusion
    _CGT_INCLUSION_RATE = 0.40              # 40% of gain included in taxable income
    _CGT_PRIMARY_RESIDENCE_EXCLUSION = 2_000_000  # R2m primary residence exclusion

    # --- Default interest rate reference ---
    DEFAULT_PRIME_RATE = 11.75              # SA prime rate (%)

    def calculate_bond(
        self,
        purchase_price: float,
        deposit: float = 0,
        interest_rate: float = 11.75,
        years: int = 20,
    ) -> dict:
        """Calculate monthly bond repayment and affordability for a South African home loan.

        Uses the standard amortising loan formula (reducing balance).

        Args:
            purchase_price: Property purchase price in ZAR.
            deposit: Deposit amount in ZAR (default: 0 = 100% bond).
            interest_rate: Annual interest rate in percent (default: 11.75%).
            years: Loan term in years (default: 20).

        Returns:
            Dictionary with monthly repayment, total interest, total cost,
            loan-to-value ratio, and affordability indicators.
        """
        if purchase_price <= 0:
            return {
                "result": "Invalid input",
                "data": {"error": "Purchase price must be greater than zero."},
                "status": "error",
            }

        if deposit < 0 or deposit >= purchase_price:
            return {
                "result": "Invalid input",
                "data": {"error": "Deposit must be non-negative and less than purchase price."},
                "status": "error",
            }

        if interest_rate <= 0 or years <= 0:
            return {
                "result": "Invalid input",
                "data": {"error": "Interest rate and years must be positive."},
                "status": "error",
            }

        loan_amount = purchase_price - deposit
        ltv_ratio = (loan_amount / purchase_price) * 100
        monthly_rate = interest_rate / 100 / 12
        num_payments = years * 12

        # Monthly repayment (amortising loan formula)
        if monthly_rate == 0:
            monthly_payment = loan_amount / num_payments
        else:
            monthly_payment = loan_amount * (
                monthly_rate * (1 + monthly_rate) ** num_payments
            ) / ((1 + monthly_rate) ** num_payments - 1)

        total_repayment = monthly_payment * num_payments
        total_interest = total_repayment - loan_amount
        total_cost = purchase_price + total_interest

        # Affordability indicators
        # SA banks typically require gross monthly income >= 3× the instalment
        min_gross_monthly_income = monthly_payment * 3
        # Interest paid as % of purchase price
        interest_as_pct_purchase = (total_interest / purchase_price) * 100

        return {
            "result": f"Monthly repayment: R{monthly_payment:,.2f} over {years} years",
            "data": {
                "purchase_price": round(purchase_price, 2),
                "deposit": round(deposit, 2),
                "loan_amount": round(loan_amount, 2),
                "loan_to_value_pct": round(ltv_ratio, 2),
                "interest_rate_annual_pct": interest_rate,
                "loan_term_years": years,
                "total_payments": num_payments,
                "monthly_repayment": round(monthly_payment, 2),
                "total_repayment": round(total_repayment, 2),
                "total_interest": round(total_interest, 2),
                "total_cost_including_interest": round(total_cost, 2),
                "interest_as_pct_of_purchase": round(interest_as_pct_purchase, 2),
                "affordability": {
                    "min_gross_monthly_income_required": round(min_gross_monthly_income, 2),
                    "rule_of_thumb": "Monthly bond repayment should not exceed 30% of gross monthly income.",
                },
                "note": (
                    f"At prime rate ({interest_rate}%), total interest paid is "
                    f"R{total_interest:,.2f} — {interest_as_pct_purchase:.1f}% of the purchase price."
                ),
            },
            "status": "success",
        }

    def calculate_rental_yield(
        self,
        purchase_price: float,
        monthly_rent: float,
        monthly_expenses: float = 0,
    ) -> dict:
        """Calculate gross and net rental yield for an investment property.

        Args:
            purchase_price: Total property purchase price in ZAR.
            monthly_rent: Monthly rental income in ZAR.
            monthly_expenses: Estimated monthly operating expenses
                              (rates, levies, maintenance, management) in ZAR.

        Returns:
            Dictionary with gross yield, net yield, and annual figures.
        """
        if purchase_price <= 0 or monthly_rent < 0:
            return {
                "result": "Invalid input",
                "data": {"error": "Purchase price must be > 0 and rent must be >= 0."},
                "status": "error",
            }

        annual_rent = monthly_rent * 12
        annual_expenses = monthly_expenses * 12
        net_annual_income = annual_rent - annual_expenses

        gross_yield_pct = (annual_rent / purchase_price) * 100
        net_yield_pct = (net_annual_income / purchase_price) * 100

        # Typical expense benchmarks for SA
        expense_benchmark_pct = 25  # typical operating expenses as % of rental income
        estimated_expenses = annual_rent * (expense_benchmark_pct / 100)
        net_yield_with_benchmark = ((annual_rent - estimated_expenses) / purchase_price) * 100

        return {
            "result": f"Gross yield: {gross_yield_pct:.2f}% | Net yield: {net_yield_pct:.2f}%",
            "data": {
                "purchase_price": round(purchase_price, 2),
                "monthly_rent": round(monthly_rent, 2),
                "monthly_expenses_provided": round(monthly_expenses, 2),
                "annual_rental_income": round(annual_rent, 2),
                "annual_expenses": round(annual_expenses, 2),
                "net_annual_income": round(net_annual_income, 2),
                "gross_yield_pct": round(gross_yield_pct, 2),
                "net_yield_pct": round(net_yield_pct, 2),
                "benchmark": {
                    "typical_expense_pct_of_rent": expense_benchmark_pct,
                    "estimated_annual_expenses": round(estimated_expenses, 2),
                    "estimated_net_yield_pct": round(net_yield_with_benchmark, 2),
                    "note": "Typical SA operating expenses are 20–30% of rental income.",
                },
                "assessment": self._assess_yield(gross_yield_pct),
            },
            "status": "success",
        }

    def _assess_yield(self, gross_yield_pct: float) -> str:
        """Provide a qualitative assessment of rental yield."""
        if gross_yield_pct >= 10:
            return "Excellent yield — strong cash flow potential."
        elif gross_yield_pct >= 7:
            return "Good yield — above average for most SA markets."
        elif gross_yield_pct >= 5:
            return "Moderate yield — typical for suburban residential."
        elif gross_yield_pct >= 3:
            return "Low yield — capital growth may be the primary return driver."
        else:
            return "Very low yield — carefully evaluate total return prospects."

    def calculate_transfer_duty(self, property_value: float) -> dict:
        """Calculate South African transfer duty based on 2024 SARS brackets.

        Transfer duty is payable by the purchaser on property acquisitions.
        No transfer duty is payable on properties valued at R1,100,000 or below.

        Args:
            property_value: Property value / purchase price in ZAR.

        Returns:
            Dictionary with transfer duty amount, effective rate, and bracket breakdown.
        """
        if property_value <= 0:
            return {
                "result": "Invalid input",
                "data": {"error": "Property value must be greater than zero."},
                "status": "error",
            }

        duty = 0.0
        bracket_applied = None

        for low, high, rate, base in self._TRANSFER_DUTY_BRACKETS_2024:
            if low <= property_value <= high:
                taxable_amount = max(0, property_value - low)
                duty = base + taxable_amount * rate
                bracket_applied = {
                    "bracket_low": low,
                    "bracket_high": high if high != 999_999_999 else "No upper limit",
                    "marginal_rate_pct": rate * 100,
                    "base_amount": base,
                }
                break

        if bracket_applied is None:
            # Fallback for any edge case
            duty = property_value * 0.13
            bracket_applied = {"bracket": "Fallback: 13% flat"}

        effective_rate = (duty / property_value) * 100

        return {
            "result": f"Transfer duty: R{duty:,.2f} (effective rate: {effective_rate:.2f}%)",
            "data": {
                "property_value": round(property_value, 2),
                "transfer_duty_payable": round(duty, 2),
                "effective_rate_pct": round(effective_rate, 2),
                "marginal_rate_in_bracket_pct": bracket_applied["marginal_rate_pct"],
                "bracket_applied": bracket_applied,
                "exemptions_note": (
                    "No transfer duty on property valued at R1,100,000 or below. "
                    "New VAT-registered property acquisitions may attract VAT (15%) instead of transfer duty."
                ),
                "other_costs": {
                    "conveyancing_fees": "Typically R10,000 – R25,000 depending on property value.",
                    "deeds_office_fee": "Approximately R1,000 – R2,000.",
                    "postages_and_petties": "R1,000 – R2,500.",
                    "bond_registration": "If financing — bond registration costs apply separately.",
                },
                "source": "SARS Transfer Duty Tables 2024/2025",
            },
            "status": "success",
        }

    def calculate_capital_gains(
        self,
        selling_price: float,
        base_cost: float,
        years_held: int,
        is_primary_residence: bool = True,
        marginal_tax_rate: float = 31.0,
    ) -> dict:
        """Estimate Capital Gains Tax (CGT) for an individual in South Africa.

        Args:
            selling_price: Final selling price in ZAR.
            base_cost: Original purchase price + qualifying improvements in ZAR.
            years_held: Number of years the property was held.
            is_primary_residence: Whether the property is a primary residence.
            marginal_tax_rate: Individual's marginal income tax rate in percent.

        Returns:
            Dictionary with gross gain, taxable gain, estimated CGT, and net proceeds.
        """
        if selling_price <= 0 or base_cost < 0 or years_held <= 0:
            return {
                "result": "Invalid input",
                "data": {"error": "Selling price, base cost, and years held must be valid positive values."},
                "status": "error",
            }

        gross_gain = selling_price - base_cost

        if gross_gain <= 0:
            return {
                "result": "No capital gain — potential capital loss",
                "data": {
                    "selling_price": round(selling_price, 2),
                    "base_cost": round(base_cost, 2),
                    "gross_gain": round(gross_gain, 2),
                    "note": "Capital losses can be carried forward to offset future gains.",
                },
                "status": "success",
            }

        # Apply annual exclusion (R40,000)
        gain_after_annual_exclusion = max(0, gross_gain - self._CGT_ANNUAL_EXCLUSION)

        # Apply primary residence exclusion if applicable
        primary_residence_exclusion_used = 0
        if is_primary_residence:
            primary_residence_exclusion_used = min(
                self._CGT_PRIMARY_RESIDENCE_EXCLUSION,
                gain_after_annual_exclusion,
            )
            gain_after_primary_exclusion = max(
                0, gain_after_annual_exclusion - primary_residence_exclusion_used
            )
        else:
            gain_after_primary_exclusion = gain_after_annual_exclusion

        # Apply inclusion rate (40% for individuals)
        taxable_capital_gain = gain_after_primary_exclusion * self._CGT_INCLUSION_RATE

        # Calculate CGT at marginal rate
        cgt_payable = taxable_capital_gain * (marginal_tax_rate / 100)

        # Effective CGT rate on gross gain
        effective_cgt_rate = (cgt_payable / gross_gain) * 100 if gross_gain > 0 else 0

        net_proceeds = selling_price - cgt_payable
        annual_appreciation_pct = ((selling_price / base_cost) ** (1 / years_held) - 1) * 100

        return {
            "result": f"Estimated CGT: R{cgt_payable:,.2f} (effective rate: {effective_cgt_rate:.2f}% of gain)",
            "data": {
                "selling_price": round(selling_price, 2),
                "base_cost": round(base_cost, 2),
                "years_held": years_held,
                "is_primary_residence": is_primary_residence,
                "marginal_tax_rate_pct": marginal_tax_rate,
                "gross_capital_gain": round(gross_gain, 2),
                "annual_exclusion_applied": self._CGT_ANNUAL_EXCLUSION,
                "gain_after_annual_exclusion": round(gain_after_annual_exclusion, 2),
                "primary_residence_exclusion_applied": round(primary_residence_exclusion_used, 2),
                "gain_after_all_exclusions": round(gain_after_primary_exclusion, 2),
                "capital_gain_inclusion_rate": f"{self._CGT_INCLUSION_RATE * 100:.0f}%",
                "taxable_capital_gain": round(taxable_capital_gain, 2),
                "cgt_payable": round(cgt_payable, 2),
                "effective_cgt_rate_on_gain_pct": round(effective_cgt_rate, 2),
                "net_proceeds_after_cgt": round(net_proceeds, 2),
                "annual_appreciation_pct": round(annual_appreciation_pct, 2),
                "note": (
                    "CGT calculation assumes no other capital gains/losses in the tax year. "
                    "The annual exclusion of R40,000 applies across all gains in a tax year. "
                    "Primary residence exclusion of R2m applies only if the property was "
                    "predominantly used as a residence."
                ),
                "source": "SARS Income Tax Act, 2024 tax year provisions",
            },
            "status": "success",
        }

    def compare_buy_vs_rent(
        self,
        property_price: float,
        monthly_rent: float,
        stay_years: int = 5,
        deposit_pct: float = 10.0,
        interest_rate: float = 11.75,
        annual_property_appreciation: float = 4.5,
        annual_rent_increase: float = 5.0,
    ) -> dict:
        """Compare the financial outcomes of buying versus renting over a given period.

        Args:
            property_price: Property purchase price in ZAR.
            monthly_rent: Current monthly rent in ZAR.
            stay_years: Number of years to compare (default: 5).
            deposit_pct: Deposit percentage for purchase (default: 10%).
            interest_rate: Bond interest rate in percent (default: 11.75%).
            annual_property_appreciation: Expected annual property value growth (default: 4.5%).
            annual_rent_increase: Expected annual rent increase (default: 5.0%).

        Returns:
            Dictionary with total costs, net positions, and break-even analysis.
        """
        if property_price <= 0 or monthly_rent < 0 or stay_years <= 0:
            return {
                "result": "Invalid input",
                "data": {"error": "Property price, rent, and stay years must be valid."},
                "status": "error",
            }

        # --- BUYING SCENARIO ---
        deposit_amount = property_price * (deposit_pct / 100)
        bond_result = self.calculate_bond(
            purchase_price=property_price,
            deposit=deposit_amount,
            interest_rate=interest_rate,
            years=20,
        )
        monthly_bond = bond_result["data"]["monthly_repayment"]

        # Transfer duty
        transfer_duty_result = self.calculate_transfer_duty(property_price)
        transfer_duty = transfer_duty_result["data"]["transfer_duty_payable"]

        # Other upfront costs (estimate)
        conveyancing_fees = min(25000, max(10000, property_price * 0.005))
        deeds_office_fee = 1500
        bond_registration = min(20000, max(8000, (property_price - deposit_amount) * 0.005))

        total_upfront_costs = deposit_amount + transfer_duty + conveyancing_fees + deeds_office_fee + bond_registration

        # Ongoing ownership costs (annual estimates as % of property value)
        annual_rates = property_price * 0.01       # ~1% municipal rates
        annual_insurance = property_price * 0.002   # ~0.2% building insurance
        annual_maintenance = property_price * 0.01  # ~1% maintenance
        annual_levies = property_price * 0.015      # ~1.5% levies (if sectional title)

        total_annual_ownership_costs = annual_rates + annual_insurance + annual_maintenance + annual_levies

        # Total buying costs over period
        total_bond_payments = monthly_bond * 12 * stay_years
        total_ownership_costs = total_annual_ownership_costs * stay_years
        total_buying_costs = total_upfront_costs + total_bond_payments + total_ownership_costs

        # Future property value
        future_property_value = property_price * ((1 + annual_property_appreciation / 100) ** stay_years)
        property_gain = future_property_value - property_price

        # Remaining bond balance (simplified approximation)
        remaining_balance_approx = self._approximate_remaining_balance(
            property_price - deposit_amount, interest_rate, 20, stay_years, monthly_bond
        )

        # Net equity position
        net_equity = future_property_value - remaining_balance_approx
        net_buying_position = net_equity - total_ownership_costs - transfer_duty - conveyancing_fees - deeds_office_fee - bond_registration

        # --- RENTING SCENARIO ---
        total_rent_paid = 0
        current_rent = monthly_rent
        yearly_rent_details = []

        for year in range(1, stay_years + 1):
            annual_rent = current_rent * 12
            total_rent_paid += annual_rent
            yearly_rent_details.append({
                "year": year,
                "monthly_rent": round(current_rent, 2),
                "annual_rent": round(annual_rent, 2),
            })
            current_rent *= (1 + annual_rent_increase / 100)

        # Opportunity cost: invest the deposit difference
        # Assume deposit + upfront costs invested at conservative rate
        investment_return_rate = 0.07  # 7% annual
        invested_amount = total_upfront_costs
        future_investment_value = invested_amount * ((1 + investment_return_rate) ** stay_years)
        investment_gain = future_investment_value - invested_amount

        net_renting_position = future_investment_value - total_rent_paid

        # --- COMPARISON ---
        cost_difference = total_buying_costs - total_rent_paid
        recommendation = (
            "Buying appears more favourable"
            if net_buying_position > net_renting_position
            else "Renting appears more favourable"
        )

        return {
            "result": f"Buy vs Rent over {stay_years} years: {recommendation}",
            "data": {
                "assumptions": {
                    "property_price": round(property_price, 2),
                    "initial_monthly_rent": round(monthly_rent, 2),
                    "stay_years": stay_years,
                    "deposit_pct": deposit_pct,
                    "interest_rate_pct": interest_rate,
                    "annual_property_appreciation_pct": annual_property_appreciation,
                    "annual_rent_increase_pct": annual_rent_increase,
                },
                "buying_scenario": {
                    "upfront_costs": {
                        "deposit": round(deposit_amount, 2),
                        "transfer_duty": round(transfer_duty, 2),
                        "conveyancing_fees": round(conveyancing_fees, 2),
                        "deeds_office_fee": round(deeds_office_fee, 2),
                        "bond_registration": round(bond_registration, 2),
                        "total_upfront": round(total_upfront_costs, 2),
                    },
                    "ongoing_costs": {
                        "monthly_bond": round(monthly_bond, 2),
                        "annual_ownership_costs": round(total_annual_ownership_costs, 2),
                        "total_bond_payments_over_period": round(total_bond_payments, 2),
                        "total_ownership_costs_over_period": round(total_ownership_costs, 2),
                    },
                    "total_buying_costs": round(total_buying_costs, 2),
                    "future_property_value": round(future_property_value, 2),
                    "approximate_remaining_bond_balance": round(remaining_balance_approx, 2),
                    "net_equity": round(net_equity, 2),
                    "net_position": round(net_buying_position, 2),
                },
                "renting_scenario": {
                    "total_rent_paid": round(total_rent_paid, 2),
                    "rent_schedule": yearly_rent_details,
                    "opportunity_cost_assumption": "7% annual return on invested upfront capital",
                    "future_investment_value": round(future_investment_value, 2),
                    "net_position": round(net_renting_position, 2),
                },
                "comparison": {
                    "cost_difference_buy_vs_rent": round(cost_difference, 2),
                    "property_capital_gain": round(property_gain, 2),
                    "investment_gain_if_renting": round(investment_gain, 2),
                    "recommendation": recommendation,
                    "break_even_note": (
                        "Break-even typically occurs when property appreciation exceeds "
                        "the combined cost of interest, maintenance, and transaction costs. "
                        "In SA, this often takes 5–8 years depending on market conditions."
                    ),
                },
            },
            "status": "success",
            "disclaimer": (
                "This analysis is for educational purposes. Actual property values, "
                "rents, and interest rates fluctuate. Consult a financial advisor "
                "and mortgage specialist for personalised advice."
            ),
        }

    def _approximate_remaining_balance(
        self,
        principal: float,
        annual_rate: float,
        years: int,
        years_elapsed: int,
        monthly_payment: float,
    ) -> float:
        """Approximate remaining bond balance after years_elapsed."""
        monthly_rate = annual_rate / 100 / 12
        num_payments = years * 12
        payments_made = years_elapsed * 12

        if monthly_rate == 0:
            return principal - (monthly_payment * payments_made)

        # Remaining balance formula
        remaining = principal * (
            (1 + monthly_rate) ** num_payments - (1 + monthly_rate) ** payments_made
        ) / ((1 + monthly_rate) ** num_payments - 1)

        return max(0, remaining)