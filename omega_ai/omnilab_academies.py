"""
LUQI AI — OmniLab Academies: Hexagonal Global Matrix
=====================================================
Synthesizes elite STEM education standards from 6 global superpowers into
practical, resource-light lab experiments. Cross-compiles German MINT,
UK Cambridge CAIE, US AP/MIT, Chinese Gaokao, Russian MIPT Olympiad,
and Japanese SSH frameworks into adaptive learning vectors.

v29.0.0 — OmniLab Capability Module
"""
from __future__ import annotations
import math
import json
import time
from typing import Dict, List, Optional, Any

# =============================================================================
# SUPERPOWER MATRIX DEFINITIONS
# =============================================================================

SUPERPOWERS = {
    "DE": {"name": "Germany", "flag": "🇩🇪", "standard": "Abitur / MINT", "focus": "Engineering precision & vocational standards"},
    "UK": {"name": "United Kingdom", "flag": "🇬🇧", "standard": "Cambridge CAIE A-Levels", "focus": "Rigorous assessment & practical exams"},
    "US": {"name": "United States", "flag": "🇺🇸", "standard": "AP College Board / MIT OCW", "focus": "Analytical data tracking & modeling"},
    "CN": {"name": "China", "flag": "🇨🇳", "standard": "Gaokao / Smart Education", "focus": "Deep conceptual mastery & precision"},
    "RU": {"name": "Russia", "flag": "🇷🇺", "standard": "MIPT Olympiad", "focus": "First-principles proofs & mechanics"},
    "JP": {"name": "Japan", "flag": "🇯🇵", "standard": "Super Science High School", "focus": "Applied technology & data precision"},
}

TIER_LEVELS = ["Primary Level", "High School Level", "Advanced Varsity Level"]

# =============================================================================
# PRE-LOADED HEXAGONAL LAB DATABASE
# =============================================================================

DEFAULT_LABS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "title": "Macroscopic Thermodynamics & Kinetic Heat Transfer Vectoring",
        "tier": "Primary Level",
        "subject": "Physics",
        "inspiration": "Harmonized Matrix: US NGSS & German MINT Primary Foundation Units.",
        "superpowers": ["US", "DE"],
        "materials": [
            "2x Identical aluminum soda cans (clean and empty)",
            "1x Sheet of dark paper or crushed charcoal powder",
            "1x Sheet of shiny kitchen aluminum foil",
            "Equal volumes of cold tap water",
            "Sunlight exposure field",
        ],
        "procedure": (
            "1. Cover Can A entirely in dark charcoal/paper absorber material.\n"
            "2. Wrap Can B in highly reflective metallic aluminum foil.\n"
            "3. Pour equal volumes of cold water into both canisters.\n"
            "4. Expose both to direct sunlight side-by-side for exactly 30 minutes.\n"
            "5. Measure temperature difference to extract energy migration laws."
        ),
        "sandbox_type": "thermal",
        "learning_objectives": [
            "Understand radiative heat absorption vs reflection",
            "Measure temperature change over time",
            "Calculate basic heat transfer coefficients",
        ],
    },
    {
        "id": 2,
        "title": "Linear Gravity Constants & Statistical Error Variance",
        "tier": "High School Level",
        "subject": "Physics",
        "inspiration": "Harmonized Matrix: UK Cambridge CAIE Physics (9702), Chinese Gaokao Kinematics, Russian MIPT Olympiad Mechanics.",
        "superpowers": ["UK", "CN", "RU"],
        "materials": [
            "1x String/fishing line cut to exactly 1.000 meter",
            "1x Compact symmetrical mass anchor (stone, nut, or clay block)",
            "1x Manual stopwatch (phone app or watch)",
        ],
        "procedure": (
            "1. Mount pendulum to hang vertically from a rigid boundary.\n"
            "2. Displace mass by a small distance (angle < 15° for linear approximation).\n"
            "3. Release cleanly without applying external kinetic energy.\n"
            "4. Time exactly 10 full oscillation cycles (back-and-forth).\n"
            "5. Repeat 5 times and compute mean period with error analysis."
        ),
        "sandbox_type": "gravity",
        "learning_objectives": [
            "Verify T = 2π√(L/g) experimentally",
            "Calculate local gravitational acceleration g",
            "Perform statistical error analysis (mean, std dev, % error)",
        ],
    },
    {
        "id": 3,
        "title": "Quantum Charge Transport & Carbon Resistivity Matrix",
        "tier": "Advanced Varsity Level",
        "subject": "Physics",
        "inspiration": "Harmonized Matrix: MIT OCW 8.02 (US), Russian MIPT Solid-State, Japan SSH Semiconductors.",
        "superpowers": ["US", "RU", "JP"],
        "materials": [
            "1x High-density soft carbon pencil (Grade 2B, 4B, or 6B)",
            "1x Metric ruler with millimeter accuracy",
            "1x Basic digital multimeter",
            "Clear white card or heavy paper",
        ],
        "procedure": (
            "1. Draw a dark graphite channel 100mm long × 2mm wide on white card.\n"
            "2. Set multimeter to Resistance (Ohms) mode.\n"
            "3. Measure resistance at 20mm, 40mm, 60mm, 80mm, and 100mm points.\n"
            "4. Plot R vs length and compute resistivity ρ = RA/L.\n"
            "5. Compare with known graphite resistivity (~3.5×10⁻⁵ Ω·m)."
        ),
        "sandbox_type": "ohmic",
        "learning_objectives": [
            "Verify Ohm's Law for non-metallic conductors",
            "Calculate resistivity from geometry and resistance",
            "Understand electron transport in carbon structures",
        ],
    },
]


# =============================================================================
# SANDBOX CALCULATION ENGINES
# =============================================================================

class ThermalSandbox:
    """Heat transfer analysis for the thermodynamics lab."""

    @staticmethod
    def analyze(temp_dark_can: float, temp_reflective_can: float, ambient: float = 25.0, time_min: float = 30.0) -> Dict[str, Any]:
        """Analyze temperature differential between absorbing vs reflective surfaces."""
        delta_dark = temp_dark_can - ambient
        delta_reflective = temp_reflective_can - ambient
        absorption_ratio = delta_dark / delta_reflective if delta_reflective > 0.1 else 999_999_999
        efficiency_dark = min((delta_dark / (abs(80 - ambient) + 0.1)) * 100, 100)

        feedback = []
        if delta_dark < 5:
            feedback.append("🇩🇪 DE MINT: Temperature rise is minimal. Ensure the absorber material is truly dark (charcoal is ideal). Check sun exposure angle.")
        if temp_reflective_can > temp_dark_can:
            feedback.append("⚠️ Anomaly: Reflective can is hotter! Check that foil is shiny-side out and fully covering the surface.")
        if delta_dark > 15:
            feedback.append("🇺🇸 US NGSS: Excellent absorption differential! Your data clearly demonstrates selective absorption vs reflection.")
        if not feedback:
            feedback.append("🇨🇳 CN Gaokao: Data is within expected range. Record multiple trials for statistical validity.")

        return {
            "delta_dark": round(delta_dark, 2),
            "delta_reflective": round(delta_reflective, 2),
            "absorption_ratio": round(absorption_ratio, 2),
            "efficiency_percent": round(efficiency_dark, 1),
            "ambient_temp": ambient,
            "feedback": feedback,
        }


class GravitySandbox:
    """Pendulum analysis for gravity constant determination."""

    @staticmethod
    def analyze(times_for_10_cycles: List[float], string_length_m: float = 1.0) -> Dict[str, Any]:
        """Calculate gravitational acceleration from pendulum period measurements."""
        if not times_for_10_cycles or len(times_for_10_cycles) < 3:
            return {"error": "Need at least 3 timing measurements for statistical analysis."}

        periods = [t / 10.0 for t in times_for_10_cycles]
        n = len(periods)
        mean_period = sum(periods) / n
        variance = sum((p - mean_period) ** 2 for p in periods) / (n - 1) if n > 1 else 0
        std_dev = math.sqrt(variance)
        std_error = std_dev / math.sqrt(n)
        percent_error = (std_error / mean_period) * 100 if mean_period > 0 else 0

        # T = 2π√(L/g) → g = 4π²L / T²
        g_measured = (4 * math.pi ** 2 * string_length_m) / (mean_period ** 2)
        g_standard = 9.807  # m/s² (SA standard)
        g_error_percent = abs(g_measured - g_standard) / g_standard * 100

        feedback = []
        if mean_period < 1.8 or mean_period > 2.2:
            feedback.append("🇷🇺 RU MIPT: Period deviates from theoretical T≈2.006s for L=1m. Verify string length is exactly 1.000m and angle < 15°.")
        if percent_error > 2.0:
            feedback.append("🇬🇧 UK CAIE: High statistical variance (E > 2%). Repeat measurements with sharper start/stop timing. Use video frame analysis for precision.")
        if g_error_percent < 1.0:
            feedback.append("🎉 All Standards: Outstanding precision! g = {:.3f} m/s² within 1% of standard.".format(g_measured))
        elif g_error_percent < 3.0:
            feedback.append("🇨🇳 CN Gaokao: Good result. g = {:.3f} m/s² ({:.1f}% error). Check for air currents and ensure rigid mounting.".format(g_measured, g_error_percent))
        else:
            feedback.append("🇯🇵 JP SSH: g = {:.3f} m/s² ({:.1f}% error). Review: (1) Exact 1.000m length, (2) Small angle <15°, (3) Rigid support, (4) No wind interference.".format(g_measured, g_error_percent))

        return {
            "mean_period_s": round(mean_period, 3),
            "std_dev_s": round(std_dev, 4),
            "std_error_s": round(std_error, 4),
            "percent_error": round(percent_error, 2),
            "g_measured": round(g_measured, 3),
            "g_standard": g_standard,
            "g_error_percent": round(g_error_percent, 2),
            "theoretical_period_s": round(2 * math.pi * math.sqrt(string_length_m / g_standard), 3),
            "num_trials": n,
            "feedback": feedback,
        }


class OhmicSandbox:
    """Resistivity analysis for the graphite conductivity lab."""

    @staticmethod
    def analyze(readings: List[Dict[str, float]], track_width_mm: float = 2.0, track_thickness_mm: float = 0.1) -> Dict[str, Any]:
        """Calculate resistivity from resistance vs length measurements."""
        if not readings or len(readings) < 3:
            return {"error": "Need at least 3 resistance measurements at different lengths."}

        lengths = [r["length_mm"] for r in readings]
        resistances = [r["resistance_ohm"] for r in readings]

        # Linear regression: R = ρL/A + R_contact
        n = len(lengths)
        x_mean = sum(lengths) / n
        y_mean = sum(resistances) / n
        ss_xy = sum((lengths[i] - x_mean) * (resistances[i] - y_mean) for i in range(n))
        ss_xx = sum((lengths[i] - x_mean) ** 2 for i in range(n))

        if ss_xx == 0:
            return {"error": "All length measurements are identical. Use different lengths."}

        slope = ss_xy / ss_xx  # Ohms/mm = ρ/A
        intercept = y_mean - slope * x_mean

        # Calculate resistivity ρ = slope × A = slope × (w × t)
        # Convert dimensions to meters
        A_m2 = (track_width_mm * 1e-3) * (track_thickness_mm * 1e-3)
        rho_ohm_m = slope * 1e3 * A_m2  # slope is in Ohms/mm, convert to Ohms/m

        # Known graphite resistivity range
        rho_graphite = 3.5e-5  # Ω·m
        rho_error_percent = abs(rho_ohm_m - rho_graphite) / rho_graphite * 100 if rho_graphite > 0 else 0

        # R-squared
        ss_res = sum((resistances[i] - (slope * lengths[i] + intercept)) ** 2 for i in range(n))
        ss_tot = sum((resistances[i] - y_mean) ** 2 for i in range(n))
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 1.0

        feedback = []
        if r_squared < 0.95:
            feedback.append("🇯🇵 JP SSH: Low linearity (R²={:.3f}). Ensure consistent graphite density along the track. Press firmly and evenly with the pencil.".format(r_squared))
        if intercept < 0:
            feedback.append("⚠️ Negative intercept suggests measurement error at short lengths. Check probe contact resistance.")
        if rho_error_percent < 50:
            feedback.append("🎉 All Standards: Excellent! ρ = {:.2e} Ω·m. Your data confirms graphite as a semiconductor-like conductor.".format(rho_ohm_m))
        elif rho_error_percent < 200:
            feedback.append("🇷🇺 RU MIPT: ρ = {:.2e} Ω·m (order-of-magnitude match). Graphite grade and track geometry significantly affect results.".format(rho_ohm_m))
        else:
            feedback.append("🇺🇸 US MIT: ρ = {:.2e} Ω·m differs from reference. Check: (1) Consistent pencil grade, (2) Uniform track width, (3) Firm probe contact.".format(rho_ohm_m))

        return {
            "slope_ohm_per_mm": round(slope, 4),
            "intercept_ohm": round(intercept, 2),
            "r_squared": round(r_squared, 4),
            "resistivity_ohm_m": rho_ohm_m,
            "resistivity_reference": rho_graphite,
            "resistivity_error_percent": round(rho_error_percent, 1),
            "track_cross_section_m2": A_m2,
            "feedback": feedback,
        }


# =============================================================================
# SOCRATIC DIALOGUE ENGINE
# =============================================================================

SOCRATIC_PROMPTS = {
    "thermal": [
        "Why does the dark can heat up faster than the reflective one? What physical mechanism governs this?",
        "If you repeated this experiment at night with an infrared lamp, would the results differ? Why or why not?",
        "How does this experiment relate to real-world applications like solar water heaters or building insulation?",
        "What would happen if you used a black matte surface vs a black glossy surface? Explain using radiative transfer theory.",
    ],
    "gravity": [
        "Why must the angular displacement stay below 15° for this formula to hold? What changes in the physics above this threshold?",
        "How would your measured g value change if you performed this experiment at the equator vs the poles? Calculate the difference.",
        "The period formula T = 2π√(L/g) has no mass term. Why doesn't the pendulum bob's mass affect the period?",
        "If you replaced the string with a rigid rod, how would the period formula change? Derive the new expression.",
    ],
    "ohmic": [
        "Graphite is a form of carbon, yet it conducts electricity. How does its electron structure differ from diamond, which is an insulator?",
        "Your calculated resistivity likely differs from the reference value. What microstructural factors in pencil graphite could explain this?",
        "How does this experiment relate to the semiconductor industry? What materials replace graphite in real integrated circuits?",
        "If you halved the track width while keeping all else constant, how would the resistance change? Verify with Ohm's Law analog.",
    ],
}


# =============================================================================
# MAIN OMNILAB ENGINE
# =============================================================================

class OmniLabEngine:
    """Main engine for the Hexagonal Global Matrix educational platform."""

    def __init__(self):
        self.labs = list(DEFAULT_LABS)
        self.thermal = ThermalSandbox()
        self.gravity = GravitySandbox()
        self.ohmic = OhmicSandbox()

    def get_labs(self, tier: Optional[str] = None, subject: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get labs filtered by tier and/or subject."""
        result = self.labs
        if tier and tier != "all":
            result = [lab for lab in result if lab["tier"] == tier]
        if subject and subject != "all":
            result = [lab for lab in result if lab["subject"].lower() == subject.lower()]
        return result

    def get_lab(self, lab_id: int) -> Optional[Dict[str, Any]]:
        """Get a single lab by ID."""
        for lab in self.labs:
            if lab["id"] == lab_id:
                return lab
        return None

    def add_lab(self, lab: Dict[str, Any]) -> Dict[str, Any]:
        """Add a custom lab to the database."""
        new_id = max(lab["id"] for lab in self.labs) + 1 if self.labs else 1
        lab["id"] = new_id
        self.labs.append(lab)
        return {"success": True, "lab": lab}

    def get_superpowers(self) -> Dict[str, Any]:
        """Get the superpower matrix definitions."""
        return {"success": True, "superpowers": SUPERPOWERS, "tiers": TIER_LEVELS}

    def get_socratic(self, sandbox_type: str, index: Optional[int] = None) -> Dict[str, Any]:
        """Get Socratic dialogue prompts for a sandbox type."""
        prompts = SOCRATIC_PROMPTS.get(sandbox_type, [])
        if index is not None and 0 <= index < len(prompts):
            return {"success": True, "prompt": prompts[index], "total": len(prompts)}
        return {"success": True, "prompts": prompts, "total": len(prompts)}

    def analyze_thermal(self, temp_dark: float, temp_reflective: float, ambient: float = 25.0) -> Dict[str, Any]:
        """Run thermal sandbox analysis."""
        return {"success": True, **self.thermal.analyze(temp_dark, temp_reflective, ambient)}

    def analyze_gravity(self, times: List[float], length_m: float = 1.0) -> Dict[str, Any]:
        """Run gravity sandbox analysis."""
        return {"success": True, **self.gravity.analyze(times, length_m)}

    def analyze_ohmic(self, readings: List[Dict[str, float]], width_mm: float = 2.0, thickness_mm: float = 0.1) -> Dict[str, Any]:
        """Run ohmic sandbox analysis."""
        return {"success": True, **self.ohmic.analyze(readings, width_mm, thickness_mm)}

    def hexagonal_sync(self) -> Dict[str, Any]:
        """Trigger the hexagonal harmonization cross-sync."""
        report = []
        for code, info in SUPERPOWERS.items():
            labs_for_country = [lab for lab in self.labs if code in lab.get("superpowers", [])]
            report.append({
                "country": code,
                "name": info["name"],
                "flag": info["flag"],
                "standard": info["standard"],
                "labs_mapped": len(labs_for_country),
                "coverage_subjects": list(set(lab["subject"] for lab in labs_for_country)),
            })
        return {
            "success": True,
            "timestamp": time.time(),
            "total_labs": len(self.labs),
            "sync_report": report,
            "message": "Hexagonal Global Matrix sync complete. All 6 superpower standards cross-referenced.",
        }


# Singleton instance
_omnilab_engine: Optional[OmniLabEngine] = None

def get_engine() -> OmniLabEngine:
    """Get or create the OmniLab engine singleton."""
    global _omnilab_engine
    if _omnilab_engine is None:
        _omnilab_engine = OmniLabEngine()
    return _omnilab_engine
