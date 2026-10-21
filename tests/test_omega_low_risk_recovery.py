"""Offline recovery checks for three existing LUQI utility implementations."""
import unittest

import omega_ai
from omega_ai.loan_calculator import LoanCalculator
from omega_ai.solar_calculator import SolarCalculator
from omega_ai.community_events import CommunityEvents


class OmegaRecoveryTest(unittest.TestCase):
    def test_package_does_not_eagerly_import_unrestored_health_or_legal_code(self):
        self.assertEqual(omega_ai.LoanCalculator, LoanCalculator)
        self.assertEqual(omega_ai.SolarCalculator, SolarCalculator)
        self.assertEqual(omega_ai.CommunityEvents, CommunityEvents)
        with self.assertRaisesRegex(AttributeError, "not an enabled capability"):
            _ = omega_ai.HealthAdvisor
        with self.assertRaisesRegex(AttributeError, "not an enabled capability"):
            _ = omega_ai.LegalAssistant

    def test_zero_interest_loan_and_validation(self):
        result = LoanCalculator().calculate(120000, 0, 1)
        self.assertEqual(result["monthly_payment"], 10000)
        self.assertEqual(result["total_interest"], 0)
        with self.assertRaises(ValueError):
            LoanCalculator().calculate(1000, 2, 0)
        with self.assertRaises(ValueError):
            LoanCalculator().calculate(float("nan"), 2, 2)

    def test_solar_formula_and_invalid_depth_of_discharge(self):
        result = SolarCalculator().system_size(900, "Western Cape")
        self.assertAlmostEqual(result["recommended_system_kw"], 7.2)
        with self.assertRaises(ValueError):
            SolarCalculator().battery_size(10, dod=0)
        with self.assertRaises(ValueError):
            SolarCalculator().cost_estimate(system_kw=0)
        with self.assertRaises(ValueError):
            SolarCalculator().system_size(-1, "Gauteng")

    def test_event_inventory_is_explicitly_process_local(self):
        one = CommunityEvents()
        one.add_event("Town Hall", "2026-10-30", "Johannesburg", "community")
        self.assertEqual(len(one.find_events(location="Johannesburg")), 1)
        self.assertEqual(len(CommunityEvents().find_events()), 0)


if __name__ == "__main__":
    unittest.main()
