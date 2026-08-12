"""Solar Calculator — Solar power system calculator."""

import json
from typing import Dict, List


class SolarCalculator:
    """Solar power system sizing calculator."""

    def __init__(self):
        self.sun_hours = {
            "gauteng": 5.5,
            "western_cape": 5.0,
            "kwazulu_natal": 4.5,
            "limpopo": 5.8,
            "mpumalanga": 5.2,
            "eastern_cape": 4.8,
            "north_west": 5.6,
            "free_state": 5.4,
            "northern_cape": 6.2,
        }

    def system_size(self, monthly_kwh: float, province: str) -> Dict:
        sun_hours = self.sun_hours.get(province.lower().replace(" ", "_"), 5.0)
        daily_kwh = monthly_kwh / 30
        system_kw = daily_kwh / sun_hours
        # Add 20% for losses
        system_kw *= 1.2
        return {
            "monthly_consumption_kwh": monthly_kwh,
            "province": province,
            "sun_hours": sun_hours,
            "daily_consumption_kwh": round(daily_kwh, 2),
            "recommended_system_kw": round(system_kw, 2),
        }

    def battery_size(self, daily_kwh: float, backup_days: float = 1, dod: float = 0.8) -> Dict:
        capacity = (daily_kwh * backup_days) / dod
        return {
            "daily_consumption_kwh": daily_kwh,
            "backup_days": backup_days,
            "depth_of_discharge": dod,
            "required_capacity_kwh": round(capacity, 2),
            "recommended": f"{round(capacity * 1.2, 2)} kWh (with 20% buffer)",
        }

    def cost_estimate(self, system_kw: float, battery_kwh: float = 0) -> Dict:
        solar_cost = system_kw * 15000  # R15k per kW installed
        battery_cost = battery_kwh * 20000 if battery_kwh > 0 else 0
        total = solar_cost + battery_cost
        return {
            "solar_panels": f"R{solar_cost:,.0f}",
            "battery": f"R{battery_cost:,.0f}" if battery_cost > 0 else "Not included",
            "total_estimate": f"R{total:,.0f}",
            "payback_years": round(total / (system_kw * 5 * 30 * 3 * 12 * 0.5), 1),  # Rough estimate
        }

    def inverter_size(self, peak_load_watts: float) -> Dict:
        return {
            "peak_load_watts": peak_load_watts,
            "recommended_inverter_va": round(peak_load_watts * 1.25, 0),
            "note": "Add 25% buffer for inverter sizing",
        }


if __name__ == "__main__":
    solar = SolarCalculator()
    print(json.dumps(solar.system_size(900, "Western Cape"), indent=2))
    print(json.dumps(solar.battery_size(30, 2), indent=2))
    print(json.dumps(solar.cost_estimate(5, 10), indent=2))
    print(json.dumps(solar.inverter_size(5000), indent=2))
