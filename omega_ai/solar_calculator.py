"""Existing LUQI solar estimates exposed under the omega_ai namespace.

Source: LUQI repository root solar_calculator.py. Historical price and
sun-hours assumptions are not live quotations or independently validated.
"""

from math import isfinite
from solar_calculator import SolarCalculator as _SolarCalculator


def _nonnegative(value: float, name: str) -> None:
    if not isinstance(value, (int, float)) or not isfinite(value) or value < 0:
        raise ValueError(f"{name} must be finite and nonnegative")


class SolarCalculator(_SolarCalculator):
    """Reuse existing formulas while guarding common invalid inputs."""

    def system_size(self, monthly_kwh: float, province: str) -> dict:
        _nonnegative(monthly_kwh, "monthly_kwh")
        if not isinstance(province, str) or not province.strip():
            raise ValueError("province must be a nonempty string")
        return super().system_size(monthly_kwh, province)

    def battery_size(self, daily_kwh: float, backup_days: float = 1,
                     dod: float = 0.8) -> dict:
        _nonnegative(daily_kwh, "daily_kwh")
        _nonnegative(backup_days, "backup_days")
        if not isinstance(dod, (int, float)) or not isfinite(dod) or not 0 < dod <= 1:
            raise ValueError("depth of discharge must be between 0 and 1")
        return super().battery_size(daily_kwh, backup_days, dod)

    def cost_estimate(self, system_kw: float, battery_kwh: float = 0) -> dict:
        _nonnegative(system_kw, "system_kw")
        _nonnegative(battery_kwh, "battery_kwh")
        if system_kw <= 0:
            raise ValueError("system_kw must be positive")
        return super().cost_estimate(system_kw, battery_kwh)

    def inverter_size(self, peak_load_watts: float) -> dict:
        _nonnegative(peak_load_watts, "peak_load_watts")
        return super().inverter_size(peak_load_watts)
