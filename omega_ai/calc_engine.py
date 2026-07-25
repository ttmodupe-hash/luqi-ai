"""Omega AI v3 — Engineering Calculation Engine
Multi-discipline engineering calculator with formulas, unit conversions,
and practical calculators for civil, mechanical, electrical, and chemical
engineering.

Usage:
    from calc_engine import EngineeringCalculator
    calc = EngineeringCalculator()
    result = calc.calculate("ohm", {"voltage": 12, "resistance": 4})
"""
from __future__ import annotations

import math
from typing import Any, Callable, Dict, List, Optional


class EngineeringCalculator:
    """Multi-discipline engineering calculation engine."""

    DISCIPLINES: Dict[str, Dict[str, Any]] = {
        "civil": {"name": "Civil Engineering", "color": "\033[94m", "icon": "🏗️"},
        "mechanical": {"name": "Mechanical Engineering", "color": "\033[91m", "icon": "⚙️"},
        "electrical": {"name": "Electrical Engineering", "color": "\033[93m", "icon": "⚡"},
        "chemical": {"name": "Chemical Engineering", "color": "\033[95m", "icon": "🧪"},
        "structural": {"name": "Structural Engineering", "color": "\033[96m", "icon": "🏢"},
        "environmental": {"name": "Environmental Engineering", "color": "\033[92m", "icon": "🌿"},
    }

    def __init__(self):
        self._formulas: Dict[str, Callable] = {
            # Civil
            "concrete_volume": self._concrete_volume,
            "rebar_weight": self._rebar_weight,
            "slope": self._slope,
            "runoff": self._runoff,
            "earthwork": self._earthwork,
            # Mechanical
            "stress": self._stress,
            "strain": self._strain,
            "torque": self._torque,
            "power": self._mech_power,
            "gear_ratio": self._gear_ratio,
            "belt_speed": self._belt_speed,
            "pump_head": self._pump_head,
            # Electrical
            "ohm": self._ohm,
            "power_elec": self._elec_power,
            "voltage_drop": self._voltage_drop,
            "wire_size": self._wire_size,
            "motor_current": self._motor_current,
            "transformer": self._transformer,
            "resonance": self._resonance,
            # Structural
            "beam_moment": self._beam_moment,
            "deflection": self._deflection,
            "column_capacity": self._column_capacity,
            "wind_load": self._wind_load,
            "seismic": self._seismic,
            # Chemical
            "molarity": self._molarity,
            "flow_rate": self._flow_rate,
            "heat_transfer": self._heat_transfer,
            "reactor_volume": self._reactor_volume,
            # Environmental
            "bod": self._bod,
            "co2": self._co2,
            "sedimentation": self._sedimentation,
        }

    # ── Civil Engineering ──
    def _concrete_volume(self, l: float, w: float, h: float) -> Dict:
        vol = l * w * h
        bags = math.ceil(vol / 0.033)  # 33L per 50kg bag
        return {"volume_m3": round(vol, 2), "50kg_bags": bags, "formula": "V = l × w × h"}

    def _rebar_weight(self, dia_mm: float, length_m: float) -> Dict:
        weight_kg_m = (dia_mm ** 2) / 162
        total = weight_kg_m * length_m
        return {"weight_kg": round(total, 2), "kg_per_meter": round(weight_kg_m, 3), "formula": "W = d²/162 × L"}

    def _slope(self, rise: float, run: float) -> Dict:
        if run == 0:
            return {"error": "Run cannot be zero"}
        ratio = rise / run
        percent = ratio * 100
        degrees = math.degrees(math.atan(ratio))
        return {"ratio": f"1:{run/rise:.1f}" if rise != 0 else "0:1", "percent": round(percent, 2), "degrees": round(degrees, 2)}

    def _runoff(self, area_ha: float, intensity_mm_hr: float, coeff: float = 0.8) -> Dict:
        q = coeff * intensity_mm_hr * area_ha / 360
        return {"peak_flow_m3_s": round(q, 3), "formula": "Q = C × i × A / 360"}

    def _earthwork(self, length: float, width: float, depth: float, swell: float = 1.2) -> Dict:
        cut = length * width * depth
        haul = cut * swell
        return {"cut_volume_m3": round(cut, 1), "haul_volume_m3": round(haul, 1), "swell_factor": swell}

    # ── Mechanical Engineering ──
    def _stress(self, force_n: float, area_mm2: float) -> Dict:
        if area_mm2 <= 0:
            return {"error": "Area must be positive"}
        stress_mpa = force_n / area_mm2
        status = "OK" if stress_mpa < 250 else "WARNING" if stress_mpa < 400 else "EXCEEDS"
        return {"stress_mpa": round(stress_mpa, 2), "status": status, "formula": "σ = F/A"}

    def _strain(self, delta_l: float, original_l: float) -> Dict:
        if original_l <= 0:
            return {"error": "Original length must be positive"}
        strain = delta_l / original_l
        percent = strain * 100
        return {"strain": round(strain, 6), "percent": round(percent, 4), "formula": "ε = ΔL/L₀"}

    def _torque(self, force_n: float, radius_m: float) -> Dict:
        t = force_n * radius_m
        return {"torque_nm": round(t, 2), "formula": "T = F × r"}

    def _mech_power(self, torque_nm: float, rpm: float) -> Dict:
        p_w = torque_nm * rpm * 2 * math.pi / 60
        p_kw = p_w / 1000
        hp = p_w / 745.7
        return {"power_w": round(p_w, 1), "power_kw": round(p_kw, 3), "hp": round(hp, 2), "formula": "P = T × ω"}

    def _gear_ratio(self, input_teeth: int, output_teeth: int) -> Dict:
        if input_teeth <= 0:
            return {"error": "Input teeth must be positive"}
        ratio = output_teeth / input_teeth
        return {"ratio": round(ratio, 2), "speed_change": f"1:{ratio:.1f}", "direction": "reversed"}

    def _belt_speed(self, diameter_m: float, rpm: float) -> Dict:
        v = math.pi * diameter_m * rpm / 60
        return {"speed_ms": round(v, 2), "formula": "v = π × d × n / 60"}

    def _pump_head(self, pressure_kpa: float, density: float = 1000) -> Dict:
        h = pressure_kpa * 1000 / (density * 9.81)
        return {"head_m": round(h, 2), "formula": "H = P / (ρ × g)"}

    # ── Electrical Engineering ──
    def _ohm(self, voltage: float = 0, current: float = 0, resistance: float = 0) -> Dict:
        if resistance and current:
            v = resistance * current
            return {"voltage_v": round(v, 2), "formula": "V = I × R"}
        elif voltage and resistance:
            i = voltage / resistance
            return {"current_a": round(i, 4), "formula": "I = V/R"}
        elif voltage and current:
            r = voltage / current
            return {"resistance_ohm": round(r, 2), "formula": "R = V/I"}
        return {"error": "Need exactly 2 of: voltage, current, resistance"}

    def _elec_power(self, voltage: float = 0, current: float = 0, resistance: float = 0) -> Dict:
        if voltage and current:
            p = voltage * current
            return {"power_w": round(p, 2), "formula": "P = V × I"}
        elif current and resistance:
            p = current ** 2 * resistance
            return {"power_w": round(p, 2), "formula": "P = I² × R"}
        elif voltage and resistance:
            p = voltage ** 2 / resistance
            return {"power_w": round(p, 2), "formula": "P = V²/R"}
        return {"error": "Need exactly 2 of: voltage, current, resistance"}

    def _voltage_drop(self, current_a: float, length_m: float, resistance_ohm_m: float = 0.02) -> Dict:
        vd = 2 * current_a * length_m * resistance_ohm_m
        return {"voltage_drop_v": round(vd, 3), "formula": "VD = 2 × I × L × R"}

    def _wire_size(self, current_a: float, material: str = "copper") -> Dict:
        sizes = {
            (0, 5): "1.0 mm²", (5, 10): "1.5 mm²", (10, 16): "2.5 mm²",
            (16, 20): "4.0 mm²", (20, 25): "6.0 mm²", (25, 32): "10 mm²",
            (32, 40): "16 mm²", (40, 50): "25 mm²", (50, 65): "35 mm²",
        }
        for (low, high), size in sizes.items():
            if low <= current_a < high:
                return {"wire_size": size, "max_current_a": high, "material": material}
        return {"wire_size": "Consult electrician", "current_a": current_a}

    def _motor_current(self, power_kw: float, voltage: float = 400, efficiency: float = 0.85, pf: float = 0.8) -> Dict:
        p_out = power_kw * 1000
        p_in = p_out / efficiency
        i = p_in / (math.sqrt(3) * voltage * pf)
        return {"current_a": round(i, 2), "input_power_w": round(p_in, 1), "formula": "I = P / (√3 × V × PF)"}

    def _transformer(self, primary_v: float, secondary_v: float, power_va: float = 0) -> Dict:
        ratio = primary_v / secondary_v if secondary_v else 0
        if power_va:
            i_pri = power_va / primary_v
            i_sec = power_va / secondary_v
            return {"turns_ratio": round(ratio, 2), "primary_current_a": round(i_pri, 2), "secondary_current_a": round(i_sec, 2)}
        return {"turns_ratio": round(ratio, 2), "type": "step_down" if ratio > 1 else "step_up"}

    def _resonance(self, inductance_h: float, capacitance_f: float) -> Dict:
        if inductance_h <= 0 or capacitance_f <= 0:
            return {"error": "L and C must be positive"}
        f = 1 / (2 * math.pi * math.sqrt(inductance_h * capacitance_f))
        return {"resonance_hz": round(f, 2), "formula": "f = 1/(2π√(LC))"}

    # ── Structural Engineering ──
    def _beam_moment(self, load_kn: float, span_m: float, beam_type: str = "simply_supported") -> Dict:
        if beam_type == "simply_supported":
            m = load_kn * span_m / 4  # central point load
        elif beam_type == "cantilever":
            m = load_kn * span_m  # point load at end
        elif beam_type == "fixed":
            m = load_kn * span_m / 8
        else:
            m = load_kn * span_m / 4
        return {"max_moment_knm": round(m, 2), "beam_type": beam_type, "formula": "M = F × L / n"}

    def _deflection(self, load_kn: float, span_m: float, e_gpa: float = 200, i_mm4: float = 50e6) -> Dict:
        e_pa = e_gpa * 1e9
        i_m4 = i_mm4 * 1e-12
        if e_pa <= 0 or i_m4 <= 0:
            return {"error": "E and I must be positive"}
        delta = load_kn * 1000 * (span_m ** 3) / (48 * e_pa * i_m4)
        limit = span_m / 250  # typical deflection limit
        return {"deflection_mm": round(delta * 1000, 2), "limit_mm": round(limit * 1000, 2),
                "status": "OK" if delta < limit else "EXCEEDS", "formula": "δ = FL³/(48EI)"}

    def _column_capacity(self, area_mm2: float, strength_mpa: float = 250) -> Dict:
        capacity_kn = area_mm2 * strength_mpa / 1000
        return {"capacity_kn": round(capacity_kn, 2), "formula": "P = A × f_y"}

    def _wind_load(self, speed_ms: float, area_m2: float, cp: float = 0.8) -> Dict:
        q = 0.613 * (speed_ms ** 2)
        f = q * area_m2 * cp
        return {"pressure_pa": round(q, 1), "force_kn": round(f / 1000, 2), "formula": "F = 0.613 × v² × A × Cp"}

    def _seismic(self, weight_kn: float, sds: float = 0.5, r: float = 5, importance: float = 1.0) -> Dict:
        base_shear = (sds * weight_kn) / (r / importance)
        return {"base_shear_kn": round(base_shear, 2), "formula": "V = Sds × W / (R/I)"}

    # ── Chemical Engineering ──
    def _molarity(self, moles: float, volume_l: float) -> Dict:
        if volume_l <= 0:
            return {"error": "Volume must be positive"}
        m = moles / volume_l
        return {"molarity_m": round(m, 4), "formula": "M = n/V"}

    def _flow_rate(self, velocity_ms: float, area_m2: float) -> Dict:
        q = velocity_ms * area_m2
        return {"flow_rate_m3_s": round(q, 4), "formula": "Q = v × A"}

    def _heat_transfer(self, h: float, area: float, delta_t: float) -> Dict:
        q = h * area * delta_t
        return {"heat_transfer_w": round(q, 2), "formula": "Q = h × A × ΔT"}

    def _reactor_volume(self, flow_rate_m3_h: float, residence_time_h: float) -> Dict:
        v = flow_rate_m3_h * residence_time_h
        return {"volume_m3": round(v, 2), "formula": "V = Q × τ"}

    # ── Environmental Engineering ──
    def _bod(self, do_initial: float, do_final: float, volume_sample: float = 300, volume_bottle: float = 300) -> Dict:
        dilution = volume_bottle / volume_sample
        bod = (do_initial - do_final) * dilution
        return {"bod_mg_l": round(bod, 2), "formula": "BOD = (DOi - DOf) × dilution"}

    def _co2(self, energy_kwh: float, emission_factor: float = 0.5) -> Dict:
        co2 = energy_kwh * emission_factor
        return {"co2_kg": round(co2, 2), "formula": "CO₂ = Energy × EF"}

    def _sedimentation(self, overflow_rate: float, concentration: float, removal: float = 0.7) -> Dict:
        effluent = concentration * (1 - removal)
        return {"effluent_mg_l": round(effluent, 2), "removal_percent": removal * 100, "overflow_rate": overflow_rate}

    # ── Public API ──
    def calculate(self, formula_name: str, inputs: Dict[str, float]) -> Dict[str, Any]:
        """Execute a formula by name with given inputs."""
        fn = self._formulas.get(formula_name)
        if not fn:
            available = ", ".join(sorted(self._formulas.keys()))
            return {"error": f"Unknown formula '{formula_name}'. Available: {available}"}
        try:
            return fn(**inputs)
        except Exception as e:
            return {"error": f"Calculation error: {type(e).__name__}: {e}"}

    def list_formulas(self, discipline: str = "") -> List[Dict[str, str]]:
        """List available formulas, optionally filtered by discipline."""
        discipline_map = {
            "concrete_volume": "civil", "rebar_weight": "civil", "slope": "civil",
            "runoff": "civil", "earthwork": "civil",
            "stress": "mechanical", "strain": "mechanical", "torque": "mechanical",
            "power": "mechanical", "gear_ratio": "mechanical", "belt_speed": "mechanical", "pump_head": "mechanical",
            "ohm": "electrical", "power_elec": "electrical", "voltage_drop": "electrical",
            "wire_size": "electrical", "motor_current": "electrical", "transformer": "electrical", "resonance": "electrical",
            "beam_moment": "structural", "deflection": "structural", "column_capacity": "structural",
            "wind_load": "structural", "seismic": "structural",
            "molarity": "chemical", "flow_rate": "chemical", "heat_transfer": "chemical", "reactor_volume": "chemical",
            "bod": "environmental", "co2": "environmental", "sedimentation": "environmental",
        }
        results = []
        for name in sorted(self._formulas.keys()):
            disc = discipline_map.get(name, "")
            if not discipline or discipline == disc:
                results.append({"name": name, "discipline": disc})
        return results

    def list_disciplines(self) -> List[Dict[str, str]]:
        """List available engineering disciplines."""
        return [{"code": k, **v} for k, v in self.DISCIPLINES.items()]


if __name__ == "__main__":
    calc = EngineeringCalculator()
    print("=== Engineering Calculator Demo ===\n")
    # Civil
    print("Civil - Concrete:", calc.calculate("concrete_volume", {"l": 5, "w": 3, "h": 0.15}))
    print("Civil - Slope:", calc.calculate("slope", {"rise": 1.5, "run": 10}))
    # Mechanical
    print("Mech - Stress:", calc.calculate("stress", {"force_n": 10000, "area_mm2": 50}))
    print("Mech - Power:", calc.calculate("power", {"torque_nm": 100, "rpm": 1500}))
    # Electrical
    print("Elec - Ohm:", calc.calculate("ohm", {"voltage": 12, "resistance": 4}))
    print("Elec - Motor:", calc.calculate("motor_current", {"power_kw": 5.5}))
    # Structural
    print("Struct - Beam:", calc.calculate("beam_moment", {"load_kn": 20, "span_m": 6}))
    print("Struct - Deflection:", calc.calculate("deflection", {"load_kn": 10, "span_m": 4}))
    # Chemical
    print("Chem - Molarity:", calc.calculate("molarity", {"moles": 0.5, "volume_l": 2}))
    print("Chem - Flow:", calc.calculate("flow_rate", {"velocity_ms": 2.5, "area_m2": 0.1}))
